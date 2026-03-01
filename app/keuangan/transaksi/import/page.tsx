'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KategoriPengeluaran } from '@/types'
import { 
  FiArrowLeft,
  FiUpload,
  FiDownload,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiTrash2,
  FiFileText
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

interface ImportRow {
  no: number
  tanggal: string
  tanggal_raw: string  // raw value from Excel
  jenis_kas: string
  wilayah: string
  tipe: string
  kode_kategori: string
  keterangan: string
  jumlah: number
  errors: string[]
  valid: boolean
}

export default function ImportTransaksiPage() {
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  // Role check
  const isAllowed = userData?.role === 'ketua_rw' || userData?.role === 'bendahara_rw'

  useEffect(() => {
    if (userData && !isAllowed) {
      router.push('/keuangan/transaksi')
    }
  }, [userData, isAllowed, router])

  // Fetch kategori for validation
  useEffect(() => {
    const fetchKategori = async () => {
      const { data } = await supabase
        .from('kategori_pengeluaran')
        .select('*')
        .eq('is_active', true)
      
      if (data) {
        const sorted = data.sort((a: KategoriPengeluaran, b: KategoriPengeluaran) => 
          parseInt(a.kode) - parseInt(b.kode)
        )
        setKategoriList(sorted)
      }
    }
    fetchKategori()
  }, [])

  // Parse date from various formats
  const parseDate = (value: unknown): { date: string; raw: string } => {
    if (!value) return { date: '', raw: '' }
    
    const raw = String(value)

    // Excel serial number (e.g. 46081)
    if (typeof value === 'number' && value > 40000 && value < 60000) {
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + value * 86400000)
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      return { date: `${yyyy}-${mm}-${dd}`, raw }
    }

    // DD/MM/YYYY format
    const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (dmyMatch) {
      const dd = dmyMatch[1].padStart(2, '0')
      const mm = dmyMatch[2].padStart(2, '0')
      const yyyy = dmyMatch[3]
      return { date: `${yyyy}-${mm}-${dd}`, raw }
    }

    // YYYY-MM-DD format
    const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (ymdMatch) {
      return { date: `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`, raw }
    }

    // Try Date parse as fallback
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return { date: `${yyyy}-${mm}-${dd}`, raw }
    }

    return { date: '', raw }
  }

  // Validate a single row
  const validateRow = (row: ImportRow, kategoriKodes: string[]): ImportRow => {
    const errors: string[] = []

    // Tanggal
    if (!row.tanggal) {
      errors.push('Tanggal tidak valid')
    }

    // Jenis Kas
    const jenisKasNorm = row.jenis_kas.toLowerCase().trim()
    if (!['rw', 'rt'].includes(jenisKasNorm)) {
      errors.push('Jenis Kas harus "rw" atau "rt"')
    }

    // Wilayah
    const wilayahNorm = row.wilayah.trim()
    const wilayahMap: Record<string, string> = {
      'timur': 'Timur', 'barat': 'Barat',
      'Timur': 'Timur', 'Barat': 'Barat'
    }
    if (!wilayahMap[wilayahNorm]) {
      errors.push('Wilayah harus "Timur" atau "Barat"')
    }

    // Tipe
    const tipeNorm = row.tipe.toLowerCase().trim()
    if (!['pemasukan', 'pengeluaran'].includes(tipeNorm)) {
      errors.push('Tipe harus "pemasukan" atau "pengeluaran"')
    }

    // Kode Kategori (optional, validate if provided)
    const kodeKategori = row.kode_kategori?.toString().trim()
    if (kodeKategori && !kategoriKodes.includes(kodeKategori)) {
      errors.push(`Kode kategori "${kodeKategori}" tidak ditemukan`)
    }

    // Jumlah
    if (!row.jumlah || row.jumlah <= 0) {
      errors.push('Jumlah harus lebih dari 0')
    }

    // Keterangan
    if (!row.keterangan?.trim()) {
      errors.push('Keterangan wajib diisi')
    }

    return {
      ...row,
      jenis_kas: jenisKasNorm,
      wilayah: wilayahMap[wilayahNorm] || wilayahNorm,
      tipe: tipeNorm,
      kode_kategori: kodeKategori || '',
      errors,
      valid: errors.length === 0
    }
  }

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportResult(null)
    setLoading(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        
        // Get raw data with headers
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        
        if (jsonData.length === 0) {
          alert('File Excel kosong atau format tidak sesuai')
          setLoading(false)
          return
        }

        const kategoriKodes = kategoriList.map(k => k.kode)

        // Map Excel rows to ImportRow
        const mapped: ImportRow[] = jsonData.map((row: unknown, idx: number) => {
          const r = row as Record<string, unknown>
          
          // Find columns by partial match (flexible header names)
          const getVal = (keys: string[]): unknown => {
            for (const key of Object.keys(r)) {
              const keyLower = key.toLowerCase()
              for (const k of keys) {
                if (keyLower.includes(k.toLowerCase())) return r[key]
              }
            }
            return ''
          }

          const { date, raw } = parseDate(getVal(['tanggal']))
          const jumlahRaw = getVal(['jumlah'])
          const jumlah = Math.round(typeof jumlahRaw === 'number' ? Math.abs(jumlahRaw) : Math.abs(parseFloat(String(jumlahRaw).replace(/[^\d.-]/g, '')) || 0))

          const importRow: ImportRow = {
            no: idx + 1,
            tanggal: date,
            tanggal_raw: raw,
            jenis_kas: String(getVal(['jenis kas', 'jenis_kas', 'kas'])),
            wilayah: String(getVal(['wilayah'])),
            tipe: String(getVal(['tipe'])),
            kode_kategori: String(getVal(['kode kategori', 'kode_kategori', 'kategori'])),
            keterangan: String(getVal(['keterangan', 'deskripsi'])),
            jumlah,
            errors: [],
            valid: false
          }

          return validateRow(importRow, kategoriKodes)
        })

        setRows(mapped)
      } catch (error) {
        console.error('Error parsing Excel:', error)
        alert('Gagal membaca file Excel. Pastikan format file benar.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Remove a row
  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })))
  }

  // Import valid rows to database
  const handleImport = async () => {
    const validRows = rows.filter(r => r.valid)
    if (validRows.length === 0) {
      alert('Tidak ada data yang valid untuk diimport')
      return
    }

    try {
      setImporting(true)
      let success = 0
      let failed = 0
      const errors: string[] = []

      for (const row of validRows) {
        // Find kategori_id from kode
        let kategoriId: number | null = null
        if (row.kode_kategori) {
          const kat = kategoriList.find(k => k.kode === row.kode_kategori)
          if (kat) kategoriId = kat.id
        }

        const transaksiData = {
          jenis_kas: row.jenis_kas,
          wilayah: row.wilayah,
          tipe: row.tipe,
          sumber: 'manual' as const,
          tanggal: row.tanggal,
          kategori_id: kategoriId,
          jumlah: Math.round(row.jumlah),
          keterangan: row.keterangan,
          created_by: userData?.id
        }

        const { error } = await supabase
          .from('kas_transaksi')
          .insert(transaksiData)

        if (error) {
          failed++
          errors.push(`Baris ${row.no}: ${error.message}`)
        } else {
          success++
        }
      }

      setImportResult({ success, failed, errors })

      if (success > 0 && failed === 0) {
        // All success - redirect after short delay
        setTimeout(() => {
          router.push('/keuangan/transaksi')
        }, 2000)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Gagal import data')
    } finally {
      setImporting(false)
    }
  }

  // Reset
  const handleReset = () => {
    setRows([])
    setFileName('')
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      {
        'Tanggal (DD/MM/YYYY)': '28/02/2026',
        'Jenis Kas (rw/rt)': 'rw',
        'Wilayah (Timur/Barat)': 'Timur',
        'Tipe (pemasukan/pengeluaran)': 'pemasukan',
        'Kode Kategori': '1',
        'Keterangan': 'Contoh: Pemasukan IPL Februari 2026',
        'Jumlah': 500000
      },
      {
        'Tanggal (DD/MM/YYYY)': '01/03/2026',
        'Jenis Kas (rw/rt)': 'rw',
        'Wilayah (Timur/Barat)': 'Timur',
        'Tipe (pemasukan/pengeluaran)': 'pengeluaran',
        'Kode Kategori': '2',
        'Keterangan': 'Contoh: Pembelian alat kebersihan',
        'Jumlah': 150000
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    ws['!cols'] = [
      { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
      { wch: 15 }, { wch: 45 }, { wch: 15 }
    ]

    XLSX.writeFile(wb, 'template_transaksi_kas.xlsx')
  }

  const validCount = rows.filter(r => r.valid).length
  const errorCount = rows.filter(r => !r.valid).length

  if (userData && !isAllowed) {
    return null
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <Link href="/keuangan/transaksi" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Import Transaksi dari Excel</h1>
          <p className="text-muted mb-0">
            Upload file Excel sesuai template untuk import transaksi kas secara massal
          </p>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`alert ${importResult.failed === 0 ? 'alert-success' : 'alert-warning'} mb-4`}>
          <div className="d-flex align-items-center mb-2">
            {importResult.failed === 0 ? (
              <FiCheckCircle className="me-2" size={20} />
            ) : (
              <FiAlertCircle className="me-2" size={20} />
            )}
            <strong>
              {importResult.success} transaksi berhasil diimport
              {importResult.failed > 0 && `, ${importResult.failed} gagal`}
            </strong>
          </div>
          {importResult.failed === 0 && (
            <small>Mengalihkan ke halaman transaksi...</small>
          )}
          {importResult.errors.length > 0 && (
            <ul className="mb-0 mt-2 small">
              {importResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Upload Card */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiUpload className="me-2" />
                Upload File Excel
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={loading || importing}
                />
                <small className="text-muted">Format: .xlsx, .xls, atau .csv</small>
              </div>

              {fileName && (
                <div className="d-flex align-items-center justify-content-between bg-light rounded p-2">
                  <span className="small">
                    <FiFileText className="me-1" />
                    {fileName}
                  </span>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleReset}
                    disabled={importing}
                  >
                    <FiX className="me-1" /> Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="card mb-4">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold">
                  Preview Data ({rows.length} baris)
                </h6>
                <div>
                  <span className="badge bg-success me-2">
                    <FiCheck className="me-1" /> {validCount} valid
                  </span>
                  {errorCount > 0 && (
                    <span className="badge bg-danger">
                      <FiX className="me-1" /> {errorCount} error
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover table-sm mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40px' }}>No</th>
                        <th>Tanggal</th>
                        <th>Kas</th>
                        <th>Wilayah</th>
                        <th>Tipe</th>
                        <th>Kat.</th>
                        <th>Keterangan</th>
                        <th className="text-end">Jumlah</th>
                        <th style={{ width: '40px' }}>Status</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} className={!row.valid ? 'table-danger' : ''}>
                          <td className="small">{row.no}</td>
                          <td className="small">
                            {row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : (
                              <span className="text-danger">{row.tanggal_raw || '-'}</span>
                            )}
                          </td>
                          <td><span className={`badge bg-${row.jenis_kas === 'rw' ? 'primary' : 'secondary'} badge-sm`}>{row.jenis_kas.toUpperCase()}</span></td>
                          <td className="small">{row.wilayah}</td>
                          <td className="small">
                            {row.tipe === 'pemasukan' ? (
                              <span className="text-success">Masuk</span>
                            ) : (
                              <span className="text-danger">Keluar</span>
                            )}
                          </td>
                          <td className="small">{row.kode_kategori || '-'}</td>
                          <td className="small" style={{ maxWidth: '200px', whiteSpace: 'normal' }}>
                            {row.keterangan || '-'}
                          </td>
                          <td className="text-end small fw-bold">
                            {formatRupiah(row.jumlah)}
                          </td>
                          <td className="text-center">
                            {row.valid ? (
                              <FiCheckCircle className="text-success" />
                            ) : (
                              <span title={row.errors.join(', ')}>
                                <FiAlertCircle className="text-danger" />
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-link text-danger p-0"
                              onClick={() => removeRow(idx)}
                              title="Hapus baris"
                              disabled={importing}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Detail */}
              {errorCount > 0 && (
                <div className="card-footer bg-danger bg-opacity-10">
                  <p className="small fw-bold text-danger mb-2">
                    <FiAlertCircle className="me-1" />
                    {errorCount} baris memiliki error dan tidak akan diimport:
                  </p>
                  <ul className="small mb-0">
                    {rows.filter(r => !r.valid).map((r, idx) => (
                      <li key={idx} className="text-danger">
                        Baris {r.no}: {r.errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Action Card */}
          {rows.length > 0 && (
            <div className="card mb-4 position-sticky" style={{ top: '1rem' }}>
              <div className="card-header bg-success text-white">
                <h6 className="mb-0 fw-bold">Import Data</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>Total baris:</span>
                    <strong>{rows.length}</strong>
                  </div>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="text-success">Siap import:</span>
                    <strong className="text-success">{validCount}</strong>
                  </div>
                  {errorCount > 0 && (
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-danger">Error (skip):</span>
                      <strong className="text-danger">{errorCount}</strong>
                    </div>
                  )}
                </div>

                {validCount > 0 && (
                  <div className="alert alert-warning small mb-3">
                    <FiAlertCircle className="me-1" />
                    {validCount} transaksi akan ditambahkan ke kas. Pastikan data sudah benar.
                  </div>
                )}

                <button
                  className="btn btn-success w-100 mb-2"
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                >
                  {importing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Mengimport {validCount} data...
                    </>
                  ) : (
                    <>
                      <FiCheck className="me-2" />
                      Import {validCount} Transaksi
                    </>
                  )}
                </button>
                <button
                  className="btn btn-outline-secondary w-100"
                  onClick={handleReset}
                  disabled={importing}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Help Card */}
          <div className="card">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0 fw-bold">Panduan Import</h6>
            </div>
            <div className="card-body small">
              <ol className="ps-3 mb-3">
                <li className="mb-2">Download template Excel terlebih dahulu</li>
                <li className="mb-2">Isi data transaksi sesuai format kolom</li>
                <li className="mb-2">Upload file yang sudah diisi</li>
                <li className="mb-2">Periksa preview dan perbaiki jika ada error</li>
                <li>Klik tombol Import untuk menyimpan</li>
              </ol>

              <button
                className="btn btn-outline-info btn-sm w-100 mb-3"
                onClick={downloadTemplate}
              >
                <FiDownload className="me-1" /> Download Template
              </button>

              <hr />

              <p className="fw-bold mb-2">Format Kolom:</p>
              <table className="table table-sm table-bordered mb-2">
                <tbody>
                  <tr><td>Tanggal</td><td>DD/MM/YYYY</td></tr>
                  <tr><td>Jenis Kas</td><td><code>rw</code> atau <code>rt</code></td></tr>
                  <tr><td>Wilayah</td><td><code>Timur</code> atau <code>Barat</code></td></tr>
                  <tr><td>Tipe</td><td><code>pemasukan</code> / <code>pengeluaran</code></td></tr>
                  <tr><td>Kode Kategori</td><td>Opsional, lihat daftar di bawah</td></tr>
                  <tr><td>Keterangan</td><td>Wajib diisi</td></tr>
                  <tr><td>Jumlah</td><td>Angka positif (tanpa Rp)</td></tr>
                </tbody>
              </table>

              {kategoriList.length > 0 && (
                <>
                  <p className="fw-bold mb-2">Daftar Kode Kategori:</p>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table className="table table-sm table-bordered mb-0">
                      <thead>
                        <tr><th>Kode</th><th>Nama</th></tr>
                      </thead>
                      <tbody>
                        {kategoriList.map(k => (
                          <tr key={k.id}>
                            <td>{k.kode}</td>
                            <td>{k.nama}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}