'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { getRoleLabel } from '@/utils/helpers'
import { 
  FiUsers, FiHome, FiUserCheck, FiTruck, FiBriefcase, FiAlertCircle,
  FiCalendar, FiMapPin, FiChevronRight
} from 'react-icons/fi'

interface Stats {
  totalWarga: number
  totalKK: number
  pendudukTetap: number
  pendudukKontrak: number
  rumahMilik: number
  rumahSewa: number
  totalKendaraan: number
  totalUsaha: number
  wargaPerRT: { rt: string; jumlah: number }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { userData, role, loading: userLoading, isPengurus } = useUser()
  const [stats, setStats] = useState<Stats>({
    totalWarga: 0,
    totalKK: 0,
    pendudukTetap: 0,
    pendudukKontrak: 0,
    rumahMilik: 0,
    rumahSewa: 0,
    totalKendaraan: 0,
    totalUsaha: 0,
    wargaPerRT: []
  })
  const [loading, setLoading] = useState(true)
  const [upcomingKegiatan, setUpcomingKegiatan] = useState<{ id: string; nama_kegiatan: string; tanggal_mulai: string; lokasi: string; kategori: string }[]>([])
  const [kegiatanPage, setKegiatanPage] = useState(1)
  const KEGIATAN_PER_PAGE = 5
  
  const supabase = createClient()

  // Redirect SEMUA user yang belum punya data warga (termasuk pengurus)
  useEffect(() => {
    if (!userLoading && userData && !userData.warga_id) {
      router.push('/profil/lengkapi')
    }
  }, [userLoading, userData, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use SECURITY DEFINER function to get stats for all users
        const { data, error } = await supabase.rpc('get_dashboard_stats')
        
        if (error) throw error
        if (data) {
          setStats({
            totalWarga: data.total_warga || 0,
            totalKK: data.total_kk || 0,
            pendudukTetap: data.penduduk_tetap || 0,
            pendudukKontrak: data.penduduk_kontrak || 0,
            rumahMilik: data.rumah_milik || 0,
            rumahSewa: data.rumah_sewa || 0,
            totalKendaraan: data.total_kendaraan || 0,
            totalUsaha: data.total_usaha || 0,
            wargaPerRT: data.warga_per_rt || []
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchUpcomingKegiatan = async () => {
      try {
        const now = new Date().toISOString()
        const { data } = await supabase
          .from('kegiatan')
          .select('id, nama_kegiatan, tanggal_mulai, lokasi, kategori')
          .eq('status', 'published')
          .gte('tanggal_mulai', now)
          .order('tanggal_mulai', { ascending: true })
          .limit(20)
        setUpcomingKegiatan(data || [])
      } catch (e) {
        console.error('Error fetching kegiatan:', e)
      }
    }

    fetchStats()
    fetchUpcomingKegiatan()
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header mb-4">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted">
          {greeting()}, {userData?.nama_lengkap || 'Pengguna'}! 
          {role && <span className="badge bg-primary ms-2">{getRoleLabel(role)}</span>}
        </p>
      </div>

      {/* Welcome Card */}
      <div className="card border-start border-primary border-4 mb-4">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <span style={{ fontSize: '2rem' }}>🏘️</span>
            </div>
            <div>
              <h6 className="fw-bold text-primary mb-1">
                Selamat Datang di SIRW13
              </h6>
              <p className="mb-0 text-muted">
                Sistem Informasi RW 013 Permata Discovery - Desa Banjarsari, Kec. Manyar, Kab. Gresik.
                Kelola data warga, kendaraan, usaha, dan administrasi dengan mudah.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row 1 */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card stats-card primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stats-label text-primary">Total Warga</div>
                  <div className="stats-value">{loading ? '...' : stats.totalWarga}</div>
                </div>
                <div className="stats-icon"><FiUsers /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card stats-card success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stats-label text-success">Kepala Keluarga</div>
                  <div className="stats-value">{loading ? '...' : stats.totalKK}</div>
                </div>
                <div className="stats-icon"><FiUserCheck /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card stats-card info h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stats-label text-info">Penduduk Tetap</div>
                  <div className="stats-value">{loading ? '...' : stats.pendudukTetap}</div>
                </div>
                <div className="stats-icon"><FiHome /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card stats-card warning h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stats-label text-warning">Penduduk Kontrak</div>
                  <div className="stats-value">{loading ? '...' : stats.pendudukKontrak}</div>
                </div>
                <div className="stats-icon"><FiAlertCircle /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row 2 */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card h-100 border-start border-primary border-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Rumah Milik Sendiri</div>
                  <div className="h4 mb-0">{loading ? '...' : stats.rumahMilik}</div>
                </div>
                <FiHome className="text-primary" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card h-100 border-start border-info border-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Rumah Sewa/Kontrak</div>
                  <div className="h4 mb-0">{loading ? '...' : stats.rumahSewa}</div>
                </div>
                <FiHome className="text-info" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card h-100 border-start border-success border-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Total Kendaraan</div>
                  <div className="h4 mb-0">{loading ? '...' : stats.totalKendaraan}</div>
                </div>
                <FiTruck className="text-success" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card h-100 border-start border-warning border-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small text-muted text-uppercase fw-bold">Total Usaha</div>
                  <div className="h4 mb-0">{loading ? '...' : stats.totalUsaha}</div>
                </div>
                <FiBriefcase className="text-warning" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tables Row */}
      <div className="row">
        {/* Warga per RT */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold text-primary">Warga per RT</h6>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : stats.wargaPerRT.length > 0 ? (
                <div className="table-responsive desktop-table">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>RT</th>
                        <th>Jumlah Warga</th>
                        <th>Persentase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.wargaPerRT.map((item, index) => (
                        <tr key={index}>
                          <td>{item.rt}</td>
                          <td>{item.jumlah}</td>
                          <td>
                            <div className="progress" style={{ height: '20px' }}>
                              <div 
                                className="progress-bar bg-primary" 
                                role="progressbar" 
                                style={{ 
                                  width: `${stats.totalWarga > 0 ? (item.jumlah / stats.totalWarga) * 100 : 0}%` 
                                }}
                              >
                                {stats.totalWarga > 0 
                                  ? `${((item.jumlah / stats.totalWarga) * 100).toFixed(1)}%`
                                  : '0%'
                                }
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted">
                  <FiUsers size={48} className="mb-3" />
                  <p>Belum ada data warga</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="m-0 fw-bold text-primary">Aksi Cepat</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <Link href="/kegiatan" className="btn btn-primary w-100 py-3">
                    <FiCalendar className="me-2" />
                    Kegiatan
                  </Link>
                </div>
                <div className="col-6">
                  <Link href="/warga" className="btn btn-outline-primary w-100 py-3">
                    <FiUsers className="me-2" />
                    Daftar Warga
                  </Link>
                </div>
                <div className="col-6">
                  <Link href="/ipl" className="btn btn-outline-success w-100 py-3">
                    💰 Tagihan IPL
                  </Link>
                </div>
                <div className="col-6">
                  <Link href="/keuangan/laporan" className="btn btn-outline-info w-100 py-3">
                    📊 Laporan Keuangan
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Kegiatan Akan Datang */}
      {upcomingKegiatan.length > 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="m-0 fw-bold text-primary">
                  <FiCalendar className="me-2" />
                  Kegiatan Akan Datang
                </h6>
                <Link href="/kegiatan" className="btn btn-sm btn-outline-primary">
                  Lihat Semua <FiChevronRight className="ms-1" />
                </Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive desktop-table">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th style={{width:'40px'}}>No</th>
                        <th>Kegiatan</th>
                        <th>Tanggal</th>
                        <th style={{width:'80px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingKegiatan
                        .slice((kegiatanPage - 1) * KEGIATAN_PER_PAGE, kegiatanPage * KEGIATAN_PER_PAGE)
                        .map((k, i) => (
                        <tr key={k.id}>
                          <td className="text-muted">{(kegiatanPage - 1) * KEGIATAN_PER_PAGE + i + 1}</td>
                          <td>
                            <div className="fw-bold">{k.nama_kegiatan}</div>
                            <small className="text-muted"><FiMapPin size={11} className="me-1" />{k.lokasi}</small>
                          </td>
                          <td>
                            <div className="small">{new Date(k.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <small className="text-muted">{new Date(k.tanggal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</small>
                          </td>
                          <td>
                            <Link href={`/kegiatan/${k.id}`} className="btn btn-sm btn-outline-primary">Lihat</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-card-list">
                  {upcomingKegiatan
                    .slice((kegiatanPage - 1) * KEGIATAN_PER_PAGE, kegiatanPage * KEGIATAN_PER_PAGE)
                    .map((k, i) => (
                    <Link key={k.id} href={`/kegiatan/${k.id}`} className="text-decoration-none">
                      <div className="mobile-card-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div style={{flex:1, minWidth:0}}>
                            <div className="mc-title">{k.nama_kegiatan}</div>
                            <small className="text-muted">
                              <FiCalendar size={11} className="me-1" />
                              {new Date(k.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              {' · '}
                              <FiMapPin size={11} className="me-1" />
                              {k.lokasi}
                            </small>
                          </div>
                          <FiChevronRight className="text-muted ms-2 flex-shrink-0" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {upcomingKegiatan.length > KEGIATAN_PER_PAGE && (
                  <div className="d-flex justify-content-center py-2 border-top">
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        {Array.from({ length: Math.ceil(upcomingKegiatan.length / KEGIATAN_PER_PAGE) }, (_, i) => (
                          <li key={i} className={`page-item ${kegiatanPage === i + 1 ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setKegiatanPage(i + 1)}>{i + 1}</button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}