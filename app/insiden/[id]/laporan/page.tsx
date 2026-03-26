'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { InsidenDetail, JENIS_INSIDEN_LABELS, DAMPAK_INSIDEN_LABELS, TINGKAT_KEPARAHAN_LABELS, STATUS_INSIDEN_LABELS } from '@/types'
import InsidenPDFGenerator from '@/components/insiden/InsidenPDFGenerator'
import InsidenStatusBadge from '@/components/insiden/InsidenStatusBadge'
import TingkatKeparahanBadge from '@/components/insiden/TingkatKeparahanBadge'
import { FiArrowLeft, FiFileText, FiLock, FiAlertTriangle, FiInfo } from 'react-icons/fi'

export default function LaporanPage() {
  const params = useParams()
  const router = useRouter()
  const { isPengurus, loading: userLoading, userData } = useUser()

  const id = params.id as string

  const [insiden, setInsiden] = useState<InsidenDetail | null>(null)
  const [ketuaRW, setKetuaRW] = useState('Ketua RW 013')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/insiden/${id}`)
      if (!res.ok) { router.push('/insiden'); return }
      const data: InsidenDetail = await res.json()
      setInsiden(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  // Fetch Ketua RW name for the signature
  const fetchKetuaRW = useCallback(async () => {
    try {
      const res = await fetch('/api/insiden/officers')
      if (!res.ok) return
      const { officers } = await res.json()
      const ketua = officers.find((o: { role: string; nama_lengkap: string }) => o.role === 'ketua_rw')
      if (ketua) setKetuaRW(ketua.nama_lengkap)
    } catch {
      // fallback to default
    }
  }, [])

  useEffect(() => {
    if (!userLoading) {
      fetchData()
      if (isPengurus) fetchKetuaRW()
    }
  }, [userLoading, fetchData, fetchKetuaRW, isPengurus])

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
        <p className="text-muted">Laporan insiden tidak ditemukan.</p>
        <Link href="/insiden" className="btn btn-sm btn-danger">Ke Daftar Insiden</Link>
      </div>
    )
  }

  // Access control:
  // - Officers (pengurus): always allowed
  // - Pelapor: only if status is selesai or ditutup
  const isOwnReport = insiden.pelapor_id === userData?.id
  const isCompleted = ['selesai', 'ditutup'].includes(insiden.status)
  const canAccess   = isPengurus || (isOwnReport && isCompleted)

  if (!canAccess) {
    return (
      <div className="text-center py-5">
        <FiLock size={40} className="text-muted mb-3" />
        <p className="text-muted mb-1">
          {isOwnReport
            ? 'Laporan PDF tersedia setelah insiden selesai ditangani.'
            : 'Anda tidak memiliki akses ke halaman ini.'}
        </p>
        <Link href={`/insiden/${id}`} className="btn btn-sm btn-outline-secondary">Kembali</Link>
      </div>
    )
  }

  const hasInvestigation = !!insiden.investigasi
  const isFinal          = insiden.investigasi?.status === 'final'

  return (
    <div className="fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 gap-2">
        <div className="d-flex align-items-center gap-3">
          <Link href={`/insiden/${id}`} className="btn btn-outline-secondary btn-sm">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="page-title mb-0">
              <FiFileText className="me-2" />
              Laporan PDF
            </h1>
            <small className="text-muted">
              {insiden.kode_insiden} · {JENIS_INSIDEN_LABELS[insiden.jenis]}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <InsidenStatusBadge status={insiden.status} size="md" />
          <TingkatKeparahanBadge tingkat={insiden.tingkat_keparahan} showIcon />
        </div>
      </div>

      {/* ── Report Preview Card ──────────────────────────────────────────── */}
      <div className="row justify-content-center">
        <div className="col-lg-9">

          {/* Investigation draft warning */}
          {hasInvestigation && !isFinal && isPengurus && (
            <div
              className="rounded p-3 mb-4 d-flex gap-2 align-items-start"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
            >
              <FiInfo size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.83rem' }}>
                <strong style={{ color: '#d97706' }}>Investigasi masih berstatus Draft.</strong>
                <span className="text-muted ms-1">
                  PDF akan menyertakan data draft. Finalisasi investigasi terlebih dahulu untuk laporan resmi.
                </span>
              </div>
            </div>
          )}

          {/* No investigation notice for non-officers */}
          {!hasInvestigation && !isPengurus && (
            <div
              className="rounded p-3 mb-4 d-flex gap-2 align-items-start"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <FiInfo size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.83rem' }}>
                <span className="text-muted">
                  Laporan ini belum menyertakan hasil investigasi. PDF hanya memuat informasi insiden.
                </span>
              </div>
            </div>
          )}

          {/* Summary card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header" style={{ background: '#f8f9fa' }}>
              <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.9rem' }}>Ringkasan Laporan</h6>
            </div>
            <div className="card-body">
              <div className="row g-3" style={{ fontSize: '0.85rem' }}>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Kode Insiden</div>
                  <div className="fw-semibold font-monospace">{insiden.kode_insiden}</div>
                </div>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Jenis</div>
                  <div>{JENIS_INSIDEN_LABELS[insiden.jenis]}</div>
                </div>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Tanggal Kejadian</div>
                  <div>
                    {new Date(insiden.tanggal_kejadian).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                    {insiden.waktu_kejadian && (
                      <span className="text-muted ms-2">{insiden.waktu_kejadian.slice(0, 5)}</span>
                    )}
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Lokasi</div>
                  <div>{insiden.lokasi}</div>
                </div>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Dampak</div>
                  <div>{DAMPAK_INSIDEN_LABELS[insiden.dampak]}</div>
                </div>

                <div className="col-sm-6">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Tingkat Keparahan</div>
                  <div>{TINGKAT_KEPARAHAN_LABELS[insiden.tingkat_keparahan]}</div>
                </div>

                <div className="col-12">
                  <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Deskripsi</div>
                  <div
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {insiden.deskripsi}
                  </div>
                </div>

                {hasInvestigation && (
                  <>
                    <div className="col-12">
                      <hr className="my-1" />
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Investigator</div>
                      <div>{insiden.investigasi?.investigator?.nama_lengkap || '-'}</div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Status Investigasi</div>
                      <div>
                        <span
                          className={`badge ${isFinal ? 'bg-success' : 'bg-warning text-dark'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {isFinal ? 'Final' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="text-muted mb-1" style={{ fontSize: '0.72rem' }}>Jumlah Tindakan</div>
                      <div>{insiden.tindakan.length} tindakan</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* PDF contents checklist */}
          <div className="card shadow-sm mb-4">
            <div className="card-header" style={{ background: '#f8f9fa' }}>
              <h6 className="mb-0 fw-semibold" style={{ fontSize: '0.9rem' }}>Konten PDF</h6>
            </div>
            <div className="card-body py-3">
              <ul className="list-unstyled mb-0" style={{ fontSize: '0.85rem' }}>
                {[
                  { label: 'Informasi insiden (kode, jenis, tanggal, lokasi, dampak)', always: true },
                  { label: 'Deskripsi kejadian', always: true },
                  { label: 'Tindakan segera', show: !!insiden.investigasi?.tindakan_segera },
                  { label: 'Kronologi investigasi', show: !!insiden.investigasi?.kronologi },
                  { label: 'Analisis 5 Whys', show: !!insiden.investigasi?.analisis_5why?.length },
                  { label: 'Faktor penyebab (manusia/lingkungan/sistem)', show: !!(insiden.investigasi?.faktor_manusia || insiden.investigasi?.faktor_lingkungan || insiden.investigasi?.faktor_sistem) },
                  { label: 'Akar penyebab', show: !!insiden.investigasi?.akar_penyebab },
                  { label: `Rencana tindakan (${insiden.tindakan.length} item)`, show: insiden.tindakan.length > 0 },
                  { label: 'Kesimpulan investigasi', show: !!insiden.investigasi?.kesimpulan },
                  { label: 'Kolom tanda tangan', show: hasInvestigation },
                ].map((item, i) => {
                  const included = item.always || item.show
                  return (
                    <li key={i} className="d-flex align-items-center gap-2 mb-1">
                      <span style={{ color: included ? '#059669' : '#9ca3af', fontSize: '0.75rem' }}>
                        {included ? '✓' : '○'}
                      </span>
                      <span style={{ color: included ? 'inherit' : '#9ca3af' }}>{item.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Download button */}
          <div className="d-flex justify-content-center gap-3 pb-4">
            <Link href={`/insiden/${id}`} className="btn btn-outline-secondary">
              <FiArrowLeft size={14} className="me-1" />
              Kembali
            </Link>
            <InsidenPDFGenerator data={insiden} ketuaRW={ketuaRW} />
          </div>
        </div>
      </div>
    </div>
  )
}
