-- =====================================================
-- MIGRATION: Tambah tarif_default per rumah
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

ALTER TABLE rumah ADD COLUMN IF NOT EXISTS tarif_default INTEGER DEFAULT 100000;
