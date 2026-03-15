'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import {
  FiDownload, FiHome, FiPercent,
  FiAlertTriangle, FiRefreshCw, FiX, FiSearch,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

const BULAN_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const ITEMS_PER_PAGE = 30

interface BulanData {
  jumlah_terbayar: number
  jumlah_tagihan: number
  status: string
  is_occupied: boolean
}

interface RumahItem {
  id: string
  nomor_rumah: string
  blok: string
  is_occupied: boolean
  tarif_default: number
  jalan: { id: string; nama_jalan: string } | null
  rt: { id: string; nomor_rt: string } | null
}

interface MonitoringRow {
  rumah: RumahItem
  bulan: Record<string, BulanData>
}

interface Summary {
  total_rumah: number
  total_tagihan: number
  total_terbayar: number
  total_tunggakan: number
  persentase_lunas: number
}

export default function MonitoringIPLPage() {
  const { userData, loading: userLoading } = useUser()
  const supabase = createClient()

  const [data, setData] = useState<MonitoringRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tarifList, setTarifList] = useState<{ id: number; blok: string; periode_mulai: string; periode_selesai: string | null; tarif_berpenghuni: number; tarif_tidak_berpenghuni: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [filterRT, setFilterRT] = useState('')
  const [filterBlok, setFilterBlok] = useState('')
  const [filterJalan, setFilterJalan] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rtList, setRtList] = useState<{ id: string; nomor_rt: string }[]>([])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRumah, setModalRumah] = useState<RumahItem | null>(null)
  const [modalBulan, setModalBulan] = useState(0)
  const [modalNominal, setModalNominal] = useState('')
  const [modalMetode, setModalMetode] = useState('tunai')
  const [modalCatatan, setModalCatatan] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalAction, setModalAction] = useState<'bayar' | 'toggle'>('bayar')

  // Bulk modal state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkRumah, setBulkRumah] = useState<RumahItem | null>(null)
  const [bulkValues, setBulkValues] = useState<Record<number, string>>({}) // month -> nominal
  const [bulkOccupied, setBulkOccupied] = useState<Record<number, boolean>>({}) // month -> is_occupied
  const [bulkMetode, setBulkMetode] = useState('tunai')
  const [bulkTarifDefault, setBulkTarifDefault] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw'].includes(userData.role)

  useEffect(() => {
    supabase.from('rt').select('id, nomor_rt').order('nomor_rt').then(({ data: rtData }: { data: { id: string; nomor_rt: string }[] | null }) => {
      if (rtData) setRtList(rtData)
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [tahun, filterRT])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [filterBlok, filterJalan, search, filterRT])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tahun: String(tahun) })
      if (filterRT) params.set('rt', filterRT)

      const res = await fetch(`/api/ipl/tagihan?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setData(json.data || [])
      setSummary(json.summary || null)
      setTarifList(json.tarif || [])
    } catch (err) {
      console.error('Fetch monitoring error:', err)
    } finally {
      setLoading(false)
    }
  }, [tahun, filterRT])

  // Client-side filtered data
  const filteredData = useMemo(() => {
    let result = data

    if (filterBlok) {
      result = result.filter(row => row.rumah.blok === filterBlok)
    }

    if (filterJalan) {
      result = result.filter(row => {
        const jalan = row.rumah.jalan as { id: string; nama_jalan: string } | null
        return jalan?.id === filterJalan
      })
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(row => {
        const jalan = row.rumah.jalan as { nama_jalan: string } | null
        const alamat = `${jalan?.nama_jalan || ''} ${row.rumah.nomor_rumah}`.toLowerCase()
        return alamat.includes(q)
      })
    }

    return result
  }, [data, filterBlok, filterJalan, search])

  // Unique jalan list from data
  const jalanList = useMemo(() => {
    const map = new Map<string, string>()
    data.forEach(row => {
      const jalan = row.rumah.jalan as { id: string; nama_jalan: string } | null
      if (jalan) map.set(jalan.id, jalan.nama_jalan)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [data])

  // Group ALL filtered data by jalan (sorted)
  const allGrouped = useMemo(() => {
    const groups: Record<string, MonitoringRow[]> = {}
    filteredData.forEach(row => {
      const jalanName = (row.rumah.jalan as { nama_jalan: string } | null)?.nama_jalan || 'Lainnya'
      if (!groups[jalanName]) groups[jalanName] = []
      groups[jalanName].push(row)
    })
    // Sort within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (parseInt(a.rumah.nomor_rumah) || 0) - (parseInt(b.rumah.nomor_rumah) || 0))
    })
    return groups
  }, [filteredData])

  // Jalan names sorted
  const sortedJalanNames = useMemo(() => Object.keys(allGrouped).sort(), [allGrouped])

  // Pagination per jalan group (1 jalan = 1 halaman)
  const totalPages = sortedJalanNames.length
  const currentJalan = sortedJalanNames[page] || ''
  const groupedData: Record<string, MonitoringRow[]> = currentJalan ? { [currentJalan]: allGrouped[currentJalan] } : {}

  // Flat filtered for excel export and global numbering
  const flatFiltered = useMemo(() => {
    const result: MonitoringRow[] = []
    sortedJalanNames.forEach(name => { result.push(...allGrouped[name]) })
    return result
  }, [allGrouped, sortedJalanNames])

  // Get tarif for a blok at a given month
  const getTarifForBlok = useCallback((blok: string, bulanDate: string): number => {
    const tarif = tarifList.find(t => {
      const matchBlok = t.blok === blok || t.blok === 'Semua'
      const afterStart = bulanDate >= t.periode_mulai
      const beforeEnd = !t.periode_selesai || bulanDate <= t.periode_selesai
      return matchBlok && afterStart && beforeEnd
    })
    return tarif?.tarif_berpenghuni || 0
  }, [tarifList])

  // Performance per bulan (from ALL filtered data, not just current page)
  const now = new Date()
  const currentMonth = now.getFullYear() === tahun ? now.getMonth() + 1 : (tahun < now.getFullYear() ? 12 : 0)

  const perfPerBulan = Array.from({ length: 12 }, (_, i) => {
    const bulanKey = String(i + 1)
    const m = i + 1
    let bayar = 0, total = 0, totalNominal = 0
    filteredData.forEach(row => {
      const bd = row.bulan[bulanKey]
      // Only count months up to current month
      if (m <= currentMonth) {
        const isOccupied = bd ? bd.is_occupied : true
        if (isOccupied) {
          total++
          if (bd && bd.jumlah_terbayar > 0) {
            bayar++
            totalNominal += bd.jumlah_terbayar
          }
        }
      } else if (bd && bd.jumlah_terbayar > 0) {
        // Future months that already paid
        bayar++
        total++
        totalNominal += bd.jumlah_terbayar
      }
    })
    return { persen: total > 0 ? Math.round((bayar / total) * 100) : 0, nominal: totalNominal }
  })

  // Calculate tunggakan per rumah: use last payment as tarif, fallback to tarif_default
  const calculatedTunggakan = useMemo(() => {
    let tunggakan = 0
    filteredData.forEach(row => {
      // Find tarif acuan: last payment nominal or tarif_default
      let tarifAcuan = row.rumah.tarif_default || 100000
      for (let m = 12; m >= 1; m--) {
        const bd = row.bulan[String(m)]
        if (bd && bd.jumlah_terbayar > 0) {
          tarifAcuan = bd.jumlah_terbayar
          break
        }
      }
      // Count unpaid occupied months (all 12 months)
      for (let m = 1; m <= 12; m++) {
        const bd = row.bulan[String(m)]
        const isOccupied = bd ? bd.is_occupied : true
        const hasPaid = bd && bd.jumlah_terbayar > 0
        if (isOccupied && !hasPaid) {
          tunggakan += tarifAcuan
        }
      }
    })
    return tunggakan
  }, [filteredData])

  const calculatedTerbayar = perfPerBulan.reduce((s, p) => s + p.nominal, 0)
  const totalBulanSeharusBayar = useMemo(() => {
    let total = 0
    filteredData.forEach(row => {
      for (let m = 1; m <= currentMonth; m++) {
        const bd = row.bulan[String(m)]
        const isOccupied = bd ? bd.is_occupied : true
        if (isOccupied) total++
      }
    })
    return total
  }, [filteredData, currentMonth])

  const totalBulanSudahBayar = useMemo(() => {
    let total = 0
    filteredData.forEach(row => {
      for (let m = 1; m <= 12; m++) {
        const bd = row.bulan[String(m)]
        if (bd && bd.jumlah_terbayar > 0) total++
      }
    })
    return total
  }, [filteredData])

  const persentaseLunas = totalBulanSeharusBayar > 0 ? Math.round((totalBulanSudahBayar / totalBulanSeharusBayar) * 100) : 0

  const handleCellClick = (rumah: RumahItem, bulanIndex: number) => {
    if (!isRW) return
    setModalRumah(rumah)
    setModalBulan(bulanIndex)
    setModalAction('bayar')

    const row = data.find(d => d.rumah.id === rumah.id)
    const bulanData = row?.bulan[String(bulanIndex)]
    setModalNominal(bulanData?.jumlah_terbayar ? new Intl.NumberFormat('id-ID').format(bulanData.jumlah_terbayar) : '')
    setModalMetode('tunai')
    setModalCatatan('')
    setModalOpen(true)
  }

  const handleSavePayment = async () => {
    if (!modalRumah) return
    setModalSaving(true)
    try {
      const bulanStr = `${tahun}-${String(modalBulan).padStart(2, '0')}`

      if (modalAction === 'bayar') {
        const nominal = parseNominal(modalNominal)
        const res = await fetch('/api/ipl/tagihan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'bayar',
            rumah_id: modalRumah.id,
            bulan: bulanStr,
            jumlah_dibayar: nominal,
            jumlah_tagihan: nominal,
            metode: modalMetode,
            catatan: modalCatatan,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error)
        }
      } else if (modalAction === 'toggle') {
        const row = data.find(d => d.rumah.id === modalRumah.id)
        const currentOccupied = row?.bulan[String(modalBulan)]?.is_occupied ?? true

        const res = await fetch('/api/ipl/tagihan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_occupied',
            rumah_id: modalRumah.id,
            bulan: bulanStr,
            is_occupied: !currentOccupied,
            jumlah_tagihan: 0,
          }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error)
        }
      }

      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setModalSaving(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!modalRumah || !confirm('Hapus pembayaran bulan ini?')) return
    setModalSaving(true)
    try {
      const bulanStr = `${tahun}-${String(modalBulan).padStart(2, '0')}`
      const res = await fetch('/api/ipl/tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hapus_bayar',
          rumah_id: modalRumah.id,
          bulan: bulanStr,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error)
      }
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus')
    } finally {
      setModalSaving(false)
    }
  }

  const handleOpenBulk = (rumah: RumahItem) => {
    if (!isRW) return
    setBulkRumah(rumah)

    // Pre-fill with existing data
    const row = data.find(d => d.rumah.id === rumah.id)
    const values: Record<number, string> = {}
    const occupied: Record<number, boolean> = {}
    for (let m = 1; m <= 12; m++) {
      const bd = row?.bulan[String(m)]
      values[m] = bd?.jumlah_terbayar ? new Intl.NumberFormat('id-ID').format(bd.jumlah_terbayar) : ''
      occupied[m] = bd?.is_occupied ?? true
    }
    setBulkValues(values)
    setBulkOccupied(occupied)
    setBulkMetode('tunai')
    setBulkTarifDefault(rumah.tarif_default ? new Intl.NumberFormat('id-ID').format(rumah.tarif_default) : '100.000')
    setBulkOpen(true)
  }

  const parseNominal = (v: string) => parseInt(v.replace(/[.\s]/g, '')) || 0
  const formatInputNominal = (v: string) => {
    const num = parseInt(v.replace(/[^\d]/g, '')) || 0
    return num > 0 ? new Intl.NumberFormat('id-ID').format(num) : ''
  }
  const handleBulkInput = (m: number, raw: string) => {
    setBulkValues(prev => ({ ...prev, [m]: formatInputNominal(raw) }))
  }
  const bulkTotal = Object.values(bulkValues).reduce((sum, v) => sum + parseNominal(v), 0)
  const bulkFilledCount = Object.values(bulkValues).filter(v => parseNominal(v) > 0).length

  const handleSaveBulk = async () => {
    if (!bulkRumah) return
    setBulkSaving(true)
    try {
      // Save tarif_default if changed
      const newTarif = parseNominal(bulkTarifDefault)
      if (newTarif > 0 && newTarif !== bulkRumah.tarif_default) {
        await fetch('/api/ipl/rumah', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: bulkRumah.id, tarif_default: newTarif }),
        })
      }

      let saved = 0
      for (let m = 1; m <= 12; m++) {
        const nominal = parseNominal(bulkValues[m] || '')
        const isOccupied = bulkOccupied[m]

        // Skip if no value and occupied (nothing to save)
        if (nominal === 0 && isOccupied) {
          // Check if there was an existing payment that needs to be cleared
          const row = data.find(d => d.rumah.id === bulkRumah.id)
          const existing = row?.bulan[String(m)]
          if (existing && existing.jumlah_terbayar > 0) {
            // Clear payment
            await fetch('/api/ipl/tagihan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'hapus_bayar',
                rumah_id: bulkRumah.id,
                bulan: `${tahun}-${String(m).padStart(2, '0')}`,
              }),
            })
            saved++
          }
          continue
        }

        if (!isOccupied) {
          // Set as not occupied
          await fetch('/api/ipl/tagihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'toggle_occupied',
              rumah_id: bulkRumah.id,
              bulan: `${tahun}-${String(m).padStart(2, '0')}`,
              is_occupied: false,
              jumlah_tagihan: 0,
            }),
          })
          saved++
        } else if (nominal > 0) {
          // Save payment
          const res = await fetch('/api/ipl/tagihan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'bayar',
              rumah_id: bulkRumah.id,
              bulan: `${tahun}-${String(m).padStart(2, '0')}`,
              jumlah_dibayar: nominal,
              jumlah_tagihan: nominal,
              metode: bulkMetode,
            }),
          })
          if (!res.ok) {
            const json = await res.json()
            throw new Error(`Bulan ${m}: ${json.error}`)
          }
          saved++
        }
      }

      setBulkOpen(false)
      fetchData()
      if (saved > 0) alert(`${saved} bulan berhasil disimpan`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setBulkSaving(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID').format(n)

  const handleDownloadExcel = () => {
    // Use ALL filtered data for export (not just current page)
    const allGrouped: Record<string, MonitoringRow[]> = {}
    flatFiltered.forEach(row => {
      const jalanName = (row.rumah.jalan as { nama_jalan: string } | null)?.nama_jalan || 'Lainnya'
      if (!allGrouped[jalanName]) allGrouped[jalanName] = []
      allGrouped[jalanName].push(row)
    })

    const rows: Record<string, string | number>[] = []
    let no = 0

    Object.entries(allGrouped).forEach(([jalanName, items]) => {
      const headerRow: Record<string, string | number> = { 'No': '', 'Alamat': jalanName }
      BULAN_LABELS.forEach(b => { headerRow[b] = '' })
      rows.push(headerRow)

      items.forEach(row => {
        no++
        const r: Record<string, string | number> = {
          'No': no,
          'Alamat': `${jalanName} / ${row.rumah.nomor_rumah}`,
        }
        let rowTotal = 0
        for (let m = 1; m <= 12; m++) {
          const bd = row.bulan[String(m)]
          if (bd && !bd.is_occupied) {
            r[BULAN_LABELS[m - 1]] = 'KOSONG'
          } else if (bd && bd.jumlah_terbayar > 0) {
            r[BULAN_LABELS[m - 1]] = bd.jumlah_terbayar
            rowTotal += bd.jumlah_terbayar
          } else {
            r[BULAN_LABELS[m - 1]] = ''
          }
        }
        // Calculate tagihan
        let exTarifAcuan = row.rumah.tarif_default || 100000
        for (let m = 12; m >= 1; m--) {
          const bd = row.bulan[String(m)]
          if (bd && bd.jumlah_terbayar > 0) { exTarifAcuan = bd.jumlah_terbayar; break }
        }
        let exTagihanCount = 0
        for (let m = 1; m <= 12; m++) {
          const bd = row.bulan[String(m)]
          const isOcc = bd ? bd.is_occupied : true
          const paid = bd && bd.jumlah_terbayar > 0
          if (isOcc && !paid) exTagihanCount++
        }
        r['TOTAL'] = rowTotal > 0 ? rowTotal : ''
        r['TAGIHAN'] = exTagihanCount * exTarifAcuan > 0 ? exTagihanCount * exTarifAcuan : ''
        rows.push(r)
      })
    })

    const perfRow: Record<string, string | number> = { 'No': '', 'Alamat': 'PERFORMANCE' }
    perfPerBulan.forEach((p, i) => { perfRow[BULAN_LABELS[i]] = `${p.persen}%` })
    perfRow['TOTAL'] = `${persentaseLunas}%`
    perfRow['TAGIHAN'] = ''
    rows.push(perfRow)

    const totalRow: Record<string, string | number> = { 'No': '', 'Alamat': 'TOTAL TERKUMPUL' }
    perfPerBulan.forEach((p, i) => { totalRow[BULAN_LABELS[i]] = p.nominal })
    totalRow['TOTAL'] = calculatedTerbayar
    totalRow['TAGIHAN'] = calculatedTunggakan
    rows.push(totalRow)

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `IPL ${tahun}`)
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, ...Array(12).fill({ wch: 12 }), { wch: 14 }, { wch: 14 }]
    XLSX.writeFile(wb, `monitoring_ipl_${tahun}.xlsx`)
  }

  if (userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Monitoring IPL</h4>
          <p className="text-muted mb-0 small">Pemantauan pembayaran Iuran Pemeliharaan Lingkungan</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchData} disabled={loading}>
            <FiRefreshCw className={`me-1 ${loading ? 'spin' : ''}`} /> <span className="d-none d-sm-inline">Refresh</span>
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={handleDownloadExcel} disabled={filteredData.length === 0}>
            <FiDownload className="me-1" /> <span className="d-none d-sm-inline">Download Excel</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Tahun</label>
              <select className="form-select form-select-sm" value={tahun} onChange={e => setTahun(parseInt(e.target.value))}>
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">RT</label>
              <select className="form-select form-select-sm" value={filterRT} onChange={e => setFilterRT(e.target.value)}>
                <option value="">Semua RT</option>
                {rtList.map(rt => (
                  <option key={rt.id} value={rt.id}>RT {rt.nomor_rt}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Blok</label>
              <select className="form-select form-select-sm" value={filterBlok} onChange={e => setFilterBlok(e.target.value)}>
                <option value="">Semua Blok</option>
                <option value="Timur">Timur</option>
                <option value="Barat">Barat</option>
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small mb-1">Jalan</label>
              <select className="form-select form-select-sm" value={filterJalan} onChange={e => setFilterJalan(e.target.value)}>
                <option value="">Semua Jalan</option>
                {jalanList.map(([id, nama]) => (
                  <option key={id} value={id}>{nama.replace('Jl. ', '')}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1">Cari Rumah</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text"><FiSearch size={14} /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nomor rumah..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}><FiX size={14} /></button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-primary bg-opacity-10">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center">
                  <FiHome className="text-primary me-2 flex-shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Total Rumah</div>
                    <div className="fw-bold small">{flatFiltered.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-success bg-opacity-10">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center">
                  <span className="text-success me-2 flex-shrink-0 fw-bold" style={{ fontSize: '0.9rem' }}>Rp</span>
                  <div className="min-w-0">
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Terbayar</div>
                    <div className="fw-bold small text-truncate">Rp{formatRupiah(calculatedTerbayar)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-danger bg-opacity-10">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center">
                  <FiAlertTriangle className="text-danger me-2 flex-shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Tunggakan</div>
                    <div className="fw-bold small text-truncate">Rp{formatRupiah(calculatedTunggakan)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-info bg-opacity-10">
              <div className="card-body py-2 px-3">
                <div className="d-flex align-items-center">
                  <FiPercent className="text-info me-2 flex-shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Lunas</div>
                    <div className="fw-bold small">{persentaseLunas}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : flatFiltered.length === 0 ? (
            <div className="text-center py-5">
              <FiHome size={48} className="text-muted mb-3" />
              <p className="text-muted">{data.length === 0 ? 'Belum ada data rumah.' : 'Tidak ada data yang cocok dengan filter.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-sm mb-0" style={{ fontSize: '0.75rem' }}>
                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th className="text-center" style={{ width: '35px', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2 }}>No</th>
                    <th style={{ minWidth: '150px', position: 'sticky', left: '35px', background: '#f8f9fa', zIndex: 2 }}>Alamat</th>
                    {BULAN_LABELS.map((b, i) => (
                      <th key={i} className="text-center" style={{ minWidth: '65px' }}>{b}</th>
                    ))}
                    <th className="text-center" style={{ minWidth: '80px', background: '#f8f9fa' }}>TOTAL</th>
                    <th className="text-center" style={{ minWidth: '80px', background: '#f8f9fa' }}>TAGIHAN</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedData).map(([jalanName, items]) => (
                    <>
                      <tr key={`header-${jalanName}`} className="table-secondary">
                        <td colSpan={16} className="fw-bold" style={{ position: 'sticky', left: 0, fontSize: '0.7rem' }}>
                          {jalanName.replace('Jl. ', '').toUpperCase()}
                        </td>
                      </tr>
                      {items.map((row, idx) => {
                        return (
                          <tr key={row.rumah.id}>
                            <td className="text-center" style={{ position: 'sticky', left: 0, background: '#fff' }}>{idx + 1}</td>
                            <td
                              style={{ position: 'sticky', left: '35px', background: '#fff', whiteSpace: 'nowrap', cursor: isRW ? 'pointer' : 'default' }}
                              onClick={() => handleOpenBulk(row.rumah)}
                              title={isRW ? 'Klik untuk input bulk pembayaran' : ''}
                              className={isRW ? 'text-primary' : ''}
                            >
                              {jalanName.replace('Jl. ', '')} / {row.rumah.nomor_rumah}
                            </td>
                            {Array.from({ length: 12 }, (_, m) => {
                              const bd = row.bulan[String(m + 1)]
                              const isBayar = bd && bd.jumlah_terbayar > 0
                              const isKosong = bd && !bd.is_occupied

                              let bgColor = ''
                              let content = ''

                              if (isKosong) {
                                bgColor = '#dc3545'
                              } else if (isBayar) {
                                bgColor = bd.jumlah_terbayar >= 150000 ? '#0d6efd' : '#28a745'
                                content = formatRupiah(bd.jumlah_terbayar)
                              }

                              return (
                                <td
                                  key={m}
                                  className="text-center"
                                  style={{
                                    backgroundColor: bgColor,
                                    color: bgColor ? '#fff' : '#6c757d',
                                    cursor: isRW ? 'pointer' : 'default',
                                    fontWeight: isBayar ? 600 : 400,
                                    fontSize: '0.7rem',
                                  }}
                                  onClick={() => handleCellClick(row.rumah, m + 1)}
                                  title={isRW ? 'Klik untuk input pembayaran' : ''}
                                >
                                  {content}
                                </td>
                              )
                            })}
                            {/* TOTAL column */}
                            {(() => {
                              const totalBayar = Array.from({ length: 12 }, (_, m) => {
                                const bd = row.bulan[String(m + 1)]
                                return bd?.jumlah_terbayar || 0
                              }).reduce((s, v) => s + v, 0)

                              // TAGIHAN: find tarif acuan, count unpaid months
                              let tarifAcuan = row.rumah.tarif_default || 100000
                              for (let m = 12; m >= 1; m--) {
                                const bd = row.bulan[String(m)]
                                if (bd && bd.jumlah_terbayar > 0) {
                                  tarifAcuan = bd.jumlah_terbayar
                                  break
                                }
                              }
                              let tagihanCount = 0
                              for (let m = 1; m <= 12; m++) {
                                const bd = row.bulan[String(m)]
                                const isOccupied = bd ? bd.is_occupied : true
                                const hasPaid = bd && bd.jumlah_terbayar > 0
                                if (isOccupied && !hasPaid) tagihanCount++
                              }
                              const tagihan = tagihanCount * tarifAcuan

                              return (
                                <>
                                  <td className="text-center fw-bold" style={{ fontSize: '0.7rem', backgroundColor: totalBayar > 0 ? '#e8f5e9' : '' }}>
                                    {totalBayar > 0 ? formatRupiah(totalBayar) : ''}
                                  </td>
                                  <td className="text-center fw-bold" style={{ fontSize: '0.7rem', backgroundColor: tagihan > 0 ? '#ffebee' : '', color: tagihan > 0 ? '#dc3545' : '' }}>
                                    {tagihan > 0 ? formatRupiah(tagihan) : '-'}
                                  </td>
                                </>
                              )
                            })()}
                          </tr>
                        )
                      })}
                    </>
                  ))}

                  {/* Performance row */}
                  <tr className="table-warning fw-bold">
                    <td colSpan={2} className="text-center" style={{ position: 'sticky', left: 0, background: '#fff3cd', fontSize: '0.7rem' }}>PERFORMANCE</td>
                    {perfPerBulan.map((p, i) => (
                      <td key={i} className="text-center" style={{ fontSize: '0.7rem' }}>{p.persen}%</td>
                    ))}
                    <td className="text-center" style={{ fontSize: '0.7rem' }}>{persentaseLunas}%</td>
                    <td></td>
                  </tr>
                  <tr className="table-info fw-bold">
                    <td colSpan={2} className="text-center" style={{ position: 'sticky', left: 0, background: '#cff4fc', fontSize: '0.7rem' }}>TOTAL</td>
                    {perfPerBulan.map((p, i) => (
                      <td key={i} className="text-center" style={{ fontSize: '0.65rem' }}>Rp{formatRupiah(p.nominal)}</td>
                    ))}
                    <td className="text-center" style={{ fontSize: '0.65rem', backgroundColor: '#e8f5e9' }}>Rp{formatRupiah(calculatedTerbayar)}</td>
                    <td className="text-center" style={{ fontSize: '0.65rem', backgroundColor: '#ffebee', color: '#dc3545' }}>Rp{formatRupiah(calculatedTunggakan)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
            <small className="text-muted">
              <strong>{currentJalan.replace('Jl. ', '')}</strong> — {allGrouped[currentJalan]?.length || 0} rumah (Total: {flatFiltered.length})
            </small>
            <div className="d-flex gap-1 align-items-center">
              <button className="btn btn-outline-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <FiChevronLeft size={14} />
              </button>
              <span className="small mx-1">{page + 1}/{totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="d-flex flex-wrap gap-3 mt-2 small text-muted">
        <div><span className="badge" style={{ backgroundColor: '#28a745' }}>&nbsp;&nbsp;</span> 100.000</div>
        <div><span className="badge" style={{ backgroundColor: '#0d6efd' }}>&nbsp;&nbsp;</span> 150.000+</div>
        <div><span className="badge" style={{ backgroundColor: '#dc3545' }}>&nbsp;&nbsp;</span> Belum ditempati</div>
        <div><span className="badge bg-light border text-dark">&nbsp;&nbsp;</span> Belum bayar</div>
      </div>

      {/* Modal Input Pembayaran */}
      {modalOpen && modalRumah && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="card-header d-flex justify-content-between align-items-center py-2">
              <h6 className="mb-0 fw-bold small">
                {(modalRumah.jalan as { nama_jalan: string } | null)?.nama_jalan?.replace('Jl. ', '')} / {modalRumah.nomor_rumah} — {BULAN_FULL[modalBulan - 1]} {tahun}
              </h6>
              <button className="btn btn-sm btn-link text-dark p-0" onClick={() => setModalOpen(false)}><FiX /></button>
            </div>
            <div className="card-body">
              <div className="btn-group w-100 mb-3">
                <button
                  className={`btn btn-sm ${modalAction === 'bayar' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setModalAction('bayar')}
                >
                  Input Pembayaran
                </button>
                <button
                  className={`btn btn-sm ${modalAction === 'toggle' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setModalAction('toggle')}
                >
                  Belum Ditempati
                </button>
              </div>

              {modalAction === 'bayar' ? (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Nominal Pembayaran</label>
                    <input type="text" inputMode="numeric" className="form-control form-control-sm" placeholder="Contoh: 150.000" value={modalNominal} onChange={e => setModalNominal(formatInputNominal(e.target.value))} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Metode</label>
                    <select className="form-select form-select-sm" value={modalMetode} onChange={e => setModalMetode(e.target.value)}>
                      <option value="tunai">Tunai</option>
                      <option value="transfer">Transfer</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Catatan (opsional)</label>
                    <input type="text" className="form-control form-control-sm" value={modalCatatan} onChange={e => setModalCatatan(e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="alert alert-warning small py-2">
                  Klik "Simpan" untuk toggle status <strong>belum ditempati</strong> pada bulan {BULAN_FULL[modalBulan - 1]} {tahun}.
                </div>
              )}

              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleSavePayment} disabled={modalSaving || (modalAction === 'bayar' && !modalNominal)}>
                  {modalSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
                {modalAction === 'bayar' && (
                  <button className="btn btn-outline-danger btn-sm" onClick={handleDeletePayment} disabled={modalSaving}>Hapus Bayar</button>
                )}
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalOpen(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Payment Modal */}
      {bulkOpen && bulkRumah && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header d-flex justify-content-between align-items-center py-2">
              <h6 className="mb-0 fw-bold small">
                {(bulkRumah.jalan as { nama_jalan: string } | null)?.nama_jalan?.replace('Jl. ', '')} / {bulkRumah.nomor_rumah} — Tahun {tahun}
              </h6>
              <button className="btn btn-sm btn-link text-dark p-0" onClick={() => setBulkOpen(false)}><FiX /></button>
            </div>
            <div className="card-body p-0" style={{ overflowY: 'auto', flex: 1 }}>
              <div className="p-3 pb-0">
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small fw-bold mb-1">Tarif Default</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control form-control-sm"
                      value={bulkTarifDefault}
                      onChange={e => setBulkTarifDefault(formatInputNominal(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small fw-bold mb-1">Metode</label>
                    <select className="form-select form-select-sm" value={bulkMetode} onChange={e => setBulkMetode(e.target.value)}>
                      <option value="tunai">Tunai</option>
                      <option value="transfer">Transfer</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                  </div>
                </div>
              </div>
              <table className="table table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '80px' }}>Bulan</th>
                    <th>Nominal</th>
                    <th style={{ width: '80px' }} className="text-center">Kosong</th>
                  </tr>
                </thead>
                <tbody>
                  {BULAN_FULL.map((bulanName, i) => {
                    const m = i + 1
                    const isKosong = !bulkOccupied[m]
                    const hasValue = parseNominal(bulkValues[m] || '') > 0

                    return (
                      <tr key={m} style={{ backgroundColor: isKosong ? '#fff0f0' : hasValue ? '#f0fff0' : '' }}>
                        <td className="fw-bold align-middle">{BULAN_LABELS[i]}</td>
                        <td>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="form-control form-control-sm"
                            placeholder="0"
                            value={bulkValues[m] || ''}
                            onChange={e => handleBulkInput(m, e.target.value)}
                            disabled={isKosong}
                            style={{ backgroundColor: isKosong ? '#f8f8f8' : '' }}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isKosong}
                            onChange={e => {
                              setBulkOccupied(prev => ({ ...prev, [m]: !e.target.checked }))
                              if (e.target.checked) setBulkValues(prev => ({ ...prev, [m]: '' }))
                            }}
                            title="Belum ditempati"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-footer py-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="small">
                  <span className="text-muted">{bulkFilledCount} bulan diisi</span>
                </div>
                <div className="fw-bold">
                  Total: <span className="text-success">Rp{formatRupiah(bulkTotal)}</span>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm flex-grow-1"
                  onClick={handleSaveBulk}
                  disabled={bulkSaving}
                >
                  {bulkSaving ? 'Menyimpan...' : `Simpan Semua (${bulkFilledCount} bulan)`}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setBulkOpen(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
