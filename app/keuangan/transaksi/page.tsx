'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KasTransaksi } from '@/types'
import { 
  FiPlus, 
  FiFilter,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiArrowLeft
} from 'react-icons/fi'

// Custom Rupiah Icon
const RupiahIcon = ({ className = '' }: { className?: string }) => (
  <span className={className} style={{ fontWeight: 'bold' }}>Rp</span>
)

export default function TransaksiKasPage() {
  const { userData, isPengurus } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [transaksi, setTransaksi] = useState<KasTransaksi[]>([])
  const [filterJenisKas, setFilterJenisKas] = useState<string>('')
  const [filterWilayah, setFilterWilayah] = useState<string>('')
  const [filterTipe, setFilterTipe] = useState<string>('')
  const [filterBulan, setFilterBulan] = useState<string>('')
  
  // Summary
  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalPengeluaran, setTotalPengeluaran] = useState(0)

  useEffect(() => {
    fetchTransaksi()
  }, [filterJenisKas, filterWilayah, filterTipe, filterBulan])

  const fetchTransaksi = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('kas_transaksi')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama)
        `)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })

      if (filterJenisKas) {
        query = query.eq('jenis_kas', filterJenisKas)
      }
      if (filterWilayah) {
        query = query.eq('wilayah', filterWilayah)
      }
      if (filterTipe) {
        query = query.eq('tipe', filterTipe)
      }
      if (filterBulan) {
        const [year, month] = filterBulan.split('-')
        const startDate = `${year}-${month}-01`
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]
        query = query.gte('tanggal', startDate).lte('tanggal', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      setTransaksi(data || [])
      
      // Calculate totals
      let pemasukan = 0
      let pengeluaran = 0
      data?.forEach((t: KasTransaksi) => {
        if (t.tipe === 'pemasukan') {
          pemasukan += t.jumlah
        } else {
          pengeluaran += t.jumlah
        }
      })
      setTotalPemasukan(pemasukan)
      setTotalPengeluaran(pengeluaran)
      
    } catch (error) {
      console.error('Error fetching transaksi:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setFilterJenisKas('')
    setFilterWilayah('')
    setFilterTipe('')
    setFilterBulan('')
  }

  const getSumberLabel = (sumber: string) => {
    const labels: Record<string, string> = {
      'ipl': 'IPL',
      'pengajuan': 'Pengajuan',
      'manual': 'Manual'
    }
    return labels[sumber] || sumber
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/keuangan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Transaksi Kas</h1>
          <p className="text-muted mb-0">
            Riwayat pemasukan dan pengeluaran kas RW
          </p>
        </div>
        {isPengurus && (
          <Link href="/keuangan/transaksi/tambah" className="btn btn-primary">
            <FiPlus className="me-2" />
            Tambah Transaksi
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-start border-success border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-success bg-opacity-10 rounded-circle p-3">
                    <FiTrendingUp className="text-success" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Total Pemasukan</p>
                  <h4 className="mb-0 fw-bold text-success">{formatRupiah(totalPemasukan)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-start border-danger border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                    <FiTrendingDown className="text-danger" size={24} />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Total Pengeluaran</p>
                  <h4 className="mb-0 fw-bold text-danger">{formatRupiah(totalPengeluaran)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-start border-primary border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                    <RupiahIcon className="text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-muted mb-1 small">Selisih</p>
                  <h4 className={`mb-0 fw-bold ${totalPemasukan - totalPengeluaran >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatRupiah(totalPemasukan - totalPengeluaran)}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label small">
                <FiFilter className="me-1" /> Jenis Kas
              </label>
              <select
                className="form-select"
                value={filterJenisKas}
                onChange={(e) => setFilterJenisKas(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="rw">Kas RW</option>
                <option value="rt">Kas RT</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Wilayah</label>
              <select
                className="form-select"
                value={filterWilayah}
                onChange={(e) => setFilterWilayah(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="Timur">Discovery Timur</option>
                <option value="Barat">Discovery Barat</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Tipe</label>
              <select
                className="form-select"
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">
                <FiCalendar className="me-1" /> Bulan
              </label>
              <input
                type="month"
                className="form-control"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={resetFilters}
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaksi Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : transaksi.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tanggal</th>
                    <th>Kas</th>
                    <th>Wilayah</th>
                    <th>Tipe</th>
                    <th>Sumber</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th className="text-end">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                      <td>
                        <span className={`badge bg-${t.jenis_kas === 'rw' ? 'primary' : 'secondary'}`}>
                          {t.jenis_kas.toUpperCase()}
                        </span>
                      </td>
                      <td>{t.wilayah}</td>
                      <td>
                        {t.tipe === 'pemasukan' ? (
                          <span className="text-success">
                            <FiTrendingUp className="me-1" /> Masuk
                          </span>
                        ) : (
                          <span className="text-danger">
                            <FiTrendingDown className="me-1" /> Keluar
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${
                          t.sumber === 'ipl' ? 'info' : 
                          t.sumber === 'pengajuan' ? 'warning' : 'secondary'
                        }`}>
                          {getSumberLabel(t.sumber)}
                        </span>
                      </td>
                      <td>{t.kategori ? `${t.kategori.kode}. ${t.kategori.nama}` : '-'}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>
                        {t.keterangan || '-'}
                      </td>
                      <td className={`text-end fw-bold ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
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

      {/* Info */}
      <div className="mt-3 text-muted small">
        <p className="mb-0">
          Menampilkan {transaksi.length} transaksi
          {filterBulan && ` untuk bulan ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
        </p>
      </div>
    </div>
  )
}