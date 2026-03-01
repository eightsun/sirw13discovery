'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KasTransaksi, KategoriPengeluaran } from '@/types'
import { 
  FiArrowLeft,
  FiPrinter,
  FiCalendar
} from 'react-icons/fi'

interface KategoriSummary {
  kode: string
  nama: string
  total: number
}

export default function LaporanBulananPage() {
  const { userData, isPengurus } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [transaksi, setTransaksi] = useState<KasTransaksi[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedWilayah, setSelectedWilayah] = useState<'Timur' | 'Barat'>('Timur')
  
  // Summary
  const [totalPemasukan, setTotalPemasukan] = useState(0)
  const [totalPengeluaran, setTotalPengeluaran] = useState(0)
  const [kategoriSummary, setKategoriSummary] = useState<KategoriSummary[]>([])
  
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
      const kategoriMap = new Map<string, KategoriSummary>()
      
      transaksiData?.forEach((t: KasTransaksi) => {
        if (t.tipe === 'pemasukan') {
          pemasukan += t.jumlah
        } else {
          pengeluaran += t.jumlah
          
          // Group by kategori
          if (t.kategori) {
            const key = t.kategori.kode
            if (kategoriMap.has(key)) {
              const existing = kategoriMap.get(key)!
              existing.total += t.jumlah
            } else {
              kategoriMap.set(key, {
                kode: t.kategori.kode,
                nama: t.kategori.nama,
                total: t.jumlah
              })
            }
          } else {
            // Tanpa kategori
            const key = '99'
            if (kategoriMap.has(key)) {
              const existing = kategoriMap.get(key)!
              existing.total += t.jumlah
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
      
      setTotalPemasukan(pemasukan)
      setTotalPengeluaran(pengeluaran)
      
      // Sort kategori by kode
      const sortedKategori = Array.from(kategoriMap.values()).sort((a, b) => 
        parseInt(a.kode) - parseInt(b.kode)
      )
      setKategoriSummary(sortedKategori)

      // Fetch pejabat dari tabel users (yang punya kolom role)
      const { data: ketuaData } = await supabase
        .from('users')
        .select('nama_lengkap')
        .eq('role', 'ketua_rw')
        .eq('is_active', true)
        .single()

      if (ketuaData && ketuaData.nama_lengkap) setKetuaRW(ketuaData.nama_lengkap)
      
      // Bendahara per wilayah - default sudah di-set sesuai wilayah yang dipilih
      // Tabel users tidak punya kolom wilayah, jadi gunakan mapping default
      const bendaharaMap: Record<string, string> = {
        'Timur': 'Ferdinan Rakhmad Yanuar',
        'Barat': 'Achmad Rizaq'
      }
      setBendaharaRW(bendaharaMap[selectedWilayah] || '')
      
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
            vertical-align: top;
          }
          th { 
            background: #f0f0f0; 
            white-space: nowrap;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .nowrap { white-space: nowrap; }
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
          .section-title { font-weight: bold; margin: 15px 0 10px 0; }
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
          <Link href={isPengurus ? '/keuangan' : '/dashboard'} className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Laporan Keuangan Bulanan</h1>
          <p className="text-muted mb-0">
            Laporan kas RW 013 Permata Discovery per bulan
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
                  <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>A. RINCIAN TRANSAKSI</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '30px', whiteSpace: 'nowrap' }}>No</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '75px', whiteSpace: 'nowrap' }}>Tanggal</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '35px', whiteSpace: 'nowrap' }}>Kas</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '50px', whiteSpace: 'nowrap' }}>Tipe</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '45px', whiteSpace: 'nowrap' }}>Kode</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', whiteSpace: 'nowrap' }}>Keterangan</th>
                        <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', textAlign: 'right', width: '110px', whiteSpace: 'nowrap' }}>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaksi.map((t, index) => (
                        <tr key={t.id} style={{ verticalAlign: 'top' }}>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', whiteSpace: 'nowrap' }}>
                            {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', whiteSpace: 'nowrap' }}>
                            {t.jenis_kas.toUpperCase()}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', whiteSpace: 'nowrap' }}>
                            {t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {t.tipe === 'pengeluaran' && t.kategori ? t.kategori.kode : '-'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', wordWrap: 'break-word' }}>
                            {t.keterangan || '-'}
                          </td>
                          <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {t.tipe === 'pemasukan' ? '' : '-'}{formatRupiah(t.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Ringkasan Pengeluaran per Kategori */}
                  {kategoriSummary.length > 0 && (
                    <>
                      <p style={{ fontWeight: 'bold', marginBottom: '10px', marginTop: '25px' }}>B. RINGKASAN PENGELUARAN PER KATEGORI</p>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', width: '60px' }}>Kode</th>
                            <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0' }}>Nama Kategori</th>
                            <th style={{ border: '1px solid #333', padding: '5px 8px', backgroundColor: '#f0f0f0', textAlign: 'right', width: '150px' }}>Jumlah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kategoriSummary.map((kat) => (
                            <tr key={kat.kode}>
                              <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'center' }}>{kat.kode}</td>
                              <td style={{ border: '1px solid #333', padding: '5px 8px' }}>{kat.nama}</td>
                              <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'right' }}>{formatRupiah(kat.total)}</td>
                            </tr>
                          ))}
                          {/* Total Pengeluaran */}
                          <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                            <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'center' }} colSpan={2}>
                              Total Pengeluaran
                            </td>
                            <td style={{ border: '1px solid #333', padding: '5px 8px', textAlign: 'right' }}>
                              {formatRupiah(totalPengeluaran)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}

                  {/* Summary */}
                  <p style={{ fontWeight: 'bold', marginBottom: '10px', marginTop: '25px' }}>C. RINGKASAN KEUANGAN</p>
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', marginBottom: '5px' }}>
                      <span>Total Pemasukan:</span>
                      <span>{formatRupiah(totalPemasukan)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', marginBottom: '5px' }}>
                      <span>Total Pengeluaran:</span>
                      <span>{formatRupiah(totalPengeluaran)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '300px', fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: '5px', marginTop: '5px' }}>
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