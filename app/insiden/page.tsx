'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { Insiden, StatusInsiden, JenisInsiden, STATUS_INSIDEN_LABELS, JENIS_INSIDEN_LABELS } from '@/types'
import InsidenCard from '@/components/insiden/InsidenCard'
import {
  FiPlus, FiAlertTriangle, FiChevronLeft, FiChevronRight,
  FiShield, FiSearch, FiTool, FiCheckCircle,
} from 'react-icons/fi'

type InsidenWithPelapor = Insiden & { pelapor_nama?: string }

interface Stats {
  total: number
  dalam_investigasi: number
  menunggu_tindakan: number
  selesai_bulan_ini: number
}

const STATUS_FILTER_OPTIONS: { value: StatusInsiden | ''; label: string }[] = [
  { value: '',                  label: 'Semua Status' },
  { value: 'dilaporkan',        label: STATUS_INSIDEN_LABELS.dilaporkan },
  { value: 'dalam_investigasi', label: STATUS_INSIDEN_LABELS.dalam_investigasi },
  { value: 'menunggu_tindakan', label: STATUS_INSIDEN_LABELS.menunggu_tindakan },
  { value: 'selesai',           label: STATUS_INSIDEN_LABELS.selesai },
  { value: 'ditutup',           label: STATUS_INSIDEN_LABELS.ditutup },
]

const JENIS_FILTER_OPTIONS: { value: JenisInsiden | ''; label: string }[] = [
  { value: '',             label: 'Semua Jenis' },
  { value: 'insiden',      label: JENIS_INSIDEN_LABELS.insiden },
  { value: 'hampir_celaka', label: 'Hampir Celaka' },
]

export default function InsidenPage() {
  const { userData, isRW, isPengurus, loading: userLoading } = useUser()

  const [list,         setList]         = useState<InsidenWithPelapor[]>([])
  const [loading,      setLoading]      = useState(true)
  const [stats,        setStats]        = useState<Stats>({ total: 0, dalam_investigasi: 0, menunggu_tindakan: 0, selesai_bulan_ini: 0 })
  const [totalCount,   setTotalCount]   = useState(0)
  const [page,         setPage]         = useState(1)
  const [filterStatus, setFilterStatus] = useState<StatusInsiden | ''>('')
  const [filterJenis,  setFilterJenis]  = useState<JenisInsiden | ''>('')

  const fetchInsiden = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filterStatus) params.set('status', filterStatus)
      if (filterJenis)  params.set('jenis', filterJenis)

      const res = await fetch(`/api/insiden?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setList(data.data || [])
      setTotalCount(data.count || 0)
    } catch (err) {
      console.error('Fetch insiden error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterJenis])

  // Fetch stats separately (unfiltered totals for officer dashboard)
  const fetchStats = useCallback(async () => {
    try {
      const [all, inv, tindakan] = await Promise.all([
        fetch('/api/insiden?page=1').then(r => r.json()),
        fetch('/api/insiden?status=dalam_investigasi&page=1').then(r => r.json()),
        fetch('/api/insiden?status=menunggu_tindakan&page=1').then(r => r.json()),
      ])

      // selesai this month: filter client-side from full list
      const thisMonth = new Date().toISOString().slice(0, 7)
      const selesaiRes = await fetch('/api/insiden?status=selesai&page=1').then(r => r.json())
      const selesaiBulanIni = (selesaiRes.data || []).filter(
        (i: Insiden) => i.updated_at?.startsWith(thisMonth)
      ).length

      setStats({
        total:             all.count || 0,
        dalam_investigasi: inv.count || 0,
        menunggu_tindakan: tindakan.count || 0,
        selesai_bulan_ini: selesaiBulanIni,
      })
    } catch (err) {
      console.error('Fetch stats error:', err)
    }
  }, [])

  useEffect(() => {
    if (!userLoading) {
      fetchInsiden()
      if (isPengurus) fetchStats()
    }
  }, [userLoading, fetchInsiden, isPengurus, fetchStats])

  const handleFilterChange = (status: StatusInsiden | '', jenis: JenisInsiden | '') => {
    setFilterStatus(status)
    setFilterJenis(jenis)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / 12)

  if (userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">Laporan Insiden & Hampir Celaka</h1>
          <p className="text-muted mb-0">
            {isRW
              ? 'Semua laporan insiden di lingkungan RW 013'
              : isPengurus
              ? 'Laporan insiden di wilayah Anda'
              : 'Laporkan kejadian berbahaya untuk keselamatan bersama'}
          </p>
        </div>
        {userData?.is_verified && (
          <Link href="/insiden/laporkan" className="btn btn-danger">
            <FiPlus className="me-2" />Laporkan Insiden
          </Link>
        )}
      </div>

      {/* ── Stats cards (officers only) ────────────────────────────────────── */}
      {isPengurus && (
        <div className="row g-3 mb-4">
          {[
            { label: 'Total Laporan',     value: stats.total,             icon: <FiAlertTriangle size={18} />, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Dalam Investigasi', value: stats.dalam_investigasi, icon: <FiSearch size={18} />,        color: '#d97706', bg: '#fef3c7' },
            { label: 'Menunggu Tindakan', value: stats.menunggu_tindakan, icon: <FiTool size={18} />,          color: '#0ea5e9', bg: '#e0f2fe' },
            { label: 'Selesai Bulan Ini', value: stats.selesai_bulan_ini, icon: <FiCheckCircle size={18} />,   color: '#059669', bg: '#d1fae5' },
          ].map(s => (
            <div key={s.label} className="col-6 col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center gap-3">
                  <div
                    className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 40, height: 40, background: s.bg, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="fw-bold fs-5 lh-1">{s.value}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Safety reminder banner (warga only) ──────────────────────────── */}
      {!isPengurus && (
        <div
          className="rounded p-3 mb-4 d-flex align-items-start gap-3"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <FiShield size={20} style={{ color: '#ea580c', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.83rem' }}>
            <strong style={{ color: '#ea580c' }}>Keselamatan adalah tanggung jawab bersama.</strong>
            <span className="text-muted ms-1">
              Laporkan setiap insiden atau kejadian hampir celaka agar dapat diinvestigasi dan dicegah di masa depan.
              Laporan Anda dapat dikirim secara anonim.
            </span>
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-3 col-6">
              <select
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={e => handleFilterChange(e.target.value as StatusInsiden | '', filterJenis)}
              >
                {STATUS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <select
                className="form-select form-select-sm"
                value={filterJenis}
                onChange={e => handleFilterChange(filterStatus, e.target.value as JenisInsiden | '')}
              >
                {JENIS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <small className="text-muted">{totalCount} laporan ditemukan</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-5">
          <FiAlertTriangle size={48} className="text-muted mb-3" />
          <p className="text-muted mb-2">Belum ada laporan insiden</p>
          {userData?.is_verified && (
            <Link href="/insiden/laporkan" className="btn btn-sm btn-danger">
              <FiPlus className="me-1" />Buat Laporan Pertama
            </Link>
          )}
        </div>
      ) : (
        <>
          {list.map(insiden => (
            <InsidenCard
              key={insiden.id}
              insiden={insiden}
              showPelapor={isPengurus}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="d-flex justify-content-center mt-4">
              <ul className="pagination pagination-sm">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <FiChevronLeft />
                  </button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pn = i + 1
                  if (totalPages > 5) {
                    if (page > 3) pn = page - 2 + i
                    if (page > totalPages - 2) pn = totalPages - 4 + i
                  }
                  return (
                    <li key={pn} className={`page-item ${page === pn ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(pn)}>{pn}</button>
                    </li>
                  )
                })}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <FiChevronRight />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
