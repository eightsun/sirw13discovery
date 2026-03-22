'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { getRoleLabel } from '@/utils/helpers'
import {
  FiUsers, FiHome, FiUserCheck, FiTruck, FiBriefcase, FiAlertCircle,
  FiCalendar, FiMapPin, FiChevronRight, FiAlertTriangle,
  FiDollarSign, FiFileText, FiArrowRight
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
  const { userData, role, loading: userLoading, isPengurus, isVerified } = useUser()
  const [stats, setStats] = useState<Stats>({
    totalWarga: 0, totalKK: 0, pendudukTetap: 0, pendudukKontrak: 0,
    rumahMilik: 0, rumahSewa: 0, totalKendaraan: 0, totalUsaha: 0,
    wargaPerRT: []
  })
  const [loading, setLoading] = useState(true)
  const [upcomingKegiatan, setUpcomingKegiatan] = useState<{ id: string; nama_kegiatan: string; tanggal_mulai: string; lokasi: string; kategori: string }[]>([])
  const [kegiatanPage, setKegiatanPage] = useState(1)
  const KEGIATAN_PER_PAGE = 5
  const [keluhanStats, setKeluhanStats] = useState<{ bulan: string; label: string; total: number; selesai: number }[]>([])

  const supabase = createClient()

  // Redirect user yang belum punya data warga
  useEffect(() => {
    if (!userLoading && userData && !userData.warga_id) {
      router.push('/profil/lengkapi')
    }
  }, [userLoading, userData, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
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

    supabase.rpc('get_keluhan_monthly_stats', { months_back: 6 }).then(({ data }: { data: { bulan: string; label: string; total: number; selesai: number }[] | null }) => {
      if (data) setKeluhanStats(data)
    })
  }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const statCards = [
    { label: 'Total Warga', value: stats.totalWarga, icon: FiUsers, color: '#4e73df' },
    { label: 'Kepala Keluarga', value: stats.totalKK, icon: FiUserCheck, color: '#1cc88a' },
    { label: 'Penduduk Tetap', value: stats.pendudukTetap, icon: FiHome, color: '#36b9cc' },
    { label: 'Penduduk Kontrak', value: stats.pendudukKontrak, icon: FiAlertCircle, color: '#f6c23e' },
    { label: 'Rumah Milik', value: stats.rumahMilik, icon: FiHome, color: '#4e73df' },
    { label: 'Rumah Sewa', value: stats.rumahSewa, icon: FiHome, color: '#36b9cc' },
    { label: 'Kendaraan', value: stats.totalKendaraan, icon: FiTruck, color: '#1cc88a' },
    { label: 'Usaha', value: stats.totalUsaha, icon: FiBriefcase, color: '#f6c23e' },
  ]

  const quickActions = [
    { href: '/kegiatan', label: 'Kegiatan', icon: FiCalendar, color: '#4e73df' },
    { href: '/warga', label: 'Daftar Warga', icon: FiUsers, color: '#1cc88a' },
    { href: '/ipl', label: 'Tagihan IPL', icon: FiDollarSign, color: '#f6c23e' },
    { href: '/keuangan/laporan', label: 'Laporan', icon: FiFileText, color: '#36b9cc' },
  ]

  return (
    <div className="fade-in">
      {/* Greeting */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 gap-2">
        <div>
          <h1 className="page-title mb-1">{greeting()}, {userData?.nama_lengkap?.split(' ')[0] || 'Pengguna'}</h1>
          <p className="mb-0" style={{ color: 'var(--text-body)', fontSize: '0.875rem' }}>
            Selamat datang di Sistem Informasi RW 013 Permata Discovery
            {role && <span className="badge ms-2" style={{ background: 'rgba(78,115,223,0.1)', color: '#4e73df', fontWeight: 700, fontSize: '0.7rem' }}>{getRoleLabel(role)}</span>}
          </p>
        </div>
      </div>

      {/* Verification Banner */}
      {!isPengurus && !isVerified && userData?.warga_id && (
        <div className={`alert ${userData.rejection_reason ? 'alert-danger' : 'alert-warning'} mb-4`} style={{ borderRadius: '0.75rem', border: 'none' }}>
          <div className="d-flex align-items-start">
            <FiAlertTriangle className="me-2 flex-shrink-0 mt-1" size={18} />
            <div className="flex-grow-1">
              {userData.rejection_reason ? (
                <>
                  <strong>Verifikasi ditolak.</strong> Silakan koreksi data Anda.
                  <div className="mt-2 p-2 bg-white rounded" style={{ border: '1px solid var(--card-border)' }}>
                    <small className="text-muted">Alasan:</small>
                    <div className="fw-bold" style={{ fontSize: '0.875rem' }}>{userData.rejection_reason}</div>
                  </div>
                  <a href={`/warga/edit/${userData.warga_id}`} className="btn btn-sm btn-outline-danger mt-2">
                    Koreksi Data
                  </a>
                </>
              ) : (
                <>
                  <strong>Akun belum diverifikasi.</strong> Beberapa fitur belum dapat diakses hingga pengurus RT/RW memverifikasi akun Anda.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="row g-3 mb-4">
        {statCards.map((s, i) => (
          <div key={i} className="col-6 col-lg-3">
            <div className="card stats-card h-100" style={{ borderLeftColor: s.color }}>
              <div className="card-body py-3">
                <div className="stats-label" style={{ color: s.color }}>{s.label}</div>
                <div className="stats-value">{loading ? '—' : s.value}</div>
                <div className="stats-icon"><s.icon /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Row */}
      <div className="row g-3">
        {/* Warga per RT */}
        <div className="col-lg-7 mb-3">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold">Distribusi Warga per RT</h6>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                </div>
              ) : stats.wargaPerRT.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {stats.wargaPerRT.map((item, index) => {
                    const persen = stats.totalWarga > 0 ? ((item.jumlah / stats.totalWarga) * 100) : 0
                    return (
                      <div key={index}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold" style={{ fontSize: '0.8125rem', color: 'var(--text-heading)' }}>{item.rt}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-body)' }}>{item.jumlah} warga · {persen.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '3px', background: '#edf0f7' }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${persen}%`,
                              background: 'linear-gradient(90deg, #4e73df, #6d9aff)',
                              borderRadius: '3px',
                              transition: 'width 0.6s ease'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4" style={{ color: 'var(--text-body)' }}>
                  <FiUsers size={32} className="mb-2 opacity-25" />
                  <p className="small mb-0">Belum ada data warga</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-5 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="m-0 fw-bold">Aksi Cepat</h6>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {quickActions.map((a, i) => (
                  <div key={i} className="col-6">
                    <Link
                      href={a.href}
                      className="d-flex flex-column align-items-center justify-content-center text-decoration-none p-3 rounded-3"
                      style={{
                        border: '1px solid var(--card-border)',
                        transition: 'all 0.2s ease',
                        color: 'var(--text-heading)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.boxShadow = `0 2px 8px ${a.color}15` }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      <div className="mb-2 d-flex align-items-center justify-content-center rounded-3" style={{ width: '40px', height: '40px', background: `${a.color}10`, color: a.color }}>
                        <a.icon size={18} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keluhan Stats */}
      {keluhanStats.length > 0 && (() => {
        const maxVal = Math.max(...keluhanStats.map((s: { total: number }) => s.total), 1)
        const thisMonth = keluhanStats[keluhanStats.length - 1]
        return (
          <div className="row g-3 mb-3">
            <div className="col-lg-8 mb-3">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="m-0 fw-bold"><FiAlertTriangle className="me-2" size={14} />Laporan Keluhan (6 Bulan)</h6>
                  <Link href="/keluhan" className="btn btn-sm btn-outline-danger" style={{ fontSize: '0.75rem', borderRadius: '6px' }}>Lihat Semua</Link>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-end gap-2" style={{ height: '140px' }}>
                    {keluhanStats.map((s: { bulan: string; label: string; total: number; selesai: number }) => (
                      <div key={s.bulan} className="flex-fill text-center">
                        <div className="d-flex flex-column align-items-center" style={{ height: '110px', justifyContent: 'flex-end' }}>
                          <div className="d-flex gap-1 align-items-end" style={{ height: '100%' }}>
                            <div style={{ width: 16, height: `${Math.max((s.total / maxVal) * 100, 6)}%`, background: 'linear-gradient(180deg, #e74a3b, #fc8181)', borderRadius: '4px 4px 0 0' }} title={`Total: ${s.total}`} />
                            <div style={{ width: 16, height: `${Math.max((s.selesai / maxVal) * 100, 6)}%`, background: 'linear-gradient(180deg, #1cc88a, #6ee7b7)', borderRadius: '4px 4px 0 0' }} title={`Selesai: ${s.selesai}`} />
                          </div>
                        </div>
                        <div className="mt-1" style={{ fontSize: '0.625rem', color: '#94a3b8' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex gap-3 mt-3" style={{ fontSize: '0.75rem' }}>
                    <span className="d-flex align-items-center gap-1"><span style={{ display: 'inline-block', width: 10, height: 10, background: '#e74a3b', borderRadius: 3 }} /> Total</span>
                    <span className="d-flex align-items-center gap-1"><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1cc88a', borderRadius: 3 }} /> Selesai</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-header"><h6 className="m-0 fw-bold">Bulan Ini</h6></div>
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  {thisMonth && (
                    <>
                      <div className="text-center mb-3">
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#e74a3b', lineHeight: 1 }}>{thisMonth.total}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Laporan Masuk</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1cc88a', lineHeight: 1 }}>{thisMonth.selesai}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Diselesaikan</div>
                      </div>
                      {thisMonth.total > 0 && (
                        <div className="w-100 mt-3">
                          <div className="progress" style={{ height: '6px', borderRadius: '3px', background: '#edf0f7' }}>
                            <div className="progress-bar" style={{ width: `${(thisMonth.selesai / thisMonth.total) * 100}%`, background: 'linear-gradient(90deg, #1cc88a, #6ee7b7)', borderRadius: '3px' }} />
                          </div>
                          <div className="text-center mt-1" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{((thisMonth.selesai / thisMonth.total) * 100).toFixed(0)}% selesai</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Kegiatan Akan Datang */}
      {upcomingKegiatan.length > 0 && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="m-0 fw-bold">
              <FiCalendar className="me-2" size={14} />
              Kegiatan Akan Datang
            </h6>
            <Link href="/kegiatan" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem', borderRadius: '6px' }}>
              Lihat Semua <FiArrowRight className="ms-1" size={12} />
            </Link>
          </div>
          <div className="card-body p-0">
            {/* Desktop */}
            <div className="table-responsive desktop-table">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>No</th>
                    <th>Kegiatan</th>
                    <th>Tanggal</th>
                    <th style={{ width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingKegiatan
                    .slice((kegiatanPage - 1) * KEGIATAN_PER_PAGE, kegiatanPage * KEGIATAN_PER_PAGE)
                    .map((k, i) => (
                    <tr key={k.id}>
                      <td className="text-muted">{(kegiatanPage - 1) * KEGIATAN_PER_PAGE + i + 1}</td>
                      <td>
                        <div className="fw-bold" style={{ fontSize: '0.85rem', color: 'var(--text-heading)' }}>{k.nama_kegiatan}</div>
                        <small style={{ color: '#94a3b8' }}><FiMapPin size={11} className="me-1" />{k.lokasi}</small>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-heading)' }}>{new Date(k.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <small style={{ color: '#94a3b8' }}>{new Date(k.tanggal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</small>
                      </td>
                      <td>
                        <Link href={`/kegiatan/${k.id}`} className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem', borderRadius: '6px' }}>Lihat</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="mobile-card-list">
              {upcomingKegiatan
                .slice((kegiatanPage - 1) * KEGIATAN_PER_PAGE, kegiatanPage * KEGIATAN_PER_PAGE)
                .map((k) => (
                <Link key={k.id} href={`/kegiatan/${k.id}`} className="text-decoration-none">
                  <div className="mobile-card-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div style={{ flex: 1, minWidth: 0 }}>
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
      )}
    </div>
  )
}
