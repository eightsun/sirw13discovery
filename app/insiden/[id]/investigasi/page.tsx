'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { InsidenInvestigasi, Insiden, JENIS_INSIDEN_LABELS } from '@/types'
import InvestigasiForm from '@/components/insiden/InvestigasiForm'
import InsidenStatusBadge from '@/components/insiden/InsidenStatusBadge'
import TingkatKeparahanBadge from '@/components/insiden/TingkatKeparahanBadge'
import { FiArrowLeft, FiSearch, FiLock, FiAlertTriangle } from 'react-icons/fi'

export default function InvestigasiPage() {
  const params = useParams()
  const router = useRouter()
  const { isPengurus, loading: userLoading } = useUser()

  const id = params.id as string

  const [insiden,      setInsiden]      = useState<Insiden | null>(null)
  const [investigasi,  setInvestigasi]  = useState<InsidenInvestigasi | null>(null)
  const [loading,      setLoading]      = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [insidenRes, invRes] = await Promise.all([
        fetch(`/api/insiden/${id}`),
        fetch(`/api/insiden/${id}/investigasi`),
      ])

      if (!insidenRes.ok) { router.push('/insiden'); return }
      const insidenData = await insidenRes.json()
      setInsiden(insidenData)

      if (invRes.ok) {
        const invData = await invRes.json()
        setInvestigasi(invData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!userLoading) fetchData()
  }, [userLoading, fetchData])

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isPengurus) {
    return (
      <div className="text-center py-5">
        <FiLock size={40} className="text-muted mb-3" />
        <p className="text-muted mb-1">Halaman ini hanya dapat diakses oleh Pengurus RW/RT.</p>
        <Link href={`/insiden/${id}`} className="btn btn-sm btn-outline-secondary">Kembali</Link>
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

  // Cannot start investigation if not in the right status
  const canInvestigate = ['dilaporkan', 'dalam_investigasi', 'menunggu_tindakan'].includes(insiden.status)
  if (!canInvestigate && !investigasi) {
    return (
      <div className="text-center py-5">
        <FiAlertTriangle size={40} className="text-muted mb-3" />
        <p className="text-muted">Investigasi tidak dapat dimulai pada status saat ini.</p>
        <Link href={`/insiden/${id}`} className="btn btn-sm btn-outline-secondary">Kembali</Link>
      </div>
    )
  }

  // Finalised investigation is read-only unless RW officer
  const isFinalised = investigasi?.status === 'final'

  const isNearMiss = insiden.jenis === 'hampir_celaka'

  return (
    <div className="fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 gap-2">
        <div className="d-flex align-items-center gap-3">
          <Link href={`/insiden/${id}`} className="btn btn-outline-secondary btn-sm">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="page-title mb-0">
              <FiSearch className="me-2" />
              {investigasi ? 'Edit Investigasi' : 'Form Investigasi'}
            </h1>
            <small className="text-muted">
              {insiden.kode_insiden} · {JENIS_INSIDEN_LABELS[insiden.jenis]}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <InsidenStatusBadge status={insiden.status} size="md" />
          <TingkatKeparahanBadge tingkat={insiden.tingkat_keparahan} showIcon />
        </div>
      </div>

      {/* ── Incident context card ─────────────────────────────────────── */}
      <div
        className="rounded p-3 mb-4"
        style={{
          background: isNearMiss ? '#faf5ff' : '#fff1f2',
          border:     `1px solid ${isNearMiss ? '#e9d5ff' : '#fecdd3'}`,
        }}
      >
        <div className="row g-2" style={{ fontSize: '0.82rem' }}>
          <div className="col-sm-4">
            <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Tanggal Kejadian</span>
            <strong>{new Date(insiden.tanggal_kejadian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </div>
          <div className="col-sm-4">
            <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Lokasi</span>
            <strong>{insiden.lokasi}</strong>
          </div>
          <div className="col-sm-4">
            <span className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Deskripsi Singkat</span>
            <span
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {insiden.deskripsi}
            </span>
          </div>
        </div>
      </div>

      {/* ── Finalised notice ─────────────────────────────────────────── */}
      {isFinalised && (
        <div
          className="rounded p-3 mb-4 d-flex gap-2 align-items-start"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <FiLock size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.83rem' }}>
            <strong style={{ color: '#059669' }}>Investigasi telah difinalkan.</strong>
            <span className="text-muted ms-1">
              Hanya Pengurus RW yang dapat mengubah investigasi yang sudah final.
            </span>
          </div>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <InvestigasiForm
            insidenId={id}
            existing={investigasi}
            onSaved={() => {
              router.push(`/insiden/${id}`)
              router.refresh()
            }}
          />
        </div>
      </div>
    </div>
  )
}
