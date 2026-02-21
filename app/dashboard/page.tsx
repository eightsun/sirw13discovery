'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { getRoleLabel } from '@/utils/helpers'
import { 
  FiUsers, FiHome, FiUserCheck, FiTruck, FiBriefcase, FiAlertCircle
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
  
  const supabase = createClient()

  // Redirect user baru untuk lengkapi profil (kecuali pengurus)
  useEffect(() => {
    if (!userLoading && userData && !userData.warga_id && !isPengurus) {
      router.push('/profil/lengkapi')
    }
  }, [userLoading, userData, isPengurus, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total warga
        const { count: wargaCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)

        // Total KK
        const { count: kkCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .eq('hubungan_keluarga', 'kepala_keluarga')
          .eq('is_active', true)

        // Penduduk tetap
        const { count: tetapCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .eq('status_kependudukan', 'penduduk_tetap')
          .eq('is_active', true)

        // Penduduk kontrak
        const { count: kontrakCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .eq('status_kependudukan', 'penduduk_kontrak')
          .eq('is_active', true)

        // Rumah milik sendiri
        const { count: milikCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .eq('status_rumah', 'milik_sendiri')
          .eq('hubungan_keluarga', 'kepala_keluarga')
          .eq('is_active', true)

        // Rumah sewa/kontrak
        const { count: sewaCount } = await supabase
          .from('warga')
          .select('*', { count: 'exact', head: true })
          .in('status_rumah', ['sewa', 'kontrak'])
          .eq('hubungan_keluarga', 'kepala_keluarga')
          .eq('is_active', true)

        // Total kendaraan
        const { count: kendaraanCount } = await supabase
          .from('kendaraan')
          .select('*', { count: 'exact', head: true })

        // Total usaha
        const { count: usahaCount } = await supabase
          .from('usaha')
          .select('*', { count: 'exact', head: true })

        // Warga per RT
        const { data: rtData } = await supabase
          .from('rt')
          .select('nomor_rt')
          .order('nomor_rt')

        const wargaPerRT: { rt: string; jumlah: number }[] = []
        if (rtData) {
          for (const rt of rtData) {
            const { count } = await supabase
              .from('warga')
              .select('*', { count: 'exact', head: true })
              .eq('rt_id', (await supabase.from('rt').select('id').eq('nomor_rt', rt.nomor_rt).single()).data?.id)
              .eq('is_active', true)
            
            wargaPerRT.push({
              rt: `RT ${rt.nomor_rt}`,
              jumlah: count || 0
            })
          }
        }

        setStats({
          totalWarga: wargaCount || 0,
          totalKK: kkCount || 0,
          pendudukTetap: tetapCount || 0,
          pendudukKontrak: kontrakCount || 0,
          rumahMilik: milikCount || 0,
          rumahSewa: sewaCount || 0,
          totalKendaraan: kendaraanCount || 0,
          totalUsaha: usahaCount || 0,
          wargaPerRT
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
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
                <div className="table-responsive">
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
                  <Link href="/warga/tambah" className="btn btn-primary w-100 py-3">
                    <FiUsers className="me-2" />
                    Tambah Warga
                  </Link>
                </div>
                <div className="col-6">
                  <Link href="/warga" className="btn btn-outline-primary w-100 py-3">
                    <FiUsers className="me-2" />
                    Lihat Semua Warga
                  </Link>
                </div>
                <div className="col-6">
                  <a href="#" className="btn btn-outline-success w-100 py-3">
                    📄 Buat Surat
                  </a>
                </div>
                <div className="col-6">
                  <a href="#" className="btn btn-outline-info w-100 py-3">
                    📢 Pengumuman
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="row">
        <div className="col-12">
          <div className="card border-start border-primary border-4">
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
                    Sistem Informasi RW 013 Permata Discovery - Desa Banjarsari, Kec. Ngamprah, Kab. Bandung Barat.
                    Kelola data warga, kendaraan, usaha, dan administrasi dengan mudah.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
