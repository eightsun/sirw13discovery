'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TagihanIPL, Rumah } from '@/types'
import { FiAlertTriangle, FiCheck, FiClock, FiFilter, FiLoader, FiMapPin } from 'react-icons/fi'

interface TagihanWithRumah extends TagihanIPL {
  rumah: Rumah & {
    jalan: { nama_jalan: string }
    rt: { id: string; nomor_rt: string }
    kepala_keluarga: { nama_lengkap: string }
  }
}

interface PembayaranPending {
  id: string
  rumah_id: string
  bulan_dibayar: string[]
  jumlah_dibayar: number
  status: string
}

interface RTData {
  id: string
  nomor_rt: string
}

// Role yang bisa akses semua RT (level RW)
const RW_LEVEL_ROLES = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']
// Role yang hanya bisa akses RT-nya sendiri
const RT_LEVEL_ROLES = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']

export default function IPLPage() {
  const { userData, isPengurus, loading: userLoading } = useUser()
  const [tagihan, setTagihan] = useState<TagihanWithRumah[]>([])
  const [pembayaranPending, setPembayaranPending] = useState<PembayaranPending[]>([])
  const [myRumah, setMyRumah] = useState<Rumah | null>(null)
  const [rtList, setRtList] = useState<RTData[]>([])
  const [userRtId, setUserRtId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterTahun, setFilterTahun] = useState<string>(new Date().getFullYear().toString())
  const [filterRT, setFilterRT] = useState<string>('')
  
  const supabase = createClient()

  // Check if user is RW level (can see all RT)
  const isRWLevel = useMemo(() => {
    return RW_LEVEL_ROLES.includes(userData?.role || '')
  }, [userData?.role])

  // Check if user is RT level (can only see their RT)
  const isRTLevel = useMemo(() => {
    return RT_LEVEL_ROLES.includes(userData?.role || '')
  }, [userData?.role])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        let userRumahId: string | null = null
        let userRtIdLocal: string | null = null
        
        // Get user's warga data to find their rumah and RT
        if (userData?.warga_id) {
          const { data: wargaData } = await supabase
            .from('warga')
            .select('rumah_id')
            .eq('id', userData.warga_id)
            .single()
          
          userRumahId = wargaData?.rumah_id || null
          
          if (userRumahId) {
            // Get rumah details including RT
            const { data: rumahData } = await supabase
              .from('rumah')
              .select(`
                *,
                jalan:jalan_id (nama_jalan),
                rt:rt_id (id, nomor_rt),
                kepala_keluarga:kepala_keluarga_id (nama_lengkap)
              `)
              .eq('id', userRumahId)
              .single()
            
            setMyRumah(rumahData)
            userRtIdLocal = rumahData?.rt?.id || null
            setUserRtId(userRtIdLocal)
          }
        }

        // Fetch RT list for filter (only for pengurus)
        if (isPengurus) {
          const { data: rtData } = await supabase
            .from('rt')
            .select('id, nomor_rt')
            .order('nomor_rt')
          
          setRtList(rtData || [])
          
          // If RT level, set filter to their RT
          if (isRTLevel && userRtIdLocal) {
            setFilterRT(userRtIdLocal)
          }
        }

        // Fetch tagihan based on role
        let query = supabase
          .from('tagihan_ipl')
          .select(`
            *,
            rumah:rumah_id (
              id,
              nomor_rumah,
              blok,
              jalan:jalan_id (nama_jalan),
              rt:rt_id (id, nomor_rt),
              kepala_keluarga:kepala_keluarga_id (nama_lengkap)
            )
          `)
          .order('bulan', { ascending: false })

        // Apply access control based on role
        if (!isPengurus) {
          // Warga biasa: hanya lihat tagihan rumahnya
          if (userRumahId) {
            query = query.eq('rumah_id', userRumahId)
          } else {
            // Tidak ada rumah_id, tampilkan empty (filter dengan ID yang tidak ada)
            query = query.eq('rumah_id', '00000000-0000-0000-0000-000000000000')
          }
        } else if (isRTLevel && userRtIdLocal) {
          // Pengurus RT: hanya lihat tagihan di RT-nya
          // Need to filter by rumah's rt_id
          const { data: rumahInRT } = await supabase
            .from('rumah')
            .select('id')
            .eq('rt_id', userRtIdLocal)
          
          const rumahIds = rumahInRT?.map((r: { id: string }) => r.id) || []
          if (rumahIds.length > 0) {
            query = query.in('rumah_id', rumahIds)
          }
        }
        // RW level: lihat semua (no filter)

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError
        setTagihan(data || [])

        // Fetch pembayaran pending
        if (!isPengurus) {
          if (userRumahId) {
            const { data: pendingData } = await supabase
              .from('pembayaran_ipl')
              .select('id, rumah_id, bulan_dibayar, jumlah_dibayar, status')
              .eq('rumah_id', userRumahId)
              .eq('status', 'pending')
            
            setPembayaranPending(pendingData || [])
          } else {
            setPembayaranPending([])
          }
        } else if (isPengurus) {
          // Pengurus bisa lihat semua pending (sesuai akses RT-nya)
          let pendingQuery = supabase
            .from('pembayaran_ipl')
            .select('id, rumah_id, bulan_dibayar, jumlah_dibayar, status')
            .eq('status', 'pending')
          
          const { data: pendingData } = await pendingQuery
          setPembayaranPending(pendingData || [])
        }

      } catch (err) {
        console.error('Error fetching tagihan:', err)
        setError('Gagal memuat data tagihan')
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading && userData) {
      fetchData()
    }
  }, [userLoading, userData, isPengurus, isRTLevel])

  // Filter tagihan
  const filteredTagihan = useMemo(() => {
    return tagihan.filter(t => {
      // Filter by status
      if (filterStatus && filterStatus !== 'menunggu_verifikasi') {
        if (t.status !== filterStatus) return false
      }
      
      // Filter by year
      if (filterTahun && !t.bulan.startsWith(filterTahun)) return false
      
      // Filter by RT (only for pengurus)
      if (filterRT && t.rumah?.rt?.id !== filterRT) return false
      
      return true
    })
  }, [tagihan, filterStatus, filterTahun, filterRT])

  // Helper: Check if bulan has pending payment
  const getPendingForBulan = (bulan: string, rumahId: string) => {
    return pembayaranPending.find(p => 
      p.rumah_id === rumahId && 
      p.bulan_dibayar?.includes(bulan)
    )
  }

  // Calculate summary
  const summary = useMemo(() => {
    const totalTagihan = filteredTagihan.reduce((sum, t) => sum + t.jumlah_tagihan, 0)
    const totalTerbayar = filteredTagihan.reduce((sum, t) => sum + t.jumlah_terbayar, 0)
    const totalTunggakan = totalTagihan - totalTerbayar
    const lunas = filteredTagihan.filter(t => t.status === 'lunas').length
    
    // Hitung pending (menunggu verifikasi)
    const totalPending = pembayaranPending.reduce((sum, p) => sum + p.jumlah_dibayar, 0)
    const bulanPending = new Set<string>()
    pembayaranPending.forEach(p => {
      p.bulan_dibayar?.forEach(b => bulanPending.add(b))
    })
    const menungguVerifikasi = filteredTagihan.filter(t => 
      t.status !== 'lunas' && bulanPending.has(t.bulan)
    ).length
    
    const belumLunas = filteredTagihan.filter(t => 
      t.status !== 'lunas' && !bulanPending.has(t.bulan)
    ).length
    
    return { totalTagihan, totalTerbayar, totalTunggakan, totalPending, lunas, belumLunas, menungguVerifikasi }
  }, [filteredTagihan, pembayaranPending])

  // Get unique years for filter
  const years = useMemo(() => {
    const yearSet = new Set(tagihan.map(t => t.bulan.substring(0, 4)))
    return Array.from(yearSet).sort().reverse()
  }, [tagihan])

  const formatBulan = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (userLoading || loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Memuat data tagihan...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-0">Tagihan IPL</h1>
          <p className="text-muted mb-0">Iuran Pengelolaan Lingkungan RW 013</p>
        </div>
        <Link href="/ipl/bayar" className="btn btn-primary">
          <span className="me-2 fw-bold">Rp</span>
          Bayar IPL
        </Link>
      </div>

      {/* Info for pending payments */}
      {summary.totalPending > 0 && !isPengurus && (
        <div className="alert alert-info d-flex align-items-center mb-4">
          <FiLoader className="me-2" size={20} />
          <div>
            <strong>Dalam Proses!</strong> Pembayaran sebesar {formatCurrency(summary.totalPending)} sedang menunggu verifikasi pengurus.
          </div>
        </div>
      )}

      {/* Warning for tunggakan - hanya tampil jika ada tunggakan SETELAH dikurangi pending */}
      {(summary.totalTunggakan - summary.totalPending) > 0 && !isPengurus && (
        <div className="alert alert-warning d-flex align-items-center mb-4">
          <FiAlertTriangle className="me-2" size={20} />
          <div>
            <strong>Perhatian!</strong> Anda memiliki tunggakan IPL sebesar {formatCurrency(summary.totalTunggakan - summary.totalPending)}.
            Silakan segera melakukan pembayaran.
          </div>
        </div>
      )}

      {/* My Rumah Info (for non-pengurus) */}
      {!isPengurus && myRumah && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted">Alamat Rumah</small>
                <p className="mb-0 fw-bold">
                  {myRumah.jalan?.nama_jalan} No. {myRumah.nomor_rumah}
                </p>
              </div>
              <div className="col-md-3">
                <small className="text-muted">RT</small>
                <p className="mb-0 fw-bold">{myRumah.rt?.nomor_rt}</p>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Blok</small>
                <p className="mb-0 fw-bold">{myRumah.blok}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-lg col-6 mb-3">
          <div className="card text-center h-100 border-primary">
            <div className="card-body py-3">
              <h4 className="text-primary mb-0">{formatCurrency(summary.totalTagihan)}</h4>
              <small className="text-muted">Total Tagihan</small>
            </div>
          </div>
        </div>
        <div className="col-lg col-6 mb-3">
          <div className="card text-center h-100 border-success">
            <div className="card-body py-3">
              <h4 className="text-success mb-0">{formatCurrency(summary.totalTerbayar)}</h4>
              <small className="text-muted">Sudah Dibayar</small>
            </div>
          </div>
        </div>
        {summary.totalPending > 0 && (
          <div className="col-lg col-6 mb-3">
            <div className="card text-center h-100 border-info">
              <div className="card-body py-3">
                <h4 className="text-info mb-0">{formatCurrency(summary.totalPending)}</h4>
                <small className="text-muted">Proses Verifikasi</small>
              </div>
            </div>
          </div>
        )}
        <div className="col-lg col-6 mb-3">
          <div className="card text-center h-100 border-danger">
            <div className="card-body py-3">
              <h4 className="text-danger mb-0">{formatCurrency(summary.totalTunggakan - summary.totalPending)}</h4>
              <small className="text-muted">Tunggakan</small>
            </div>
          </div>
        </div>
        <div className="col-lg col-6 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="mb-0">
                <span className="text-success">{summary.lunas}</span>
                {summary.menungguVerifikasi > 0 && (
                  <>
                    <span className="text-muted mx-1">/</span>
                    <span className="text-info">{summary.menungguVerifikasi}</span>
                  </>
                )}
                <span className="text-muted mx-1">/</span>
                <span className="text-danger">{summary.belumLunas}</span>
              </h4>
              <small className="text-muted">
                Lunas{summary.menungguVerifikasi > 0 && ' / Proses'} / Belum
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-2 mb-2">
              <label className="form-label small">
                <FiFilter className="me-1" />
                Filter Tahun
              </label>
              <select
                className="form-select"
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
              >
                <option value="">Semua Tahun</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Filter RT - only show for RW level pengurus */}
            {isPengurus && isRWLevel && rtList.length > 0 && (
              <div className="col-md-2 mb-2">
                <label className="form-label small">
                  <FiMapPin className="me-1" />
                  Filter RT
                </label>
                <select
                  className="form-select"
                  value={filterRT}
                  onChange={(e) => setFilterRT(e.target.value)}
                >
                  <option value="">Semua RT</option>
                  {rtList.map(rt => (
                    <option key={rt.id} value={rt.id}>RT {rt.nomor_rt}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Show RT info for RT level pengurus */}
            {isPengurus && isRTLevel && userRtId && (
              <div className="col-md-2 mb-2">
                <label className="form-label small">
                  <FiMapPin className="me-1" />
                  Wilayah
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={`RT ${rtList.find(r => r.id === userRtId)?.nomor_rt || '-'}`}
                  disabled
                />
              </div>
            )}
            
            <div className="col-md-2 mb-2">
              <label className="form-label small">Filter Status</label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="lunas">Lunas</option>
                <option value="belum_lunas">Belum Lunas</option>
                <option value="sebagian">Sebagian</option>
              </select>
            </div>
            <div className="col-md-2 mb-2">
              <button 
                className="btn btn-outline-secondary"
                onClick={() => { 
                  setFilterStatus(''); 
                  setFilterTahun(new Date().getFullYear().toString()); 
                  // Only reset RT filter if RW level
                  if (isRWLevel) setFilterRT('');
                }}
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tagihan Table */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            Daftar Tagihan ({filteredTagihan.length})
          </h6>
        </div>
        <div className="card-body">
          {error ? (
            <div className="alert alert-danger">{error}</div>
          ) : filteredTagihan.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <div className="display-1 mb-3">Rp</div>
              <p>Tidak ada data tagihan</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    {isPengurus && <th>Alamat</th>}
                    {isPengurus && <th>Kepala Keluarga</th>}
                    <th className="text-end">Tagihan</th>
                    <th className="text-end">Terbayar</th>
                    <th className="text-center">Status</th>
                    <th>Tgl Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTagihan.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{formatBulan(t.bulan)}</strong>
                      </td>
                      {isPengurus && (
                        <td>
                          <small>
                            {t.rumah?.jalan?.nama_jalan} No. {t.rumah?.nomor_rumah}
                            <br />
                            <span className="text-muted">RT {t.rumah?.rt?.nomor_rt}</span>
                          </small>
                        </td>
                      )}
                      {isPengurus && (
                        <td>
                          <small>{t.rumah?.kepala_keluarga?.nama_lengkap || '-'}</small>
                        </td>
                      )}
                      <td className="text-end">
                        {formatCurrency(t.jumlah_tagihan)}
                      </td>
                      <td className="text-end">
                        {formatCurrency(t.jumlah_terbayar)}
                      </td>
                      <td className="text-center">
                        {t.status === 'lunas' ? (
                          <span className="badge bg-success">
                            <FiCheck className="me-1" />
                            Lunas
                          </span>
                        ) : t.status === 'sebagian' ? (
                          <span className="badge bg-warning text-dark">
                            <FiClock className="me-1" />
                            Sebagian
                          </span>
                        ) : getPendingForBulan(t.bulan, t.rumah_id) ? (
                          <span className="badge bg-info">
                            <FiLoader className="me-1" />
                            Proses Verifikasi
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <FiClock className="me-1" />
                            Belum Lunas
                          </span>
                        )}
                      </td>
                      <td>
                        {t.tanggal_lunas ? (
                          <small>{new Date(t.tanggal_lunas).toLocaleDateString('id-ID')}</small>
                        ) : (
                          <small className="text-muted">-</small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}