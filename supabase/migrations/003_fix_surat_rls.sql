-- =====================================================
-- FIX: RLS Policies untuk tabel surat dan surat_baca
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Drop existing policies (agar tidak conflict)
DROP POLICY IF EXISTS "surat_select_all" ON surat;
DROP POLICY IF EXISTS "surat_insert_pengurus_rw" ON surat;
DROP POLICY IF EXISTS "surat_update_pengurus_rw" ON surat;
DROP POLICY IF EXISTS "surat_delete_pengurus_rw" ON surat;
DROP POLICY IF EXISTS "surat_baca_select" ON surat_baca;
DROP POLICY IF EXISTS "surat_baca_insert_self" ON surat_baca;

-- 2. Pastikan RLS aktif
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_baca ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: surat

-- Semua authenticated user bisa melihat surat
CREATE POLICY "surat_select_all" ON surat
  FOR SELECT USING (TRUE);

-- Pengurus RW bisa insert
CREATE POLICY "surat_insert_pengurus_rw" ON surat
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- Pengurus RW bisa update
CREATE POLICY "surat_update_pengurus_rw" ON surat
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- Pengurus RW bisa delete
CREATE POLICY "surat_delete_pengurus_rw" ON surat
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw')
    )
  );

-- 4. RLS Policies: surat_baca

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
