-- =====================================================
-- SIRW13 - Database Schema
-- Sistem Informasi RW 13 Permata Discovery
-- Disesuaikan dengan Formulir Pendataan Warga
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Role user
CREATE TYPE user_role AS ENUM (
  'ketua_rw',
  'wakil_ketua_rw', 
  'sekretaris_rw',
  'bendahara_rw',
  'ketua_rt',
  'sekretaris_rt',
  'bendahara_rt',
  'warga'
);

-- Jenis kelamin
CREATE TYPE jenis_kelamin AS ENUM ('L', 'P');

-- Status pernikahan
CREATE TYPE status_pernikahan AS ENUM ('belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati');

-- Agama
CREATE TYPE agama AS ENUM ('islam', 'kristen', 'katolik', 'hindu', 'budha', 'konghucu', 'lainnya');

-- Pendidikan terakhir
CREATE TYPE pendidikan_terakhir AS ENUM (
  'tidak_sekolah',
  'sd',
  'smp',
  'sma',
  'diploma_1',
  'diploma_2',
  'diploma_3',
  'diploma_4',
  'sarjana_s1',
  'magister_s2',
  'doktor_s3'
);

-- B. Status kependudukan
CREATE TYPE status_kependudukan AS ENUM (
  'penduduk_tetap',
  'penduduk_kontrak',
  'menumpang',
  'pemilik_tidak_tinggal'
);

-- Status rumah
CREATE TYPE status_rumah AS ENUM (
  'milik_sendiri',
  'sewa',
  'kontrak',
  'menumpang',
  'dinas'
);

-- E. Status dokumen
CREATE TYPE status_ktp AS ENUM (
  'ada_aktif',
  'ada_alamat_beda',
  'proses_pindah',
  'tidak_ada'
);

CREATE TYPE status_kk AS ENUM (
  'sesuai_domisili',
  'alamat_beda',
  'proses_perubahan'
);

CREATE TYPE status_surat_domisili AS ENUM ('sudah_ada', 'belum_ada');

CREATE TYPE status_pindah AS ENUM (
  'tidak_pindah',
  'pindah_antar_rt',
  'pindah_antar_rw',
  'pindah_antar_kota',
  'pendatang_baru'
);

-- Hubungan keluarga
CREATE TYPE hubungan_keluarga AS ENUM (
  'kepala_keluarga', 'istri', 'suami', 'anak', 'orang_tua', 
  'mertua', 'menantu', 'cucu', 'kerabat', 'lainnya'
);

-- Jenis kendaraan
CREATE TYPE jenis_kendaraan AS ENUM ('motor', 'mobil');

-- =====================================================
-- TABLE: rt (Rukun Tetangga)
-- =====================================================
CREATE TABLE IF NOT EXISTS rt (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_rt VARCHAR(3) NOT NULL UNIQUE,
  nama_ketua VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: jalan
-- =====================================================
CREATE TABLE IF NOT EXISTS jalan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_jalan VARCHAR(255) NOT NULL,
  rt_id UUID REFERENCES rt(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: warga (UPDATED - Sesuai Formulir)
-- =====================================================
CREATE TABLE IF NOT EXISTS warga (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- A. DATA IDENTITAS PRIBADI
  nama_lengkap VARCHAR(255) NOT NULL,
  nik VARCHAR(16) UNIQUE,
  no_kk VARCHAR(16),
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin jenis_kelamin NOT NULL DEFAULT 'L',
  agama agama NOT NULL DEFAULT 'islam',
  status_pernikahan status_pernikahan DEFAULT 'belum_kawin',
  pendidikan_terakhir pendidikan_terakhir,
  pekerjaan VARCHAR(100),
  nama_institusi VARCHAR(255),
  no_hp VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  
  -- B. STATUS KEPENDUDUKAN
  status_kependudukan status_kependudukan NOT NULL DEFAULT 'penduduk_tetap',
  lama_tinggal_tahun INTEGER DEFAULT 0,
  lama_tinggal_bulan INTEGER DEFAULT 0,
  status_rumah status_rumah NOT NULL DEFAULT 'milik_sendiri',
  
  -- C. ALAMAT DOMISILI
  jalan_id UUID REFERENCES jalan(id) ON DELETE SET NULL,
  nomor_rumah VARCHAR(20) NOT NULL,
  rt_id UUID NOT NULL REFERENCES rt(id) ON DELETE RESTRICT,
  perumahan VARCHAR(100) DEFAULT 'Permata Discovery',
  kelurahan VARCHAR(100) DEFAULT 'Banjarsari',
  kecamatan VARCHAR(100) DEFAULT 'Ngamprah',
  kota_kabupaten VARCHAR(100) DEFAULT 'Kabupaten Bandung Barat',
  kode_pos VARCHAR(10) DEFAULT '40552',
  
  -- D. ALAMAT KTP
  alamat_ktp_sama BOOLEAN DEFAULT TRUE,
  alamat_ktp TEXT,
  rt_ktp VARCHAR(3),
  rw_ktp VARCHAR(3),
  kelurahan_ktp VARCHAR(100),
  kecamatan_ktp VARCHAR(100),
  kota_kabupaten_ktp VARCHAR(100),
  kode_pos_ktp VARCHAR(10),
  
  -- E. STATUS DOKUMEN
  status_ktp status_ktp DEFAULT 'ada_aktif',
  status_kk status_kk DEFAULT 'sesuai_domisili',
  status_surat_domisili status_surat_domisili DEFAULT 'belum_ada',
  status_pindah status_pindah DEFAULT 'tidak_pindah',
  
  -- F. DATA KELUARGA
  kepala_keluarga_id UUID REFERENCES warga(id) ON DELETE SET NULL,
  hubungan_keluarga hubungan_keluarga NOT NULL DEFAULT 'kepala_keluarga',
  
  -- G. DATA DARURAT
  nama_kontak_darurat VARCHAR(255),
  hubungan_kontak_darurat VARCHAR(100),
  no_hp_darurat VARCHAR(20),
  
  -- H. DATA TAMBAHAN
  minat_olahraga TEXT[], -- Array of olahraga
  
  -- Metadata
  foto_url TEXT,
  catatan TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: kendaraan (H. DATA TAMBAHAN - Kendaraan)
-- =====================================================
CREATE TABLE IF NOT EXISTS kendaraan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warga_id UUID NOT NULL REFERENCES warga(id) ON DELETE CASCADE,
  jenis_kendaraan jenis_kendaraan NOT NULL,
  nomor_polisi VARCHAR(20) NOT NULL,
  merek VARCHAR(100) NOT NULL,
  tipe VARCHAR(100),
  tahun_pembuatan INTEGER,
  warna VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: usaha (H. DATA TAMBAHAN - Kepemilikan Usaha)
-- =====================================================
CREATE TABLE IF NOT EXISTS usaha (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warga_id UUID NOT NULL REFERENCES warga(id) ON DELETE CASCADE,
  nama_usaha VARCHAR(255) NOT NULL,
  deskripsi_usaha TEXT,
  alamat_usaha TEXT,
  no_whatsapp_usaha VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: users (User Profile, linked to Supabase Auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  nama_lengkap VARCHAR(255),
  role user_role NOT NULL DEFAULT 'warga',
  warga_id UUID REFERENCES warga(id) ON DELETE SET NULL,
  rt_id UUID REFERENCES rt(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_warga_rt_id ON warga(rt_id);
CREATE INDEX IF NOT EXISTS idx_warga_nik ON warga(nik);
CREATE INDEX IF NOT EXISTS idx_warga_nama ON warga(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_warga_no_kk ON warga(no_kk);
CREATE INDEX IF NOT EXISTS idx_warga_kepala_keluarga ON warga(kepala_keluarga_id);
CREATE INDEX IF NOT EXISTS idx_warga_is_active ON warga(is_active);
CREATE INDEX IF NOT EXISTS idx_warga_status_kependudukan ON warga(status_kependudukan);
CREATE INDEX IF NOT EXISTS idx_jalan_rt_id ON jalan(rt_id);
CREATE INDEX IF NOT EXISTS idx_kendaraan_warga_id ON kendaraan(warga_id);
CREATE INDEX IF NOT EXISTS idx_kendaraan_nopol ON kendaraan(nomor_polisi);
CREATE INDEX IF NOT EXISTS idx_usaha_warga_id ON usaha(warga_id);
CREATE INDEX IF NOT EXISTS idx_users_warga_id ON users(warga_id);
CREATE INDEX IF NOT EXISTS idx_users_rt_id ON users(rt_id);

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rt_updated_at
  BEFORE UPDATE ON rt
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jalan_updated_at
  BEFORE UPDATE ON jalan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warga_updated_at
  BEFORE UPDATE ON warga
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kendaraan_updated_at
  BEFORE UPDATE ON kendaraan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usaha_updated_at
  BEFORE UPDATE ON usaha
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE rt ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalan ENABLE ROW LEVEL SECURITY;
ALTER TABLE warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan ENABLE ROW LEVEL SECURITY;
ALTER TABLE usaha ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: rt
-- =====================================================
CREATE POLICY "rt_select_all" ON rt
  FOR SELECT USING (TRUE);

CREATE POLICY "rt_insert_rw" ON rt
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

CREATE POLICY "rt_update_rw" ON rt
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

-- =====================================================
-- RLS POLICIES: jalan
-- =====================================================
CREATE POLICY "jalan_select_all" ON jalan
  FOR SELECT USING (TRUE);

CREATE POLICY "jalan_insert_rw" ON jalan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

CREATE POLICY "jalan_update_rw" ON jalan
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

-- =====================================================
-- RLS POLICIES: warga
-- =====================================================

-- SELECT: Berdasarkan role
CREATE POLICY "warga_select_policy" ON warga
  FOR SELECT USING (
    -- RW bisa lihat semua
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw')
    )
    OR
    -- RT hanya lihat warga di RT-nya
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rt', 'sekretaris_rt', 'bendahara_rt')
      AND users.rt_id = warga.rt_id
    )
    OR
    -- Warga hanya lihat data sendiri
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.warga_id = warga.id
    )
  );

-- INSERT: Hanya pengurus
CREATE POLICY "warga_insert_policy" ON warga
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN (
        'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw',
        'ketua_rt', 'sekretaris_rt'
      )
    )
  );

-- UPDATE: Pengurus atau warga sendiri
CREATE POLICY "warga_update_policy" ON warga
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN (
        'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw',
        'ketua_rt', 'sekretaris_rt'
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.warga_id = warga.id
    )
  );

-- DELETE: Hanya RW
CREATE POLICY "warga_delete_policy" ON warga
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

-- =====================================================
-- RLS POLICIES: kendaraan
-- =====================================================
CREATE POLICY "kendaraan_select_policy" ON kendaraan
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN warga w ON u.rt_id = w.rt_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('ketua_rt', 'sekretaris_rt', 'bendahara_rt')
      AND w.id = kendaraan.warga_id
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.warga_id = kendaraan.warga_id
    )
  );

CREATE POLICY "kendaraan_insert_policy" ON kendaraan
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'ketua_rt', 'sekretaris_rt')
        OR users.warga_id = kendaraan.warga_id
      )
    )
  );

CREATE POLICY "kendaraan_update_policy" ON kendaraan
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'ketua_rt', 'sekretaris_rt')
        OR users.warga_id = kendaraan.warga_id
      )
    )
  );

CREATE POLICY "kendaraan_delete_policy" ON kendaraan
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
        OR users.warga_id = kendaraan.warga_id
      )
    )
  );

-- =====================================================
-- RLS POLICIES: usaha
-- =====================================================
CREATE POLICY "usaha_select_policy" ON usaha
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN warga w ON u.rt_id = w.rt_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('ketua_rt', 'sekretaris_rt', 'bendahara_rt')
      AND w.id = usaha.warga_id
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.warga_id = usaha.warga_id
    )
  );

CREATE POLICY "usaha_insert_policy" ON usaha
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'ketua_rt', 'sekretaris_rt')
        OR users.warga_id = usaha.warga_id
      )
    )
  );

CREATE POLICY "usaha_update_policy" ON usaha
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'ketua_rt', 'sekretaris_rt')
        OR users.warga_id = usaha.warga_id
      )
    )
  );

CREATE POLICY "usaha_delete_policy" ON usaha
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (
        users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
        OR users.warga_id = usaha.warga_id
      )
    )
  );

-- =====================================================
-- RLS POLICIES: users
-- =====================================================
CREATE POLICY "users_select_all" ON users
  FOR SELECT USING (TRUE);

CREATE POLICY "users_insert_self" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw')
    )
  );

-- =====================================================
-- DATA MASTER: RT
-- =====================================================
INSERT INTO rt (nomor_rt) VALUES 
  ('001'),
  ('002'),
  ('003'),
  ('004'),
  ('005'),
  ('006')
ON CONFLICT (nomor_rt) DO NOTHING;

-- =====================================================
-- DATA MASTER: Jalan
-- =====================================================
DO $$
DECLARE
  rt_001 UUID;
  rt_002 UUID;
  rt_003 UUID;
  rt_004 UUID;
  rt_005 UUID;
  rt_006 UUID;
BEGIN
  SELECT id INTO rt_001 FROM rt WHERE nomor_rt = '001';
  SELECT id INTO rt_002 FROM rt WHERE nomor_rt = '002';
  SELECT id INTO rt_003 FROM rt WHERE nomor_rt = '003';
  SELECT id INTO rt_004 FROM rt WHERE nomor_rt = '004';
  SELECT id INTO rt_005 FROM rt WHERE nomor_rt = '005';
  SELECT id INTO rt_006 FROM rt WHERE nomor_rt = '006';

  -- Insert Jalan Discovery Timur
  INSERT INTO jalan (nama_jalan, rt_id) VALUES 
    ('Jl. Discovery Timur 1', rt_001),
    ('Jl. Discovery Timur 2', rt_001),
    ('Jl. Discovery Timur 3', rt_002),
    ('Jl. Discovery Timur 4', rt_002),
    ('Jl. Discovery Timur 5', rt_003),
    ('Jl. Discovery Timur 6', rt_003),
    ('Jl. Discovery Timur 7', rt_003)
  ON CONFLICT DO NOTHING;

  -- Insert Jalan Discovery Barat
  INSERT INTO jalan (nama_jalan, rt_id) VALUES 
    ('Jl. Discovery Barat 1', rt_004),
    ('Jl. Discovery Barat 2', rt_005),
    ('Jl. Discovery Barat 3', rt_005),
    ('Jl. Discovery Barat 4', rt_006)
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- FUNCTION: Handle new user registration
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nama_lengkap, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    'warga'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk auto-create user profile saat registrasi
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
