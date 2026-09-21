#!/usr/bin/env node

/**
 * Google OAuth Token Generator for Cloudflare Workers
 * Reads credentials.json and exchanges authorization code for refresh_token
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { exec } = require("child_process");

// 1. Locate credentials.json
const possiblePaths = [
  path.join(__dirname, "credentials.json"),
  path.join(__dirname, "..", "credentials.json"),
];

let credentialsPath = possiblePaths.find((p) => fs.existsSync(p));

if (!credentialsPath) {
  console.error("❌ Error: credentials.json tidak ditemukan.");
  console.error("Pastikan file credentials.json berada di folder ini atau di root Next.js.");
  process.exit(1);
}

const credsRaw = fs.readFileSync(credentialsPath, "utf-8");
let creds;
try {
  creds = JSON.parse(credsRaw);
} catch (e) {
  console.error("❌ Error: Format credentials.json tidak valid (bukan JSON yang valid).");
  process.exit(1);
}

const clientConfig = creds.web || creds.installed;
if (!clientConfig) {
  console.error("❌ Error: credentials.json tidak memiliki properti 'web' atau 'installed'.");
  process.exit(1);
}

const clientId = clientConfig.client_id;
const clientSecret = clientConfig.client_secret;
const redirectUris = clientConfig.redirect_uris || [];

if (!clientId || !clientSecret) {
  console.error("❌ Error: client_id atau client_secret tidak ditemukan di credentials.json.");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const http = require("http");

async function startLocalReceiver(port = 8085) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://localhost:${port}`);
        if (reqUrl.pathname === "/oauth2callback" || reqUrl.pathname === "/callback" || reqUrl.searchParams.has("code")) {
          const code = reqUrl.searchParams.get("code");
          if (code) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><title>Otorisasi Berhasil</title></head>
              <body style="font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;text-align:center;max-width:450px;">
                  <h1 style="color:#10b981;margin:0 0 12px 0;">✅ Otorisasi Berhasil!</h1>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.5;">Kode otorisasi berhasil diterima oleh script generator. Anda dapat menutup tab ini sekarang dan kembali ke terminal.</p>
                </div>
              </body>
              </html>
            `);
            server.close();
            resolve(code);
          }
        }
      } catch (_) {}
    });

    server.listen(port, () => {});
    server.on("error", () => {
      resolve(null);
    });
  });
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function main() {
  console.log("\n========================================================");
  console.log("   🔑 GOOGLE OAUTH REFRESH TOKEN GENERATOR (LEVIDRIVE)  ");
  console.log("========================================================\n");
  console.log(`📁 Menggunakan: ${credentialsPath}`);
  console.log(`🆔 Client ID  : ${clientId}`);
  console.log(`🔒 Secret     : ${clientSecret.substring(0, 8)}********\n`);

  console.log("Pilih Metode Redirect URI:");
  console.log("  [1] Localhost Otomatis (http://localhost:8085/oauth2callback)");
  console.log("      ⭐ Paling mudah: Script otomatis menangkap token tanpa salin-tempel!");
  console.log("      (Pastikan 'http://localhost:8085/oauth2callback' sudah ditambahkan di Google Cloud Console)\n");
  console.log("  [2] URL Vercel dari credentials.json:");
  console.log(`      (${redirectUris[0] || "Tidak ada"})\n`);
  console.log("  [3] Masukkan Redirect URI kustom (misal URL Cloudflare Worker Anda)\n");

  const methodChoice = await ask("Pilih opsi [1 / 2 / 3] (default 1): ");
  let selectedRedirectUri = "http://localhost:8085/oauth2callback";
  let useLocalServer = true;

  const choiceTrimmed = methodChoice.trim();
  if (choiceTrimmed === "2") {
    selectedRedirectUri = redirectUris[0] || "http://localhost:8085/oauth2callback";
    useLocalServer = false;
  } else if (choiceTrimmed === "3") {
    const customUri = await ask("Masukkan Redirect URI terdaftar Anda: ");
    selectedRedirectUri = customUri.trim() || "http://localhost:8085/oauth2callback";
    useLocalServer = selectedRedirectUri.includes("localhost:8085");
  }

  console.log(`\n🔗 Redirect URI yang digunakan: ${selectedRedirectUri}\n`);

  let localServerPromise = null;
  if (useLocalServer) {
    localServerPromise = startLocalReceiver(8085);
  }

  // Construct OAuth Consent URL
  const scope = "https://www.googleapis.com/auth/drive.readonly";
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: selectedRedirectUri,
      response_type: "code",
      scope: scope,
      access_type: "offline",
      prompt: "consent", // Ensures Google returns a refresh_token
    }).toString();

  console.log("--------------------------------------------------------");
  console.log("LANGKAH 1: Membuka halaman login & otorisasi Google...");
  console.log("--------------------------------------------------------");
  console.log(authUrl);
  console.log("--------------------------------------------------------\n");

  openBrowser(authUrl);

  let code = null;

  if (useLocalServer) {
    console.log("⏳ Menunggu Anda menyetujui izin di browser...");
    console.log("(Script akan otomatis mendeteksi saat Anda klik 'Izinkan' di browser)\n");

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 120000));
    code = await Promise.race([localServerPromise, timeoutPromise]);

    if (!code) {
      console.log("⚠️ Tidak menerima respon otomatis dalam 2 menit. Beralih ke input manual.\n");
    }
  }

  if (!code) {
    console.log("--------------------------------------------------------");
    console.log("LANGKAH 2: Setelah login dan klik 'Izinkan/Allow':");
    console.log("👉 Salin seluruh URL atau nilai '?code=...' dari address bar browser");
    console.log("--------------------------------------------------------\n");

    let trimmed = "";
    while (!trimmed) {
      const inputCodeOrUrl = await ask("Tempelkan URL atau kode di sini: ");
      trimmed = inputCodeOrUrl.trim();
      if (!trimmed) {
        console.log("⚠️ Input masih kosong. Silakan salin URL dari address bar browser.");
      }
    }
    code = trimmed;
  }

  // If user pasted full URL
  if (code && code.includes("code=")) {
    try {
      const parsedUrl = new URL(code.startsWith("http") ? code : `http://dummy.com/${code}`);
      code = parsedUrl.searchParams.get("code") || code;
    } catch (_) {
      const match = code.match(/[?&]code=([^&]+)/);
      if (match) {
        code = decodeURIComponent(match[1]);
      }
    }
  }

  console.log("\n⏳ Sedang menukar kode dengan refresh_token dari Google...");

  try {
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: selectedRedirectUri,
      }).toString(),
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error("\n❌ Gagal mendapatkan token dari Google:");
      console.error(JSON.stringify(tokenData, null, 2));
      console.error("\n💡 Tips:");
      console.error("1. Pastikan kode otorisasi belum kedaluwarsa atau pernah digunakan.");
      console.error("2. Pastikan Redirect URI yang dipilih sama persis dengan yang terdaftar di Google Cloud Console.");
      rl.close();
      process.exit(1);
    }

    const refreshToken = tokenData.refresh_token;

    console.log("\n========================================================");
    console.log("   🎉 BERHASIL MENDAPATKAN TOKEN GOOGLE OAUTH!          ");
    console.log("========================================================\n");
    console.log(`GOOGLE_CLIENT_ID     : ${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET : ${clientSecret}`);
    console.log(`REFRESH_TOKEN        : ${refreshToken || "(Tidak ada refresh_token yang dikembalikan)"}`);
    console.log(`ACCESS_TOKEN (aktif) : ${tokenData.access_token.substring(0, 25)}...`);
    console.log("========================================================\n");

    if (!refreshToken) {
      console.warn("⚠️ Perhatian: Google tidak mengembalikan refresh_token baru karena akun ini sudah pernah diberikan izin.");
      console.warn("Untuk memaksa Google mengembalikan refresh_token baru:");
      console.warn("1. Buka https://myaccount.google.com/permissions");
      console.warn("2. Cabut izin aplikasi Anda, lalu jalankan script ini kembali.\n");
    }

    // Save credentials to gitignored .dev.vars for Wrangler
    if (refreshToken) {
      const devVarsPath = path.join(__dirname, ".dev.vars");
      const devVarsContent =
        `GOOGLE_CLIENT_ID="${clientId}"\n` +
        `GOOGLE_CLIENT_SECRET="${clientSecret}"\n` +
        `REFRESH_TOKEN="${refreshToken}"\n`;

      fs.writeFileSync(devVarsPath, devVarsContent, "utf-8");
      console.log("✅ Berhasil menyimpan kredensial ke cloudflare-worker/.dev.vars (terlindungi .gitignore)!");
    }

    console.log("\n🚀 Langkah Selanjutnya:");
    console.log("1. Upload secrets ke Cloudflare Worker:");
    console.log("   npx wrangler secret bulk .dev.vars\n");
    console.log("2. Deploy worker ke Cloudflare:");
    console.log("   npx wrangler deploy\n");
    console.log("3. Pasang URL worker ke file .env.local di Next.js:");
    console.log('   NEXT_PUBLIC_CF_WORKER_URL="https://levidrive-downloader.<subdomain>.workers.dev"\n');
  } catch (err) {
    console.error("❌ Terjadi error saat pertukaran token:", err.message);
  } finally {
    rl.close();
  }
}

main();
