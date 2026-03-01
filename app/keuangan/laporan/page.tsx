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

const LOGO_BASE64 = 'data:image/jpeg;base64,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'

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
  const [saldoAwal, setSaldoAwal] = useState(0)
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

      // Fetch saldo awal: semua transaksi SEBELUM bulan yang dipilih
      const { data: saldoAwalData } = await supabase
        .from('kas_transaksi')
        .select('tipe, jumlah')
        .eq('jenis_kas', 'rw')
        .eq('wilayah', selectedWilayah)
        .lt('tanggal', startDate)

      let saldoAwalCalc = 0
      saldoAwalData?.forEach((t: { tipe: string; jumlah: number }) => {
        if (t.tipe === 'pemasukan') {
          saldoAwalCalc += t.jumlah
        } else {
          saldoAwalCalc -= t.jumlah
        }
      })
      setSaldoAwal(saldoAwalCalc)

      // Fetch transaksi bulan ini
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
          .page-break-before { page-break-before: always; }
          img { max-width: 70px; height: auto; }
          @media print {
            body { padding: 0; }
            .page-break-before { page-break-before: always; }
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
              {/* Header dengan Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                <img 
                  src={LOGO_BASE64} 
                  alt="Logo RW 013" 
                  style={{ width: '65px', height: '65px', objectFit: 'contain', flexShrink: 0 }} 
                />
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h1 style={{ fontSize: '16px', marginBottom: '5px', fontWeight: 'bold' }}>
                    LAPORAN KEUANGAN KAS RW
                  </h1>
                  <p style={{ margin: '3px 0' }}>RW 013 Permata Discovery</p>
                  <p style={{ margin: '3px 0' }}>Discovery {selectedWilayah}</p>
                  <p style={{ margin: '3px 0', fontWeight: 'bold' }}>Periode: {getMonthName()}</p>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '2px solid #333', marginBottom: '20px' }} />

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

                  {/* === HALAMAN 2: Ringkasan + Tanda Tangan === */}
                  <div style={{ pageBreakBefore: 'always' }}>

                    {/* Ringkasan Pengeluaran per Kategori */}
                    {kategoriSummary.length > 0 && (
                      <>
                        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>B. RINGKASAN PENGELUARAN PER KATEGORI</p>
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

                    {/* Ringkasan Keuangan */}
                    <p style={{ fontWeight: 'bold', marginBottom: '10px', marginTop: '25px' }}>C. RINGKASAN KEUANGAN</p>
                    <div style={{ marginBottom: '30px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '350px', marginBottom: '5px' }}>
                        <span>Saldo Awal (s.d. bulan lalu):</span>
                        <span>{formatRupiah(saldoAwal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '350px', marginBottom: '5px' }}>
                        <span>Pemasukan bulan ini:</span>
                        <span style={{ color: '#198754' }}>+{formatRupiah(totalPemasukan)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '350px', marginBottom: '5px' }}>
                        <span>Pengeluaran bulan ini:</span>
                        <span style={{ color: '#dc3545' }}>-{formatRupiah(totalPengeluaran)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '350px', fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '5px', marginTop: '5px' }}>
                        <span>Saldo Akhir:</span>
                        <span>{formatRupiah(saldoAwal + totalPemasukan - totalPengeluaran)}</span>
                      </div>
                    </div>

                    {/* Tanggal & Tempat - sejajar dengan Bendahara (kanan) */}
                    <div style={{ textAlign: 'right', marginBottom: '30px', paddingRight: '30px' }}>
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
                  {/* === END HALAMAN 2 === */}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}