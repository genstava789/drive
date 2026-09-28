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

// In-memory token cache across requests in the same isolate (keyed by account index)
const tokenCacheMap = new Map();

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
async function getAccessToken(env, explicitToken, accountIndex = 0) {
  if (explicitToken) {
    return explicitToken;
  }

  const accIdx = parseInt(accountIndex, 10) || 0;
  const cacheKey = `acc_${accIdx}`;
  const now = Date.now();

  const cached = tokenCacheMap.get(cacheKey);
  if (cached && cached.accessToken && cached.expiresAt > now + 60000) {
    return cached.accessToken;
  }

  // Parse accounts config if provided via ACCOUNTS JSON env
  let accountsConfig = [];
  if (env?.ACCOUNTS) {
    try {
      accountsConfig = typeof env.ACCOUNTS === "string" ? JSON.parse(env.ACCOUNTS) : env.ACCOUNTS;
    } catch (_) {}
  }

  const accountObj = Array.isArray(accountsConfig) && accountsConfig[accIdx] ? accountsConfig[accIdx] : null;

  // Resolve credentials with fallback hierarchy
  const clientId =
    accountObj?.client_id ||
    env?.[`GOOGLE_CLIENT_ID_${accIdx}`] ||
    env?.GOOGLE_CLIENT_ID ||
    authConfig.client_id;

  const clientSecret =
    accountObj?.client_secret ||
    env?.[`GOOGLE_CLIENT_SECRET_${accIdx}`] ||
    env?.GOOGLE_CLIENT_SECRET ||
    authConfig.client_secret;

  const refreshToken =
    accountObj?.refresh_token ||
    env?.[`REFRESH_TOKEN_${accIdx}`] ||
    env?.[`GOOGLE_REFRESH_TOKEN_${accIdx}`] ||
    (accIdx === 0 ? (env?.REFRESH_TOKEN || authConfig.refresh_token) : null);

  const saConfig =
    accountObj?.service_account ||
    env?.[`SERVICE_ACCOUNT_JSON_${accIdx}`] ||
    (accIdx === 0 ? (env?.SERVICE_ACCOUNT_JSON || serviceAccountConfig) : null);

  let result;
  if (saConfig) {
    result = await fetchAccessTokenFromServiceAccount(saConfig);
  } else if (clientId && clientSecret && refreshToken) {
    result = await fetchAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
  } else if (accIdx > 0 && (env?.REFRESH_TOKEN || authConfig.refresh_token)) {
    // If account-specific token isn't configured, gracefully fallback to primary account
    const fallbackRefresh = env?.REFRESH_TOKEN || authConfig.refresh_token;
    result = await fetchAccessTokenFromRefreshToken(clientId, clientSecret, fallbackRefresh);
  } else {
    throw new Error(
      `Worker belum dikonfigurasi untuk akun #${accIdx}. Tambahkan REFRESH_TOKEN_${accIdx} atau set ACCOUNTS=[...] di environment variables Cloudflare Worker.`
    );
  }

  tokenCacheMap.set(cacheKey, {
    accessToken: result.accessToken,
    expiresAt: now + (result.expiresIn - 300) * 1000,
  });

  return result.accessToken;
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
  const accountIndex = searchParams.get("account") || searchParams.get("acc") || "0";

  const accessToken = await getAccessToken(env, explicitToken, accountIndex);

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
 * Render Status Landing Page with Tailwind CSS
 */
function renderStatusPage(url) {
  const html = `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeviDrive Downloader • Status Online</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f0f9ff', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen flex flex-col justify-between antialiased selection:bg-sky-500 selection:text-white">
  <!-- Glow background -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-500/10 blur-[130px] rounded-full"></div>
    <div class="absolute top-1/2 -right-40 w-[500px] h-[350px] bg-blue-600/10 blur-[140px] rounded-full"></div>
  </div>

  <!-- Header -->
  <header class="border-b border-white/5 bg-[#0f1523]/70 backdrop-blur-md px-6 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <h1 class="text-base font-bold text-white tracking-tight">LeviDrive Worker</h1>
          <p class="text-xs text-slate-400">Direct Download & High-Speed Stream Engine</p>
        </div>
      </div>

      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Status: Online
      </div>
    </div>
  </header>

  <!-- Content -->
  <main class="max-w-4xl mx-auto px-6 py-12 flex-1 w-full">
    <!-- Hero Box -->
    <div class="rounded-2xl border border-white/10 bg-[#121927]/90 p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium mb-3">
            Multi-Account Engine v2.0
          </div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Direct Download & Streaming Service</h2>
          <p class="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
            Worker ini aktif melayani download berkecepatan tinggi dan video streaming dari Google Drive tanpa batasan kuota download harian ataupun limit browser.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <a href="${url.origin}/generate" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-all shadow-lg shadow-sky-500/25">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            OAuth Generator
          </a>
          <a href="${url.origin}/status" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-all">
            JSON Status
          </a>
        </div>
      </div>

      <!-- Quick Tester -->
      <div class="mt-8 pt-6 border-t border-white/5">
        <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Uji Unduhan Langsung File Drive</label>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div class="md:col-span-6">
            <input id="testFileId" type="text" placeholder="Masukkan Google Drive File ID..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-all font-mono" />
          </div>
          <div class="md:col-span-3">
            <select id="testAccount" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition-all">
              <option value="0">Akun #0 (Utama)</option>
              <option value="1">Akun #1</option>
              <option value="2">Akun #2</option>
              <option value="3">Akun #3</option>
            </select>
          </div>
          <div class="md:col-span-3 flex gap-2">
            <button onclick="testAction(false)" class="flex-1 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10">
              Download
            </button>
            <button onclick="testAction(true)" class="flex-1 px-3 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-all">
              Stream
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- API Docs -->
    <div class="rounded-2xl border border-white/10 bg-[#121927]/60 p-6 shadow-xl backdrop-blur-xl">
      <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <svg class="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Parameter URL Direct Download
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left text-slate-300">
          <thead class="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/5">
            <tr>
              <th class="py-2.5 pr-4 font-semibold">Parameter</th>
              <th class="py-2.5 pr-4 font-semibold">Tipe</th>
              <th class="py-2.5 font-semibold">Deskripsi</th>
            </tr>
          </thead>
          <tbody class="divide-y border-white/5 divide-white/5 font-mono">
            <tr>
              <td class="py-2.5 pr-4 text-sky-400 font-bold">id</td>
              <td class="py-2.5 pr-4 text-slate-400">string (wajib)</td>
              <td class="py-2.5 text-slate-300 font-sans">Google Drive File ID</td>
            </tr>
            <tr>
              <td class="py-2.5 pr-4 text-sky-400 font-bold">account</td>
              <td class="py-2.5 pr-4 text-slate-400">number (opsional)</td>
              <td class="py-2.5 text-slate-300 font-sans">Index akun multi-login (0, 1, 2, ...). Default: 0</td>
            </tr>
            <tr>
              <td class="py-2.5 pr-4 text-sky-400 font-bold">inline</td>
              <td class="py-2.5 pr-4 text-slate-400">boolean</td>
              <td class="py-2.5 text-slate-300 font-sans">Set <code>true</code> untuk video / audio streaming & inline preview</td>
            </tr>
            <tr>
              <td class="py-2.5 pr-4 text-sky-400 font-bold">name</td>
              <td class="py-2.5 pr-4 text-slate-400">string</td>
              <td class="py-2.5 text-slate-300 font-sans">Nama kustom saat berkas diunduh</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 p-3 rounded-xl bg-slate-900/90 border border-white/5 text-[11px] text-slate-400">
        <span class="text-sky-400 font-bold">Contoh URL:</span>
        <code class="text-white block mt-1 select-all">${url.origin}/download?id=FILE_ID&account=0&inline=true</code>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-white/5 py-6 px-6 text-center text-xs text-slate-500">
    LeviDrive Worker Downloader • Multi-Account Direct Engine
  </footer>

  <script>
    function testAction(inline) {
      const id = document.getElementById('testFileId').value.trim();
      const acc = document.getElementById('testAccount').value;
      if (!id) return alert('Silakan masukkan Google Drive File ID terlebih dahulu.');
      let target = '${url.origin}/download?id=' + encodeURIComponent(id) + '&account=' + encodeURIComponent(acc);
      if (inline) target += '&inline=true';
      window.open(target, '_blank');
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

  // Explicit health / status endpoint
  if (path === "/status" || path === "/health") {
    return new Response(
      JSON.stringify({
        service: "LeviDrive Cloudflare Worker Downloader",
        status: "online",
        multi_account: true,
        generator: `${url.origin}/generate`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=UTF-8", "Access-Control-Allow-Origin": "*" },
      }
    );
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
  const acceptHeader = request.headers.get("Accept") || "";
  const isHtmlRequest = acceptHeader.includes("text/html") && !url.searchParams.has("json");

  if (isHtmlRequest) {
    return renderStatusPage(url);
  }

  return new Response(
    JSON.stringify({
      service: "LeviDrive Cloudflare Worker Downloader",
      status: "online",
      multi_account: true,
      generator: `${url.origin}/generate`,
      documentation: {
        usage: `${url.origin}/download?id=GOOGLE_DRIVE_FILE_ID&account=0`,
        parameters: {
          id: "Google Drive file ID (required)",
          account: "Account index for multi-account setup (optional, e.g. 0, 1, 2)",
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
