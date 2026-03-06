'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Kegiatan, KategoriKegiatan } from '@/types'
import { 
  FiCalendar, FiMapPin, FiUsers, FiPlus, FiFilter,
  FiClock, FiTag, FiDollarSign, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'

const KATEGORI_LABELS: Record<KategoriKegiatan, string> = {
  keagamaan: 'Keagamaan',
  olahraga: 'Olahraga',
  sosial: 'Sosial',
  rapat: 'Rapat',
  gotong_royong: 'Gotong Royong',
  pendidikan: 'Pendidikan',
  kesehatan: 'Kesehatan',
  kesenian: 'Kesenian',
  lingkungan: 'Lingkungan',
  lainnya: 'Lainnya',
}

const KATEGORI_COLORS: Record<KategoriKegiatan, string> = {
  keagamaan: 'bg-success',
  olahraga: 'bg-primary',
  sosial: 'bg-info',
  rapat: 'bg-secondary',
  gotong_royong: 'bg-warning text-dark',
  pendidikan: 'bg-purple',
  kesehatan: 'bg-danger',
  kesenian: 'bg-pink',
  lingkungan: 'bg-success',
  lainnya: 'bg-dark',
}

const KATEGORI_ICONS: Record<KategoriKegiatan, string> = {
  keagamaan: '🕌',
  olahraga: '⚽',
  sosial: '🤝',
  rapat: '📋',
  gotong_royong: '🧹',
  pendidikan: '📚',
  kesehatan: '🏥',
  kesenian: '🎨',
  lingkungan: '🌿',
  lainnya: '📌',
}

const PER_PAGE = 10

export default function KegiatanPage() {
  const { userData, loading: userLoading } = useUser()
  const supabase = createClient()
  
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKategori, setFilterKategori] = useState<string>('')
  const [filterWaktu, setFilterWaktu] = useState<string>('upcoming') // upcoming, past, all
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [rtMap, setRtMap] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('rt').select('id, nomor_rt').order('nomor_rt').then(({ data }: { data: { id: string; nomor_rt: string }[] | null }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((rt: { id: string; nomor_rt: string }) => { map[rt.id] = rt.nomor_rt })
        setRtMap(map)
      }
    })
  }, [])

  useEffect(() => {
    fetchKegiatan()
  }, [filterKategori, filterWaktu, page])

  const fetchKegiatan = async () => {
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const from = (page - 1) * PER_PAGE
      const to = from + PER_PAGE - 1

      let query = supabase
        .from('kegiatan')
        .select(`
          *,
          penyelenggara:created_by(nama_lengkap, email)
        `, { count: 'exact' })
        .in('status', ['published', 'completed'])

      if (filterKategori) {
        query = query.eq('kategori', filterKategori)
      }

      if (filterWaktu === 'upcoming') {
        query = query.gte('tanggal_mulai', now).order('tanggal_mulai', { ascending: true })
      } else if (filterWaktu === 'past') {
        query = query.lt('tanggal_mulai', now).order('tanggal_mulai', { ascending: false })
      } else {
        query = query.order('tanggal_mulai', { ascending: false })
      }

      const { data, count, error } = await query.range(from, to)

      if (error) throw error

      // Get participation counts
      if (data && data.length > 0) {
        const ids = data.map((k: Kegiatan) => k.id)
        const { data: partCounts } = await supabase
          .from('kegiatan_partisipasi')
          .select('kegiatan_id')
          .in('kegiatan_id', ids)
          .eq('status', 'registered')

        const countMap: Record<string, number> = {}
        partCounts?.forEach((p: { kegiatan_id: string }) => {
          countMap[p.kegiatan_id] = (countMap[p.kegiatan_id] || 0) + 1
        })

        data.forEach((k: Kegiatan) => {
          k.partisipasi_count = countMap[k.id] || 0
        })
      }

      setKegiatanList(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching kegiatan:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTanggal = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { 
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
    })
  }

  const formatJam = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const isUpcoming = (dateStr: string) => new Date(dateStr) > new Date()

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">Kegiatan Warga</h1>
          <p className="text-muted mb-0">Jadwal kegiatan dan acara di lingkungan RW 013</p>
        </div>
        {userData?.warga_id && (
          <Link href="/kegiatan/buat" className="btn btn-primary">
            <FiPlus className="me-2" />
            Buat Kegiatan
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-4 col-6">
              <select 
                className="form-select form-select-sm"
                value={filterWaktu}
                onChange={(e) => { setFilterWaktu(e.target.value); setPage(1) }}
              >
                <option value="upcoming">Akan Datang</option>
                <option value="past">Sudah Lewat</option>
                <option value="all">Semua</option>
              </select>
            </div>
            <div className="col-md-4 col-6">
              <select 
                className="form-select form-select-sm"
                value={filterKategori}
                onChange={(e) => { setFilterKategori(e.target.value); setPage(1) }}
              >
                <option value="">Semua Kategori</option>
                {Object.entries(KATEGORI_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <small className="text-muted">
                {totalCount} kegiatan ditemukan
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : kegiatanList.length === 0 ? (
        <div className="text-center py-5">
          <FiCalendar size={48} className="text-muted mb-3" />
          <p className="text-muted">Belum ada kegiatan {filterWaktu === 'upcoming' ? 'yang akan datang' : ''}</p>
          {userData?.warga_id && (
            <Link href="/kegiatan/buat" className="btn btn-primary mt-2">
              <FiPlus className="me-2" />
              Buat Kegiatan Pertama
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Event Cards */}
          <div className="row">
            {kegiatanList.map((k) => (
              <div key={k.id} className="col-lg-6 mb-3">
                <Link href={`/kegiatan/${k.id}`} className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm" style={{ transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  >
                    {k.banner_url && (
                      <div style={{ height: '160px', overflow: 'hidden', borderRadius: '0.5rem 0.5rem 0 0' }}>
                        <img 
                          src={k.banner_url} 
                          alt={k.nama_kegiatan}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className={`badge ${KATEGORI_COLORS[k.kategori]} me-2`}>
                          {KATEGORI_ICONS[k.kategori]} {KATEGORI_LABELS[k.kategori]}
                        </span>
                        {k.tipe_biaya === 'berbayar' ? (
                          <span className="badge bg-warning text-dark">
                            <FiDollarSign size={10} className="me-1" />
                            {formatRupiah(k.biaya_per_orang)}
                          </span>
                        ) : (
                          <span className="badge bg-success">Gratis</span>
                        )}
                      </div>

                      <h6 className="fw-bold text-dark mb-2" style={{ lineHeight: 1.3 }}>
                        {k.nama_kegiatan}
                      </h6>

                      {/* RT Target */}
                      {k.target_rt_ids && k.target_rt_ids.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted me-1">Untuk:</small>
                          {k.target_rt_ids.map((rtId: string) => (
                            <span key={rtId} className="badge bg-outline-secondary border text-dark me-1" style={{fontSize:'0.65rem'}}>
                              RT {rtMap[rtId] || '?'}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="small text-muted mb-1">
                        <FiCalendar className="me-1" size={13} />
                        {formatTanggal(k.tanggal_mulai)} · {formatJam(k.tanggal_mulai)}
                        {k.tanggal_selesai && ` - ${formatJam(k.tanggal_selesai)}`}
                      </div>
                      
                      <div className="small text-muted mb-2">
                        <FiMapPin className="me-1" size={13} />
                        {k.lokasi}
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                        <div className="small text-muted">
                          <FiUsers className="me-1" size={13} />
                          {k.partisipasi_count || 0} peserta
                          {k.max_peserta && ` / ${k.max_peserta}`}
                        </div>
                        <div className="small text-muted">
                          oleh {(k.penyelenggara as { nama_lengkap: string })?.nama_lengkap || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    {/* Status ribbon */}
                    {!isUpcoming(k.tanggal_mulai) && (
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="badge bg-secondary">Selesai</span>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>

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
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (page > 3) pageNum = page - 2 + i
                    if (page > totalPages - 2) pageNum = totalPages - 4 + i
                  }
                  return (
                    <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(pageNum)}>{pageNum}</button>
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