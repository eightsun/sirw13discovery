-- =====================================================
-- MIGRATION: Kategori Surat Keluar + Auto-Numbering
-- Jalankan di Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Buat enum kategori surat
CREATE TYPE kategori_surat AS ENUM (
  'INF',  -- Informasi
  'UND',  -- Undangan
  'EDR',  -- Edaran
  'INT',  -- Instruksi
  'KEP',  -- Keputusan
  'LAP',  -- Laporan
  'NOT',  -- Notulen
  'PER',  -- Permohonan
  'IZN',  -- Perizinan / Rekomendasi
  'PKS',  -- Kerjasama
  'PAN',  -- Kepanitiaan
  'KEU'   -- Keuangan
);

-- 2. Tambah kolom kategori_surat ke tabel surat (nullable, karena surat masuk tidak perlu kategori)
ALTER TABLE surat ADD COLUMN kategori_surat kategori_surat;
