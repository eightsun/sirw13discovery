'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga, RT, Jalan } from '@/types'
import { FiSearch, FiEye, FiRefreshCw } from 'react-icons/fi'

interface RumahData {
  jalan_id: string
  jalan_nama: string
  nomor_rumah: string
  rt_id: string
  rt_nomor: string
  jumlah_kk: number
  jumlah_penghuni: number
  kepala_keluarga: string[]
  warga_list: Warga[]
}

export default function RumahListPage() {
  const { userData, isRW, isRT, isPengurus, loading: userLoading } = useUser()
  const [wargaList, setWargaList] = useState<Warga[]>([])
  const [rtList, setRtList] = useState<RT[]>([])
  const [jalanList, setJalanList] = useState<Jalan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRT, setFilterRT] = useState<string>('')
  const [filterJalan, setFilterJalan] = useState<string>('')
  const [filterJumlahKK, setFilterJumlahKK] = useState<string>('')
  
  const supabase = createClient()

  // Fetch data warga
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('warga')
        .select(`
          *,
          rt:rt_id (id, nomor_rt),
          jalan:jalan_id (id, nama_jalan)
        `)
        .eq('is_active', true)
        .order('nomor_rumah')

      // Filter berdasarkan role
      if (isRT && userData?.rt_id) {
        query = query.eq('rt_id', userData.rt_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setWargaList(data || [])

      // Fetch RT & Jalan untuk filter
      const { data: rtData } = await supabase
        .from('rt')
        .select('*')
        .order('nomor_rt')
      setRtList(rtData || [])

      const { data: jalanData } = await supabase
        .from('jalan')
        .select('*')
        .order('nama_jalan')
      setJalanList(jalanData || [])

    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userLoading && isPengurus) {
      fetchData()
    }
  }, [userLoading, userData, isPengurus])

  // Group warga by rumah (jalan_id + nomor_rumah)
  const rumahList = useMemo(() => {
    const rumahMap = new Map<string, RumahData>()

    wargaList.forEach(warga => {
      if (!warga.jalan_id || !warga.nomor_rumah) return

      const key = `${warga.jalan_id}-${warga.nomor_rumah}`
      
      if (!rumahMap.has(key)) {
        const jalan = warga.jalan as Jalan
        const rt = warga.rt as RT
        rumahMap.set(key, {
          jalan_id: warga.jalan_id,
          jalan_nama: jalan?.nama_jalan || '-',
          nomor_rumah: warga.nomor_rumah,
          rt_id: warga.rt_id,
          rt_nomor: rt?.nomor_rt || '-',
          jumlah_kk: 0,
          jumlah_penghuni: 0,
          kepala_keluarga: [],
          warga_list: []
        })
      }

      const rumah = rumahMap.get(key)!
      rumah.jumlah_penghuni++
      rumah.warga_list.push(warga)

      // Hitung KK unik
      if (warga.hubungan_keluarga === 'kepala_keluarga') {
        rumah.jumlah_kk++
        rumah.kepala_keluarga.push(warga.nama_lengkap)
      }
    })

    // Convert to array and sort
    return Array.from(rumahMap.values()).sort((a, b) => {
      // Sort by jalan, then nomor_rumah
      if (a.jalan_nama !== b.jalan_nama) {
        return a.jalan_nama.localeCompare(b.jalan_nama)
      }
      return a.nomor_rumah.localeCompare(b.nomor_rumah, undefined, { numeric: true })
    })
  }, [wargaList])

  // Filter rumah
  const filteredRumah = useMemo(() => {
    return rumahList.filter(rumah => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchJalan = rumah.jalan_nama.toLowerCase().includes(query)
        const matchNomor = rumah.nomor_rumah.toLowerCase().includes(query)
        const matchKK = rumah.kepala_keluarga.some(kk => kk.toLowerCase().includes(query))
        if (!matchJalan && !matchNomor && !matchKK) return false
      }

      // RT filter
      if (filterRT && rumah.rt_id !== filterRT) return false

      // Jalan filter
      if (filterJalan && rumah.jalan_id !== filterJalan) return false

      // Jumlah KK filter
      if (filterJumlahKK === '1' && rumah.jumlah_kk !== 1) return false
      if (filterJumlahKK === '2+' && rumah.jumlah_kk < 2) return false

      return true
    })
  }, [rumahList, searchQuery, filterRT, filterJalan, filterJumlahKK])

  // Reset filter
  const handleResetFilter = () => {
    setSearchQuery('')
    setFilterRT('')
    setFilterJalan('')
    setFilterJumlahKK('')
  }

  if (userLoading || loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Memuat data...</p>
      </div>
    )
  }

  if (!isPengurus) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-warning" role="alert">
          Anda tidak memiliki akses ke halaman ini
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Daftar Rumah</h1>
          <p className="text-muted mb-0">
            Data rumah dan Kartu Keluarga RW 013 Permata Discovery
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text">
                  <FiSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari alamat, kepala keluarga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterRT}
                onChange={(e) => setFilterRT(e.target.value)}
              >
                <option value="">Semua RT</option>
                {rtList.map(rt => (
                  <option key={rt.id} value={rt.id}>
                    RT {rt.nomor_rt}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={filterJalan}
                onChange={(e) => setFilterJalan(e.target.value)}
              >
                <option value="">Semua Jalan</option>
                {jalanList.map(jalan => (
                  <option key={jalan.id} value={jalan.id}>
                    {jalan.nama_jalan}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select"
                value={filterJumlahKK}
                onChange={(e) => setFilterJumlahKK(e.target.value)}
              >
                <option value="">Semua KK</option>
                <option value="1">1 KK</option>
                <option value="2+">2+ KK</option>
              </select>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={handleResetFilter}
              >
                <FiRefreshCw className="me-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="m-0 fw-bold text-primary">
            Data Rumah ({filteredRumah.length} dari {rumahList.length})
          </h6>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={fetchData}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} />
          </button>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Memuat data...</p>
            </div>
          ) : filteredRumah.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FiSearch size={48} className="mb-3" />
              <p>Tidak ada data rumah ditemukan</p>
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="table-responsive desktop-table">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th className="d-none d-md-table-cell">#</th>
                    <th>Alamat</th>
                    <th>RT</th>
                    <th className="d-none d-md-table-cell">Jumlah KK</th>
                    <th className="d-none d-lg-table-cell">Penghuni</th>
                    <th className="d-none d-md-table-cell">Kepala Keluarga</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRumah.map((rumah, index) => (
                    <tr key={`${rumah.jalan_id}-${rumah.nomor_rumah}`}>
                      <td className="d-none d-md-table-cell">{index + 1}</td>
                      <td>
                        <strong>{rumah.jalan_nama} No. {rumah.nomor_rumah}</strong>
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          RT {rumah.rt_nomor}
                        </span>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <span className={`badge ${rumah.jumlah_kk >= 2 ? 'bg-warning text-dark' : 'bg-success'}`}>
                          {rumah.jumlah_kk} KK
                        </span>
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <small>{rumah.jumlah_penghuni} orang</small>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <small>
                          {rumah.kepala_keluarga.map((kk, i) => (
                            <div key={i}>{i + 1}. {kk}</div>
                          ))}
                        </small>
                      </td>
                      <td>
                        <Link 
                          href={`/rumah/${encodeURIComponent(rumah.jalan_id)}/${encodeURIComponent(rumah.nomor_rumah)}`}
                          className="btn btn-sm btn-outline-primary"
                          title="Lihat Detail"
                        >
                          <FiEye />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-list">
              {filteredRumah.map((rumah) => (
                <Link 
                  key={`${rumah.jalan_id}-${rumah.nomor_rumah}`}
                  href={`/rumah/${encodeURIComponent(rumah.jalan_id)}/${encodeURIComponent(rumah.nomor_rumah)}`}
                  className="text-decoration-none"
                >
                  <div className="mobile-card-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="card-title mb-0 text-dark">
                        {rumah.jalan_nama} No. {rumah.nomor_rumah}
                      </div>
                      <span className="badge bg-primary">RT {rumah.rt_nomor}</span>
                    </div>
                    <div className="card-detail">
                      <span>
                        <span className={`badge ${rumah.jumlah_kk >= 2 ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.65rem' }}>
                          {rumah.jumlah_kk} KK
                        </span>
                        <span className="ms-2">{rumah.jumlah_penghuni} penghuni</span>
                      </span>
                    </div>
                    {rumah.kepala_keluarga.length > 0 && (
                      <div className="card-detail">
                        <small className="text-muted">{rumah.kepala_keluarga.join(', ')}</small>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}