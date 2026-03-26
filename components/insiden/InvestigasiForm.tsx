'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InsidenInvestigasi, MetodeAnalisis } from '@/types'
import { FiSave, FiAlertTriangle, FiPlus, FiTrash2, FiInfo } from 'react-icons/fi'

interface Props {
  insidenId: string
  existing?: InsidenInvestigasi | null
  onSaved?: () => void
}

interface FiveWhy {
  why: string
  jawaban: string
}

const EMPTY_WHY: FiveWhy = { why: '', jawaban: '' }

const DEFAULT_WHYS: FiveWhy[] = [
  { why: 'Mengapa insiden ini terjadi?',            jawaban: '' },
  { why: 'Mengapa hal tersebut bisa terjadi?',      jawaban: '' },
  { why: 'Mengapa kondisi tersebut ada?',           jawaban: '' },
  { why: 'Mengapa kondisi di atasnya terjadi?',     jawaban: '' },
  { why: 'Mengapa kondisi tersebut tidak dicegah?', jawaban: '' },
]

export default function InvestigasiForm({ insidenId, existing, onSaved }: Props) {
  const router = useRouter()
  const isEdit = !!existing

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    tanggal_investigasi: existing?.tanggal_investigasi || new Date().toISOString().split('T')[0],
    kronologi:           existing?.kronologi           || '',
    metode_analisis:     (existing?.metode_analisis    || '5_whys') as MetodeAnalisis,
    akar_penyebab:       existing?.akar_penyebab       || '',
    faktor_manusia:      existing?.faktor_manusia      || '',
    faktor_lingkungan:   existing?.faktor_lingkungan   || '',
    faktor_sistem:       existing?.faktor_sistem       || '',
    tindakan_segera:     existing?.tindakan_segera     || '',
    kesimpulan:          existing?.kesimpulan          || '',
  })
  const [whys, setWhys] = useState<FiveWhy[]>(
    existing?.analisis_5why?.length
      ? existing.analisis_5why
      : DEFAULT_WHYS
  )

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const updateWhy = (i: number, field: keyof FiveWhy, val: string) =>
    setWhys(ws => ws.map((w, idx) => idx === i ? { ...w, [field]: val } : w))

  const addWhy = () => {
    if (whys.length >= 7) return
    setWhys(ws => [...ws, { ...EMPTY_WHY }])
  }

  const removeWhy = (i: number) => {
    if (whys.length <= 3) return
    setWhys(ws => ws.filter((_, idx) => idx !== i))
  }

  const validate = (): string => {
    if (!form.tanggal_investigasi) return 'Tanggal investigasi wajib diisi'
    if (!form.kronologi.trim())    return 'Kronologi kejadian wajib diisi'
    if (!form.akar_penyebab.trim()) return 'Akar penyebab wajib diisi'
    if (!form.kesimpulan.trim())   return 'Kesimpulan wajib diisi'
    if (form.metode_analisis === '5_whys') {
      const filled = whys.filter(w => w.jawaban.trim())
      if (filled.length < 3) return 'Isi minimal 3 analisis Why untuk metode 5 Whys'
    }
    return ''
  }

  const handleSave = async (asFinal = false) => {
    const validErr = validate()
    if (validErr) { setError(validErr); return }
    setError('')
    setSaving(true)

    const payload = {
      ...form,
      analisis_5why: form.metode_analisis === '5_whys' ? whys : null,
      status: asFinal ? 'final' : 'draft',
    }

    try {
      const url    = `/api/insiden/${insidenId}/investigasi`
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')

      if (onSaved) {
        onSaved()
      } else {
        router.push(`/insiden/${insidenId}`)
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger alert-dismissible mb-4">
          <FiAlertTriangle className="me-2" />{error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      {/* ── Section 1: Kronologi ─────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header bg-danger text-white">
          <h6 className="mb-0 fw-bold">1. Kronologi Kejadian</h6>
        </div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Tanggal Investigasi <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={form.tanggal_investigasi}
                onChange={e => set('tanggal_investigasi', e.target.value)}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Kronologi Lengkap <span className="text-danger">*</span></label>
            <textarea
              className="form-control"
              rows={6}
              style={{ resize: 'vertical' }}
              placeholder="Jelaskan urutan kejadian secara lengkap dan kronologis. Sertakan waktu, tempat, orang yang terlibat, dan kondisi saat itu..."
              value={form.kronologi}
              onChange={e => set('kronologi', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Tindakan Segera yang Sudah Diambil <span className="text-muted fw-normal">(Opsional)</span></label>
            <textarea
              className="form-control"
              rows={3}
              style={{ resize: 'vertical' }}
              placeholder="Tindakan darurat yang sudah dilakukan di tempat kejadian (P3K, evakuasi, menutup area, dll)..."
              value={form.tindakan_segera}
              onChange={e => set('tindakan_segera', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Analisis Akar Penyebab ───────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header bg-warning text-dark">
          <h6 className="mb-0 fw-bold">2. Analisis Akar Penyebab</h6>
        </div>
        <div className="card-body">
          {/* Metode */}
          <div className="mb-4">
            <label className="form-label">Metode Analisis</label>
            <div className="d-flex gap-3 flex-wrap">
              {([
                { value: '5_whys',   label: '5 Whys',   desc: 'Tanya "Mengapa?" berulang untuk menemukan akar masalah' },
                { value: 'fishbone', label: 'Fishbone',  desc: 'Diagram Ishikawa: kategorisasi faktor penyebab' },
                { value: 'lainnya',  label: 'Lainnya',   desc: 'Metode analisis lain yang sesuai' },
              ] as { value: MetodeAnalisis; label: string; desc: string }[]).map(opt => (
                <div
                  key={opt.value}
                  className="rounded p-2"
                  style={{
                    border:     `2px solid ${form.metode_analisis === opt.value ? '#d97706' : '#e5e7eb'}`,
                    background: form.metode_analisis === opt.value ? '#fffbeb' : '#fff',
                    cursor:     'pointer',
                    minWidth:   140,
                    transition: 'all 0.15s',
                  }}
                  onClick={() => set('metode_analisis', opt.value)}
                >
                  <div className="fw-semibold" style={{ fontSize: '0.85rem', color: form.metode_analisis === opt.value ? '#d97706' : '#374151' }}>
                    {opt.label}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Whys table */}
          {form.metode_analisis === '5_whys' && (
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <label className="form-label mb-0">Analisis 5 Whys</label>
                <span
                  className="rounded px-2"
                  style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                >
                  Minimal 3 Why
                </span>
              </div>
              <div
                className="rounded p-2 mb-3"
                style={{ background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}
              >
                <FiInfo size={12} className="me-1" />
                Mulai dari gejala yang terlihat, tanyakan "Mengapa?" berulang hingga menemukan akar masalah yang sesungguhnya.
              </div>

              {whys.map((w, i) => (
                <div key={i} className="mb-3">
                  <div className="d-flex align-items-start gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width: 24, height: 24, background: '#d97706', fontSize: '0.72rem', marginTop: 6 }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-grow-1">
                      <input
                        type="text"
                        className="form-control form-control-sm mb-1"
                        placeholder={`Pertanyaan Why ke-${i + 1}...`}
                        value={w.why}
                        onChange={e => updateWhy(i, 'why', e.target.value)}
                        style={{ fontStyle: 'italic', color: '#6b7280' }}
                      />
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Jawaban / temuan..."
                        value={w.jawaban}
                        onChange={e => updateWhy(i, 'jawaban', e.target.value)}
                        style={{ resize: 'none' }}
                      />
                    </div>
                    {whys.length > 3 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger flex-shrink-0"
                        style={{ marginTop: 6, padding: '2px 6px' }}
                        onClick={() => removeWhy(i)}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {whys.length < 7 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning"
                  onClick={addWhy}
                >
                  <FiPlus size={12} className="me-1" />Tambah Why
                </button>
              )}
            </div>
          )}

          {/* Root cause summary */}
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Akar Penyebab (Root Cause) <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              style={{ resize: 'vertical' }}
              placeholder="Tuliskan akar penyebab utama yang ditemukan dari analisis di atas..."
              value={form.akar_penyebab}
              onChange={e => set('akar_penyebab', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Faktor Penyebab ───────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0 fw-bold">3. Faktor-Faktor Penyebab</h6>
        </div>
        <div className="card-body">
          <div
            className="rounded p-2 mb-4"
            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.78rem', color: '#0369a1' }}
          >
            <FiInfo size={12} className="me-1" />
            Isi faktor yang berkontribusi. Tidak semua faktor harus diisi — cukup yang relevan dengan insiden ini.
          </div>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <span
                  className="rounded px-2"
                  style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                >
                  Manusia
                </span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
                placeholder="Perilaku, keputusan, kelalaian, kelelahan, kurang pelatihan..."
                value={form.faktor_manusia}
                onChange={e => set('faktor_manusia', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <span
                  className="rounded px-2"
                  style={{ fontSize: '0.65rem', background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}
                >
                  Lingkungan
                </span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
                placeholder="Kondisi cuaca, pencahayaan, kebisingan, kondisi fisik area..."
                value={form.faktor_lingkungan}
                onChange={e => set('faktor_lingkungan', e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label d-flex align-items-center gap-2">
                <span
                  className="rounded px-2"
                  style={{ fontSize: '0.65rem', background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd' }}
                >
                  Sistem / Prosedur
                </span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                style={{ resize: 'vertical', fontSize: '0.85rem' }}
                placeholder="SOP yang kurang, rambu tidak ada, infrastruktur tidak memadai..."
                value={form.faktor_sistem}
                onChange={e => set('faktor_sistem', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Kesimpulan ────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header bg-success text-white">
          <h6 className="mb-0 fw-bold">4. Kesimpulan Investigasi</h6>
        </div>
        <div className="card-body">
          <textarea
            className="form-control"
            rows={5}
            style={{ resize: 'vertical' }}
            placeholder="Tuliskan kesimpulan investigasi, rekomendasi umum, dan pelajaran yang dapat diambil (lesson learned) dari insiden ini..."
            value={form.kesimpulan}
            onChange={e => set('kesimpulan', e.target.value)}
          />
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div className="d-flex gap-3 justify-content-end flex-wrap">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => router.back()}
          disabled={saving}
        >
          Batal
        </button>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => handleSave(false)}
          disabled={saving}
        >
          {saving
            ? <span className="spinner-border spinner-border-sm me-2" />
            : <FiSave className="me-2" />
          }
          Simpan sebagai Draft
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={() => handleSave(true)}
          disabled={saving}
        >
          {saving
            ? <span className="spinner-border spinner-border-sm me-2" />
            : <FiSave className="me-2" />
          }
          Finalisasi Investigasi
        </button>
      </div>
    </div>
  )
}
