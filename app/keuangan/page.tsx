'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiFileText,
  FiPlus,
  FiClock,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi'

interface KasSummary {
  jenis_kas: 'rw' | 'rt'
  wilayah: 'Timur' | 'Barat'
  total_pemasukan: number
  total_pengeluaran: number
  saldo: number
}

interface PengajuanSummary {
  status: string
  count: number
}

interface RecentTransaction {
  id: string
  tanggal: string
  tipe: 'pemasukan' | 'pengeluaran'
  jumlah: number
  keterangan: string
  jenis_kas: string
  wilayah: string
}

export default function KeuanganDashboardPage() {
  const { userData, isPengurus, isRW } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [kasSummary, setKasSummary] = useState<KasSummary[]>([])
  const [pengajuanSummary, setPengajuanSummary] = useState<PengajuanSummary[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [currentMonth, setCurrentMonth] = useState({
    pemasukan: 0,
    pengeluaran: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch kas summary per wilayah
        const { data: kasData } = await supabase
          .from('kas_transaksi')
          .select('jenis_kas, wilayah, tipe, jumlah')

        if (kasData) {
          const summary: Record<string, KasSummary> = {}
          
          kasData.forEach((t) => {
            const key = `${t.jenis_kas}-${t.wilayah}`
            if (!summary[key]) {
              summary[key] = {
                jenis_kas: t.jenis_kas,
                wilayah: t.wilayah,
                total_pemasukan: 0,
                total_pengeluaran: 0,
                saldo: 0
              }
            }
            if (t.tipe === 'pemasukan') {
              summary[key].total_pemasukan += t.jumlah
            } else {
              summary[key].total_pengeluaran += t.jumlah
            }
            summary[key].saldo = summary[key].total_pemasukan - summary[key].total_pengeluaran
          })
          
          setKasSummary(Object.values(summary))
        }

        // Fetch pengajuan summary
        const { data: pengajuanData } = await supabase
          .from('pengajuan_pembelian')
          .select('status')

        if (pengajuanData) {
          const summary: Record<string, number> = {}
          pengajuanData.forEach((p) => {
            summary[p.status] = (summary[p.status] || 0) + 1
          })
          setPengajuanSummary(
            Object.entries(summary).map(([status, count]) => ({ status, count }))
          )
        }

        // Fetch recent transactions
        const { data: recentData } = await supabase
          .from('kas_transaksi')
          .select('id, tanggal, tipe, jumlah, keterangan, jenis_kas, wilayah')
          .order('created_at', { ascending: false })
          .limit(10)

        if (recentData) {
          setRecentTransactions(recentData)
        }

        // Calculate current month totals
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const { data: monthData } = await supabase
          .from('kas_transaksi')
          .select('tipe, jumlah')
          .gte('tanggal', startOfMonth.toISOString().split('T')[0])

        if (monthData) {
          let pemasukan = 0
          let pengeluaran = 0
          monthData.forEach((t) => {
            if (t.tipe === 'pemasukan') pemasukan += t.jumlah
            else pengeluaran += t.jumlah
          })
          setCurrentMonth({ pemasukan, pengeluaran })
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate totals
  const totalSaldoRW = kasSummary
    .filter(k => k.jenis_kas === 'rw')
    .reduce((sum, k) => sum + k.saldo, 0)
  
  const totalSaldoRT = kasSummary
    .filter(k => k.jenis_kas === 'rt')
    .reduce((sum, k) => sum + k.saldo, 0)

  const pengajuanMenunggu = pengajuanSummary
    .filter(p => ['diajukan', 'direvisi'].includes(p.status))
    .reduce((sum, p) => sum + p.count, 0)

  const pengajuanDiproses = pengajuanSummary
    .filter(p => ['disetujui', 'diproses'].includes(p.status))
    .reduce((sum, p) => sum + p.count, 0)

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'diajukan': 'Menunggu Approval',
      'direvisi': 'Perlu Revisi',
      'disetujui': 'Disetujui',
      'ditolak': 'Ditolak',
      'diproses': 'Sedang Diproses',
      'selesai': 'Selesai',
      'dibatalkan': 'Dibatalkan'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'diajukan': 'warning',
      'direvisi': 'info',
      'disetujui': 'primary',
      'ditolak': 'danger',
      'diproses': 'info',
      'selesai': 'success',
      'dibatalkan': 'secondary'
    }
    return colors[status] || 'secondary'
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-1">Dashboard Keuangan</h1>
          <p className="text-muted mb-0">
            Ringkasan kas RW 013 Permata Discovery
          </p>
        </div>
        {isPengurus && (
          <Link href="/keuangan/pengajuan/tambah" className="btn btn-primary">
            <FiPlus className="me-2" />
            Pengajuan Baru
          </Link>
        )}
      </div>

      {/* Summary Cards - Kas RW */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-primary border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                    <FiDollarSign className="text-primary" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Saldo Kas RW</p>
                  <h4 className="mb-0 fw-bold">{formatRupiah(totalSaldoRW)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-success border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-success bg-opacity-10 rounded-circle p-3">
                    <FiTrendingUp className="text-success" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Pemasukan Bulan Ini</p>
                  <h4 className="mb-0 fw-bold text-success">{formatRupiah(currentMonth.pemasukan)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-danger border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                    <FiTrendingDown className="text-danger" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Pengeluaran Bulan Ini</p>
                  <h4 className="mb-0 fw-bold text-danger">{formatRupiah(currentMonth.pengeluaran)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="card h-100 border-start border-warning border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                    <FiClock className="text-warning" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Pengajuan Menunggu</p>
                  <h4 className="mb-0 fw-bold">{pengajuanMenunggu}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Kas per Wilayah */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiDollarSign className="me-2" />
                Saldo Kas per Wilayah
              </h6>
            </div>
            <div className="card-body">
              {kasSummary.length === 0 ? (
                <p className="text-muted text-center py-4">Belum ada data transaksi</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Kas</th>
                        <th>Wilayah</th>
                        <th className="text-end">Pemasukan</th>
                        <th className="text-end">Pengeluaran</th>
                        <th className="text-end">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kasSummary.map((kas, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className={`badge bg-${kas.jenis_kas === 'rw' ? 'primary' : 'info'}`}>
                              {kas.jenis_kas.toUpperCase()}
                            </span>
                          </td>
                          <td>{kas.wilayah}</td>
                          <td className="text-end text-success">{formatRupiah(kas.total_pemasukan)}</td>
                          <td className="text-end text-danger">{formatRupiah(kas.total_pengeluaran)}</td>
                          <td className="text-end fw-bold">{formatRupiah(kas.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan={4} className="fw-bold">Total Kas RW</td>
                        <td className="text-end fw-bold">{formatRupiah(totalSaldoRW)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="fw-bold">Total Kas RT</td>
                        <td className="text-end fw-bold">{formatRupiah(totalSaldoRT)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Pengajuan */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">
                <FiFileText className="me-2" />
                Status Pengajuan
              </h6>
              <Link href="/keuangan/pengajuan" className="btn btn-sm btn-light">
                Lihat Semua
              </Link>
            </div>
            <div className="card-body">
              {pengajuanSummary.length === 0 ? (
                <p className="text-muted text-center py-4">Belum ada pengajuan</p>
              ) : (
                <div className="row g-3">
                  {pengajuanSummary.map((item, idx) => (
                    <div key={idx} className="col-6">
                      <div className={`card bg-${getStatusColor(item.status)} bg-opacity-10 border-0`}>
                        <div className="card-body text-center py-3">
                          <h3 className={`mb-1 fw-bold text-${getStatusColor(item.status)}`}>
                            {item.count}
                          </h3>
                          <small className="text-muted">{getStatusLabel(item.status)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">
                <FiDollarSign className="me-2" />
                Transaksi Terbaru
              </h6>
              <Link href="/keuangan/transaksi" className="btn btn-sm btn-light">
                Lihat Semua
              </Link>
            </div>
            <div className="card-body p-0">
              {recentTransactions.length === 0 ? (
                <p className="text-muted text-center py-4">Belum ada transaksi</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Tanggal</th>
                        <th>Kas</th>
                        <th>Wilayah</th>
                        <th>Keterangan</th>
                        <th className="text-end">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((t) => (
                        <tr key={t.id}>
                          <td>{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                          <td>
                            <span className={`badge bg-${t.jenis_kas === 'rw' ? 'primary' : 'info'}`}>
                              {t.jenis_kas.toUpperCase()}
                            </span>
                          </td>
                          <td>{t.wilayah}</td>
                          <td>{t.keterangan || '-'}</td>
                          <td className={`text-end fw-bold text-${t.tipe === 'pemasukan' ? 'success' : 'danger'}`}>
                            {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.jumlah)}
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
      </div>
    </div>
  )
}