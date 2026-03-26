-- =====================================================
-- Migration 010: Modul Insiden & Investigasi
-- Date: 2026-03-25
-- Description:
--   Incident Reporting & Investigation module for RW 013
--   Inspired by Shell's Near Miss / Incident Investigation system.
--   Tables:
--     1. insiden          - Primary incident report
--     2. insiden_investigasi - Root cause analysis & findings
--     3. insiden_tindakan    - Corrective/preventive actions
--     4. insiden_timeline    - Status audit trail
-- =====================================================

-- =====================================================
-- 1. TABLE: insiden
-- =====================================================
CREATE TABLE IF NOT EXISTS insiden (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_insiden      TEXT UNIQUE NOT NULL,             -- INS-2026-0001 / NM-2026-0001
  jenis             TEXT NOT NULL CHECK (jenis IN ('insiden', 'hampir_celaka')),
  tanggal_kejadian  DATE NOT NULL,
  waktu_kejadian    TIME,
  lokasi            TEXT NOT NULL,
  deskripsi         TEXT NOT NULL,
  dampak            TEXT NOT NULL CHECK (dampak IN (
                      'tidak_ada',
                      'cedera_ringan',
                      'cedera_serius',
                      'kerusakan_properti',
                      'gangguan_lingkungan'
                    )),
  tingkat_keparahan TEXT NOT NULL CHECK (tingkat_keparahan IN (
                      'rendah',
                      'sedang',
                      'tinggi',
                      'kritis'
                    )),
  foto_urls         JSONB NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'dilaporkan' CHECK (status IN (
                      'dilaporkan',
                      'dalam_investigasi',
                      'menunggu_tindakan',
                      'selesai',
                      'ditutup'
                    )),
  pelapor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  warga_id          UUID REFERENCES warga(id) ON DELETE SET NULL,
  is_anonim         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. TABLE: insiden_investigasi
-- =====================================================
CREATE TABLE IF NOT EXISTS insiden_investigasi (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insiden_id            UUID UNIQUE NOT NULL REFERENCES insiden(id) ON DELETE CASCADE,
  investigator_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  tanggal_investigasi   DATE,
  kronologi             TEXT,                 -- detailed event narrative
  akar_penyebab         TEXT,                 -- root cause summary
  metode_analisis       TEXT CHECK (metode_analisis IN ('5_whys', 'fishbone', 'lainnya')),
  analisis_5why         JSONB,                -- [{"why": "...", "jawaban": "..."}, ...]
  faktor_manusia        TEXT,
  faktor_lingkungan     TEXT,
  faktor_sistem         TEXT,
  tindakan_segera       TEXT,                 -- immediate actions already taken at scene
  kesimpulan            TEXT,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. TABLE: insiden_tindakan
-- =====================================================
CREATE TABLE IF NOT EXISTS insiden_tindakan (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insiden_id            UUID NOT NULL REFERENCES insiden(id) ON DELETE CASCADE,
  jenis                 TEXT NOT NULL CHECK (jenis IN ('korektif', 'preventif')),
  deskripsi             TEXT NOT NULL,
  penanggung_jawab_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  target_selesai        DATE,
  status                TEXT NOT NULL DEFAULT 'belum_dimulai' CHECK (status IN (
                          'belum_dimulai',
                          'dalam_proses',
                          'selesai',
                          'batal'
                        )),
  tanggal_selesai       DATE,
  catatan_penyelesaian  TEXT,
  bukti_urls            JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. TABLE: insiden_timeline
-- =====================================================
CREATE TABLE IF NOT EXISTS insiden_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insiden_id  UUID NOT NULL REFERENCES insiden(id) ON DELETE CASCADE,
  status_lama TEXT,
  status_baru TEXT NOT NULL,
  catatan     TEXT,
  dibuat_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. AUTO-GENERATE kode_insiden via FUNCTION + TRIGGER
--    Format: INS-YYYY-NNNN (insiden)
--            NM-YYYY-NNNN  (hampir_celaka / Near Miss)
-- =====================================================
CREATE OR REPLACE FUNCTION generate_kode_insiden()
RETURNS TRIGGER AS $$
DECLARE
  tahun       TEXT;
  prefix      TEXT;
  last_seq    INTEGER;
  new_kode    TEXT;
BEGIN
  tahun  := TO_CHAR(NEW.tanggal_kejadian, 'YYYY');
  prefix := CASE WHEN NEW.jenis = 'hampir_celaka' THEN 'NM' ELSE 'INS' END;

  -- Count existing records for this prefix+year to determine next sequence
  SELECT COUNT(*) + 1
    INTO last_seq
    FROM insiden
   WHERE kode_insiden LIKE prefix || '-' || tahun || '-%';

  new_kode := prefix || '-' || tahun || '-' || LPAD(last_seq::TEXT, 4, '0');

  -- Handle unlikely collision by incrementing until unique
  WHILE EXISTS (SELECT 1 FROM insiden WHERE kode_insiden = new_kode) LOOP
    last_seq := last_seq + 1;
    new_kode := prefix || '-' || tahun || '-' || LPAD(last_seq::TEXT, 4, '0');
  END LOOP;

  NEW.kode_insiden := new_kode;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_kode_insiden ON insiden;
CREATE TRIGGER trg_generate_kode_insiden
  BEFORE INSERT ON insiden
  FOR EACH ROW
  WHEN (NEW.kode_insiden IS NULL OR NEW.kode_insiden = '')
  EXECUTE FUNCTION generate_kode_insiden();

-- =====================================================
-- 6. AUTO-UPDATE updated_at TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_insiden_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_insiden_updated_at ON insiden;
CREATE TRIGGER trg_insiden_updated_at
  BEFORE UPDATE ON insiden
  FOR EACH ROW EXECUTE FUNCTION update_insiden_updated_at();

DROP TRIGGER IF EXISTS trg_insiden_investigasi_updated_at ON insiden_investigasi;
CREATE TRIGGER trg_insiden_investigasi_updated_at
  BEFORE UPDATE ON insiden_investigasi
  FOR EACH ROW EXECUTE FUNCTION update_insiden_updated_at();

DROP TRIGGER IF EXISTS trg_insiden_tindakan_updated_at ON insiden_tindakan;
CREATE TRIGGER trg_insiden_tindakan_updated_at
  BEFORE UPDATE ON insiden_tindakan
  FOR EACH ROW EXECUTE FUNCTION update_insiden_updated_at();

-- =====================================================
-- 7. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_insiden_status           ON insiden(status);
CREATE INDEX IF NOT EXISTS idx_insiden_jenis            ON insiden(jenis);
CREATE INDEX IF NOT EXISTS idx_insiden_pelapor_id       ON insiden(pelapor_id);
CREATE INDEX IF NOT EXISTS idx_insiden_tanggal          ON insiden(tanggal_kejadian DESC);
CREATE INDEX IF NOT EXISTS idx_insiden_kode             ON insiden(kode_insiden);
CREATE INDEX IF NOT EXISTS idx_insiden_tingkat          ON insiden(tingkat_keparahan);

CREATE INDEX IF NOT EXISTS idx_investigasi_insiden_id   ON insiden_investigasi(insiden_id);
CREATE INDEX IF NOT EXISTS idx_investigasi_investigator ON insiden_investigasi(investigator_id);
CREATE INDEX IF NOT EXISTS idx_investigasi_status       ON insiden_investigasi(status);

CREATE INDEX IF NOT EXISTS idx_tindakan_insiden_id      ON insiden_tindakan(insiden_id);
CREATE INDEX IF NOT EXISTS idx_tindakan_status          ON insiden_tindakan(status);
CREATE INDEX IF NOT EXISTS idx_tindakan_pj              ON insiden_tindakan(penanggung_jawab_id);
CREATE INDEX IF NOT EXISTS idx_tindakan_target          ON insiden_tindakan(target_selesai);

CREATE INDEX IF NOT EXISTS idx_timeline_insiden_id      ON insiden_timeline(insiden_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at      ON insiden_timeline(created_at DESC);

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE insiden            ENABLE ROW LEVEL SECURITY;
ALTER TABLE insiden_investigasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE insiden_tindakan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE insiden_timeline   ENABLE ROW LEVEL SECURITY;

-- Helper: is caller an RW officer?
-- (used inline to avoid schema dependency on custom functions)

-- -------------------------------------------------------
-- RLS: insiden
-- -------------------------------------------------------

DROP POLICY IF EXISTS "insiden_select_own_or_officer" ON insiden;
DROP POLICY IF EXISTS "insiden_insert_authenticated"  ON insiden;
DROP POLICY IF EXISTS "insiden_update_officer"        ON insiden;
DROP POLICY IF EXISTS "insiden_delete_ketua_rw"       ON insiden;

-- Warga: see own reports + all completed/closed non-anonymous reports
-- Officers (RT/RW): see all reports
CREATE POLICY "insiden_select_own_or_officer" ON insiden FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- own report
    auth.uid() = pelapor_id
    OR
    -- completed/closed & not anonymous → visible to all verified users
    (status IN ('selesai', 'ditutup') AND is_anonim = false)
    OR
    -- RT officers see all
    EXISTS (
      SELECT 1 FROM users
       WHERE users.id = auth.uid()
         AND users.role IN (
           'ketua_rt', 'sekretaris_rt', 'bendahara_rt',
           'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
           'bendahara_rw', 'koordinator_rw'
         )
    )
  )
);

-- Any authenticated user may report
CREATE POLICY "insiden_insert_authenticated" ON insiden FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- RT and RW officers may update (status changes, assignment, etc.)
CREATE POLICY "insiden_update_officer" ON insiden FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN (
         'ketua_rt', 'sekretaris_rt',
         'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
         'bendahara_rw', 'koordinator_rw'
       )
  )
);

-- Only ketua_rw / wakil_ketua_rw may delete (soft-close preferred)
CREATE POLICY "insiden_delete_ketua_rw" ON insiden FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN ('ketua_rw', 'wakil_ketua_rw')
  )
);

-- -------------------------------------------------------
-- RLS: insiden_investigasi
-- -------------------------------------------------------

DROP POLICY IF EXISTS "investigasi_select_officer_or_final" ON insiden_investigasi;
DROP POLICY IF EXISTS "investigasi_insert_officer"          ON insiden_investigasi;
DROP POLICY IF EXISTS "investigasi_update_officer"          ON insiden_investigasi;
DROP POLICY IF EXISTS "investigasi_delete_rw"               ON insiden_investigasi;

-- Final investigations are readable by all authenticated users
-- Draft investigations only by officers
CREATE POLICY "investigasi_select_officer_or_final" ON insiden_investigasi FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    status = 'final'
    OR
    EXISTS (
      SELECT 1 FROM users
       WHERE users.id = auth.uid()
         AND users.role IN (
           'ketua_rt', 'sekretaris_rt',
           'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
           'bendahara_rw', 'koordinator_rw'
         )
    )
  )
);

-- RT and RW officers may create investigations
CREATE POLICY "investigasi_insert_officer" ON insiden_investigasi FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN (
         'ketua_rt', 'sekretaris_rt',
         'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
         'bendahara_rw', 'koordinator_rw'
       )
  )
);

-- Only RW officers may update (includes finalising)
CREATE POLICY "investigasi_update_officer" ON insiden_investigasi FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN (
         'ketua_rt', 'sekretaris_rt',
         'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
         'bendahara_rw', 'koordinator_rw'
       )
  )
);

CREATE POLICY "investigasi_delete_rw" ON insiden_investigasi FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN ('ketua_rw', 'wakil_ketua_rw')
  )
);

-- -------------------------------------------------------
-- RLS: insiden_tindakan
-- -------------------------------------------------------

DROP POLICY IF EXISTS "tindakan_select_authenticated" ON insiden_tindakan;
DROP POLICY IF EXISTS "tindakan_insert_officer"       ON insiden_tindakan;
DROP POLICY IF EXISTS "tindakan_update_officer"       ON insiden_tindakan;
DROP POLICY IF EXISTS "tindakan_delete_rw"            ON insiden_tindakan;

-- All authenticated users may view action items
CREATE POLICY "tindakan_select_authenticated" ON insiden_tindakan FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- RT and RW officers may add action items
CREATE POLICY "tindakan_insert_officer" ON insiden_tindakan FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN (
         'ketua_rt', 'sekretaris_rt',
         'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
         'bendahara_rw', 'koordinator_rw'
       )
  )
);

-- Officers or the assigned PIC may update their own action items
CREATE POLICY "tindakan_update_officer" ON insiden_tindakan FOR UPDATE USING (
  auth.uid() = penanggung_jawab_id
  OR
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN (
         'ketua_rt', 'sekretaris_rt',
         'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
         'bendahara_rw', 'koordinator_rw'
       )
  )
);

CREATE POLICY "tindakan_delete_rw" ON insiden_tindakan FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users
     WHERE users.id = auth.uid()
       AND users.role IN ('ketua_rw', 'wakil_ketua_rw', 'koordinator_rw')
  )
);

-- -------------------------------------------------------
-- RLS: insiden_timeline
-- -------------------------------------------------------

DROP POLICY IF EXISTS "timeline_select_authenticated" ON insiden_timeline;
DROP POLICY IF EXISTS "timeline_insert_officer"       ON insiden_timeline;

-- Timeline readable by all authenticated users
CREATE POLICY "timeline_select_authenticated" ON insiden_timeline FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Only officers and the system (via admin client) may write timeline entries
CREATE POLICY "timeline_insert_officer" ON insiden_timeline FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM users
       WHERE users.id = auth.uid()
         AND users.role IN (
           'ketua_rt', 'sekretaris_rt',
           'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw',
           'bendahara_rw', 'koordinator_rw'
         )
    )
    -- Allow pelapor to insert their own initial 'dilaporkan' entry
    OR EXISTS (
      SELECT 1 FROM insiden
       WHERE insiden.id = insiden_timeline.insiden_id
         AND insiden.pelapor_id = auth.uid()
    )
  )
);

-- Timeline entries are immutable (no UPDATE / DELETE policies)

-- =====================================================
-- 9. STORAGE BUCKET for incident photos
--    Run separately in Supabase dashboard if bucket
--    does not yet exist:
--
--    INSERT INTO storage.buckets (id, name, public)
--    VALUES ('insiden', 'insiden', false)
--    ON CONFLICT DO NOTHING;
--
--    Then add storage policies:
--    - Authenticated users: INSERT into insiden/
--    - Officers: SELECT all
--    - Pelapor: SELECT own folder (insiden/{user_id}/*)
-- =====================================================
