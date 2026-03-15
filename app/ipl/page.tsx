'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import {
  FiHome, FiCalendar, FiAlertTriangle, FiCheck,
  FiCreditCard, FiBarChart2, FiSettings
} from 'react-icons/fi'

const BULAN_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES']
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

interface RumahInfo {
  id: string
  nomor_rumah: string
  blok: string
  tarif_default: number
  jalan: { nama_jalan: string } | null
  rt: { nomor_rt: string } | null
}

interface TagihanData {
  bulan: string
  jumlah_tagihan: number
  jumlah_terbayar: number
  status: string
  is_occupied: boolean
}

interface YearSummary {
  tahun: number
  bulanLunas: number
  bulanBelum: number
  totalBayar: number
  totalTagihan: number
}

export default function TagihanIPLPage() {
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()

  const [rumah, setRumah] = useState<RumahInfo | null>(null)
  const [tagihan, setTagihan] = useState<TagihanData[]>([])
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [noRumah, setNoRumah] = useState(false)

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw'].includes(userData.role)
  const isRT = userData?.role && ['ketua_rt', 'sekretaris_rt', 'bendahara_rt'].includes(userData.role)
  const isPengurus = isRW || isRT

  useEffect(() => {
    if (user && userData) fetchData()
  }, [user, userData])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (!userData?.warga_id) {
        setNoRumah(true)
        setLoading(false)
        return
      }

      // Get warga's rumah_id
      const { data: wargaData } = await supabase
        .from('warga')
        .select('rumah_id')
        .eq('id', userData.warga_id)
        .single()

      if (!wargaData?.rumah_id) {
        setNoRumah(true)
        setLoading(false)
        return
      }

      // Get rumah details
      const { data: rumahData } = await supabase
        .from('rumah')
        .select('id, nomor_rumah, blok, tarif_default, jalan:jalan_id(nama_jalan), rt:rt_id(nomor_rt)')
        .eq('id', wargaData.rumah_id)
        .single()

      if (!rumahData) {
        setNoRumah(true)
        setLoading(false)
        return
      }

      setRumah(rumahData as unknown as RumahInfo)

      // Get all tagihan for this rumah
      const { data: tagihanData } = await supabase
        .from('tagihan_ipl')
        .select('bulan, jumlah_tagihan, jumlah_terbayar, status, is_occupied')
        .eq('rumah_id', wargaData.rumah_id)
        .order('bulan', { ascending: true })

      setTagihan(tagihanData || [])

      // Calculate year summaries
      const years = new Set<number>()
      ;(tagihanData || []).forEach((t: TagihanData) => {
        years.add(parseInt(t.bulan.substring(0, 4)))
      })
      // Add current year
      years.add(new Date().getFullYear())

      const summaries: YearSummary[] = Array.from(years).sort().map(year => {
        const yearTagihan = (tagihanData || []).filter(
          (t: TagihanData) => parseInt(t.bulan.substring(0, 4)) === year
        )
        const bulanLunas = yearTagihan.filter((t: TagihanData) => t.jumlah_terbayar > 0).length
        const bulanBelum = 12 - bulanLunas
        const totalBayar = yearTagihan.reduce((s: number, t: TagihanData) => s + (t.jumlah_terbayar || 0), 0)
        const totalTagihan = yearTagihan.reduce((s: number, t: TagihanData) => s + (t.jumlah_tagihan || 0), 0)

        return { tahun: year, bulanLunas, bulanBelum, totalBayar, totalTagihan }
      })

      setYearSummaries(summaries)
    } catch (err) {
      console.error('Error fetching IPL data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter tagihan for selected year
  const yearTagihan = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const bulanDate = `${selectedYear}-${String(i + 1).padStart(2, '0')}-01`
      const found = tagihan.find(t => t.bulan === bulanDate)
      return {
        bulan: i + 1,
        bulanLabel: BULAN_FULL[i],
        jumlah_tagihan: found?.jumlah_tagihan || 0,
        jumlah_terbayar: found?.jumlah_terbayar || 0,
        status: found?.status || 'belum_lunas',
        is_occupied: found?.is_occupied ?? true,
        hasPaid: (found?.jumlah_terbayar || 0) > 0,
      }
    })
  }, [tagihan, selectedYear])

  const currentYearSummary = yearSummaries.find(s => s.tahun === selectedYear)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID').format(n)

  if (userLoading || loading) {
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
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Tagihan IPL</h4>
          <p className="text-muted mb-0 small">Iuran Pemeliharaan Lingkungan RW 013</p>
        </div>
        <div className="d-flex gap-2">
          {!noRumah && (
            <Link href="/ipl/bayar" className="btn btn-primary btn-sm">
              <FiCreditCard className="me-1" /> Bayar IPL
            </Link>
          )}
          {isPengurus && (
            <>
              <Link href="/ipl/dashboard" className="btn btn-outline-info btn-sm">
                <FiBarChart2 className="me-1" /> <span className="d-none d-sm-inline">Dashboard</span>
              </Link>
              <Link href="/ipl/monitoring" className="btn btn-outline-secondary btn-sm">
                <FiSettings className="me-1" /> <span className="d-none d-sm-inline">Monitoring</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* No Rumah State */}
      {noRumah ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <FiHome size={48} className="text-muted mb-3" />
            <h5 className="text-muted">Data rumah belum terhubung</h5>
            <p className="text-muted small">
              Akun Anda belum terhubung ke data rumah. Hubungi pengurus RW untuk menghubungkan akun Anda.
            </p>
            {isPengurus && (
              <div className="mt-3">
                <Link href="/ipl/monitoring" className="btn btn-primary">
                  Buka Monitoring IPL
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Rumah Info */}
          {rumah && (
            <div className="card mb-4 border-primary">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <FiHome className="text-primary me-3 flex-shrink-0" size={24} />
                  <div>
                    <div className="fw-bold">{(rumah.jalan as { nama_jalan: string } | null)?.nama_jalan} No. {rumah.nomor_rumah}</div>
                    <div className="text-muted small">RT {(rumah.rt as { nomor_rt: string } | null)?.nomor_rt} | Blok {rumah.blok} | Tarif: Rp{formatRupiah(rumah.tarif_default || 100000)}/bulan</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Year Summary Cards (grafik bar sederhana) */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold"><FiCalendar className="me-2" />Ringkasan Per Tahun</h6>
            </div>
            <div className="card-body">
              {yearSummaries.length === 0 ? (
                <p className="text-muted text-center mb-0">Belum ada data tagihan</p>
              ) : (
                <div className="row g-3">
                  {yearSummaries.map(ys => {
                    const totalBulan = ys.bulanLunas + ys.bulanBelum
                    const pctLunas = totalBulan > 0 ? Math.round((ys.bulanLunas / totalBulan) * 100) : 0

                    return (
                      <div key={ys.tahun} className="col-12 col-md-6">
                        <div
                          className={`card h-100 ${selectedYear === ys.tahun ? 'border-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedYear(ys.tahun)}
                        >
                          <div className="card-body py-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-bold">Tahun {ys.tahun}</span>
                              <span className={`badge ${pctLunas >= 80 ? 'bg-success' : pctLunas >= 50 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                {pctLunas}% Lunas
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="progress mb-2" style={{ height: '20px' }}>
                              <div
                                className="progress-bar bg-success"
                                style={{ width: `${pctLunas}%` }}
                              >
                                {ys.bulanLunas} bln
                              </div>
                              {ys.bulanBelum > 0 && (
                                <div
                                  className="progress-bar bg-danger"
                                  style={{ width: `${100 - pctLunas}%` }}
                                >
                                  {ys.bulanBelum} bln
                                </div>
                              )}
                            </div>
                            <div className="d-flex justify-content-between small">
                              <span className="text-success"><FiCheck size={12} className="me-1" />Terbayar: Rp{formatRupiah(ys.totalBayar)}</span>
                              {ys.bulanBelum > 0 && (
                                <span className="text-danger"><FiAlertTriangle size={12} className="me-1" />Tunggakan: {ys.bulanBelum} bulan</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail Tagihan per Bulan */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">Detail Tagihan {selectedYear}</h6>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
              >
                {yearSummaries.map(ys => (
                  <option key={ys.tahun} value={ys.tahun}>{ys.tahun}</option>
                ))}
              </select>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Bulan</th>
                      <th className="text-end">Tagihan</th>
                      <th className="text-end">Terbayar</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearTagihan.map(t => (
                      <tr key={t.bulan}>
                        <td className="fw-bold">{t.bulanLabel}</td>
                        <td className="text-end">
                          {t.jumlah_tagihan > 0 ? `Rp${formatRupiah(t.jumlah_tagihan)}` : !t.is_occupied ? <span className="text-muted small">Kosong</span> : <span className="text-muted">-</span>}
                        </td>
                        <td className="text-end">
                          {t.hasPaid ? (
                            <span className="text-success fw-bold">Rp{formatRupiah(t.jumlah_terbayar)}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-center">
                          {!t.is_occupied ? (
                            <span className="badge bg-secondary">Kosong</span>
                          ) : t.hasPaid ? (
                            <span className="badge bg-success"><FiCheck size={10} className="me-1" />Lunas</span>
                          ) : (
                            <span className="badge bg-danger"><FiAlertTriangle size={10} className="me-1" />Belum</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light">
                    <tr className="fw-bold">
                      <td>Total</td>
                      <td className="text-end">Rp{formatRupiah(currentYearSummary?.totalTagihan || 0)}</td>
                      <td className="text-end text-success">Rp{formatRupiah(currentYearSummary?.totalBayar || 0)}</td>
                      <td className="text-center">
                        <span className="badge bg-info">{currentYearSummary?.bulanLunas || 0}/12</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
