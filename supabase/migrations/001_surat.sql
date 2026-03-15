-- =====================================================
-- MIGRATION: Fitur Arsip Surat (Surat Masuk & Keluar)
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Enum tipe surat
CREATE TYPE tipe_surat AS ENUM ('keluar', 'masuk');

-- 2. Tabel surat
CREATE TABLE IF NOT EXISTS surat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipe tipe_surat NOT NULL,
  nomor_surat VARCHAR(100) NOT NULL,
  perihal VARCHAR(500) NOT NULL,
  isi_surat TEXT,
  tanggal_rilis DATE NOT NULL,
  lampiran_url TEXT,
  lampiran_filename VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel surat_baca (read tracker)
CREATE TABLE IF NOT EXISTS surat_baca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  surat_id UUID NOT NULL REFERENCES surat(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(surat_id, user_id)
);

-- 4. Indexes
CREATE INDEX idx_surat_tipe ON surat(tipe);
CREATE INDEX idx_surat_tanggal_rilis ON surat(tanggal_rilis DESC);
CREATE INDEX idx_surat_created_by ON surat(created_by);
CREATE INDEX idx_surat_baca_surat_id ON surat_baca(surat_id);
CREATE INDEX idx_surat_baca_user_id ON surat_baca(user_id);

-- 5. Trigger auto-update updated_at
CREATE TRIGGER update_surat_updated_at
  BEFORE UPDATE ON surat
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS: surat
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;

-- Semua user bisa melihat surat
CREATE POLICY "surat_select_all" ON surat
  FOR SELECT USING (TRUE);

-- Hanya Pengurus RW bisa insert
CREATE POLICY "surat_insert_pengurus_rw" ON surat
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- Hanya Pengurus RW bisa update
CREATE POLICY "surat_update_pengurus_rw" ON surat
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- Hanya Pengurus RW bisa delete
CREATE POLICY "surat_delete_pengurus_rw" ON surat
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- 7. RLS: surat_baca
ALTER TABLE surat_baca ENABLE ROW LEVEL SECURITY;

-- Pengurus RW bisa lihat semua, user biasa hanya lihat milik sendiri
CREATE POLICY "surat_baca_select" ON surat_baca
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- User hanya bisa insert record baca milik sendiri
CREATE POLICY "surat_baca_insert_self" ON surat_baca
  FOR INSERT WITH CHECK (user_id = auth.uid());
