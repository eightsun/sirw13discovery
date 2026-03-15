-- =====================================================
-- MIGRATION: Tambah kolom pengirim untuk surat masuk
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

ALTER TABLE surat ADD COLUMN IF NOT EXISTS pengirim VARCHAR(255);
