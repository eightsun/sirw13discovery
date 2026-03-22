-- =====================================================
-- Migration 009: Security RLS Policies + Audit Log
-- Date: 2026-03-22
-- Description:
--   1. Enable RLS on kegiatan, keluhan, kas_transaksi
--   2. Create audit_log table for sensitive operations
-- =====================================================

-- =====================================================
-- 1. RLS for kegiatan
-- =====================================================
ALTER TABLE IF EXISTS kegiatan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kegiatan_select_all" ON kegiatan;
DROP POLICY IF EXISTS "kegiatan_insert_pengurus" ON kegiatan;
DROP POLICY IF EXISTS "kegiatan_update_pengurus" ON kegiatan;
DROP POLICY IF EXISTS "kegiatan_delete_rw" ON kegiatan;

-- All authenticated users can read kegiatan
CREATE POLICY "kegiatan_select_all" ON kegiatan FOR SELECT USING (TRUE);

-- Only pengurus RW can create/update kegiatan
CREATE POLICY "kegiatan_insert_pengurus" ON kegiatan FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw'))
);

CREATE POLICY "kegiatan_update_pengurus" ON kegiatan FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw'))
);

CREATE POLICY "kegiatan_delete_rw" ON kegiatan FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw'))
);

-- =====================================================
-- 2. RLS for keluhan
-- =====================================================
ALTER TABLE IF EXISTS keluhan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "keluhan_select_own_or_pengurus" ON keluhan;
DROP POLICY IF EXISTS "keluhan_insert_authenticated" ON keluhan;
DROP POLICY IF EXISTS "keluhan_update_own_or_pengurus" ON keluhan;
DROP POLICY IF EXISTS "keluhan_delete_rw" ON keluhan;

-- Users can read their own keluhan, pengurus can read all
CREATE POLICY "keluhan_select_own_or_pengurus" ON keluhan FOR SELECT USING (
  auth.uid() = pelapor_id OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw','ketua_rt','sekretaris_rt','bendahara_rt'))
);

-- All authenticated users can create keluhan
CREATE POLICY "keluhan_insert_authenticated" ON keluhan FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Users can update their own keluhan, pengurus can update all
CREATE POLICY "keluhan_update_own_or_pengurus" ON keluhan FOR UPDATE USING (
  auth.uid() = pelapor_id OR
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw','ketua_rt'))
);

-- Only ketua RW can delete keluhan
CREATE POLICY "keluhan_delete_rw" ON keluhan FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw'))
);

-- =====================================================
-- 3. RLS for kas_transaksi (financial data - restricted)
-- =====================================================
ALTER TABLE IF EXISTS kas_transaksi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kas_transaksi_select_pengurus" ON kas_transaksi;
DROP POLICY IF EXISTS "kas_transaksi_insert_pengurus" ON kas_transaksi;
DROP POLICY IF EXISTS "kas_transaksi_update_pengurus" ON kas_transaksi;
DROP POLICY IF EXISTS "kas_transaksi_delete_rw" ON kas_transaksi;

-- Only pengurus can read financial transactions
CREATE POLICY "kas_transaksi_select_pengurus" ON kas_transaksi FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw','ketua_rt','sekretaris_rt','bendahara_rt'))
);

CREATE POLICY "kas_transaksi_insert_pengurus" ON kas_transaksi FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw'))
);

CREATE POLICY "kas_transaksi_update_pengurus" ON kas_transaksi FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw','bendahara_rw','koordinator_rw'))
);

CREATE POLICY "kas_transaksi_delete_rw" ON kas_transaksi FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw'))
);

-- =====================================================
-- 4. Audit Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- RLS for audit_log: only pengurus RW can read, system can write
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_rw" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ketua_rw','wakil_ketua_rw','sekretaris_rw'))
);

-- Insert allowed for all authenticated users (for logging their own actions)
CREATE POLICY "audit_log_insert_authenticated" ON audit_log FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
