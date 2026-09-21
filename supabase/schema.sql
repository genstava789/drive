-- =========================================================================
-- LEVIDRIVE - SUPABASE DATABASE SCHEMA
-- Jalankan skrip ini di: Supabase Dashboard > SQL Editor > New Query > Run
-- Project URL: https://kbcyqbejeexitkvbwogo.supabase.co
-- =========================================================================

-- 1. Tabel untuk menyimpan akun Google Drive yang terhubung
CREATE TABLE IF NOT EXISTS public.drive_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  image TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at BIGINT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel untuk mengontrol status sesi global (Logout serempak semua perangkat)
CREATE TABLE IF NOT EXISTS public.drive_session_control (
  id TEXT PRIMARY KEY DEFAULT 'global_session',
  logged_out BOOLEAN DEFAULT FALSE,
  logged_out_at BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inisialisasi baris tunggal global_session jika belum ada
INSERT INTO public.drive_session_control (id, logged_out, logged_out_at)
VALUES ('global_session', false, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security (RLS) agar dapat diakses dari aplikasi Next.js
ALTER TABLE public.drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_session_control ENABLE ROW LEVEL SECURITY;

-- Buat Policy agar anon & authenticated role dapat mengelola akun & sesi
DROP POLICY IF EXISTS "Allow anon all on drive_accounts" ON public.drive_accounts;
CREATE POLICY "Allow anon all on drive_accounts" ON public.drive_accounts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on drive_session_control" ON public.drive_session_control;
CREATE POLICY "Allow anon all on drive_session_control" ON public.drive_session_control
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
