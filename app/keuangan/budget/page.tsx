'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KategoriPengeluaran } from '@/types'
import { 
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiSave,
  FiX,
  FiCalendar,
  FiFilter,
  FiPieChart,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi'

interface BudgetItem {
  id: number
  tahun: number
  wilayah: string
  kategori_id: number
  jumlah_budget: number
  created_at: string
  updated_at: string
  kategori?: KategoriPengeluaran
  realisasi?: number
}

export default function BudgetTahunanPage() {
  const { userData } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [budgetList, setBudgetList] = useState<BudgetItem[]>([])
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  
  // Filters
  const currentYear = new Date().getFullYear()
  const [filterTahun, setFilterTahun] = useState<number>(currentYear)
  const [filterWilayah, setFilterWilayah] = useState<string>('Timur')
  
  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  // Add mode
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBudget, setNewBudget] = useState({
    kategori_id: '',
    jumlah_budget: ''
  })
  const [saving, setSaving] = useState(false)

  // Bulk setup mode
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkYear, setBulkYear] = useState<number>(currentYear)
  const [bulkWilayah, setBulkWilayah] = useState<string>('Timur')
  const [bulkAmount, setBulkAmount] = useState<string>('10000000')

  const isKetuaRW = userData?.role === 'ketua_rw' || userData?.role === 'wakil_ketua_rw'
  const isBendaharaRW = userData?.role === 'bendahara_rw'
  const canEdit = isKetuaRW || isBendaharaRW

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch kategori
      const { data: kategoriData } = await supabase
        .from('kategori_pengeluaran')
        .select('*')
        .eq('is_active', true)
        .order('kode')

      if (kategoriData) {
        setKategoriList(kategoriData)
      }

      // Fetch budget
      const { data: budgetData } = await supabase
        .from('budget_tahunan')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama)
        `)
        .eq('tahun', filterTahun)
        .eq('wilayah', filterWilayah)
        .order('kategori_id')

      if (budgetData) {
        // Calculate realisasi dari kas_transaksi (pengeluaran aktual)
        const budgetWithRealisasi = await Promise.all(
          budgetData.map(async (budget: BudgetItem) => {
            const { data: realisasiData } = await supabase
              .from('kas_transaksi')
              .select('jumlah')
              .eq('kategori_id', budget.kategori_id)
              .eq('wilayah', budget.wilayah)
              .eq('tipe', 'pengeluaran')
              .eq('jenis_kas', 'rw')
              .gte('tanggal', `${budget.tahun}-01-01`)
              .lte('tanggal', `${budget.tahun}-12-31`)

            const realisasi = realisasiData?.reduce((sum: number, item: { jumlah: number }) => sum + item.jumlah, 0) || 0
            return { ...budget, realisasi }
          })
        )
        setBudgetList(budgetWithRealisasi)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [filterTahun, filterWilayah, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate totals
  const totalBudget = budgetList.reduce((sum: number, item: BudgetItem) => sum + item.jumlah_budget, 0)
  const totalRealisasi = budgetList.reduce((sum: number, item: BudgetItem) => sum + (item.realisasi || 0), 0)
  const totalSisa = totalBudget - totalRealisasi
  const totalPersentase = totalBudget > 0 ? (totalRealisasi / totalBudget) * 100 : 0

  const handleEdit = (item: BudgetItem) => {
    setEditingId(item.id)
    setEditValue(item.jumlah_budget.toString())
  }

  const handleSaveEdit = async (id: number) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('budget_tahunan')
        .update({ 
          jumlah_budget: Number(editValue),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      setEditingId(null)
      fetchData()
    } catch (error) {
      console.error('Error updating budget:', error)
      alert('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleAddBudget = async () => {
    if (!newBudget.kategori_id || !newBudget.jumlah_budget) {
      alert('Pilih kategori dan masukkan jumlah budget')
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('budget_tahunan')
        .insert({
          tahun: filterTahun,
          wilayah: filterWilayah,
          kategori_id: Number(newBudget.kategori_id),
          jumlah_budget: Number(newBudget.jumlah_budget),
          created_by: userData?.id
        })

      if (error) {
        if (error.code === '23505') {
          alert('Budget untuk kategori ini sudah ada')
        } else {
          throw error
        }
        return
      }
      
      setShowAddModal(false)
      setNewBudget({ kategori_id: '', jumlah_budget: '' })
      fetchData()
    } catch (error) {
      console.error('Error adding budget:', error)
      alert('Gagal menambah budget')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSetup = async () => {
    if (!bulkAmount) {
      alert('Masukkan jumlah budget default')
      return
    }

    try {
      setSaving(true)
      
      // Get all active categories
      const { data: categories } = await supabase
        .from('kategori_pengeluaran')
        .select('id')
        .eq('is_active', true)

      if (!categories || categories.length === 0) {
        alert('Tidak ada kategori aktif')
        return
      }

      // Insert budget for each category
      const budgetInserts = categories.map((cat: KategoriPengeluaran) => ({
        tahun: bulkYear,
        wilayah: bulkWilayah,
        kategori_id: cat.id,
        jumlah_budget: Number(bulkAmount),
        created_by: userData?.id
      }))

      const { error } = await supabase
        .from('budget_tahunan')
        .upsert(budgetInserts, { 
          onConflict: 'tahun,wilayah,kategori_id',
          ignoreDuplicates: true
        })

      if (error) throw error
      
      setShowBulkModal(false)
      setFilterTahun(bulkYear)
      setFilterWilayah(bulkWilayah)
      fetchData()
      alert(`Budget berhasil dibuat untuk ${categories.length} kategori`)
    } catch (error) {
      console.error('Error bulk setup:', error)
      alert('Gagal setup budget')
    } finally {
      setSaving(false)
    }
  }

  // Get categories not yet in budget
  const availableCategories = kategoriList.filter((kat: KategoriPengeluaran) =>
     !budgetList.some((b: BudgetItem) => b.kategori_id === kat.id)
  )

  const getProgressColor = (persen: number) => {
    if (persen >= 100) return 'bg-danger'
    if (persen >= 80) return 'bg-warning'
    return 'bg-success'
  }

  const getStatusBadge = (persen: number) => {
    if (persen >= 100) {
      return <span className="badge bg-danger"><FiAlertTriangle className="me-1" />Over Budget</span>
    }
    if (persen >= 80) {
      return <span className="badge bg-warning text-dark"><FiAlertTriangle className="me-1" />Hampir Habis</span>
    }
    return <span className="badge bg-success"><FiCheckCircle className="me-1" />Aman</span>
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Link href="/keuangan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Budget Tahunan</h1>
          <p className="text-muted mb-0">
            Kelola anggaran pengeluaran per kategori
          </p>
        </div>
        {canEdit && (
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-primary"
              onClick={() => setShowBulkModal(true)}
            >
              <FiRefreshCw className="me-2" />
              Setup Budget Massal
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
              disabled={availableCategories.length === 0}
            >
              <FiPlus className="me-2" />
              Tambah Budget
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-primary">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                  <FiPieChart className="text-primary fs-4" />
                </div>
                <div>
                  <small className="text-muted">Total Budget</small>
                  <h5 className="mb-0 text-primary">{formatRupiah(totalBudget)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-danger">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-danger bg-opacity-10 p-3 me-3">
                  <FiTrendingUp className="text-danger fs-4" />
                </div>
                <div>
                  <small className="text-muted">Total Realisasi</small>
                  <h5 className="mb-0 text-danger">{formatRupiah(totalRealisasi)}</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-success">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                  <FiCheckCircle className="text-success fs-4" />
                </div>
                <div>
                  <small className="text-muted">Sisa Budget</small>
                  <h5 className={`mb-0 ${totalSisa >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatRupiah(totalSisa)}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <small className="text-muted d-block mb-2">Penggunaan Budget</small>
              <div className="progress" style={{ height: '20px' }}>
                <div 
                  className={`progress-bar ${getProgressColor(totalPersentase)}`}
                  style={{ width: `${Math.min(totalPersentase, 100)}%` }}
                >
                  {totalPersentase.toFixed(1)}%
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
            <div className="col-md-3">
              <label className="form-label">
                <FiCalendar className="me-1" /> Tahun
              </label>
              <select
                className="form-select"
                value={filterTahun}
                onChange={(e) => setFilterTahun(Number(e.target.value))}
              >
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">
                <FiFilter className="me-1" /> Wilayah
              </label>
              <select
                className="form-select"
                value={filterWilayah}
                onChange={(e) => setFilterWilayah(e.target.value)}
              >
                <option value="Timur">Discovery Timur</option>
                <option value="Barat">Discovery Barat</option>
              </select>
            </div>
            <div className="col-md-6 text-end">
              <span className="text-muted">
                Menampilkan {budgetList.length} dari {kategoriList.length} kategori
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Table */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0 fw-bold">
            <FiPieChart className="me-2" />
            Daftar Budget {filterTahun} - Discovery {filterWilayah}
          </h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : budgetList.length === 0 ? (
            <div className="text-center py-5">
              <FiPieChart className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <p className="text-muted mb-3">Belum ada budget untuk periode ini</p>
              {canEdit && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowBulkModal(true)}
                >
                  <FiPlus className="me-2" />
                  Setup Budget Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>Kode</th>
                    <th>Kategori</th>
                    <th className="text-end" style={{ width: '150px' }}>Budget</th>
                    <th className="text-end" style={{ width: '150px' }}>Realisasi</th>
                    <th className="text-end" style={{ width: '150px' }}>Sisa</th>
                    <th style={{ width: '200px' }}>Progress</th>
                    <th style={{ width: '120px' }}>Status</th>
                    {canEdit && <th className="text-center" style={{ width: '100px' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {budgetList.map((item: BudgetItem) => {
                    const sisa = item.jumlah_budget - (item.realisasi || 0)
                    const persen = item.jumlah_budget > 0 
                      ? ((item.realisasi || 0) / item.jumlah_budget) * 100 
                      : 0

                    return (
                      <tr key={item.id}>
                        <td className="text-center fw-bold">{item.kategori?.kode}</td>
                        <td>{item.kategori?.nama}</td>
                        <td className="text-end">
                          {editingId === item.id ? (
                            <input
                              type="number"
                              className="form-control form-control-sm text-end"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <span className="fw-bold">{formatRupiah(item.jumlah_budget)}</span>
                          )}
                        </td>
                        <td className="text-end text-danger">
                          {formatRupiah(item.realisasi || 0)}
                        </td>
                        <td className={`text-end fw-bold ${sisa >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatRupiah(sisa)}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: '8px' }}>
                              <div 
                                className={`progress-bar ${getProgressColor(persen)}`}
                                style={{ width: `${Math.min(persen, 100)}%` }}
                              />
                            </div>
                            <small className="text-muted" style={{ minWidth: '45px' }}>
                              {persen.toFixed(0)}%
                            </small>
                          </div>
                        </td>
                        <td>{getStatusBadge(persen)}</td>
                        {canEdit && (
                          <td className="text-center">
                            {editingId === item.id ? (
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleSaveEdit(item.id)}
                                  disabled={saving}
                                >
                                  <FiSave />
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={handleCancelEdit}
                                  disabled={saving}
                                >
                                  <FiX />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(item)}
                              >
                                <FiEdit2 />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td colSpan={2}>TOTAL</td>
                    <td className="text-end">{formatRupiah(totalBudget)}</td>
                    <td className="text-end text-danger">{formatRupiah(totalRealisasi)}</td>
                    <td className={`text-end ${totalSisa >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatRupiah(totalSisa)}
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '8px' }}>
                          <div 
                            className={`progress-bar ${getProgressColor(totalPersentase)}`}
                            style={{ width: `${Math.min(totalPersentase, 100)}%` }}
                          />
                        </div>
                        <small style={{ minWidth: '45px' }}>
                          {totalPersentase.toFixed(0)}%
                        </small>
                      </div>
                    </td>
                    <td></td>
                    {canEdit && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <FiPlus className="me-2" />
                  Tambah Budget
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                />
              </div>
              <div className="modal-body">
                <div className="alert alert-info small">
                  Menambah budget untuk <strong>{filterTahun}</strong> - <strong>Discovery {filterWilayah}</strong>
                </div>

                <div className="mb-3">
                  <label className="form-label">Kategori <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={newBudget.kategori_id}
                    onChange={(e) => setNewBudget({ ...newBudget, kategori_id: e.target.value })}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {availableCategories.map((kat: KategoriPengeluaran) => (
                      <option key={kat.id} value={kat.id}>
                        {kat.kode}. {kat.nama}
                      </option>
                    ))}
                  </select>
                  {availableCategories.length === 0 && (
                    <small className="text-muted">Semua kategori sudah memiliki budget</small>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Jumlah Budget <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={newBudget.jumlah_budget}
                      onChange={(e) => setNewBudget({ ...newBudget, jumlah_budget: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddBudget}
                  disabled={saving || !newBudget.kategori_id || !newBudget.jumlah_budget}
                >
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                  ) : (
                    <><FiSave className="me-2" />Simpan</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Setup Modal */}
      {showBulkModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <FiRefreshCw className="me-2" />
                  Setup Budget Massal
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowBulkModal(false)}
                  disabled={saving}
                />
              </div>
              <div className="modal-body">
                <div className="alert alert-warning small">
                  <FiAlertTriangle className="me-2" />
                  Fitur ini akan membuat budget untuk <strong>semua kategori aktif</strong> sekaligus dengan jumlah yang sama.
                </div>

                <div className="mb-3">
                  <label className="form-label">Tahun <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(Number(e.target.value))}
                  >
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Wilayah <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={bulkWilayah}
                    onChange={(e) => setBulkWilayah(e.target.value)}
                  >
                    <option value="Timur">Discovery Timur</option>
                    <option value="Barat">Discovery Barat</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Budget per Kategori <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text">Rp</span>
                    <input
                      type="number"
                      className="form-control"
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(e.target.value)}
                      placeholder="10000000"
                    />
                  </div>
                  <small className="text-muted">
                    Total: {formatRupiah(Number(bulkAmount) * kategoriList.length)} untuk {kategoriList.length} kategori
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowBulkModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkSetup}
                  disabled={saving || !bulkAmount}
                >
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Memproses...</>
                  ) : (
                    <><FiRefreshCw className="me-2" />Setup Budget</>
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