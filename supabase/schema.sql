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

-- 3. Tabel Cache Metadata Berkas & Folder Google Drive (High-Speed Indexing Layer)
CREATE TABLE IF NOT EXISTS public.files_cache (
  id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  is_folder BOOLEAN NOT NULL DEFAULT FALSE,
  size BIGINT,
  parent_id TEXT NOT NULL DEFAULT 'root',
  parents JSONB DEFAULT '[]'::jsonb,
  thumbnail_link TEXT,
  web_view_link TEXT,
  web_content_link TEXT,
  icon_link TEXT,
  shared BOOLEAN DEFAULT FALSE,
  trashed BOOLEAN DEFAULT FALSE,
  created_time TIMESTAMPTZ,
  modified_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, account_id)
);

-- Indeks performa tinggi untuk pemuatan folder dalam hitungan milidetik
CREATE INDEX IF NOT EXISTS idx_files_cache_lookup
  ON public.files_cache (account_id, parent_id, trashed, is_folder DESC, name ASC);

CREATE INDEX IF NOT EXISTS idx_files_cache_item
  ON public.files_cache (account_id, id);

CREATE INDEX IF NOT EXISTS idx_files_cache_name_search
  ON public.files_cache (account_id, name);

-- 4. Tabel Status Sinkronisasi Latar Belakang (Google Drive changes.list tokens)
CREATE TABLE IF NOT EXISTS public.drive_sync_state (
  account_id TEXT PRIMARY KEY,
  start_page_token TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS) agar dapat diakses dari aplikasi Next.js
ALTER TABLE public.drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_session_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_sync_state ENABLE ROW LEVEL SECURITY;

-- Policies untuk akun dan kontrol sesi
DROP POLICY IF EXISTS "Allow anon all on drive_accounts" ON public.drive_accounts;
CREATE POLICY "Allow anon all on drive_accounts" ON public.drive_accounts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on drive_session_control" ON public.drive_session_control;
CREATE POLICY "Allow anon all on drive_session_control" ON public.drive_session_control
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Policies untuk files_cache dan drive_sync_state
DROP POLICY IF EXISTS "Allow anon all on files_cache" ON public.files_cache;
CREATE POLICY "Allow anon all on files_cache" ON public.files_cache
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on drive_sync_state" ON public.drive_sync_state;
CREATE POLICY "Allow anon all on drive_sync_state" ON public.drive_sync_state
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
