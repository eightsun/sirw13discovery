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
  FiFile,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight
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

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KasTransaksi | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const isKetuaRW = userData?.role === 'ketua_rw'

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

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [filterJenisKas, filterWilayah, filterTipe, filterBulan])

  // Pagination calculations
  const totalPages = Math.ceil(transaksi.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransaksi = transaksi.slice(startIndex, startIndex + itemsPerPage)

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

  const resetFilters = () => {
    setFilterJenisKas('')
    setFilterWilayah('')
    setFilterTipe('')
    setFilterBulan('')
    setCurrentPage(1)
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
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '' as unknown as 'Timur' | 'Barat', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Total Pemasukan', 'Jumlah': totalPemasukan })
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '' as unknown as 'Timur' | 'Barat', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Total Pengeluaran', 'Jumlah': -totalPengeluaran })
    data.push({ 'No': '' as unknown as number, 'Tanggal': '', 'Jenis Kas': '', 'Wilayah': '' as unknown as 'Timur' | 'Barat', 'Tipe': '', 'Sumber': '', 'Kategori': '', 'Keterangan': 'Saldo', 'Jumlah': totalPemasukan - totalPengeluaran })

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

  const handleDeleteClick = (item: KasTransaksi) => {
    setDeleteTarget(item)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      // Hapus file bukti dari storage jika ada
      if (deleteTarget.bukti_url) {
        const path = deleteTarget.bukti_url.startsWith('http')
          ? deleteTarget.bukti_url.match(/\/pengajuan\/([^?]+)/)?.[1]
          : deleteTarget.bukti_url.split('?')[0]

        if (path) {
          await supabase.storage.from('pengajuan').remove([path])
        }
      }

      // Hapus transaksi dari database
      const { error } = await supabase
        .from('kas_transaksi')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error

      setShowDeleteModal(false)
      setDeleteTarget(null)
      fetchTransaksi()
      alert('Transaksi berhasil dihapus')
    } catch (error) {
      console.error('Error deleting transaksi:', error)
      alert('Gagal menghapus transaksi')
    } finally {
      setDeleting(false)
    }
  }

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
            <div className="table-responsive desktop-table">
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
                    {isKetuaRW && <th className="text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransaksi.map((t) => (
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
                      {isKetuaRW && (
                        <td>
                          <div className="d-flex justify-content-center gap-1">
                            <Link
                              href={`/keuangan/transaksi/${t.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Lihat Detail"
                            >
                              <FiEye />
                            </Link>
                            <Link
                              href={`/keuangan/transaksi/${t.id}/edit`}
                              className="btn btn-sm btn-outline-warning"
                              title="Edit"
                            >
                              <FiEdit2 />
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Hapus Transaksi"
                              onClick={() => handleDeleteClick(t)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          )}

            {/* Mobile Card View */}
            <div className="mobile-card-list">
              {paginatedTransaksi.map((t) => (
                <div key={t.id} className="mobile-card-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div style={{flex:1, minWidth:0}}>
                      <div className="mc-title" style={{whiteSpace:'normal',wordBreak:'break-word'}}>{t.keterangan || 'Transaksi'}</div>
                      <small className="text-muted">{new Date(t.tanggal).toLocaleDateString('id-ID')} · {t.wilayah}</small>
                    </div>
                    <span className={`mc-amount ms-2 text-nowrap ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                      {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.jumlah)}
                    </span>
                  </div>
                  <div className="mc-row mt-1">
                    <span>
                      <span className={`badge bg-${t.jenis_kas === 'rw' ? 'primary' : 'secondary'} me-1`} style={{fontSize:'0.65rem'}}>
                        {t.jenis_kas.toUpperCase()}
                      </span>
                      {t.kategori ? `${t.kategori.kode}. ${t.kategori.nama}` : ''}
                    </span>
                  </div>
                  {isKetuaRW && (
                    <div className="mc-actions mt-2">
                      <Link href={`/keuangan/transaksi/${t.id}`} className="btn btn-sm btn-outline-primary">
                        <FiEye className="me-1" /> Detail
                      </Link>
                      <Link href={`/keuangan/transaksi/${t.id}/edit`} className="btn btn-sm btn-outline-warning">
                        <FiEdit2 className="me-1" /> Edit
                      </Link>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(t)}>
                        <FiTrash2 className="me-1" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 gap-2">
          <small className="text-muted">
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, transaksi.length)} dari {transaksi.length} transaksi
            {filterBulan && ` untuk bulan ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
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
      {totalPages <= 1 && transaksi.length > 0 && (
        <div className="mt-3 text-muted small">
          Menampilkan {transaksi.length} transaksi
          {filterBulan && ` untuk bulan ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <FiTrash2 className="me-2" />
                  Hapus Transaksi
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Apakah Anda yakin ingin menghapus transaksi berikut?
                </p>
                <div className="alert alert-secondary">
                  <strong>{new Date(deleteTarget.tanggal).toLocaleDateString('id-ID')}</strong> - {deleteTarget.wilayah}<br />
                  {deleteTarget.keterangan || 'Tidak ada keterangan'}<br />
                  <span className={`fw-bold ${deleteTarget.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                    {deleteTarget.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(deleteTarget.jumlah)}
                  </span>
                </div>
                <div className="alert alert-warning small mb-0">
                  <strong>Perhatian:</strong> Tindakan ini tidak dapat dibatalkan.
                  {deleteTarget.bukti_url && <> File bukti transaksi juga akan dihapus.</>}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Menghapus...</>
                  ) : (
                    <><FiTrash2 className="me-2" />Ya, Hapus Transaksi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}