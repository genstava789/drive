/**
 * Cloudflare Worker for Google Drive File Downloads & Streaming
 * Modeled after Google-Drive-Index (https://gitlab.com/GoogleDriveIndex/Google-Drive-Index)
 *
 * Supported Routes:
 * - GET /download?id=FILE_ID
 * - GET /download.aspx?file=FILE_ID
 * - GET /?id=FILE_ID or /?file=FILE_ID
 * - GET /:fileId
 * - GET /generate       : Web Token Generator for OAuth Refresh Token
 *
 * Query Options:
 * - ?inline=true        : Stream inline (e.g. for media preview) instead of attachment download
 * - ?fmt=pdf|docx|xlsx  : Choose export format for Google Docs/Sheets/Slides
 * - ?token=ACCESS_TOKEN : (Optional) Pass temporary user access token from Next.js session
 * - ?name=CUSTOM_NAME   : (Optional) Override downloaded filename
 */

// Configuration (can also be overridden via Cloudflare Worker Environment Variables)
const authConfig = {
  siteName: "LeviDrive Downloader",
  // Google OAuth 2.0 credentials (dapat diisi otomatis via generate-tokens.js atau env Cloudflare)
  client_id: "", // Or set GOOGLE_CLIENT_ID env variable / .dev.vars
  client_secret: "", // Or set GOOGLE_CLIENT_SECRET env variable / .dev.vars
  refresh_token: "", // Or set REFRESH_TOKEN env variable / .dev.vars
  // Service account option
  service_account: false, // Set true if using Service Account
  cors_domain: "*",
};

// Optional: Service account JSON key if using service account
const serviceAccountConfig = null; // Or set SERVICE_ACCOUNT_JSON env variable

// Google Workspace mimeType -> export format mapping (same as Google-Drive-Index)
const GDOC_EXPORT_FORMATS = {
  "application/vnd.google-apps.document": {
    name: "Google Doc",
    defaultExt: "docx",
    formats: [
      {
        ext: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      { ext: "pdf", mime: "application/pdf" },
      { ext: "txt", mime: "text/plain" },
    ],
  },
  "application/vnd.google-apps.spreadsheet": {
    name: "Google Sheet",
    defaultExt: "xlsx",
    formats: [
      {
        ext: "xlsx",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      { ext: "pdf", mime: "application/pdf" },
      { ext: "csv", mime: "text/csv" },
    ],
  },
  "application/vnd.google-apps.presentation": {
    name: "Google Slides",
    defaultExt: "pptx",
    formats: [
      {
        ext: "pptx",
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      },
      { ext: "pdf", mime: "application/pdf" },
    ],
  },
};

// In-memory token cache across requests in the same isolate
let tokenCache = {
  accessToken: "",
  expiresAt: 0,
};

/**
 * Fetch new Google Access Token using OAuth Refresh Token
 */
async function fetchAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Failed to refresh Google access token: ${resp.status} ${errorText}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Fetch Google Access Token using Service Account (RS256 JWT via Web Crypto)
 */
async function fetchAccessTokenFromServiceAccount(saJson) {
  const sa = typeof saJson === "string" ? JSON.parse(saJson) : saJson;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str) =>
    btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Import RSA Private Key
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  const jwt = `${unsignedToken}.${encodedSignature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Service Account token error: ${resp.status} ${errorText}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Get active access token (cached or refreshed)
 */
async function getAccessToken(env, explicitToken) {
  if (explicitToken) {
    return explicitToken;
  }

  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const clientId = env?.GOOGLE_CLIENT_ID || authConfig.client_id;
  const clientSecret = env?.GOOGLE_CLIENT_SECRET || authConfig.client_secret;
  const refreshToken = env?.REFRESH_TOKEN || authConfig.refresh_token;
  const saConfig = env?.SERVICE_ACCOUNT_JSON || serviceAccountConfig;

  let result;
  if (saConfig) {
    result = await fetchAccessTokenFromServiceAccount(saConfig);
  } else if (clientId && clientSecret && refreshToken) {
    result = await fetchAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
  } else {
    throw new Error(
      "Worker belum dikonfigurasi dengan Google credentials. Harap jalankan 'node generate-tokens.js' untuk mendapatkan refresh_token, atau set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan REFRESH_TOKEN di environment variables Cloudflare Worker."
    );
  }

  tokenCache = {
    accessToken: result.accessToken,
    expiresAt: now + (result.expiresIn - 300) * 1000,
  };

  return tokenCache.accessToken;
}

/**
 * Handle Download Request for a Google Drive File ID
 */
async function handleDownload(request, fileId, env, searchParams) {
  const rangeHeader = request.headers.get("Range");
  const isInline = searchParams.get("inline") === "true";
  const explicitToken = searchParams.get("token") || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const customName = searchParams.get("name");
  const requestedFmt = searchParams.get("fmt")?.toLowerCase();

  const accessToken = await getAccessToken(env, explicitToken);

  // 1. Fetch file metadata
  const metaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?fields=id,name,mimeType,size,webContentLink&supportsAllDrives=true`;

  const metaResp = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaResp.ok) {
    if (metaResp.status === 404) {
      return new Response(
        JSON.stringify({ error: "Berkas Google Drive tidak ditemukan (404)." }),
        { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
    const errText = await metaResp.text();
    return new Response(
      JSON.stringify({ error: "Gagal mengambil metadata berkas dari Google Drive", details: errText }),
      { status: metaResp.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  const fileMeta = await metaResp.json();
  const fileName = customName || fileMeta.name || `file_${fileId}`;
  const mimeType = fileMeta.mimeType;

  // 2. Handle Google Workspace files via Export API (Docs, Sheets, Slides)
  const exportEntry = GDOC_EXPORT_FORMATS[mimeType];
  if (exportEntry) {
    const selectedFormat = requestedFmt
      ? exportEntry.formats.find((f) => f.ext === requestedFmt) || exportEntry.formats[0]
      : exportEntry.formats[0];

    const exportUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}/export?mimeType=${encodeURIComponent(selectedFormat.mime)}`;

    const exportResp = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!exportResp.ok) {
      const errDetails = await exportResp.text();
      return new Response(errDetails, {
        status: exportResp.status,
        headers: { "Content-Type": "text/plain;charset=UTF-8", "Access-Control-Allow-Origin": "*" },
      });
    }

    const exportName = `${fileName.replace(/\.[^/.]+$/, "")}.${selectedFormat.ext}`;
    const disposition = isInline
      ? "inline"
      : `attachment; filename*=UTF-8''${encodeURIComponent(exportName)}`;

    const responseHeaders = new Headers(exportResp.headers);
    responseHeaders.set("Content-Disposition", disposition);
    responseHeaders.set("Content-Type", selectedFormat.mime);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length");

    return new Response(exportResp.body, {
      status: exportResp.status,
      headers: responseHeaders,
    });
  }

  // 3. Regular Binary / Media Files via `alt=media`
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?alt=media&supportsAllDrives=true`;

  const driveHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (rangeHeader) {
    driveHeaders["Range"] = rangeHeader;
  }

  // Retry up to 3 times as in Google-Drive-Index
  let driveResp;
  for (let i = 0; i < 3; i++) {
    driveResp = await fetch(downloadUrl, { headers: driveHeaders });
    if (driveResp.ok || driveResp.status === 206) {
      break;
    }
    await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }

  if (!driveResp.ok && driveResp.status !== 206) {
    const details = await driveResp.text();
    return new Response(
      JSON.stringify({ error: "Gagal mengunduh stream berkas dari Google Drive", status: driveResp.status, details }),
      { status: driveResp.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  const disposition = isInline
    ? "inline"
    : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  const responseHeaders = new Headers(driveResp.headers);
  responseHeaders.set("Content-Disposition", disposition);
  if (mimeType) {
    responseHeaders.set("Content-Type", mimeType);
  }
  if (fileMeta.size && !rangeHeader) {
    responseHeaders.set("Content-Length", fileMeta.size.toString());
  }
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set(
    "Access-Control-Expose-Headers",
    "Content-Disposition, Content-Length, Content-Range, Accept-Ranges"
  );

  return new Response(driveResp.body, {
    status: driveResp.status,
    headers: responseHeaders,
  });
}

/**
 * Built-in Web Generator UI for OAuth Tokens
 */
function renderWebGenerator(url) {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google OAuth Token Generator • LeviDrive</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; max-width: 600px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    h1 { font-size: 20px; font-weight: 700; color: #38bdf8; margin-top: 0; display: flex; align-items: center; gap: 8px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; }
    label { font-size: 12px; font-weight: 600; color: #cbd5e1; display: block; margin-top: 14px; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; border-radius: 8px; padding: 9px 12px; color: #f8fafc; font-size: 13px; outline: none; }
    input:focus { border-color: #38bdf8; }
    .btn { display: inline-block; background: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; margin-top: 16px; }
    .btn:hover { background: #0369a1; }
    .box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; margin-top: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: #0369a1; color: #e0f2fe; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>🔑 OAuth Token Generator</h1>
      <span class="badge">LeviDrive</span>
    </div>
    <p>Gunakan formulir ini atau script CLI <code>node generate-tokens.js</code> di folder <code>cloudflare-worker</code> untuk membuat <strong>REFRESH_TOKEN</strong> dari <code>credentials.json</code>.</p>
    
    <label>Client ID:</label>
    <input type="text" id="cid" placeholder="xxxx.apps.googleusercontent.com" value="${authConfig.client_id}">

    <label>Redirect URI:</label>
    <input type="text" id="ruri" value="${url.origin}/oauth/callback">

    <button class="btn" onclick="openAuth()">1. Buka Otorisasi Google</button>

    <div style="margin-top:20px; border-top: 1px solid #334155; padding-top:16px;">
      <label>2. Tempelkan Authorization Code di sini:</label>
      <input type="text" id="code" placeholder="4/0Abc123...">

      <label>Client Secret:</label>
      <input type="text" id="csec" placeholder="GOCSPX-..." value="${authConfig.client_secret}">

      <button class="btn" onclick="exchangeCode()" style="background:#10b981;">3. Dapatkan Refresh Token</button>
    </div>

    <div id="output" class="box" style="display:none;"></div>
  </div>

  <script>
    function openAuth() {
      const cid = document.getElementById('cid').value.trim();
      const ruri = document.getElementById('ruri').value.trim();
      if(!cid) return alert('Masukkan Client ID terlebih dahulu');
      const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: cid,
        redirect_uri: ruri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        access_type: 'offline',
        prompt: 'consent'
      });
      window.open(url, '_blank');
    }

    async function exchangeCode() {
      const cid = document.getElementById('cid').value.trim();
      const csec = document.getElementById('csec').value.trim();
      const ruri = document.getElementById('ruri').value.trim();
      let code = document.getElementById('code').value.trim();
      if (code.includes('code=')) {
        try {
          const u = new URL(code.startsWith('http') ? code : 'http://x.com/' + code);
          code = u.searchParams.get('code') || code;
        } catch(_) {}
      }
      if(!cid || !csec || !code) return alert('Lengkapi Client ID, Client Secret, dan Code.');

      const out = document.getElementById('output');
      out.style.display = 'block';
      out.innerText = 'Sedang menukar token dengan Google...';

      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: cid,
            client_secret: csec,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: ruri
          }).toString()
        });
        const data = await res.json();
        if(!res.ok) {
          out.innerText = 'Error: ' + JSON.stringify(data, null, 2);
        } else {
          out.innerHTML = '<strong>BERHASIL!</strong><br><br>' +
            'GOOGLE_CLIENT_ID="' + cid + '"<br>' +
            'GOOGLE_CLIENT_SECRET="' + csec + '"<br>' +
            'REFRESH_TOKEN="' + (data.refresh_token || 'Tidak ada (sudah pernah disetujui sebelumnya)') + '"';
        }
      } catch(err) {
        out.innerText = 'Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

/**
 * Main Cloudflare Worker Request Handler
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Authorization, Content-Type, Origin",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Web Generator Route
  if (path === "/generate" || path === "/oauth") {
    return renderWebGenerator(url);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Extract file ID from various supported parameter patterns
  let fileId =
    url.searchParams.get("id") ||
    url.searchParams.get("file") ||
    url.searchParams.get("fileId");

  // If path is like /download/FILE_ID or /FILE_ID (and not root)
  if (!fileId && path !== "/" && path !== "/download" && path !== "/download.aspx") {
    const cleanPath = path.replace(/^\/download\/?/, "").replace(/^\//, "");
    if (cleanPath && !cleanPath.includes("/") && cleanPath.length > 5) {
      fileId = cleanPath;
    }
  }

  // If valid file ID found, process download
  if (fileId) {
    try {
      return await handleDownload(request, fileId, env, url.searchParams);
    } catch (err) {
      console.error("Worker download error:", err);
      return new Response(
        JSON.stringify({
          error: "Terjadi kesalahan saat memproses unduhan",
          message: err.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }
  }

  // Home / Health / Status Info
  return new Response(
    JSON.stringify({
      service: "LeviDrive Cloudflare Worker Downloader",
      status: "online",
      generator: `${url.origin}/generate`,
      documentation: {
        usage: `${url.origin}/download?id=GOOGLE_DRIVE_FILE_ID`,
        parameters: {
          id: "Google Drive file ID (required)",
          name: "Custom downloaded filename (optional)",
          inline: "Set 'true' for inline streaming / preview (optional)",
          fmt: "Export format for Docs/Sheets/Slides: pdf, docx, xlsx, pptx, txt, csv (optional)",
          token: "Google Access Token if not configured via worker env (optional)",
        },
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
    }
  );
}

// Cloudflare Workers ES Module export (Modern standard)
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};

// Fallback for Service Worker syntax environments
if (typeof addEventListener === "function") {
  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request, {}));
  });
}
