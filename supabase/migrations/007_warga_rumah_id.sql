-- =====================================================
-- MIGRATION: Tambah kolom rumah_id di tabel warga
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

ALTER TABLE warga ADD COLUMN IF NOT EXISTS rumah_id UUID REFERENCES rumah(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_warga_rumah_id ON warga(rumah_id);
