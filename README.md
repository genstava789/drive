# CloudVault • Google Drive Explorer (Next.js 15+)

Aplikasi web modern berbasis **Next.js 15+ (App Router)** yang terintegrasi dengan **Google Drive API** menggunakan **Google OAuth 2.0**. Berkas dan folder ditampilkan di halaman depan (*frontpage*) menggunakan tabel headless berkinerja tinggi dari **TanStack Table (v8)**, antarmuka bertema **"White Smoke"**, **shadcn/ui**, **Tailwind CSS**, **Lucide Icons**, dan **Google Fonts (Plus Jakarta Sans)**.

---

## ✨ Fitur Unggulan

1. **Google Drive API & OAuth 2.0 Integration**:
   - Autentikasi aman melalui NextAuth / Auth.js dengan scope `https://www.googleapis.com/auth/drive.readonly`.
   - Mengambil berkas aktual dari Google Drive: Nama, tipe MIME, ukuran berkas, tanggal modifikasi, pemilik, dan tautan langsung.
2. **Headless TanStack Table (v8)**:
   - **Sorting Interaktif**: Urutkan berdasarkan Nama Berkas (folder otomatis diprioritaskan), Ukuran Berkas, dan Tanggal Modifikasi.
   - **Pencarian Real-Time**: Pencarian cepat (*instant debounce*) untuk nama berkas atau tipe format.
   - **Pagination Dinamis**: Navigasi halaman cepat (*first, previous, next, last*) dengan pilihan baris per halaman (5, 10, 20, 50).
3. **Navigasi Folder Hierarkis (Breadcrumb)**:
   - Klik baris folder untuk masuk ke dalam direktori.
   - Navigasi breadcrumb (*My Drive > Subfolder*) dengan tombol kembali satu tingkat.
4. **Desain Tema "White Smoke"**:
   - Palet off-white bersih (`#F6F7F9`), kontras lembut, bayangan halus (*subtle shadows*), kartu terangkat (*elevated cards*), dan tipografi modern dari Google Font *Plus Jakarta Sans*.
5. **Dual Mode (Live OAuth & Interactive Demo)**:
   - **Live OAuth**: Aktif ketika pengguna login dengan akun Google.
   - **Interactive Demo**: Menampilkan data simulasi realistis jika belum mengisi kredensial Google Cloud Console, sehingga aplikasi dapat langsung dicoba dan dipamerkan seketika.
6. **Modal Detail & Pratinjau**:
   - Menampilkan metadata lengkap, thumbnail gambar, tautan URL Google Drive, dan tombol salin tautan.
7. **Pilihan Tampilan (View Toggle)**:
   - Beralih antara **Tampilan Tabel Detail** dan **Tampilan Grid Kartu**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, React 19)
- **Data Table**: [@tanstack/react-table](https://tanstack.com/table/v8) (Headless)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Auth**: [NextAuth.js / Auth.js](https://authjs.dev/)
- **Typography**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) via `next/font/google`

---

## 🚀 Cara Menjalankan

### 1. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di peramban Anda.

### 2. Konfigurasi Kredensial Google OAuth (Opsional untuk Akun Nyata)

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru dan aktifkan **Google Drive API** di menu *APIs & Services > Library*.
3. Buka menu *Credentials > Create Credentials > OAuth Client ID* (Pilih tipe *Web application*).
4. Masukkan Authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Salin Client ID dan Client Secret ke file `.env.local`:
   ```env
   GOOGLE_CLIENT_ID="ISI_DENGAN_GOOGLE_CLIENT_ID_ANDA"
   GOOGLE_CLIENT_SECRET="ISI_DENGAN_GOOGLE_CLIENT_SECRET_ANDA"
   AUTH_SECRET="kunci_rahasia_acak_minimal_32_karakter"
   NEXTAUTH_URL="http://localhost:3000"
   ```
6. Klik tombol **Login Google** di pojok kanan atas aplikasi.

---

## 🌐 Deploy ke Vercel (Post-Production)

Proyek ini telah dikonfigurasi penuh untuk deploy sekali klik ke [Vercel](https://vercel.com/):

### Langkah-langkah Deploy:
1. Push kode ke repository GitHub Anda (sudah dilakukan).
2. Buka dashboard [Vercel](https://vercel.com/new) dan klik **Import Project** dari repository GitHub Anda.
3. Di bagian **Environment Variables**, tambahkan:
   - `GOOGLE_CLIENT_ID`: ID Klien OAuth dari Google Cloud Console
   - `GOOGLE_CLIENT_SECRET`: Klien Rahasia dari Google Cloud Console
   - `AUTH_SECRET`: String acak 32 karakter (misal: jalankan `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: URL aplikasi Vercel Anda (contoh: `https://drive-explorer.vercel.app`)
4. Klik **Deploy**.
5. Di **Google Cloud Console > Credentials**, tambahkan callback Vercel ke **Authorized redirect URIs**:
   ```
   https://<domain-aplikasi-anda>.vercel.app/api/auth/callback/google
   ```

---

## 📁 Struktur Direktori

```
google-drive-explorer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # Route Handler OAuth Google
│   │   │   └── drive/route.ts              # Proxy API Google Drive v3
│   │   ├── globals.css                     # White Smoke color tokens & base style
│   │   ├── layout.tsx                      # Plus Jakarta Sans & SessionProvider
│   │   └── page.tsx                        # Frontpage utama
│   ├── components/
│   │   ├── auth/
│   │   │   ├── oauth-setup-dialog.tsx      # Panduan interaktif Google Cloud Console
│   │   │   ├── session-provider.tsx        # NextAuth client provider
│   │   │   └── user-nav.tsx                # Status profil Google & tombol login/logout
│   │   ├── drive/
│   │   │   ├── breadcrumb-nav.tsx          # Navigasi path hierarki folder
│   │   │   ├── drive-explorer.tsx          # Controller & state manager utama
│   │   │   ├── drive-grid.tsx              # Tampilan kartu berkas visual
│   │   │   ├── drive-table.tsx             # Tabel TanStack headless
│   │   │   ├── drive-toolbar.tsx           # Search bar & filter pills
│   │   │   ├── file-preview-modal.tsx      # Modal metadata & tautan berkas
│   │   │   ├── file-type-icon.tsx          # Lucide Icon mapper berdasarkan tipe berkas
│   │   │   ├── mode-badge.tsx              # Banner status Demo vs Live OAuth
│   │   │   └── stats-cards.tsx             # Kartu ringkasan berkas & kuota penyimpanan
│   │   └── ui/                             # shadcn UI primitives (button, table, badge, card, dialog, dropdown, input, skeleton, tooltip)
│   ├── lib/
│   │   ├── auth.ts                         # Konfigurasi NextAuth v5
│   │   ├── google-drive.ts                 # Service fetcher Google Drive API v3
│   │   ├── mock-data.ts                    # Data simulasi berkas & folder
│   │   └── utils.ts                        # Helper cn, formatBytes, formatDate
│   └── types/
│       ├── drive.ts                        # Interface berkas, folder, dan API response
│       └── next-auth.d.ts                  # Type augmentation untuk JWT token & session
```
