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

  // Determine redirect URI
  let selectedRedirectUri = redirectUris[0] || "http://localhost:3000/api/auth/callback/google";
  if (redirectUris.length > 1) {
    console.log("Daftar redirect_uris terdaftar di credentials.json:");
    redirectUris.forEach((uri, idx) => console.log(`  [${idx + 1}] ${uri}`));
    const choice = await ask(`Pilih nomor redirect URI (default 1): `);
    const num = parseInt(choice.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= redirectUris.length) {
      selectedRedirectUri = redirectUris[num - 1];
    }
  }

  console.log(`\n🔗 Redirect URI yang digunakan: ${selectedRedirectUri}\n`);

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

  console.log("--------------------------------------------------------");
  console.log("LANGKAH 2: Setelah login dan klik 'Izinkan/Allow':");
  console.log("Browser akan diarahkan ke halaman redirect (Vercel).");
  console.log("👉 Salin SELURUH URL dari address bar browser Anda");
  console.log("   (yang ada tulisan '?code=4/0...') lalu tempel di bawah:");
  console.log("--------------------------------------------------------\n");

  let trimmed = "";
  while (!trimmed) {
    const inputCodeOrUrl = await ask("Tempelkan URL atau kode di sini: ");
    trimmed = inputCodeOrUrl.trim();
    if (!trimmed) {
      console.log("⚠️ Input masih kosong. Silakan salin URL dari address bar browser dan tempel di sini.");
    }
  }

  let code = trimmed;
  // If user pasted full URL
  if (trimmed.includes("code=")) {
    try {
      const parsedUrl = new URL(trimmed.startsWith("http") ? trimmed : `http://dummy.com/${trimmed}`);
      code = parsedUrl.searchParams.get("code") || trimmed;
    } catch (_) {
      const match = trimmed.match(/[?&]code=([^&]+)/);
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

    // Offer to update worker.js directly
    const workerPath = path.join(__dirname, "worker.js");
    if (refreshToken && fs.existsSync(workerPath)) {
      const updateWorker = await ask("Apakah Anda ingin memperbarui worker.js secara otomatis dengan kredensial ini? (Y/n): ");
      if (updateWorker.trim().toLowerCase() !== "n") {
        let workerContent = fs.readFileSync(workerPath, "utf-8");

        workerContent = workerContent.replace(
          /client_id:\s*["'][^"']*["']/,
          `client_id: "${clientId}"`
        );
        workerContent = workerContent.replace(
          /client_secret:\s*["'][^"']*["']/,
          `client_secret: "${clientSecret}"`
        );
        workerContent = workerContent.replace(
          /refresh_token:\s*["'][^"']*["']/,
          `refresh_token: "${refreshToken}"`
        );

        fs.writeFileSync(workerPath, workerContent, "utf-8");
        console.log("✅ Berhasil memperbarui authConfig di cloudflare-worker/worker.js!");
      }
    }

    // Offer to create .dev.vars for wrangler local development
    if (refreshToken) {
      const devVarsPath = path.join(__dirname, ".dev.vars");
      const devVarsContent =
        `GOOGLE_CLIENT_ID="${clientId}"\n` +
        `GOOGLE_CLIENT_SECRET="${clientSecret}"\n` +
        `REFRESH_TOKEN="${refreshToken}"\n`;

      fs.writeFileSync(devVarsPath, devVarsContent, "utf-8");
      console.log("✅ Berhasil membuat cloudflare-worker/.dev.vars untuk pengujian Wrangler lokal!");
    }

    console.log("\n🚀 Langkah Selanjutnya:");
    console.log("1. Jalankan worker secara lokal: npx wrangler dev");
    console.log("2. Deploy worker ke Cloudflare: npx wrangler deploy");
    console.log("3. Pasang URL worker ke .env.local Next.js:");
    console.log('   NEXT_PUBLIC_CF_WORKER_URL="https://your-worker.workers.dev"\n');
  } catch (err) {
    console.error("❌ Terjadi error saat pertukaran token:", err.message);
  } finally {
    rl.close();
  }
}

main();
