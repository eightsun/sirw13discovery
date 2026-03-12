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
  FiPlus, FiSearch, FiFilter, FiEye, FiEdit, FiTrash2, FiRefreshCw, FiDownload, FiHome,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
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

  // Reset halaman ke 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRT, filterJalan, filterStatus])

  // Pagination calculation
  const totalPages = Math.ceil(filteredWarga.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedWarga = filteredWarga.slice(startIndex, startIndex + itemsPerPage)

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

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
    if (!confirm(`Yakin ingin menghapus data warga "${nama}" secara permanen?\n\nSemua data terkait (kendaraan, usaha, foto) juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`)) return

    try {
      // 1. Hapus foto warga dari storage jika ada
      const { data: wargaData } = await supabase
        .from('warga')
        .select('foto_url')
        .eq('id', id)
        .single()

      if (wargaData?.foto_url) {
        const match = wargaData.foto_url.match(/\/(?:warga|pengajuan)\/(.+?)(?:\?|$)/)
        if (match) {
          const bucket = wargaData.foto_url.includes('/warga/') ? 'warga' : 'pengajuan'
          await supabase.storage.from(bucket).remove([match[1]])
        }
      }

      // 2. Hapus data terkait (cascade seharusnya handle, tapi eksplisit untuk jaga-jaga)
      const { error: kendaraanErr } = await supabase.from('kendaraan').delete().eq('warga_id', id)
      if (kendaraanErr) console.warn('Kendaraan delete warning:', kendaraanErr.message)

      const { error: usahaErr } = await supabase.from('usaha').delete().eq('warga_id', id)
      if (usahaErr) console.warn('Usaha delete warning:', usahaErr.message)

      // 3. Hapus notifikasi dan record users yang terkait dengan warga ini
      const { data: linkedUsers } = await supabase
        .from('users')
        .select('id')
        .eq('warga_id', id)

      if (linkedUsers && linkedUsers.length > 0) {
        const userIds = linkedUsers.map((u: { id: string }) => u.id)
        // Hapus notifikasi user terkait
        const { error: notifErr } = await supabase.from('notifikasi').delete().in('user_id', userIds)
        if (notifErr) console.warn('Notifikasi delete warning:', notifErr.message)
        // Hapus record users
        const { error: usersDelErr } = await supabase.from('users').delete().in('id', userIds)
        if (usersDelErr) console.warn('Users delete warning:', usersDelErr.message)
      }

      const { error: rumahErr } = await supabase.from('rumah').update({ kepala_keluarga_id: null }).eq('kepala_keluarga_id', id)
      if (rumahErr) console.warn('Rumah unlink warning:', rumahErr.message)

      // 4. Putuskan self-reference kepala_keluarga di tabel warga
      const { error: selfRefErr } = await supabase.from('warga').update({ kepala_keluarga_id: null }).eq('kepala_keluarga_id', id)
      if (selfRefErr) console.warn('Warga self-ref warning:', selfRefErr.message)

      // 5. Hapus data warga
      const { error, status } = await supabase
        .from('warga')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete warga error:', error)
        alert(`Gagal menghapus data warga: ${error.message}\n\nKode: ${error.code}\nHint: ${error.hint || 'Kemungkinan RLS policy tidak mengizinkan DELETE. Jalankan SQL di bawah di Supabase SQL Editor.'}`)
        return
      }

      // 6. Verifikasi data benar-benar terhapus
      const { data: checkData } = await supabase
        .from('warga')
        .select('id')
        .eq('id', id)
        .maybeSingle()

      if (checkData) {
        alert('Data warga masih ada setelah DELETE. Kemungkinan RLS policy memblokir operasi DELETE.\n\nJalankan SQL berikut di Supabase SQL Editor:\n\nCREATE POLICY "Allow pengurus delete warga" ON warga FOR DELETE TO authenticated USING (true);')
        return
      }

      fetchWarga()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Error deleting warga:', err)
      alert(`Gagal menghapus data warga: ${errorMsg}`)
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
                  setCurrentPage(1)
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
            <>
            {/* Desktop Table View */}
            <div className="table-responsive desktop-table">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th className="d-none d-md-table-cell">#</th>
                    <th>Nama Lengkap</th>
                    <th className="d-none d-lg-table-cell">NIK</th>
                    <th>RT</th>
                    <th>Alamat</th>
                    <th className="d-none d-md-table-cell">No. HP</th>
                    <th className="d-none d-lg-table-cell">Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWarga.map((warga, index) => {
                    const masked = shouldMask(warga)
                    return (
                      <tr key={warga.id}>
                        <td className="d-none d-md-table-cell">{startIndex + index + 1}</td>
                        <td>
                          <strong>{masked ? maskName(warga.nama_lengkap) : warga.nama_lengkap}</strong>
                        </td>
                        <td className="d-none d-lg-table-cell">
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
                        <td className="d-none d-md-table-cell">
                          <small>{masked ? '08**********' : warga.no_hp}</small>
                        </td>
                        <td className="d-none d-lg-table-cell">
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
                            {warga.jalan_id && warga.nomor_rumah && (
                              <Link 
                                href={`/rumah/${encodeURIComponent(warga.jalan_id)}/${encodeURIComponent(warga.nomor_rumah)}`}
                                className="btn btn-outline-info"
                                title="Lihat Rumah"
                              >
                                <FiHome />
                              </Link>
                            )}
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

            {/* Mobile Card View */}
            <div className="mobile-card-list">
              {paginatedWarga.map((warga) => {
                const masked = shouldMask(warga)
                return (
                  <div key={warga.id} className="mobile-card-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="card-title mb-0">
                        {masked ? maskName(warga.nama_lengkap) : warga.nama_lengkap}
                      </div>
                      <span className="badge bg-primary">RT {(warga.rt as RT)?.nomor_rt || '-'}</span>
                    </div>
                    <div className="card-detail">
                      <span>{(warga.jalan as Jalan)?.nama_jalan || '-'} No. {warga.nomor_rumah}</span>
                      <span className={`badge ${
                        warga.status_kependudukan === 'penduduk_tetap' ? 'bg-success' :
                        warga.status_kependudukan === 'penduduk_kontrak' ? 'bg-info' :
                        warga.status_kependudukan === 'menumpang' ? 'bg-warning' :
                        'bg-secondary'
                      }`} style={{ fontSize: '0.65rem' }}>
                        {getStatusKependudukanLabel(warga.status_kependudukan).replace('Penduduk ', '')}
                      </span>
                    </div>
                    <div className="card-detail">
                      <span>{masked ? '08**********' : warga.no_hp || '-'}</span>
                    </div>
                    <div className="card-actions">
                      <Link href={`/warga/${warga.id}`} className="btn btn-sm btn-outline-primary">
                        <FiEye className="me-1" /> Detail
                      </Link>
                      {warga.jalan_id && warga.nomor_rumah && (
                        <Link href={`/rumah/${encodeURIComponent(warga.jalan_id)}/${encodeURIComponent(warga.nomor_rumah)}`} className="btn btn-sm btn-outline-info">
                          <FiHome className="me-1" /> Rumah
                        </Link>
                      )}
                      {(isPengurus || warga.id === userData?.warga_id) && (
                        <Link href={`/warga/edit/${warga.id}`} className="btn btn-sm btn-outline-warning">
                          <FiEdit className="me-1" /> Edit
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 gap-2">
                <small className="text-muted">
                  Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredWarga.length)} dari {filteredWarga.length} warga
                </small>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        <FiChevronsLeft />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                        <FiChevronLeft />
                      </button>
                    </li>
                    {getPageNumbers().map((page, idx) => (
                      <li key={idx} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={page === '...'}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                        <FiChevronRight />
                      </button>
                    </li>
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                        <FiChevronsRight />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
            </>
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

  