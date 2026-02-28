'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KasTransaksi } from '@/types'
import { 
  FiArrowLeft,
  FiPrinter,
  FiDownload,
  FiCalendar
} from 'react-icons/fi'

export default function LaporanBulananPage() {
  const { userData } = useUser()
  const supabase = createClient()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [transaksi, setTransaksi] = useState<KasTransaksi[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedWilayah, setSelectedWilayah] = useState<'Timur' | 'Barat'>('Timur')
  
  // Summary
  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalPengeluaran, setTotalPengeluaran] = useState(0)
  
  // Pejabat penandatangan
  const [ketuaRW, setKetuaRW] = useState('')
  const [bendaharaRW, setBendaharaRW] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedWilayah])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`

      // Fetch transaksi
      const { data: transaksiData, error } = await supabase
        .from('kas_transaksi')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama)
        `)
        .eq('jenis_kas', 'rw')
        .eq('wilayah', selectedWilayah)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true })

      if (error) throw error
      setTransaksi(transaksiData || [])
      
      // Calculate totals
      let pemasukan = 0
      let pengeluaran = 0
      transaksiData?.forEach((t: KasTransaksi) => {
        if (t.tipe === 'pemasukan') {
          pemasukan += t.jumlah
        } else {
          pengeluaran += t.jumlah
        }
      })
      setTotalPemasukan(pemasukan)
      setTotalPengeluaran(pengeluaran)

      // Fetch pejabat
      const { data: ketuaData } = await supabase
        .from('warga')
        .select('nama_lengkap')
        .eq('role', 'ketua_rw')
        .single()
      
      const { data: bendaharaData } = await supabase
        .from('warga')
        .select('nama_lengkap')
        .eq('role', 'bendahara_rw')
        .single()

      if (ketuaData) setKetuaRW(ketuaData.nama_lengkap)
      if (bendaharaData) setBendaharaRW(bendaharaData.nama_lengkap)
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { 
      month: 'long', 
      year: 'numeric' 
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Kas RW - ${monthName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            padding: 20px;
            font-size: 12px;
            line-height: 1.4;
          }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 16px; margin-bottom: 5px; }
          .header p { font-size: 12px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #333; 
            padding: 5px 8px; 
            text-align: left;
          }
          th { background: #f0f0f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary { margin: 20px 0; }
          .summary-row { display: flex; justify-content: space-between; max-width: 300px; }
          .signatures { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 50px;
            padding: 0 30px;
          }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { 
            border-top: 1px solid #333; 
            margin-top: 60px; 
            padding-top: 5px;
          }
          .date-place { text-align: right; margin: 30px 0; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const getMonthName = () => {
    return new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/keuangan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Laporan Keuangan Bulanan</h1>
          <p className="text-muted mb-0">
            Generate laporan kas RW per bulan
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handlePrint}
          disabled={loading || transaksi.length === 0}
        >
          <FiPrinter className="me-2" />
          Cetak Laporan
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">
                <FiCalendar className="me-1" /> Periode Bulan
              </label>
              <input
                type="month"
                className="form-control"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Wilayah</label>
              <select
                className="form-select"
                value={selectedWilayah}
                onChange={(e) => setSelectedWilayah(e.target.value as 'Timur' | 'Barat')}
              >
                <option value="Timur">Discovery Timur</option>
                <option value="Barat">Discovery Barat</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Laporan */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0 fw-bold">Preview Laporan</h6>
        </div>
        <div className="card-body" style={{ backgroundColor: '#f8f9fa' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div 
              ref={printRef}
              style={{ 
                backgroundColor: 'white', 
                padding: '30px',
                fontFamily: "'Courier New', monospace",
                fontSize: '12px',
                maxWidth: '800px',
                margin: '0 auto'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '16px', marginBottom: '5px', fontWeight: 'bold' }}>
                  LAPORAN KEUANGAN KAS RW
                </h1>
                <p style={{ margin: '3px 0' }}>RW 013 Permata Discovery</p>
                <p style={{ margin: '3px 0' }}>Discovery {selectedWilayah}</p>
                <p style={{ margin: '3px 0', fontWeight: 'bold' }}>Periode: {getMonthName()}</p>
              </div>

              {/* Tabel Transaksi */}
              {transaksi.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px' }}>
                  Tidak ada transaksi pada periode ini
                </p>
              ) : (
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>No</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>Tanggal</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>Kas</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>Tipe</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>Keterangan</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', textAlign: 'right' }}>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaksi.map((t, index) => (
                        <tr key={t.id}>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px' }}>
                            {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px' }}>
                            {t.jenis_kas.toUpperCase()}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px' }}>
                            {t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', maxWidth: '200px' }}>
                            {t.keterangan?.substring(0, 30) || '-'}{t.keterangan && t.keterangan.length > 30 ? '...' : ''}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'right' }}>
                            {t.tipe === 'pemasukan' ? '' : '-'}{formatRupiah(t.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary */}
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', marginBottom: '5px' }}>
                      <span>Total Pemasukan:</span>
                      <span>{formatRupiah(totalPemasukan)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', marginBottom: '5px' }}>
                      <span>Total Pengeluaran:</span>
                      <span>{formatRupiah(totalPengeluaran)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', fontWeight: 'bold' }}>
                      <span>Saldo:</span>
                      <span>{formatRupiah(totalPemasukan - totalPengeluaran)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Tanggal & Tempat */}
              <div style={{ textAlign: 'right', marginBottom: '40px' }}>
                Gresik, {getCurrentDate()}
              </div>

              {/* Tanda Tangan - Ketua RW di KIRI, Bendahara di KANAN */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', paddingRight: '30px' }}>
                {/* Ketua RW - KIRI */}
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <p style={{ marginBottom: '5px' }}>Ketua RW 013</p>
                  <p style={{ marginBottom: '0' }}>Permata Discovery</p>
                  <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '5px' }}>
                    {ketuaRW || '____________________'}
                  </div>
                </div>

                {/* Bendahara RW - KANAN */}
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <p style={{ marginBottom: '5px' }}>Bendahara RW</p>
                  <p style={{ marginBottom: '0' }}>Discovery {selectedWilayah}</p>
                  <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '5px' }}>
                    {bendaharaRW || '____________________'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}