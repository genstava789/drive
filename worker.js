/**
 * Cloudflare Worker for Google Drive File Downloads & Streaming
 * Modeled after Google-Drive-Index (https://gitlab.com/GoogleDriveIndex/Google-Drive-Index)
 *
 * Supported Routes:
 * - GET /download?id=FILE_ID
 * - GET /download.aspx?file=FILE_ID
 * - GET /?id=FILE_ID or /?file=FILE_ID
 * - GET /:fileId
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
  // Google OAuth 2.0 credentials
  client_id: "", // Or set GOOGLE_CLIENT_ID env variable
  client_secret: "", // Or set GOOGLE_CLIENT_SECRET env variable
  refresh_token: "", // Or set REFRESH_TOKEN env variable
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
      "Worker belum dikonfigurasi dengan Google credentials. Harap set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan REFRESH_TOKEN (atau SERVICE_ACCOUNT_JSON) di environment variables Cloudflare Worker, atau teruskan parameter ?token=ACCESS_TOKEN."
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
