'use client'

import { useEffect, useState, useCallback } from 'react'
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
  FiArrowLeft,
  FiDownload,
  FiUpload,
  FiFileText,
  FiFile
} from 'react-icons/fi'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // Pejabat untuk tanda tangan
  const [pejabat, setPejabat] = useState<{
    ketuaRW: string;
    bendaharaTimur: string;
    bendaharaBarat: string;
  }>({
    ketuaRW: 'Ichsan Yudha Pratama',
    bendaharaTimur: 'Ratih Muliasari',
    bendaharaBarat: 'Ratih Muliasari'
  })

  useEffect(() => {
    fetchTransaksi()
    fetchPejabat()
  }, [filterJenisKas, filterWilayah, filterTipe, filterBulan])

  const fetchPejabat = async () => {
    // Fetch Ketua RW
    const { data: ketuaData } = await supabase
      .from('warga')
      .select('nama_lengkap')
      .eq('role', 'ketua_rw')
      .single()
    
    // Fetch Bendahara RW
    const { data: bendaharaData } = await supabase
      .from('warga')
      .select('nama_lengkap, wilayah')
      .eq('role', 'bendahara_rw')
    
    if (ketuaData) {
      setPejabat(prev => ({ ...prev, ketuaRW: ketuaData.nama_lengkap }))
    }
    
    if (bendaharaData) {
      bendaharaData.forEach((b: { nama_lengkap: string; wilayah: string }) => {
        if (b.wilayah === 'Timur') {
          setPejabat(prev => ({ ...prev, bendaharaTimur: b.nama_lengkap }))
        } else if (b.wilayah === 'Barat') {
          setPejabat(prev => ({ ...prev, bendaharaBarat: b.nama_lengkap }))
        }
      })
    }
  }

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
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`
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

  const getReportTitle = () => {
    let title = 'Laporan Transaksi Kas'
    if (filterWilayah) {
      title += ` Discovery ${filterWilayah}`
    }
    if (filterBulan) {
      const date = new Date(filterBulan + '-01')
      title += ` - ${date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
    }
    return title
  }

  // Download Excel
  const downloadExcel = useCallback(() => {
    const data = transaksi.map((t, idx) => ({
      'No': idx + 1,
      'Tanggal': new Date(t.tanggal).toLocaleDateString('id-ID'),
      'Jenis Kas': t.jenis_kas.toUpperCase(),
      'Wilayah': t.wilayah,
      'Tipe': t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar',
      'Sumber': getSumberLabel(t.sumber),
      'Kategori': t.kategori ? `${t.kategori.kode}. ${t.kategori.nama}` : '-',
      'Keterangan': t.keterangan || '-',
      'Jumlah': t.tipe === 'pemasukan' ? t.jumlah : -t.jumlah
    }))

    // Add summary rows
    data.push({} as typeof data[0])
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Total Pemasukan', 'Jumlah': totalPemasukan })
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Total Pengeluaran', 'Jumlah': -totalPengeluaran })
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Saldo', 'Jumlah': totalPemasukan - totalPengeluaran })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi')

    // Set column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 15 }
    ]

    const fileName = `laporan_transaksi_kas_${filterWilayah || 'semua'}_${filterBulan || new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }, [transaksi, totalPemasukan, totalPengeluaran, filterWilayah, filterBulan])

  // Download PDF
  const downloadPDF = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const wilayah = filterWilayah || 'Timur'
    
    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('LAPORAN TRANSAKSI KAS', pageWidth / 2, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.text(`RW 013 Permata Discovery ${wilayah}`, pageWidth / 2, 28, { align: 'center' })
    
    // Periode
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let periodeText = 'Periode: Semua'
    if (filterBulan) {
      const date = new Date(filterBulan + '-01')
      periodeText = `Periode: ${date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
    }
    doc.text(periodeText, pageWidth / 2, 36, { align: 'center' })

    // Table data - keterangan tidak dipotong
    const tableData = transaksi.map((t, idx) => [
      idx + 1,
      new Date(t.tanggal).toLocaleDateString('id-ID'),
      t.jenis_kas.toUpperCase(),
      t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar',
      t.kategori ? `${t.kategori.kode}. ${t.kategori.nama}` : '-',
      t.keterangan || '-',
      t.tipe === 'pemasukan' ? formatRupiah(t.jumlah) : `-${formatRupiah(t.jumlah)}`
    ])

    // Table dengan auto wrap untuk keterangan
    autoTable(doc, {
      startY: 42,
      head: [['No', 'Tanggal', 'Kas', 'Tipe', 'Kategori', 'Keterangan', 'Jumlah']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: {
        overflow: 'linebreak',
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 12 },
        4: { cellWidth: 25 },
        5: { cellWidth: 'auto' }, // Keterangan auto expand dan wrap
        6: { cellWidth: 28, halign: 'right' }
      }
    })

    // Calculate pengeluaran per kategori
    const kategoriMap = new Map<string, { kode: string; nama: string; total: number }>()
    transaksi.forEach((t) => {
      if (t.tipe === 'pengeluaran') {
        if (t.kategori) {
          const key = t.kategori.kode
          if (kategoriMap.has(key)) {
            kategoriMap.get(key)!.total += t.jumlah
          } else {
            kategoriMap.set(key, {
              kode: t.kategori.kode,
              nama: t.kategori.nama,
              total: t.jumlah
            })
          }
        } else {
          const key = '99'
          if (kategoriMap.has(key)) {
            kategoriMap.get(key)!.total += t.jumlah
          } else {
            kategoriMap.set(key, {
              kode: '99',
              nama: 'Tanpa Kategori',
              total: t.jumlah
            })
          }
        }
      }
    })

    // Sort by kode
    const kategoriSummary = Array.from(kategoriMap.values()).sort((a, b) => 
      parseInt(a.kode) - parseInt(b.kode)
    )

    let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

    // Ringkasan Pengeluaran per Kategori (jika ada pengeluaran)
    if (kategoriSummary.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Ringkasan Pengeluaran per Kategori:', 14, finalY)
      
      const kategoriTableData = kategoriSummary.map((kat) => [
        kat.kode,
        kat.nama,
        formatRupiah(kat.total)
      ])
      
      // Add total row
      kategoriTableData.push(['', 'Total Pengeluaran', formatRupiah(totalPengeluaran)])

      autoTable(doc, {
        startY: finalY + 3,
        head: [['Kode', 'Nama Kategori', 'Jumlah']],
        body: kategoriTableData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 40, halign: 'right' }
        }
      })

      finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }

    // Summary Keuangan
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Pemasukan: ${formatRupiah(totalPemasukan)}`, 14, finalY)
    doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 14, finalY + 6)
    doc.text(`Saldo: ${formatRupiah(totalPemasukan - totalPengeluaran)}`, 14, finalY + 12)

    // Signature section
    const sigY = finalY + 30
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    
    // Location and date
    doc.setFont('helvetica', 'normal')
    doc.text(`Gresik, ${today}`, pageWidth - 60, sigY)

    // Signature boxes
    const leftX = 30
    const rightX = pageWidth - 60

    // Ketua RW - KIRI
    doc.text('Ketua RW 013', leftX, sigY + 10)
    doc.text('Permata Discovery', leftX, sigY + 15)
    doc.setFont('helvetica', 'bold')
    doc.text(pejabat.ketuaRW, leftX, sigY + 45)
    doc.line(leftX - 5, sigY + 47, leftX + 45, sigY + 47)

    // Bendahara RW - KANAN
    doc.setFont('helvetica', 'normal')
    doc.text('Bendahara RW', rightX, sigY + 10)
    doc.text('Discovery ' + wilayah, rightX, sigY + 15)
    const bendaharaNama = wilayah === 'Timur' ? pejabat.bendaharaTimur : pejabat.bendaharaBarat
    doc.setFont('helvetica', 'bold')
    doc.text(bendaharaNama, rightX, sigY + 45)
    doc.line(rightX - 5, sigY + 47, rightX + 45, sigY + 47)

    const fileName = `laporan_transaksi_kas_${wilayah}_${filterBulan || new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }, [transaksi, totalPemasukan, totalPengeluaran, filterWilayah, filterBulan, pejabat])

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Link href="/keuangan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Transaksi Kas</h1>
          <p className="text-muted mb-0">
            Riwayat pemasukan dan pengeluaran kas RW
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {/* Download Template */}
          <a 
            href="/templates/template_transaksi_kas.xlsx" 
            download
            className="btn btn-outline-info"
          >
            <FiDownload className="me-1" /> Template Excel
          </a>
          
          {/* Import Excel */}
          {isPengurus && (
            <Link href="/keuangan/transaksi/import" className="btn btn-outline-success">
              <FiUpload className="me-1" /> Import Excel
            </Link>
          )}
          
          {/* Download Excel */}
          <button 
            className="btn btn-success"
            onClick={downloadExcel}
            disabled={transaksi.length === 0}
          >
            <FiFile className="me-1" /> Download Excel
          </button>
          
          {/* Download PDF */}
          <button 
            className="btn btn-danger"
            onClick={downloadPDF}
            disabled={transaksi.length === 0}
          >
            <FiFileText className="me-1" /> Download PDF
          </button>
          
          {/* Tambah Manual */}
          {isPengurus && (
            <Link href="/keuangan/transaksi/tambah" className="btn btn-primary">
              <FiPlus className="me-1" /> Tambah Manual
            </Link>
          )}
        </div>
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
                  <p className="text-muted mb-1 small">Saldo</p>
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

      {/* Info untuk PDF */}
      {filterWilayah && (
        <div className="alert alert-info small mb-4">
          <FiFileText className="me-2" />
          Laporan PDF akan ditandatangani oleh <strong>Bendahara RW {filterWilayah}</strong> dan <strong>Ketua RW</strong>
        </div>
      )}

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
                      <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
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