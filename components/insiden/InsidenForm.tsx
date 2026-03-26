'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  JenisInsiden, DampakInsiden, TingkatKeparahan, InsidenFormInput,
  JENIS_INSIDEN_LABELS, DAMPAK_INSIDEN_LABELS, TINGKAT_KEPARAHAN_LABELS,
} from '@/types'
import { notifyKetuaViaAPI } from '@/lib/notifikasi'
import {
  FiArrowLeft, FiArrowRight, FiSave, FiCamera, FiX,
  FiAlertTriangle, FiShield, FiInfo, FiEyeOff,
} from 'react-icons/fi'

// ─── Option configs ────────────────────────────────────────────────────────────

const JENIS_OPTIONS: { value: JenisInsiden; label: string; desc: string; color: string }[] = [
  {
    value: 'insiden',
    label: 'Insiden',
    desc: 'Kejadian yang telah terjadi dan menimbulkan dampak (cedera, kerusakan, gangguan)',
    color: '#dc2626',
  },
  {
    value: 'hampir_celaka',
    label: 'Hampir Celaka (Near Miss)',
    desc: 'Kejadian yang nyaris terjadi tetapi berhasil dihindari tanpa dampak nyata',
    color: '#7c3aed',
  },
]

const DAMPAK_OPTIONS: { value: DampakInsiden; label: string; icon: string }[] = [
  { value: 'tidak_ada',           label: 'Tidak Ada Dampak',    icon: '✅' },
  { value: 'cedera_ringan',       label: 'Cedera Ringan',        icon: '🩹' },
  { value: 'cedera_serius',       label: 'Cedera Serius',        icon: '🚑' },
  { value: 'kerusakan_properti',  label: 'Kerusakan Properti',   icon: '🏚️' },
  { value: 'gangguan_lingkungan', label: 'Gangguan Lingkungan',  icon: '⚠️' },
]

const TINGKAT_OPTIONS: { value: TingkatKeparahan; label: string; desc: string; bg: string; border: string; textColor: string }[] = [
  { value: 'rendah',  label: 'Rendah',  desc: 'Dampak minimal, tidak perlu tindakan segera',       bg: '#d1fae5', border: '#059669', textColor: '#065f46' },
  { value: 'sedang',  label: 'Sedang',  desc: 'Dampak terbatas, perlu tindakan dalam beberapa hari', bg: '#fef3c7', border: '#d97706', textColor: '#92400e' },
  { value: 'tinggi',  label: 'Tinggi',  desc: 'Dampak signifikan, perlu tindakan segera',           bg: '#fee2e2', border: '#dc2626', textColor: '#991b1b' },
  { value: 'kritis',  label: 'Kritis',  desc: 'Bahaya nyawa / kerusakan parah, tindakan darurat',  bg: '#1e1e2e', border: '#dc2626', textColor: '#fca5a5' },
]

// ─── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Kejadian' },
  { n: 2, label: 'Detail' },
  { n: 3, label: 'Foto & Kirim' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="d-flex align-items-center justify-content-center mb-4 gap-0">
      {STEPS.map((s, i) => (
        <div key={s.n} className="d-flex align-items-center">
          <div className="d-flex flex-column align-items-center">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{
                width: 32, height: 32, fontSize: '0.8rem',
                background: s.n < current ? '#059669' : s.n === current ? '#dc2626' : '#e5e7eb',
                color: s.n <= current ? '#fff' : '#6b7280',
                border: s.n === current ? '2px solid #dc2626' : 'none',
              }}
            >
              {s.n < current ? '✓' : s.n}
            </div>
            <small style={{ fontSize: '0.65rem', color: s.n === current ? '#dc2626' : '#9ca3af', marginTop: 4 }}>
              {s.label}
            </small>
          </div>
          {i < STEPS.length - 1 && (
            <div
              style={{
                height: 2, width: 60, marginBottom: 18,
                background: s.n < current ? '#059669' : '#e5e7eb',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  rtId?: string | null
}

export default function InsidenForm({ rtId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]     = useState('')
  const [photos, setPhotos]   = useState<{ file: File; preview: string }[]>([])

  const [form, setForm] = useState<InsidenFormInput>({
    jenis: 'insiden',
    tanggal_kejadian: new Date().toISOString().split('T')[0],
    waktu_kejadian: '',
    lokasi: '',
    deskripsi: '',
    dampak: 'tidak_ada',
    tingkat_keparahan: 'sedang',
    is_anonim: false,
    foto_urls: [],
  })

  const set = <K extends keyof InsidenFormInput>(key: K, value: InsidenFormInput[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  // ─── Photo handlers ──────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > 5) { setError('Maksimal 5 foto'); return }
    const valid = files.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return false
      if (f.size > 10 * 1024 * 1024) return false
      return true
    }).map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setPhotos(prev => [...prev, ...valid])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photos[idx].preview)
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadPhotos = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const p of photos) {
      const fd = new FormData()
      fd.append('file', p.file)
      const res = await fetch('/api/upload-insiden', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload foto gagal')
      urls.push(data.fileUrl)
    }
    return urls
  }

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!form.lokasi.trim())        return 'Lokasi kejadian wajib diisi'
      if (!form.tanggal_kejadian)     return 'Tanggal kejadian wajib diisi'
      const d = new Date(form.tanggal_kejadian)
      if (d > new Date())             return 'Tanggal kejadian tidak boleh di masa depan'
    }
    if (s === 2) {
      if (!form.deskripsi.trim())     return 'Deskripsi kejadian wajib diisi'
      if (form.deskripsi.trim().length < 20) return 'Deskripsi minimal 20 karakter'
    }
    return ''
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const goPrev = () => { setError(''); setStep(s => s - 1) }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      let foto_urls: string[] = []
      if (photos.length > 0) {
        setUploading(true)
        foto_urls = await uploadPhotos()
        setUploading(false)
      }

      const res = await fetch('/api/insiden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, foto_urls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim laporan')

      // Notify officers
      const jenisLabel = JENIS_INSIDEN_LABELS[form.jenis]
      await notifyKetuaViaAPI({
        judul: `${jenisLabel} Baru Dilaporkan`,
        pesan: `Laporan ${jenisLabel.toLowerCase()} baru di ${form.lokasi}. Tingkat: ${TINGKAT_KEPARAHAN_LABELS[form.tingkat_keparahan]}.`,
        tipe: 'insiden',
        link: `/insiden/${data.id}`,
        rt_id: rtId || null,
      })

      router.push(`/insiden/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim laporan')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <StepIndicator current={step} />

      {error && (
        <div className="alert alert-danger alert-dismissible mb-4" role="alert">
          <FiAlertTriangle className="me-2" />
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      {/* ── STEP 1: Informasi Kejadian ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="card mb-4">
          <div className="card-header bg-danger text-white">
            <h6 className="mb-0 fw-bold"><FiAlertTriangle className="me-2" />Informasi Kejadian</h6>
          </div>
          <div className="card-body">
            {/* Jenis */}
            <div className="mb-4">
              <label className="form-label fw-semibold">Jenis Laporan <span className="text-danger">*</span></label>
              <div className="row g-3">
                {JENIS_OPTIONS.map(opt => (
                  <div key={opt.value} className="col-md-6">
                    <div
                      className="rounded p-3"
                      style={{
                        border: `2px solid ${form.jenis === opt.value ? opt.color : '#e5e7eb'}`,
                        background: form.jenis === opt.value ? `${opt.color}0d` : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => set('jenis', opt.value)}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <div
                          className="rounded-circle"
                          style={{
                            width: 16, height: 16,
                            border: `2px solid ${opt.color}`,
                            background: form.jenis === opt.value ? opt.color : 'transparent',
                            flexShrink: 0,
                          }}
                        />
                        <span className="fw-semibold" style={{ color: opt.color, fontSize: '0.9rem' }}>
                          {opt.label}
                        </span>
                      </div>
                      <p className="mb-0 text-muted" style={{ fontSize: '0.78rem', paddingLeft: 24 }}>
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tanggal & Waktu */}
            <div className="row mb-3 g-3">
              <div className="col-md-6">
                <label className="form-label">Tanggal Kejadian <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={form.tanggal_kejadian}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => set('tanggal_kejadian', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Waktu Kejadian <span className="text-muted fw-normal">(Opsional)</span></label>
                <input
                  type="time"
                  className="form-control"
                  value={form.waktu_kejadian || ''}
                  onChange={e => set('waktu_kejadian', e.target.value)}
                />
              </div>
            </div>

            {/* Lokasi */}
            <div className="mb-0">
              <label className="form-label">Lokasi Kejadian <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Jl. Permata 3 depan pos ronda, atau Taman Blok Timur"
                value={form.lokasi}
                onChange={e => set('lokasi', e.target.value)}
              />
              <div className="form-text">Sebutkan lokasi spesifik di dalam area RW 013</div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Detail & Klasifikasi ──────────────────────────────────── */}
      {step === 2 && (
        <div className="card mb-4">
          <div className="card-header bg-warning text-dark">
            <h6 className="mb-0 fw-bold"><FiShield className="me-2" />Detail & Klasifikasi</h6>
          </div>
          <div className="card-body">
            {/* Deskripsi */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Deskripsi Kejadian <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={5}
                style={{ resize: 'vertical' }}
                placeholder="Jelaskan apa yang terjadi, bagaimana kejadiannya, siapa yang terlibat, dan kondisi sekitar saat kejadian..."
                value={form.deskripsi}
                onChange={e => set('deskripsi', e.target.value)}
              />
              <div className="d-flex justify-content-between form-text">
                <span>Minimal 20 karakter. Semakin detail semakin baik.</span>
                <span className={form.deskripsi.length < 20 ? 'text-danger' : 'text-success'}>
                  {form.deskripsi.length} karakter
                </span>
              </div>
            </div>

            {/* Dampak */}
            <div className="mb-4">
              <label className="form-label fw-semibold">Dampak yang Terjadi <span className="text-danger">*</span></label>
              <div className="row g-2">
                {DAMPAK_OPTIONS.map(opt => (
                  <div key={opt.value} className="col-6 col-md-4">
                    <div
                      className="rounded p-2 d-flex align-items-center gap-2"
                      style={{
                        border: `2px solid ${form.dampak === opt.value ? '#1d4ed8' : '#e5e7eb'}`,
                        background: form.dampak === opt.value ? '#eff6ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => set('dampak', opt.value)}
                    >
                      <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                      <span style={{ color: form.dampak === opt.value ? '#1d4ed8' : '#374151' }}>
                        {opt.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tingkat Keparahan */}
            <div className="mb-0">
              <label className="form-label fw-semibold">Tingkat Keparahan <span className="text-danger">*</span></label>
              <div className="row g-2">
                {TINGKAT_OPTIONS.map(opt => (
                  <div key={opt.value} className="col-6 col-md-3">
                    <div
                      className="rounded p-3 text-center"
                      style={{
                        border: `2px solid ${form.tingkat_keparahan === opt.value ? opt.border : '#e5e7eb'}`,
                        background: form.tingkat_keparahan === opt.value ? opt.bg : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => set('tingkat_keparahan', opt.value)}
                    >
                      <div
                        className="fw-bold mb-1"
                        style={{
                          color: form.tingkat_keparahan === opt.value ? opt.textColor : '#374151',
                          fontSize: '0.85rem',
                        }}
                      >
                        {opt.label}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Foto & Konfirmasi ─────────────────────────────────────── */}
      {step === 3 && (
        <>
          {/* Foto */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold">
                <FiCamera className="me-2" />Foto Bukti
                <span className="text-muted fw-normal ms-1">(Opsional, maks. 5 foto)</span>
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="col-4 col-md-3 position-relative">
                    <img
                      src={p.preview}
                      alt=""
                      className="rounded"
                      style={{ width: '100%', height: 90, objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 22, height: 22, padding: 0 }}
                      onClick={() => removePhoto(i)}
                    >
                      <FiX size={11} />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <div className="col-4 col-md-3">
                    <div
                      className="border rounded d-flex align-items-center justify-content-center text-muted"
                      style={{ height: 90, cursor: 'pointer', borderStyle: 'dashed !important' as 'dashed' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="text-center">
                        <FiCamera size={18} />
                        <div style={{ fontSize: '0.68rem', marginTop: 2 }}>Tambah</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <small className="text-muted">JPG, PNG, WEBP · Maks 10MB per foto</small>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="d-none"
                multiple
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          {/* Anonim toggle */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="form-check form-switch d-flex align-items-start gap-3 m-0">
                <input
                  className="form-check-input mt-1"
                  type="checkbox"
                  id="chkAnonim"
                  checked={form.is_anonim}
                  onChange={e => set('is_anonim', e.target.checked)}
                  style={{ width: 40, height: 22, flexShrink: 0 }}
                />
                <label className="form-check-label" htmlFor="chkAnonim">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <FiEyeOff size={14} />
                    <span className="fw-semibold">Kirim sebagai Anonim</span>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
                    Identitas Anda akan disembunyikan dari tampilan publik dan warga lain.
                    Pengurus RW tetap dapat melihat identitas Anda untuk keperluan investigasi.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Review summary */}
          <div className="card mb-4 border-0" style={{ background: '#f8fafc' }}>
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <FiInfo className="text-primary" />
                <span className="fw-semibold text-primary">Ringkasan Laporan</span>
              </div>
              <div className="row g-2" style={{ fontSize: '0.82rem' }}>
                {[
                  ['Jenis',    JENIS_INSIDEN_LABELS[form.jenis]],
                  ['Tanggal', `${form.tanggal_kejadian}${form.waktu_kejadian ? ' · ' + form.waktu_kejadian : ''}`],
                  ['Lokasi',  form.lokasi],
                  ['Dampak',  DAMPAK_INSIDEN_LABELS[form.dampak]],
                  ['Tingkat', TINGKAT_KEPARAHAN_LABELS[form.tingkat_keparahan]],
                  ['Foto',    `${photos.length} file`],
                  ['Anonim',  form.is_anonim ? 'Ya' : 'Tidak'],
                ].map(([k, v]) => (
                  <div key={k} className="col-6 col-md-4">
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{k}</div>
                    <div className="fw-semibold text-dark">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Navigation buttons ─────────────────────────────────────────────── */}
      <div className="d-flex gap-2 justify-content-between">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={step === 1 ? () => router.push('/insiden') : goPrev}
        >
          <FiArrowLeft className="me-1" />
          {step === 1 ? 'Batal' : 'Sebelumnya'}
        </button>

        {step < 3 ? (
          <button type="button" className="btn btn-danger" onClick={goNext}>
            Berikutnya <FiArrowRight className="ms-1" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleSubmit}
            disabled={saving || uploading}
          >
            {saving || uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                {uploading ? 'Mengupload foto...' : 'Mengirim...'}
              </>
            ) : (
              <><FiSave className="me-2" />Kirim Laporan</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
