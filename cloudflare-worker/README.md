# ☁️ LeviDrive Cloudflare Worker & Token Generator

Direktori terpisah untuk Cloudflare Worker yang menangani pengunduhan dan *streaming* berkas Google Drive dengan kecepatan tinggi, serta generator token OAuth.

---

## 📁 Struktur Folder

```
cloudflare-worker/
├── credentials.json       # Salinan Google OAuth credentials dari Google Cloud Console
├── generate-tokens.js     # Script CLI generator Client ID, Secret & Refresh Token
├── worker.js              # Script Cloudflare Worker (Downloader & Streamer)
├── wrangler.jsonc         # Konfigurasi Wrangler untuk deployment ke Cloudflare
├── package.json           # Script npm untuk generate & deploy
└── .dev.vars              # Kredensial lokal untuk pengujian wrangler dev (di-ignore git)
```

---

## ⚡ Langkah Cepat (Quick Start)

### 1. Dapatkan Kredensial & Refresh Token
Jalankan script generator interaktif:
```bash
# Dari folder root project:
npm --prefix cloudflare-worker run generate

# Atau masuk ke folder cloudflare-worker:
cd cloudflare-worker
node generate-tokens.js
```

Script ini akan:
1. Membaca `credentials.json`.
2. Menampilkan URL otorisasi Google OAuth dan otomatis membukanya di browser Anda.
3. Setelah Anda login dan menyetujui, salin URL dari address bar browser dan tempelkan ke terminal.
4. Script akan menukar kode tersebut dengan **`REFRESH_TOKEN`**, lalu otomatis memperbarui `worker.js` dan membuat file `.dev.vars`!

---

### 2. Pengujian Lokal (Opsional)
Jalankan worker secara lokal menggunakan Wrangler:
```bash
cd cloudflare-worker
npx wrangler dev
```

Kunjungi `http://localhost:8787` atau `http://localhost:8787/generate` di browser Anda.

---

### 3. Deploy ke Cloudflare Workers
Deploy ke akun Cloudflare Anda:
```bash
cd cloudflare-worker
npx wrangler deploy
```

Setelah di-deploy, Anda akan mendapatkan URL Worker (misal: `https://levidrive-downloader.subdomain.workers.dev`).

---

### 4. Hubungkan ke Next.js
Buka file `.env.local` di root Next.js Anda (dan pasang juga di pengaturan Environment Variables Vercel):

```env
NEXT_PUBLIC_CF_WORKER_URL="https://levidrive-downloader.subdomain.workers.dev"
```

Sekarang:
- Tombol **Download** di samping *Buka di Drive* akan langsung mengunduh lewat Cloudflare Worker.
- Tombol **Salin URL** akan menyalin tautan Cloudflare Worker.
- Menu dropdown tabel dan grid juga menggunakan Cloudflare Worker.
