'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  FiHome, FiDollarSign, FiAlertTriangle, FiDownload, FiBarChart2
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

interface RTSummary {
  rt_id: string
  nomor_rt: string
  tahun: string
  total_rumah: number
  bulan_lunas: number
  bulan_belum: number
  total_terbayar: number
  total_tagihan_nominal: number
  persen_lunas: number
}

interface GrandTotal {
  total_rumah: number
  total_terbayar: number
  total_tunggakan: number
  years: string[]
}

export default function DashboardIPLPage() {
  const { userData, loading: userLoading } = useUser()

  const [data, setData] = useState<RTSummary[]>([])
  const [grand, setGrand] = useState<GrandTotal | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterTahun, setFilterTahun] = useState('')

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw'].includes(userData.role)
  const isRT = userData?.role && ['ketua_rt', 'sekretaris_rt', 'bendahara_rt'].includes(userData.role)
  const isPengurus = isRW || isRT

  useEffect(() => {
    fetchData()
  }, [filterTahun])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterTahun) params.set('tahun', filterTahun)

      const res = await fetch(`/api/ipl/summary?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setData(json.data || [])
      setGrand(json.grand || null)
    } catch (err) {
      console.error('Fetch dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID').format(n)

  // Group by tahun for display
  const years = grand?.years || []
  const dataByYear: Record<string, RTSummary[]> = {}
  data.forEach(d => {
    if (!dataByYear[d.tahun]) dataByYear[d.tahun] = []
    dataByYear[d.tahun].push(d)
  })

  const handleDownloadExcel = () => {
    const rows: Record<string, string | number>[] = []

    Object.entries(dataByYear).sort().forEach(([year, items]) => {
      // Header
      rows.push({ 'RT': `TAHUN ${year}`, 'Total Rumah': '', 'Bulan Lunas': '', 'Bulan Belum': '', '% Lunas': '', 'Total Terbayar': '', 'Tunggakan': '' })

      items.forEach(d => {
        rows.push({
          'RT': `RT ${d.nomor_rt}`,
          'Total Rumah': d.total_rumah,
          'Bulan Lunas': d.bulan_lunas,
          'Bulan Belum': d.bulan_belum,
          '% Lunas': `${d.persen_lunas}%`,
          'Total Terbayar': d.total_terbayar,
          'Tunggakan': d.total_tagihan_nominal - d.total_terbayar,
        })
      })

      // Subtotal
      const subTotal = items.reduce((s, d) => s + d.total_terbayar, 0)
      const subTunggak = items.reduce((s, d) => s + (d.total_tagihan_nominal - d.total_terbayar), 0)
      rows.push({ 'RT': 'SUBTOTAL', 'Total Rumah': '', 'Bulan Lunas': '', 'Bulan Belum': '', '% Lunas': '', 'Total Terbayar': subTotal, 'Tunggakan': subTunggak })
      rows.push({} as Record<string, string | number>)
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard IPL')
    ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }]
    XLSX.writeFile(wb, `dashboard_ipl_summary.xlsx`)
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

  if (!isPengurus) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Halaman ini hanya untuk pengurus RW/RT.</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Dashboard IPL</h4>
          <p className="text-muted mb-0 small">Ringkasan pembayaran IPL per RT</p>
        </div>
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={filterTahun}
            onChange={e => setFilterTahun(e.target.value)}
          >
            <option value="">Semua Tahun</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-outline-success btn-sm" onClick={handleDownloadExcel} disabled={data.length === 0}>
            <FiDownload className="me-1" /> Excel
          </button>
        </div>
      </div>

      {/* Grand Summary */}
      {grand && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4">
            <div className="card border-0 bg-primary bg-opacity-10">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <FiHome className="text-primary me-2" size={20} />
                  <div>
                    <div className="text-muted small">Total Rumah</div>
                    <div className="fw-bold">{grand.total_rumah}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="card border-0 bg-success bg-opacity-10">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <FiDollarSign className="text-success me-2" size={20} />
                  <div>
                    <div className="text-muted small">Total Terbayar</div>
                    <div className="fw-bold">Rp{formatRupiah(grand.total_terbayar)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="card border-0 bg-danger bg-opacity-10">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <FiAlertTriangle className="text-danger me-2" size={20} />
                  <div>
                    <div className="text-muted small">Total Tunggakan</div>
                    <div className="fw-bold">Rp{formatRupiah(grand.total_tunggakan)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data per Tahun */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <FiBarChart2 size={48} className="text-muted mb-3" />
            <p className="text-muted">Belum ada data tagihan IPL</p>
          </div>
        </div>
      ) : (
        Object.entries(dataByYear).sort().map(([year, items]) => (
          <div key={year} className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">Tahun {year}</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>RT</th>
                      <th className="text-center">Rumah</th>
                      <th className="text-center">Lunas</th>
                      <th className="text-center">Belum</th>
                      <th className="text-center">% Lunas</th>
                      <th className="text-end">Terbayar</th>
                      <th className="text-end">Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(d => {
                      const tunggakan = d.total_tagihan_nominal - d.total_terbayar
                      return (
                        <tr key={d.rt_id}>
                          <td className="fw-bold">RT {d.nomor_rt}</td>
                          <td className="text-center">{d.total_rumah}</td>
                          <td className="text-center text-success">{d.bulan_lunas}</td>
                          <td className="text-center text-danger">{d.bulan_belum}</td>
                          <td className="text-center">
                            <div className="d-flex align-items-center justify-content-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '8px', maxWidth: '60px' }}>
                                <div
                                  className={`progress-bar ${d.persen_lunas >= 80 ? 'bg-success' : d.persen_lunas >= 50 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${d.persen_lunas}%` }}
                                />
                              </div>
                              <small className="fw-bold">{d.persen_lunas}%</small>
                            </div>
                          </td>
                          <td className="text-end text-success">Rp{formatRupiah(d.total_terbayar)}</td>
                          <td className="text-end text-danger">{tunggakan > 0 ? `Rp${formatRupiah(tunggakan)}` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td>Total</td>
                      <td className="text-center">{items.reduce((s, d) => s + d.total_rumah, 0)}</td>
                      <td className="text-center text-success">{items.reduce((s, d) => s + d.bulan_lunas, 0)}</td>
                      <td className="text-center text-danger">{items.reduce((s, d) => s + d.bulan_belum, 0)}</td>
                      <td className="text-center">
                        {(() => {
                          const totalL = items.reduce((s, d) => s + d.bulan_lunas, 0)
                          const totalAll = totalL + items.reduce((s, d) => s + d.bulan_belum, 0)
                          return totalAll > 0 ? `${Math.round((totalL / totalAll) * 100)}%` : '0%'
                        })()}
                      </td>
                      <td className="text-end text-success">Rp{formatRupiah(items.reduce((s, d) => s + d.total_terbayar, 0))}</td>
                      <td className="text-end text-danger">Rp{formatRupiah(items.reduce((s, d) => s + (d.total_tagihan_nominal - d.total_terbayar), 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
