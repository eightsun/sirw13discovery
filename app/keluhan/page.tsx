'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Keluhan, KategoriKeluhan, StatusKeluhan } from '@/types'
import {
  FiPlus, FiAlertTriangle, FiFilter, FiEye, FiChevronLeft, FiChevronRight,
  FiClock, FiCheckCircle, FiSearch as FiSearchIcon, FiXCircle
} from 'react-icons/fi'

const KATEGORI_LABELS: Record<KategoriKeluhan, string> = {
  keselamatan: 'Keselamatan', kebersihan: 'Kebersihan', keamanan: 'Keamanan',
  ketertiban: 'Ketertiban', kenyamanan: 'Kenyamanan', infrastruktur: 'Infrastruktur',
  fasilitas_umum: 'Fasilitas Umum', penerangan: 'Penerangan', saluran_air: 'Saluran Air', lainnya: 'Lainnya',
}

const STATUS_CONFIG: Record<StatusKeluhan, { label: string; color: string; icon: React.ReactNode }> = {
  dikirim: { label: 'Dikirim', color: 'bg-info', icon: <FiClock size={12} /> },
  ditinjau: { label: 'Ditinjau', color: 'bg-warning text-dark', icon: <FiEye size={12} /> },
  dikerjakan: { label: 'Dikerjakan', color: 'bg-primary', icon: <FiSearchIcon size={12} /> },
  selesai: { label: 'Selesai', color: 'bg-success', icon: <FiCheckCircle size={12} /> },
  ditolak: { label: 'Ditolak', color: 'bg-danger', icon: <FiXCircle size={12} /> },
}

const PER_PAGE = 10

export default function KeluhanPage() {
  const { userData, isRW, isRT, loading: userLoading } = useUser()
  const supabase = createClient()

  const [keluhanList, setKeluhanList] = useState<Keluhan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => { fetchKeluhan() }, [filterStatus, filterKategori, page])

  const fetchKeluhan = async () => {
    setLoading(true)
    try {
      const from = (page - 1) * PER_PAGE
      let query = supabase
        .from('keluhan')
        .select('*, rt:rt_id(nomor_rt)', { count: 'exact' })

      if (filterStatus) query = query.eq('status', filterStatus)
      if (filterKategori) query = query.eq('kategori', filterKategori)

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, from + PER_PAGE - 1)

      if (error) throw error
      setKeluhanList(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div className="fade-in">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">Laporan Keluhan Warga</h1>
          <p className="text-muted mb-0">
            {isRW ? 'Semua laporan keluhan warga RW 013' : isRT ? 'Laporan keluhan warga RT Anda' : 'Laporan keluhan Anda'}
          </p>
        </div>
        {userData?.warga_id && (
          <Link href="/keluhan/buat" className="btn btn-danger">
            <FiPlus className="me-2" />Buat Laporan
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-3 col-6">
              <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
                <option value="">Semua Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <select className="form-select form-select-sm" value={filterKategori} onChange={(e) => { setFilterKategori(e.target.value); setPage(1) }}>
                <option value="">Semua Kategori</option>
                {Object.entries(KATEGORI_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-md-6"><small className="text-muted">{totalCount} laporan ditemukan</small></div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : keluhanList.length === 0 ? (
        <div className="text-center py-5">
          <FiAlertTriangle size={48} className="text-muted mb-3" />
          <p className="text-muted">Belum ada laporan keluhan</p>
        </div>
      ) : (
        <>
          {keluhanList.map((k: Keluhan) => {
            const statusCfg = STATUS_CONFIG[k.status]
            return (
              <Link key={k.id} href={`/keluhan/${k.id}`} className="text-decoration-none d-block mb-3">
                <div className="card border-0 shadow-sm" style={{ transition: 'transform 0.15s', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}>
                  <div className="card-body py-3">
                    <div className="d-flex gap-3 align-items-start">
                      {k.foto_urls && k.foto_urls.length > 0 && (
                        <div className="flex-shrink-0 d-none d-sm-block" style={{ width: '80px', height: '60px', borderRadius: '0.375rem', overflow: 'hidden' }}>
                          <img src={k.foto_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div className="flex-grow-1 min-width-0">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div className="d-flex flex-wrap gap-1 align-items-center">
                            <span className="badge bg-secondary" style={{ fontSize: '0.65rem' }}>{k.nomor_laporan}</span>
                            <span className={`badge ${statusCfg.color}`} style={{ fontSize: '0.65rem' }}>{statusCfg.icon} <span className="ms-1">{statusCfg.label}</span></span>
                            <span className="badge bg-outline-dark border text-dark" style={{ fontSize: '0.6rem' }}>{KATEGORI_LABELS[k.kategori]}</span>
                          </div>
                          <small className="text-muted flex-shrink-0 ms-2">{formatDate(k.created_at)}</small>
                        </div>
                        <p className="mb-1 text-dark" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                          {k.detail_keluhan}
                        </p>
                        <div className="d-flex justify-content-between small text-muted">
                          <span>{k.nama_pelapor} · {k.blok_rumah} No.{k.nomor_rumah}</span>
                          {k.rt && <span>RT {k.rt.nomor_rt}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="d-flex justify-content-center mt-4">
              <ul className="pagination pagination-sm">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p: number) => Math.max(1, p - 1))}><FiChevronLeft /></button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pn = i + 1
                  if (totalPages > 5) { if (page > 3) pn = page - 2 + i; if (page > totalPages - 2) pn = totalPages - 4 + i }
                  return <li key={pn} className={`page-item ${page === pn ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(pn)}>{pn}</button></li>
                })}
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}><FiChevronRight /></button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  )
}