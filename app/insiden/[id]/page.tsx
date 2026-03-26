'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import {
  InsidenDetail, StatusInsiden, STATUS_INSIDEN_LABELS,
  DAMPAK_INSIDEN_LABELS, TINGKAT_KEPARAHAN_LABELS, JENIS_INSIDEN_LABELS,
  InsidenTindakan, InsidenTimeline as TimelineItem,
} from '@/types'
import InsidenStatusBadge from '@/components/insiden/InsidenStatusBadge'
import TingkatKeparahanBadge from '@/components/insiden/TingkatKeparahanBadge'
import InsidenTimeline from '@/components/insiden/InsidenTimeline'
import TindakanList from '@/components/insiden/TindakanList'
import {
  FiArrowLeft, FiCalendar, FiMapPin, FiUser, FiAlertTriangle,
  FiCamera, FiX, FiSearch, FiClipboard, FiCheckCircle, FiFileText,
} from 'react-icons/fi'

const VALID_TRANSITIONS: Record<string, StatusInsiden[]> = {
  dilaporkan:        ['dalam_investigasi'],
  dalam_investigasi: ['menunggu_tindakan', 'selesai'],
  menunggu_tindakan: ['selesai'],
  selesai:           ['ditutup'],
  ditutup:           [],
}

type EnrichedDetail = Omit<InsidenDetail, 'tindakan' | 'timeline'> & {
  pelapor_nama?: string
  investigasi?: (InsidenDetail['investigasi'] & { investigator_nama?: string | null }) | null
  tindakan: (InsidenTindakan & { pic_nama?: string | null })[]
  timeline: (TimelineItem & { pembuat_nama?: string | null })[]
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function InsidenDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const { user, userData, isRW, isPengurus, loading: userLoading } = useUser()

  const id = params.id as string

  const [insiden,       setInsiden]       = useState<EnrichedDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [photoModal,    setPhotoModal]    = useState<string | null>(null)
  const [statusNote,    setStatusNote]    = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusError,   setStatusError]   = useState('')
  const [officerList,   setOfficerList]   = useState<{ id: string; nama_lengkap: string }[]>([])

  const canManage  = isPengurus
  const canDelete  = isRW
  const isKetua    = userData?.role === 'ketua_rw' || userData?.role === 'wakil_ketua_rw'
  const isOwner    = insiden?.pelapor_id === user?.id

  // ── Fetch detail ────────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/insiden/${id}`)
      if (!res.ok) {
        if (res.status === 404) router.push('/insiden')
        return
      }
      const data = await res.json()
      setInsiden(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch officer list for TindakanList PIC selector
  const fetchOfficers = useCallback(async () => {
    try {
      const res = await fetch('/api/insiden?page=1') // just to warm up auth; officers loaded separately
      // Directly from Supabase via inline fetch isn't ideal — use a dedicated endpoint
      // For now we pass an empty list; TindakanList shows a free-text fallback
    } catch {}
  }, [])

  useEffect(() => {
    if (!userLoading) {
      fetchDetail()
      if (isPengurus) fetchOfficers()
    }
  }, [userLoading, fetchDetail, isPengurus])

  // Load officer list via admin-access call
  useEffect(() => {
    if (!isPengurus) return
    fetch('/api/insiden/officers').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.officers) setOfficerList(d.officers)
    }).catch(() => {})
  }, [isPengurus])

  // ── Status update ────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (newStatus: StatusInsiden) => {
    setStatusError('')
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/insiden/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus, catatan: statusNote || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatusNote('')
      await fetchDetail()
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : 'Gagal memperbarui status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!insiden) {
    return (
      <div className="text-center py-5">
        <FiAlertTriangle size={40} className="text-muted mb-3" />
        <p className="text-muted">Laporan tidak ditemukan atau Anda tidak memiliki akses.</p>
        <Link href="/insiden" className="btn btn-danger btn-sm">Kembali ke Daftar</Link>
      </div>
    )
  }

  const nextStatuses  = VALID_TRANSITIONS[insiden.status] || []
  const isClosed      = insiden.status === 'ditutup'
  const isNearMiss    = insiden.jenis === 'hampir_celaka'
  const jenisColor    = isNearMiss ? '#7c3aed' : '#dc2626'

  return (
    <div className="fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <Link href="/insiden" className="btn btn-outline-secondary btn-sm">
          <FiArrowLeft className="me-1" />Kembali
        </Link>
        <div className="d-flex gap-2 flex-wrap">
          {isPengurus && insiden.status === 'dilaporkan' && (
            <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-outline-warning">
              <FiSearch className="me-1" />Mulai Investigasi
            </Link>
          )}
          {isPengurus && insiden.investigasi && insiden.investigasi.status === 'draft' && (
            <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-outline-warning">
              <FiClipboard className="me-1" />Lanjutkan Investigasi
            </Link>
          )}
          {isPengurus && insiden.status === 'dalam_investigasi' && !insiden.investigasi && (
            <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-warning">
              <FiSearch className="me-1" />Isi Form Investigasi
            </Link>
          )}
          {/* PDF report link — officers always, pelapor only when selesai/ditutup */}
          {(isPengurus || (insiden.pelapor_id === user?.id && ['selesai', 'ditutup'].includes(insiden.status))) && (
            <Link href={`/insiden/${id}/laporan`} className="btn btn-sm btn-outline-danger">
              <FiFileText className="me-1" />Laporan PDF
            </Link>
          )}
        </div>
      </div>

      {/* ── Status banner ─────────────────────────────────────────────── */}
      <div
        className="rounded p-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{
          background: isClosed ? '#f3f4f6' : '#fff7ed',
          border: `1px solid ${isClosed ? '#d1d5db' : '#fed7aa'}`,
        }}
      >
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span
            className="fw-bold rounded px-2 py-1"
            style={{ background: jenisColor, color: '#fff', fontSize: '0.72rem' }}
          >
            {JENIS_INSIDEN_LABELS[insiden.jenis]}
          </span>
          <span className="text-muted fw-mono" style={{ fontSize: '0.8rem' }}>{insiden.kode_insiden}</span>
          <InsidenStatusBadge status={insiden.status} size="md" />
          <TingkatKeparahanBadge tingkat={insiden.tingkat_keparahan} showIcon />
        </div>
        <small className="text-muted">{formatDateTime(insiden.created_at)}</small>
      </div>

      <div className="row">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="col-lg-8 mb-4">

          {/* Info grid */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="d-flex gap-2">
                    <FiCalendar className="text-muted flex-shrink-0 mt-1" size={14} />
                    <div>
                      <div className="small text-muted">Tanggal Kejadian</div>
                      <div className="fw-semibold">
                        {formatDate(insiden.tanggal_kejadian)}
                        {insiden.waktu_kejadian && ` · ${insiden.waktu_kejadian}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex gap-2">
                    <FiMapPin className="text-muted flex-shrink-0 mt-1" size={14} />
                    <div>
                      <div className="small text-muted">Lokasi</div>
                      <div className="fw-semibold">{insiden.lokasi}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex gap-2">
                    <FiAlertTriangle className="text-muted flex-shrink-0 mt-1" size={14} />
                    <div>
                      <div className="small text-muted">Dampak</div>
                      <div className="fw-semibold">{DAMPAK_INSIDEN_LABELS[insiden.dampak]}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex gap-2">
                    <FiUser className="text-muted flex-shrink-0 mt-1" size={14} />
                    <div>
                      <div className="small text-muted">Dilaporkan oleh</div>
                      <div className="fw-semibold">
                        {insiden.is_anonim && !isPengurus ? 'Anonim' : (insiden.pelapor_nama || '—')}
                        {insiden.is_anonim && (
                          <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}>Anonim</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deskripsi */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold">Deskripsi Kejadian</h6>
            </div>
            <div className="card-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0 }}>{insiden.deskripsi}</p>
            </div>
          </div>

          {/* Photos */}
          {insiden.foto_urls?.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0 fw-bold"><FiCamera className="me-2" />Foto Bukti ({insiden.foto_urls.length})</h6>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  {insiden.foto_urls.map((url, i) => (
                    <div key={i} className="col-4 col-md-3">
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="rounded"
                        style={{ width: '100%', height: 110, objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => setPhotoModal(url)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Investigation summary (read-only if final) */}
          {insiden.investigasi && (
            <div className="card mb-4" style={{ borderLeft: '4px solid #d97706' }}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold"><FiSearch className="me-2" />Investigasi</h6>
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="badge"
                    style={{
                      background: insiden.investigasi.status === 'final' ? '#059669' : '#d97706',
                      fontSize: '0.65rem',
                    }}
                  >
                    {insiden.investigasi.status === 'final' ? 'Final' : 'Draft'}
                  </span>
                  {isPengurus && insiden.investigasi.status === 'draft' && (
                    <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-outline-warning" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      Edit
                    </Link>
                  )}
                </div>
              </div>
              <div className="card-body">
                {insiden.investigasi.investigator_nama && (
                  <p className="text-muted small mb-3">
                    Investigator: <strong>{insiden.investigasi.investigator_nama}</strong>
                    {insiden.investigasi.tanggal_investigasi && ` · ${formatDate(insiden.investigasi.tanggal_investigasi)}`}
                  </p>
                )}

                {insiden.investigasi.akar_penyebab && (
                  <div className="mb-3">
                    <div className="small fw-semibold text-muted mb-1">Akar Penyebab</div>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                      {insiden.investigasi.akar_penyebab}
                    </p>
                  </div>
                )}

                {insiden.investigasi.kesimpulan && (
                  <div>
                    <div className="small fw-semibold text-muted mb-1">Kesimpulan</div>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                      {insiden.investigasi.kesimpulan}
                    </p>
                  </div>
                )}

                {isPengurus && (
                  <div className="mt-3 pt-3 border-top text-end">
                    <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-outline-secondary">
                      Lihat Detail Investigasi →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start investigation prompt (officers, right status) */}
          {isPengurus && insiden.status === 'dalam_investigasi' && !insiden.investigasi && (
            <div
              className="rounded p-4 mb-4 text-center"
              style={{ border: '2px dashed #fde68a', background: '#fffbeb' }}
            >
              <FiClipboard size={32} className="mb-2" style={{ color: '#d97706' }} />
              <p className="fw-semibold mb-2" style={{ color: '#92400e' }}>Investigasi belum dimulai</p>
              <Link href={`/insiden/${id}/investigasi`} className="btn btn-warning btn-sm">
                <FiSearch className="me-1" />Mulai Isi Form Investigasi
              </Link>
            </div>
          )}

          {/* Action items */}
          {(isPengurus || insiden.tindakan?.length > 0) && (
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">Rencana Tindakan</h6>
                {insiden.tindakan?.length > 0 && (
                  <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                    {insiden.tindakan.filter(t => t.status === 'selesai').length}/{insiden.tindakan.length} selesai
                  </span>
                )}
              </div>
              <div className="card-body">
                <TindakanList
                  insidenId={id}
                  tindakan={insiden.tindakan || []}
                  canManage={canManage}
                  canDelete={canDelete}
                  officerList={officerList}
                  onChange={fetchDetail}
                />
              </div>
            </div>
          )}

          {/* Closed notice */}
          {isClosed && (
            <div
              className="rounded p-3 mb-4 d-flex gap-2"
              style={{ background: '#f3f4f6', border: '1px solid #d1d5db' }}
            >
              <FiCheckCircle className="flex-shrink-0 mt-1 text-muted" />
              <div>
                <div className="fw-semibold text-muted">Insiden ditutup</div>
                <div className="text-muted small">Laporan ini telah ditutup dan tidak dapat diubah lagi.</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar: status update + timeline ─────────────────────── */}
        <div className="col-lg-4">

          {/* Status Update Panel (officers only, not closed) */}
          {isPengurus && !isClosed && nextStatuses.length > 0 && (
            <div className="card mb-4" style={{ border: '1px solid #fed7aa' }}>
              <div className="card-header" style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                <h6 className="mb-0 fw-bold" style={{ color: '#92400e' }}>Update Status</h6>
              </div>
              <div className="card-body">
                {statusError && (
                  <div className="alert alert-danger py-2 small mb-3">{statusError}</div>
                )}
                <div className="mb-3">
                  <label className="form-label small">Catatan (opsional)</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Catatan untuk perubahan status ini..."
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                  />
                </div>

                {nextStatuses.map(ns => (
                  <button
                    key={ns}
                    className="btn btn-sm w-100 mb-2"
                    style={{
                      background: ns === 'selesai' || ns === 'ditutup' ? '#059669' : '#d97706',
                      color: '#fff',
                      border: 'none',
                    }}
                    onClick={() => handleStatusUpdate(ns)}
                    disabled={updatingStatus}
                  >
                    {updatingStatus
                      ? <span className="spinner-border spinner-border-sm me-2" />
                      : null
                    }
                    Ubah ke: {STATUS_INSIDEN_LABELS[ns]}
                  </button>
                ))}

                {/* Advance to investigasi also requires navigation */}
                {insiden.status === 'dilaporkan' && (
                  <div className="mt-2 pt-2 border-top">
                    <small className="text-muted d-block mb-1">Atau langsung mulai investigasi:</small>
                    <Link href={`/insiden/${id}/investigasi`} className="btn btn-sm btn-outline-warning w-100">
                      <FiSearch className="me-1" />Buka Form Investigasi
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-header">
              <h6 className="mb-0 fw-bold">Timeline</h6>
            </div>
            <div className="card-body">
              <InsidenTimeline timeline={insiden.timeline || []} />
            </div>
          </div>
        </div>
      </div>

      {/* Photo zoom modal */}
      {photoModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => setPhotoModal(null)}
        >
          <button
            className="btn btn-light position-absolute d-flex align-items-center justify-content-center"
            style={{ top: 20, right: 20, borderRadius: '50%', width: 40, height: 40 }}
            onClick={() => setPhotoModal(null)}
          >
            <FiX size={18} />
          </button>
          <img
            src={photoModal}
            alt="Zoom"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
