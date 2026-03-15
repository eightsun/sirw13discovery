-- =====================================================
-- MIGRATION: Sistem IPL - Tabel + Insert Data Rumah
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- 1. TABEL RUMAH
-- =====================================================
CREATE TABLE IF NOT EXISTS rumah (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jalan_id UUID NOT NULL REFERENCES jalan(id),
  nomor_rumah VARCHAR(20) NOT NULL,
  rt_id UUID NOT NULL REFERENCES rt(id),
  blok VARCHAR(10) NOT NULL, -- 'Timur' atau 'Barat'
  kode_rumah VARCHAR(50),
  kepala_keluarga_id UUID REFERENCES warga(id) ON DELETE SET NULL,
  is_occupied BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(jalan_id, nomor_rumah)
);

CREATE INDEX IF NOT EXISTS idx_rumah_jalan_id ON rumah(jalan_id);
CREATE INDEX IF NOT EXISTS idx_rumah_rt_id ON rumah(rt_id);
CREATE INDEX IF NOT EXISTS idx_rumah_blok ON rumah(blok);

DROP TRIGGER IF EXISTS update_rumah_updated_at ON rumah;
CREATE TRIGGER update_rumah_updated_at
  BEFORE UPDATE ON rumah
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TABEL TARIF IPL
-- =====================================================
CREATE TABLE IF NOT EXISTS tarif_ipl (
  id SERIAL PRIMARY KEY,
  blok VARCHAR(10) NOT NULL,
  periode_mulai DATE NOT NULL,
  periode_selesai DATE,
  tarif_berpenghuni INTEGER NOT NULL,
  tarif_tidak_berpenghuni INTEGER,
  keterangan TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_tarif_ipl_updated_at ON tarif_ipl;
CREATE TRIGGER update_tarif_ipl_updated_at
  BEFORE UPDATE ON tarif_ipl
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. TABEL TAGIHAN IPL (per rumah per bulan)
-- =====================================================
CREATE TABLE IF NOT EXISTS tagihan_ipl (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rumah_id UUID NOT NULL REFERENCES rumah(id) ON DELETE CASCADE,
  bulan DATE NOT NULL,
  jumlah_tagihan INTEGER NOT NULL,
  jumlah_terbayar INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'belum_lunas',
  is_occupied BOOLEAN DEFAULT TRUE,
  tanggal_lunas TIMESTAMPTZ,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rumah_id, bulan)
);

CREATE INDEX IF NOT EXISTS idx_tagihan_ipl_rumah_id ON tagihan_ipl(rumah_id);
CREATE INDEX IF NOT EXISTS idx_tagihan_ipl_bulan ON tagihan_ipl(bulan);
CREATE INDEX IF NOT EXISTS idx_tagihan_ipl_status ON tagihan_ipl(status);

DROP TRIGGER IF EXISTS update_tagihan_ipl_updated_at ON tagihan_ipl;
CREATE TRIGGER update_tagihan_ipl_updated_at
  BEFORE UPDATE ON tagihan_ipl
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TABEL PEMBAYARAN IPL
-- =====================================================
CREATE TABLE IF NOT EXISTS pembayaran_ipl (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rumah_id UUID NOT NULL REFERENCES rumah(id) ON DELETE CASCADE,
  jumlah_dibayar INTEGER NOT NULL,
  tanggal_bayar DATE NOT NULL,
  metode VARCHAR(20) DEFAULT 'tunai',
  bukti_url TEXT,
  bukti_file_id TEXT,
  dibayar_oleh UUID REFERENCES users(id),
  nama_pembayar VARCHAR(255),
  bulan_dibayar DATE[] NOT NULL,
  status VARCHAR(20) DEFAULT 'verified',
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  rejected_reason TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pembayaran_ipl_rumah_id ON pembayaran_ipl(rumah_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_ipl_status ON pembayaran_ipl(status);

DROP TRIGGER IF EXISTS update_pembayaran_ipl_updated_at ON pembayaran_ipl;
CREATE TRIGGER update_pembayaran_ipl_updated_at
  BEFORE UPDATE ON pembayaran_ipl
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE rumah ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarif_ipl ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagihan_ipl ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_ipl ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "rumah_select_all" ON rumah;
DROP POLICY IF EXISTS "rumah_insert_rw" ON rumah;
DROP POLICY IF EXISTS "rumah_update_rw" ON rumah;
DROP POLICY IF EXISTS "rumah_delete_rw" ON rumah;
DROP POLICY IF EXISTS "tarif_ipl_select_all" ON tarif_ipl;
DROP POLICY IF EXISTS "tarif_ipl_insert_rw" ON tarif_ipl;
DROP POLICY IF EXISTS "tarif_ipl_update_rw" ON tarif_ipl;
DROP POLICY IF EXISTS "tarif_ipl_delete_rw" ON tarif_ipl;
DROP POLICY IF EXISTS "tagihan_ipl_select_all" ON tagihan_ipl;
DROP POLICY IF EXISTS "tagihan_ipl_insert_rw" ON tagihan_ipl;
DROP POLICY IF EXISTS "tagihan_ipl_update_rw" ON tagihan_ipl;
DROP POLICY IF EXISTS "tagihan_ipl_delete_rw" ON tagihan_ipl;
DROP POLICY IF EXISTS "pembayaran_ipl_select_all" ON pembayaran_ipl;
DROP POLICY IF EXISTS "pembayaran_ipl_insert_rw" ON pembayaran_ipl;
DROP POLICY IF EXISTS "pembayaran_ipl_update_rw" ON pembayaran_ipl;
DROP POLICY IF EXISTS "pembayaran_ipl_delete_rw" ON pembayaran_ipl;

-- rumah
CREATE POLICY "rumah_select_all" ON rumah FOR SELECT USING (TRUE);
CREATE POLICY "rumah_insert_rw" ON rumah FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "rumah_update_rw" ON rumah FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "rumah_delete_rw" ON rumah FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);

-- tarif_ipl
CREATE POLICY "tarif_ipl_select_all" ON tarif_ipl FOR SELECT USING (TRUE);
CREATE POLICY "tarif_ipl_insert_rw" ON tarif_ipl FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "tarif_ipl_update_rw" ON tarif_ipl FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "tarif_ipl_delete_rw" ON tarif_ipl FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);

-- tagihan_ipl
CREATE POLICY "tagihan_ipl_select_all" ON tagihan_ipl FOR SELECT USING (TRUE);
CREATE POLICY "tagihan_ipl_insert_rw" ON tagihan_ipl FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "tagihan_ipl_update_rw" ON tagihan_ipl FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "tagihan_ipl_delete_rw" ON tagihan_ipl FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);

-- pembayaran_ipl
CREATE POLICY "pembayaran_ipl_select_all" ON pembayaran_ipl FOR SELECT USING (TRUE);
CREATE POLICY "pembayaran_ipl_insert_rw" ON pembayaran_ipl FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "pembayaran_ipl_update_rw" ON pembayaran_ipl FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);
CREATE POLICY "pembayaran_ipl_delete_rw" ON pembayaran_ipl FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw'))
);

-- =====================================================
-- 6. INSERT DATA RUMAH (~300 alamat)
-- =====================================================
DO $$
DECLARE
  jl_timur1 UUID; jl_timur2 UUID; jl_timur3 UUID; jl_timur4 UUID;
  jl_timur5 UUID; jl_timur6 UUID; jl_timur7 UUID;
  jl_barat1 UUID; jl_barat2 UUID; jl_barat3 UUID; jl_barat4 UUID;
  rt_001 UUID; rt_002 UUID; rt_003 UUID;
  rt_004 UUID; rt_005 UUID; rt_006 UUID;
BEGIN
  -- Get RT IDs
  SELECT id INTO rt_001 FROM rt WHERE nomor_rt = '001';
  SELECT id INTO rt_002 FROM rt WHERE nomor_rt = '002';
  SELECT id INTO rt_003 FROM rt WHERE nomor_rt = '003';
  SELECT id INTO rt_004 FROM rt WHERE nomor_rt = '004';
  SELECT id INTO rt_005 FROM rt WHERE nomor_rt = '005';
  SELECT id INTO rt_006 FROM rt WHERE nomor_rt = '006';

  -- Get Jalan IDs
  SELECT id INTO jl_timur1 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 1';
  SELECT id INTO jl_timur2 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 2';
  SELECT id INTO jl_timur3 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 3';
  SELECT id INTO jl_timur4 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 4';
  SELECT id INTO jl_timur5 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 5';
  SELECT id INTO jl_timur6 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 6';
  SELECT id INTO jl_timur7 FROM jalan WHERE nama_jalan = 'Jl. Discovery Timur 7';
  SELECT id INTO jl_barat1 FROM jalan WHERE nama_jalan = 'Jl. Discovery Barat 1';
  SELECT id INTO jl_barat2 FROM jalan WHERE nama_jalan = 'Jl. Discovery Barat 2';
  SELECT id INTO jl_barat3 FROM jalan WHERE nama_jalan = 'Jl. Discovery Barat 3';
  SELECT id INTO jl_barat4 FROM jalan WHERE nama_jalan = 'Jl. Discovery Barat 4';

  -- ======= Discovery Timur 1 (RT 001) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur1, '01', rt_001, 'Timur'), (jl_timur1, '02', rt_001, 'Timur'),
    (jl_timur1, '03', rt_001, 'Timur'), (jl_timur1, '04', rt_001, 'Timur'),
    (jl_timur1, '05', rt_001, 'Timur'), (jl_timur1, '06', rt_001, 'Timur'),
    (jl_timur1, '07', rt_001, 'Timur'), (jl_timur1, '08', rt_001, 'Timur'),
    (jl_timur1, '09', rt_001, 'Timur'), (jl_timur1, '10', rt_001, 'Timur'),
    (jl_timur1, '11', rt_001, 'Timur'), (jl_timur1, '12', rt_001, 'Timur'),
    (jl_timur1, '13', rt_001, 'Timur'), (jl_timur1, '14', rt_001, 'Timur'),
    (jl_timur1, '15', rt_001, 'Timur'), (jl_timur1, '16', rt_001, 'Timur'),
    (jl_timur1, '17', rt_001, 'Timur'), (jl_timur1, '18', rt_001, 'Timur'),
    (jl_timur1, '19', rt_001, 'Timur'), (jl_timur1, '20', rt_001, 'Timur'),
    (jl_timur1, '21', rt_001, 'Timur'), (jl_timur1, '22', rt_001, 'Timur'),
    (jl_timur1, '23', rt_001, 'Timur'), (jl_timur1, '25', rt_001, 'Timur'),
    (jl_timur1, '27', rt_001, 'Timur'), (jl_timur1, '29', rt_001, 'Timur'),
    (jl_timur1, '31', rt_001, 'Timur'), (jl_timur1, '33', rt_001, 'Timur'),
    (jl_timur1, '35', rt_001, 'Timur'), (jl_timur1, '37', rt_001, 'Timur'),
    (jl_timur1, '39', rt_001, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 2 (RT 001) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur2, '02', rt_001, 'Timur'), (jl_timur2, '04', rt_001, 'Timur'),
    (jl_timur2, '06', rt_001, 'Timur'), (jl_timur2, '08', rt_001, 'Timur'),
    (jl_timur2, '10', rt_001, 'Timur'), (jl_timur2, '12', rt_001, 'Timur'),
    (jl_timur2, '14', rt_001, 'Timur'), (jl_timur2, '16', rt_001, 'Timur'),
    (jl_timur2, '18', rt_001, 'Timur'), (jl_timur2, '20', rt_001, 'Timur'),
    (jl_timur2, '22', rt_001, 'Timur'), (jl_timur2, '24', rt_001, 'Timur'),
    (jl_timur2, '26', rt_001, 'Timur'), (jl_timur2, '28', rt_001, 'Timur'),
    (jl_timur2, '30', rt_001, 'Timur'), (jl_timur2, '32', rt_001, 'Timur'),
    (jl_timur2, '34', rt_001, 'Timur'), (jl_timur2, '36', rt_001, 'Timur'),
    (jl_timur2, '38', rt_001, 'Timur'), (jl_timur2, '40', rt_001, 'Timur'),
    (jl_timur2, '42', rt_001, 'Timur'), (jl_timur2, '44', rt_001, 'Timur'),
    (jl_timur2, '46', rt_001, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 3 (RT 001) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur3, '01', rt_001, 'Timur'), (jl_timur3, '03', rt_001, 'Timur'),
    (jl_timur3, '05', rt_001, 'Timur'), (jl_timur3, '07', rt_001, 'Timur'),
    (jl_timur3, '09', rt_001, 'Timur'), (jl_timur3, '11', rt_001, 'Timur'),
    (jl_timur3, '13', rt_001, 'Timur'), (jl_timur3, '15', rt_001, 'Timur'),
    (jl_timur3, '17', rt_001, 'Timur'), (jl_timur3, '19', rt_001, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 4 (RT 002) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur4, '01', rt_002, 'Timur'), (jl_timur4, '02', rt_002, 'Timur'),
    (jl_timur4, '03', rt_002, 'Timur'), (jl_timur4, '04', rt_002, 'Timur'),
    (jl_timur4, '05', rt_002, 'Timur'), (jl_timur4, '06', rt_002, 'Timur'),
    (jl_timur4, '07', rt_002, 'Timur'), (jl_timur4, '08', rt_002, 'Timur'),
    (jl_timur4, '09', rt_002, 'Timur'), (jl_timur4, '10', rt_002, 'Timur'),
    (jl_timur4, '11', rt_002, 'Timur'), (jl_timur4, '12', rt_002, 'Timur'),
    (jl_timur4, '13', rt_002, 'Timur'), (jl_timur4, '14', rt_002, 'Timur'),
    (jl_timur4, '15', rt_002, 'Timur'), (jl_timur4, '16', rt_002, 'Timur'),
    (jl_timur4, '17', rt_002, 'Timur'), (jl_timur4, '18', rt_002, 'Timur'),
    (jl_timur4, '19', rt_002, 'Timur'), (jl_timur4, '20', rt_002, 'Timur'),
    (jl_timur4, '21', rt_002, 'Timur'), (jl_timur4, '22', rt_002, 'Timur'),
    (jl_timur4, '24', rt_002, 'Timur'), (jl_timur4, '26', rt_002, 'Timur'),
    (jl_timur4, '28', rt_002, 'Timur'), (jl_timur4, '30', rt_002, 'Timur'),
    (jl_timur4, '32', rt_002, 'Timur'), (jl_timur4, '34', rt_002, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 5 (RT 002) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur5, '01', rt_002, 'Timur'), (jl_timur5, '02', rt_002, 'Timur'),
    (jl_timur5, '03', rt_002, 'Timur'), (jl_timur5, '04', rt_002, 'Timur'),
    (jl_timur5, '05', rt_002, 'Timur'), (jl_timur5, '06', rt_002, 'Timur'),
    (jl_timur5, '07', rt_002, 'Timur'), (jl_timur5, '08', rt_002, 'Timur'),
    (jl_timur5, '09', rt_002, 'Timur'), (jl_timur5, '10', rt_002, 'Timur'),
    (jl_timur5, '11', rt_002, 'Timur'), (jl_timur5, '12', rt_002, 'Timur'),
    (jl_timur5, '13', rt_002, 'Timur'), (jl_timur5, '14', rt_002, 'Timur'),
    (jl_timur5, '15', rt_002, 'Timur'), (jl_timur5, '16', rt_002, 'Timur'),
    (jl_timur5, '17', rt_002, 'Timur'), (jl_timur5, '18', rt_002, 'Timur'),
    (jl_timur5, '19', rt_002, 'Timur'), (jl_timur5, '20', rt_002, 'Timur'),
    (jl_timur5, '21', rt_002, 'Timur'), (jl_timur5, '22', rt_002, 'Timur'),
    (jl_timur5, '23', rt_002, 'Timur'), (jl_timur5, '24', rt_002, 'Timur'),
    (jl_timur5, '25', rt_002, 'Timur'), (jl_timur5, '26', rt_002, 'Timur'),
    (jl_timur5, '27', rt_002, 'Timur'), (jl_timur5, '28', rt_002, 'Timur'),
    (jl_timur5, '29', rt_002, 'Timur'), (jl_timur5, '30', rt_002, 'Timur'),
    (jl_timur5, '31', rt_002, 'Timur'), (jl_timur5, '32', rt_002, 'Timur'),
    (jl_timur5, '33', rt_002, 'Timur'), (jl_timur5, '34', rt_002, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 6 (RT 003) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur6, '01', rt_003, 'Timur'), (jl_timur6, '02', rt_003, 'Timur'),
    (jl_timur6, '03', rt_003, 'Timur'), (jl_timur6, '04', rt_003, 'Timur'),
    (jl_timur6, '05', rt_003, 'Timur'), (jl_timur6, '06', rt_003, 'Timur'),
    (jl_timur6, '07', rt_003, 'Timur'), (jl_timur6, '08', rt_003, 'Timur'),
    (jl_timur6, '09', rt_003, 'Timur'), (jl_timur6, '10', rt_003, 'Timur'),
    (jl_timur6, '11', rt_003, 'Timur'), (jl_timur6, '12', rt_003, 'Timur'),
    (jl_timur6, '13', rt_003, 'Timur'), (jl_timur6, '14', rt_003, 'Timur'),
    (jl_timur6, '15', rt_003, 'Timur'), (jl_timur6, '16', rt_003, 'Timur'),
    (jl_timur6, '17', rt_003, 'Timur'), (jl_timur6, '18', rt_003, 'Timur'),
    (jl_timur6, '19', rt_003, 'Timur'), (jl_timur6, '20', rt_003, 'Timur'),
    (jl_timur6, '21', rt_003, 'Timur'), (jl_timur6, '22', rt_003, 'Timur'),
    (jl_timur6, '23', rt_003, 'Timur'), (jl_timur6, '24', rt_003, 'Timur'),
    (jl_timur6, '25', rt_003, 'Timur'), (jl_timur6, '26', rt_003, 'Timur'),
    (jl_timur6, '27', rt_003, 'Timur'), (jl_timur6, '28', rt_003, 'Timur'),
    (jl_timur6, '29', rt_003, 'Timur'), (jl_timur6, '30', rt_003, 'Timur'),
    (jl_timur6, '31', rt_003, 'Timur'), (jl_timur6, '32', rt_003, 'Timur'),
    (jl_timur6, '33', rt_003, 'Timur'), (jl_timur6, '34', rt_003, 'Timur'),
    (jl_timur6, '35', rt_003, 'Timur'), (jl_timur6, '36', rt_003, 'Timur'),
    (jl_timur6, '37', rt_003, 'Timur'), (jl_timur6, '38', rt_003, 'Timur'),
    (jl_timur6, '39', rt_003, 'Timur'), (jl_timur6, '40', rt_003, 'Timur'),
    (jl_timur6, '41', rt_003, 'Timur'), (jl_timur6, '42', rt_003, 'Timur'),
    (jl_timur6, '44', rt_003, 'Timur'), (jl_timur6, '46', rt_003, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Timur 7 (RT 003) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_timur7, '01', rt_003, 'Timur'), (jl_timur7, '02', rt_003, 'Timur'),
    (jl_timur7, '03', rt_003, 'Timur'), (jl_timur7, '04', rt_003, 'Timur'),
    (jl_timur7, '05', rt_003, 'Timur'), (jl_timur7, '06', rt_003, 'Timur'),
    (jl_timur7, '07', rt_003, 'Timur'), (jl_timur7, '08', rt_003, 'Timur'),
    (jl_timur7, '09', rt_003, 'Timur'), (jl_timur7, '10', rt_003, 'Timur'),
    (jl_timur7, '11', rt_003, 'Timur'), (jl_timur7, '12', rt_003, 'Timur'),
    (jl_timur7, '13', rt_003, 'Timur'), (jl_timur7, '14', rt_003, 'Timur'),
    (jl_timur7, '15', rt_003, 'Timur'), (jl_timur7, '16', rt_003, 'Timur'),
    (jl_timur7, '17', rt_003, 'Timur'), (jl_timur7, '18', rt_003, 'Timur'),
    (jl_timur7, '19', rt_003, 'Timur'), (jl_timur7, '20', rt_003, 'Timur'),
    (jl_timur7, '21', rt_003, 'Timur'), (jl_timur7, '23', rt_003, 'Timur'),
    (jl_timur7, '25', rt_003, 'Timur'), (jl_timur7, '27', rt_003, 'Timur'),
    (jl_timur7, '29', rt_003, 'Timur'), (jl_timur7, '31', rt_003, 'Timur'),
    (jl_timur7, '33', rt_003, 'Timur'), (jl_timur7, '35', rt_003, 'Timur'),
    (jl_timur7, '37', rt_003, 'Timur'), (jl_timur7, '39', rt_003, 'Timur'),
    (jl_timur7, '41', rt_003, 'Timur')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Barat 1 (RT 005) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_barat1, '01', rt_005, 'Barat'), (jl_barat1, '02', rt_005, 'Barat'),
    (jl_barat1, '03', rt_005, 'Barat'), (jl_barat1, '04', rt_005, 'Barat'),
    (jl_barat1, '05', rt_005, 'Barat'), (jl_barat1, '06', rt_005, 'Barat'),
    (jl_barat1, '07', rt_005, 'Barat'), (jl_barat1, '08', rt_005, 'Barat'),
    (jl_barat1, '09', rt_005, 'Barat'), (jl_barat1, '10', rt_005, 'Barat'),
    (jl_barat1, '11', rt_005, 'Barat'), (jl_barat1, '12', rt_005, 'Barat'),
    (jl_barat1, '13', rt_005, 'Barat'), (jl_barat1, '14', rt_005, 'Barat'),
    (jl_barat1, '15', rt_005, 'Barat'), (jl_barat1, '16', rt_005, 'Barat'),
    (jl_barat1, '17', rt_005, 'Barat'), (jl_barat1, '19', rt_005, 'Barat'),
    (jl_barat1, '21', rt_005, 'Barat'), (jl_barat1, '23', rt_005, 'Barat'),
    (jl_barat1, '25', rt_005, 'Barat')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Barat 2 (RT 004) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_barat2, '01', rt_004, 'Barat'), (jl_barat2, '02', rt_004, 'Barat'),
    (jl_barat2, '03', rt_004, 'Barat'), (jl_barat2, '04', rt_004, 'Barat'),
    (jl_barat2, '05', rt_004, 'Barat'), (jl_barat2, '06', rt_004, 'Barat'),
    (jl_barat2, '07', rt_004, 'Barat'), (jl_barat2, '08', rt_004, 'Barat'),
    (jl_barat2, '09', rt_004, 'Barat'), (jl_barat2, '10', rt_004, 'Barat'),
    (jl_barat2, '11', rt_004, 'Barat'), (jl_barat2, '12', rt_004, 'Barat'),
    (jl_barat2, '13', rt_004, 'Barat'), (jl_barat2, '14', rt_004, 'Barat'),
    (jl_barat2, '15', rt_004, 'Barat'), (jl_barat2, '16', rt_004, 'Barat'),
    (jl_barat2, '17', rt_004, 'Barat'), (jl_barat2, '18', rt_004, 'Barat'),
    (jl_barat2, '19', rt_004, 'Barat'), (jl_barat2, '20', rt_004, 'Barat'),
    (jl_barat2, '21', rt_004, 'Barat'), (jl_barat2, '22', rt_004, 'Barat'),
    (jl_barat2, '23', rt_004, 'Barat'), (jl_barat2, '24', rt_004, 'Barat'),
    (jl_barat2, '25', rt_004, 'Barat'), (jl_barat2, '26', rt_004, 'Barat'),
    (jl_barat2, '28', rt_004, 'Barat'), (jl_barat2, '30', rt_004, 'Barat'),
    (jl_barat2, '32', rt_004, 'Barat'), (jl_barat2, '34', rt_004, 'Barat'),
    (jl_barat2, '36', rt_004, 'Barat'), (jl_barat2, '38', rt_004, 'Barat'),
    (jl_barat2, '40', rt_004, 'Barat'), (jl_barat2, '42', rt_004, 'Barat'),
    (jl_barat2, '44', rt_004, 'Barat'), (jl_barat2, '46', rt_004, 'Barat'),
    (jl_barat2, '48', rt_004, 'Barat'), (jl_barat2, '50', rt_004, 'Barat')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Barat 3 (RT 005) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_barat3, '01', rt_005, 'Barat'), (jl_barat3, '02', rt_005, 'Barat'),
    (jl_barat3, '03', rt_005, 'Barat'), (jl_barat3, '04', rt_005, 'Barat'),
    (jl_barat3, '05', rt_005, 'Barat'), (jl_barat3, '06', rt_005, 'Barat'),
    (jl_barat3, '07', rt_005, 'Barat'), (jl_barat3, '08', rt_005, 'Barat'),
    (jl_barat3, '09', rt_005, 'Barat'), (jl_barat3, '10', rt_005, 'Barat'),
    (jl_barat3, '11', rt_005, 'Barat'), (jl_barat3, '12', rt_005, 'Barat'),
    (jl_barat3, '13', rt_005, 'Barat'), (jl_barat3, '14', rt_005, 'Barat'),
    (jl_barat3, '15', rt_005, 'Barat'), (jl_barat3, '16', rt_005, 'Barat'),
    (jl_barat3, '17', rt_005, 'Barat'), (jl_barat3, '18', rt_005, 'Barat'),
    (jl_barat3, '19', rt_005, 'Barat'), (jl_barat3, '20', rt_005, 'Barat'),
    (jl_barat3, '21', rt_005, 'Barat'), (jl_barat3, '22', rt_005, 'Barat'),
    (jl_barat3, '23', rt_005, 'Barat'), (jl_barat3, '24', rt_005, 'Barat'),
    (jl_barat3, '25', rt_005, 'Barat'), (jl_barat3, '26', rt_005, 'Barat')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- ======= Discovery Barat 4 (RT 006) =======
  INSERT INTO rumah (jalan_id, nomor_rumah, rt_id, blok) VALUES
    (jl_barat4, '01', rt_006, 'Barat'), (jl_barat4, '02', rt_006, 'Barat'),
    (jl_barat4, '03', rt_006, 'Barat'), (jl_barat4, '04', rt_006, 'Barat'),
    (jl_barat4, '05', rt_006, 'Barat'), (jl_barat4, '06', rt_006, 'Barat'),
    (jl_barat4, '07', rt_006, 'Barat'), (jl_barat4, '08', rt_006, 'Barat'),
    (jl_barat4, '09', rt_006, 'Barat'), (jl_barat4, '10', rt_006, 'Barat'),
    (jl_barat4, '11', rt_006, 'Barat'), (jl_barat4, '12', rt_006, 'Barat'),
    (jl_barat4, '13', rt_006, 'Barat'), (jl_barat4, '14', rt_006, 'Barat'),
    (jl_barat4, '15', rt_006, 'Barat'), (jl_barat4, '16', rt_006, 'Barat'),
    (jl_barat4, '17', rt_006, 'Barat'), (jl_barat4, '18', rt_006, 'Barat'),
    (jl_barat4, '19', rt_006, 'Barat'), (jl_barat4, '20', rt_006, 'Barat'),
    (jl_barat4, '21', rt_006, 'Barat'), (jl_barat4, '22', rt_006, 'Barat'),
    (jl_barat4, '23', rt_006, 'Barat'), (jl_barat4, '24', rt_006, 'Barat'),
    (jl_barat4, '25', rt_006, 'Barat'), (jl_barat4, '26', rt_006, 'Barat'),
    (jl_barat4, '27', rt_006, 'Barat'), (jl_barat4, '29', rt_006, 'Barat'),
    (jl_barat4, '31', rt_006, 'Barat'), (jl_barat4, '33', rt_006, 'Barat'),
    (jl_barat4, '35', rt_006, 'Barat'), (jl_barat4, '37', rt_006, 'Barat'),
    (jl_barat4, '39', rt_006, 'Barat'), (jl_barat4, '41', rt_006, 'Barat'),
    (jl_barat4, '43', rt_006, 'Barat'), (jl_barat4, '45', rt_006, 'Barat'),
    (jl_barat4, '47', rt_006, 'Barat'), (jl_barat4, '49', rt_006, 'Barat'),
    (jl_barat4, '51', rt_006, 'Barat'), (jl_barat4, '53', rt_006, 'Barat'),
    (jl_barat4, '55', rt_006, 'Barat'), (jl_barat4, '57', rt_006, 'Barat'),
    (jl_barat4, '59', rt_006, 'Barat'), (jl_barat4, '61', rt_006, 'Barat'),
    (jl_barat4, '63', rt_006, 'Barat'), (jl_barat4, '65', rt_006, 'Barat'),
    (jl_barat4, '67', rt_006, 'Barat')
  ON CONFLICT (jalan_id, nomor_rumah) DO NOTHING;

  -- Grant permissions
  GRANT ALL ON rumah TO authenticated;
  GRANT ALL ON tarif_ipl TO authenticated;
  GRANT ALL ON tagihan_ipl TO authenticated;
  GRANT ALL ON pembayaran_ipl TO authenticated;
  GRANT ALL ON SEQUENCE tarif_ipl_id_seq TO authenticated;

END $$;
