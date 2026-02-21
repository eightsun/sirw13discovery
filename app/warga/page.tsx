'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga, RT, Jalan } from '@/types'
import { 
  maskName, 
  maskNIK,
  getStatusKependudukanLabel,
  getStatusRumahLabel
} from '@/utils/helpers'
import { 
  FiPlus, FiSearch, FiFilter, FiEye, FiEdit, FiTrash2, FiRefreshCw, FiDownload
} from 'react-icons/fi'

export default function WargaListPage() {
  const { userData, role, isRW, isRT, isPengurus, loading: userLoading } = useUser()
  const [wargaList, setWargaList] = useState<Warga[]>([])
  const [userWarga, setUserWarga] = useState<Warga | null>(null) // Data warga user yang login
  const [rtList, setRtList] = useState<RT[]>([])
  const [jalanList, setJalanList] = useState<Jalan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRT, setFilterRT] = useState<string>('')
  const [filterJalan, setFilterJalan] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  
  const supabase = createClient()

  // Fetch data warga user yang login (untuk ambil no_kk)
  const fetchUserWarga = async () => {
    if (userData?.warga_id) {
      const { data } = await supabase
        .from('warga')
        .select('id, no_kk')
        .eq('id', userData.warga_id)
        .single()
      setUserWarga(data)
      return data
    }
    return null
  }

  // Fetch data warga
  const fetchWarga = async () => {
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
        .order('nama_lengkap')

      // Filter berdasarkan role
      if (role === 'warga' && userData?.warga_id) {
        // Ambil data user dulu untuk dapat no_kk
        const currentUserWarga = await fetchUserWarga()
        
        if (currentUserWarga?.no_kk) {
          // Tampilkan semua warga dalam 1 KK
          query = supabase
            .from('warga')
            .select(`
              *,
              rt:rt_id (id, nomor_rt),
              jalan:jalan_id (id, nama_jalan)
            `)
            .eq('is_active', true)
            .eq('no_kk', currentUserWarga.no_kk)
            .order('nama_lengkap')
        } else {
          // Jika tidak ada no_kk, hanya tampilkan data diri sendiri
          query = query.eq('id', userData.warga_id)
        }
      } else if (isRT && userData?.rt_id) {
        query = query.eq('rt_id', userData.rt_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setWargaList(data || [])
    } catch (err) {
      console.error('Error fetching warga:', err)
      setError('Gagal memuat data warga')
    } finally {
      setLoading(false)
    }
  }

  // Fetch RT & Jalan untuk filter
  const fetchMasterData = async () => {
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
  }

  useEffect(() => {
    if (!userLoading) {
      fetchWarga()
      fetchMasterData()
    }
  }, [userLoading, userData, role])

  // Filtered data
  const filteredWarga = useMemo(() => {
    return wargaList.filter(warga => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchName = warga.nama_lengkap.toLowerCase().includes(query)
        const matchNIK = warga.nik?.includes(query)
        const matchHP = warga.no_hp?.includes(query)
        const matchNomor = warga.nomor_rumah?.toLowerCase().includes(query)
        if (!matchName && !matchNIK && !matchHP && !matchNomor) return false
      }

      // RT filter
      if (filterRT && warga.rt_id !== filterRT) return false

      // Jalan filter
      if (filterJalan && warga.jalan_id !== filterJalan) return false

      // Status filter
      if (filterStatus && warga.status_kependudukan !== filterStatus) return false

      return true
    })
  }, [wargaList, searchQuery, filterRT, filterJalan, filterStatus])

  // Masking untuk warga di luar KK (tidak berlaku karena sudah difilter, tapi jaga-jaga)
  const shouldMask = (warga: Warga): boolean => {
    if (isRW) return false
    if (role === 'warga') {
      // Tidak mask jika data diri sendiri atau 1 KK
      if (warga.id === userData?.warga_id) return false
      if (userWarga?.no_kk && warga.no_kk === userWarga.no_kk) return false
      return true
    }
    if (isRT) return warga.rt_id !== userData?.rt_id
    return false
  }

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Yakin ingin menghapus data warga "${nama}"?`)) return

    try {
      const { error } = await supabase
        .from('warga')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      fetchWarga()
    } catch (err) {
      console.error('Error deleting warga:', err)
      alert('Gagal menghapus data warga')
    }
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Daftar Warga</h1>
          <p className="text-muted mb-0">
            Data warga RW 013 Permata Discovery
          </p>
        </div>
        {isPengurus && (
          <Link href="/warga/tambah" className="btn btn-primary">
            <FiPlus className="me-2" />
            Tambah Warga
          </Link>
        )}
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
                  placeholder="Cari nama, NIK, HP..."
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="penduduk_tetap">Penduduk Tetap</option>
                <option value="penduduk_kontrak">Kontrak/Sewa</option>
                <option value="menumpang">Menumpang</option>
                <option value="pemilik_tidak_tinggal">Pemilik Tidak Tinggal</option>
              </select>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setSearchQuery('')
                  setFilterRT('')
                  setFilterJalan('')
                  setFilterStatus('')
                }}
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
            Data Warga ({filteredWarga.length} dari {wargaList.length})
          </h6>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={fetchWarga}
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
          ) : filteredWarga.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FiSearch size={48} className="mb-3" />
              <p>Tidak ada data warga ditemukan</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama Lengkap</th>
                    <th>NIK</th>
                    <th>RT</th>
                    <th>Alamat</th>
                    <th>No. HP</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarga.map((warga, index) => {
                    const masked = shouldMask(warga)
                    return (
                      <tr key={warga.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{masked ? maskName(warga.nama_lengkap) : warga.nama_lengkap}</strong>
                        </td>
                        <td>
                          <code className="small">{masked ? maskNIK(warga.nik) : warga.nik}</code>
                        </td>
                        <td>
                          <span className="badge bg-primary">
                            RT {(warga.rt as RT)?.nomor_rt || '-'}
                          </span>
                        </td>
                        <td>
                          <small>
                            {(warga.jalan as Jalan)?.nama_jalan || '-'} No. {warga.nomor_rumah}
                          </small>
                        </td>
                        <td>
                          <small>{masked ? '08**********' : warga.no_hp}</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            warga.status_kependudukan === 'penduduk_tetap' ? 'bg-success' :
                            warga.status_kependudukan === 'penduduk_kontrak' ? 'bg-info' :
                            warga.status_kependudukan === 'menumpang' ? 'bg-warning' :
                            'bg-secondary'
                          }`}>
                            {getStatusKependudukanLabel(warga.status_kependudukan).replace('Penduduk ', '')}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Link 
                              href={`/warga/${warga.id}`}
                              className="btn btn-outline-primary"
                              title="Lihat Detail"
                            >
                              <FiEye />
                            </Link>
                            {(isPengurus || warga.id === userData?.warga_id) && (
                              <Link 
                                href={`/warga/edit/${warga.id}`}
                                className="btn btn-outline-warning"
                                title="Edit"
                              >
                                <FiEdit />
                              </Link>
                            )}
                            {isRW && (
                              <button
                                className="btn btn-outline-danger"
                                title="Hapus"
                                onClick={() => handleDelete(warga.id, warga.nama_lengkap)}
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}