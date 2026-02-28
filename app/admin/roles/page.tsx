'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { UserRole } from '@/types'
import { 
  FiArrowLeft,
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiSearch,
  FiEdit2,
  FiSave,
  FiX,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo
} from 'react-icons/fi'

interface UserWithWarga {
  id: string
  email: string
  role: UserRole
  warga_id: string | null
  created_at: string
  warga?: {
    id: string
    nama_lengkap: string
    nik: string
    no_hp: string
    nomor_rumah: string
    kelurahan: string
  }
}

interface WargaOption {
  id: string
  user_id?: string // User ID untuk update role langsung
  nama_lengkap: string
  nik: string
  no_hp: string
  nomor_rumah: string
  kelurahan: string
}

// Daftar role yang bisa di-assign oleh Ketua RW
const ASSIGNABLE_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'wakil_ketua_rw', label: 'Wakil Ketua RW', description: 'Membantu Ketua RW dalam menjalankan tugas' },
  { value: 'sekretaris_rw', label: 'Sekretaris RW', description: 'Mengelola administrasi dan surat-menyurat' },
  { value: 'bendahara_rw', label: 'Bendahara RW', description: 'Mengelola keuangan dan kas RW' },
  { value: 'koordinator_rw', label: 'Koordinator RW', description: 'Koordinator kegiatan dan program RW' },
  { value: 'ketua_rt', label: 'Ketua RT', description: 'Memimpin RT di wilayahnya' },
  { value: 'sekretaris_rt', label: 'Sekretaris RT', description: 'Mengelola administrasi RT' },
  { value: 'bendahara_rt', label: 'Bendahara RT', description: 'Mengelola keuangan RT' },
  { value: 'warga', label: 'Warga Biasa', description: 'Tidak memiliki jabatan khusus' },
]

const getRoleLabel = (role: UserRole): string => {
  const found = ASSIGNABLE_ROLES.find(r => r.value === role)
  return found?.label || role
}

const getRoleBadgeColor = (role: UserRole): string => {
  switch (role) {
    case 'ketua_rw': return 'bg-danger'
    case 'wakil_ketua_rw': return 'bg-danger bg-opacity-75'
    case 'sekretaris_rw': return 'bg-primary'
    case 'bendahara_rw': return 'bg-success'
    case 'koordinator_rw': return 'bg-info'
    case 'ketua_rt': return 'bg-warning text-dark'
    case 'sekretaris_rt': return 'bg-secondary'
    case 'bendahara_rt': return 'bg-dark'
    default: return 'bg-light text-dark'
  }
}

export default function ManageRolesPage() {
  const router = useRouter()
  const { userData, role: currentUserRole } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [pengurus, setPengurus] = useState<UserWithWarga[]>([])
  const [allUsers, setAllUsers] = useState<UserWithWarga[]>([])
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  
  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('warga')
  const [saving, setSaving] = useState(false)
  
  // Add new pengurus modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [wargaList, setWargaList] = useState<WargaOption[]>([])
  const [selectedWargaId, setSelectedWargaId] = useState<string>('')
  const [newRole, setNewRole] = useState<UserRole>('koordinator_rw')
  const [searchWarga, setSearchWarga] = useState('')
  const [loadingWarga, setLoadingWarga] = useState(false)

  // Check access
  const isKetuaRW = currentUserRole === 'ketua_rw'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch all users with warga data
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          warga_id,
          created_at,
          warga:warga_id (
            id,
            nama_lengkap,
            nik,
            no_hp,
            nomor_rumah,
            kelurahan
          )
        `)
        .order('role')

      if (error) throw error

      if (usersData) {
        // Filter pengurus (non-warga roles)
        const pengurusList = (usersData as UserWithWarga[]).filter((u: UserWithWarga) => u.role !== 'warga')
        setPengurus(pengurusList)
        setAllUsers(usersData as UserWithWarga[])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!isKetuaRW && currentUserRole) {
      router.push('/dashboard')
      return
    }
    fetchData()
  }, [fetchData, isKetuaRW, currentUserRole, router])

  // Search warga for adding new pengurus
  // Mencari USER yang sudah punya akun dan role-nya masih 'warga'
  const searchWargaList = async (term: string) => {
    if (term.length < 2) {
      setWargaList([])
      return
    }

    try {
      setLoadingWarga(true)
      
      // Search dari tabel users yang role = 'warga' dan punya warga_id
      // Ini adalah user yang bisa di-upgrade jadi pengurus
      const { data } = await supabase
        .from('users')
        .select(`
          id,
          warga_id,
          warga:warga_id (
            id,
            nama_lengkap,
            nik,
            no_hp,
            nomor_rumah,
            kelurahan
          )
        `)
        .eq('role', 'warga')
        .not('warga_id', 'is', null)

      if (data) {
        // Filter berdasarkan nama/NIK
        const filtered = data.filter((u: { id: string; warga_id: string; warga: unknown }) => {
          const warga = u.warga as { nama_lengkap: string; nik: string } | null
          if (!warga) return false
          const searchLower = term.toLowerCase()
          return warga.nama_lengkap?.toLowerCase().includes(searchLower) ||
                 warga.nik?.includes(term)
        })

        // Map ke format WargaOption, include user_id untuk update
        const wargaOptions = filtered.map((u: { id: string; warga_id: string; warga: unknown }) => {
          const w = u.warga as { id: string; nama_lengkap: string; nik: string; no_hp: string; nomor_rumah: string; kelurahan: string }
          return {
            id: w.id,
            user_id: u.id, // Simpan user_id untuk update role
            nama_lengkap: w.nama_lengkap,
            nik: w.nik,
            no_hp: w.no_hp,
            nomor_rumah: w.nomor_rumah,
            kelurahan: w.kelurahan
          }
        }).slice(0, 10)

        setWargaList(wargaOptions)
      }
    } catch (error) {
      console.error('Error searching warga:', error)
    } finally {
      setLoadingWarga(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchWargaList(searchWarga)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchWarga])

  const handleEditClick = (user: UserWithWarga) => {
    setEditingId(user.id)
    setEditRole(user.role)
  }

  const handleSaveRole = async (userId: string) => {
    try {
      setSaving(true)

      const { data, error } = await supabase
        .from('users')
        .update({ role: editRole })
        .eq('id', userId)
        .select()

      if (error) throw error

      // Check if update actually happened
      if (!data || data.length === 0) {
        alert('Gagal update role. Jalankan SQL policy di Supabase untuk mengizinkan Ketua RW update role.')
        return
      }

      setEditingId(null)
      fetchData()
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Gagal mengubah role')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveRole = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus jabatan user ini? User akan menjadi warga biasa.')) {
      return
    }

    try {
      setSaving(true)

      const { data, error } = await supabase
        .from('users')
        .update({ role: 'warga' })
        .eq('id', userId)
        .select()

      if (error) throw error

      // Check if update actually happened
      if (!data || data.length === 0) {
        alert('Gagal menghapus jabatan. Jalankan SQL policy di Supabase.')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error removing role:', error)
      alert('Gagal menghapus jabatan')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPengurus = async () => {
    if (!selectedWargaId || !newRole) {
      alert('Pilih warga dan role')
      return
    }

    try {
      setSaving(true)

      // Cari user_id dari wargaList yang dipilih
      const selectedWarga = wargaList.find(w => w.id === selectedWargaId)
      
      if (!selectedWarga?.user_id) {
        alert('Warga ini belum memiliki akun. Minta warga untuk mendaftar terlebih dahulu.')
        return
      }

      console.log('Updating user:', selectedWarga.user_id, 'to role:', newRole)

      // Update user's role langsung
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedWarga.user_id)
        .select()

      console.log('Update result:', { data, error })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Check if update actually happened (RLS might silently fail)
      if (!data || data.length === 0) {
        alert('Gagal update role. Pastikan Anda memiliki akses untuk mengubah role user.\n\nJalankan SQL policy di Supabase untuk mengizinkan Ketua RW update role.')
        return
      }

      setShowAddModal(false)
      setSelectedWargaId('')
      setNewRole('koordinator_rw')
      setSearchWarga('')
      setWargaList([])
      fetchData()
      alert(`Pengurus berhasil ditambahkan!\n${selectedWarga.nama_lengkap} sekarang menjadi ${getRoleLabel(newRole)}`)
    } catch (error) {
      console.error('Error adding pengurus:', error)
      alert('Gagal menambah pengurus. Cek console untuk detail error.')
    } finally {
      setSaving(false)
    }
  }

  // Filter users
  const filteredPengurus = pengurus.filter(user => {
    const matchSearch = searchTerm === '' || 
      user.warga?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchRole = filterRole === 'all' || user.role === filterRole

    return matchSearch && matchRole
  })

  // Group by role level
  const rwLevel = filteredPengurus.filter(u => 
    ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'].includes(u.role)
  )
  const rtLevel = filteredPengurus.filter(u => 
    ['ketua_rt', 'sekretaris_rt', 'bendahara_rt'].includes(u.role)
  )

  // Count warga yang bisa di-upgrade (punya akun tapi role masih 'warga')
  const wargaWithAccount = allUsers.filter(u => u.role === 'warga' && u.warga_id).length

  if (!isKetuaRW && currentUserRole) {
    return (
      <div className="text-center py-5">
        <FiShield className="text-danger mb-3" size={48} />
        <h4>Akses Ditolak</h4>
        <p className="text-muted">Hanya Ketua RW yang dapat mengakses halaman ini</p>
        <Link href="/dashboard" className="btn btn-primary">
          Kembali ke Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Link href="/pengaturan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Kelola Pengurus</h1>
          <p className="text-muted mb-0">
            Assign dan kelola role pengurus RW/RT
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <FiUserCheck className="me-2" />
          Tambah Pengurus
        </button>
      </div>

      {/* Info Card */}
      <div className="alert alert-info d-flex align-items-start mb-4">
        <FiInfo className="me-2 mt-1 flex-shrink-0" />
        <div>
          <strong>Catatan:</strong> Hanya Ketua RW yang dapat mengubah role pengurus. 
          Perubahan role akan langsung mempengaruhi akses dan hak user di sistem.
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text"><FiSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama atau email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Semua Jabatan</option>
                <optgroup label="Tingkat RW">
                  <option value="ketua_rw">Ketua RW</option>
                  <option value="wakil_ketua_rw">Wakil Ketua RW</option>
                  <option value="sekretaris_rw">Sekretaris RW</option>
                  <option value="bendahara_rw">Bendahara RW</option>
                  <option value="koordinator_rw">Koordinator RW</option>
                </optgroup>
                <optgroup label="Tingkat RT">
                  <option value="ketua_rt">Ketua RT</option>
                  <option value="sekretaris_rt">Sekretaris RT</option>
                  <option value="bendahara_rt">Bendahara RT</option>
                </optgroup>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted">{filteredPengurus.length} pengurus</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Pengurus RW */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiShield className="me-2" />
                Pengurus Tingkat RW ({rwLevel.length})
              </h6>
            </div>
            <div className="card-body p-0">
              {rwLevel.length === 0 ? (
                <p className="text-muted text-center py-4">Tidak ada pengurus RW</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Jabatan</th>
                        <th>Alamat</th>
                        <th className="text-center" style={{ width: '150px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rwLevel.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="fw-bold">{user.warga?.nama_lengkap || '-'}</div>
                            <small className="text-muted">{user.warga?.no_hp || '-'}</small>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            {editingId === user.id ? (
                              <select
                                className="form-select form-select-sm"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                style={{ width: '180px' }}
                              >
                                {ASSIGNABLE_ROLES.filter(r => r.value !== 'ketua_rw').map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </span>
                            )}
                          </td>
                          <td>
                            <small>{user.warga?.nomor_rumah ? `No. ${user.warga.nomor_rumah}, ${user.warga.kelurahan || ''}` : '-'}</small>
                          </td>
                          <td className="text-center">
                            {user.role === 'ketua_rw' ? (
                              <span className="text-muted small">-</span>
                            ) : editingId === user.id ? (
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleSaveRole(user.id)}
                                  disabled={saving}
                                >
                                  <FiSave />
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setEditingId(null)}
                                  disabled={saving}
                                >
                                  <FiX />
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditClick(user)}
                                  title="Ubah Jabatan"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveRole(user.id)}
                                  title="Hapus Jabatan"
                                >
                                  <FiUserX />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Pengurus RT */}
          <div className="card mb-4">
            <div className="card-header bg-warning">
              <h6 className="mb-0 fw-bold text-dark">
                <FiUsers className="me-2" />
                Pengurus Tingkat RT ({rtLevel.length})
              </h6>
            </div>
            <div className="card-body p-0">
              {rtLevel.length === 0 ? (
                <p className="text-muted text-center py-4">Tidak ada pengurus RT</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Jabatan</th>
                        <th>Alamat</th>
                        <th className="text-center" style={{ width: '150px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rtLevel.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="fw-bold">{user.warga?.nama_lengkap || '-'}</div>
                            <small className="text-muted">{user.warga?.no_hp || '-'}</small>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            {editingId === user.id ? (
                              <select
                                className="form-select form-select-sm"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                style={{ width: '180px' }}
                              >
                                {ASSIGNABLE_ROLES.filter(r => r.value !== 'ketua_rw').map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </span>
                            )}
                          </td>
                          <td>
                            <small>{user.warga?.nomor_rumah ? `No. ${user.warga.nomor_rumah}, ${user.warga.kelurahan || ''}` : '-'}</small>
                          </td>
                          <td className="text-center">
                            {editingId === user.id ? (
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleSaveRole(user.id)}
                                  disabled={saving}
                                >
                                  <FiSave />
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setEditingId(null)}
                                  disabled={saving}
                                >
                                  <FiX />
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex justify-content-center gap-1">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditClick(user)}
                                  title="Ubah Jabatan"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveRole(user.id)}
                                  title="Hapus Jabatan"
                                >
                                  <FiUserX />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Role Legend */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0 fw-bold">Keterangan Jabatan</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {ASSIGNABLE_ROLES.filter(r => r.value !== 'warga').map(role => (
                  <div key={role.value} className="col-md-6 col-lg-4">
                    <div className="d-flex align-items-start">
                      <span className={`badge ${getRoleBadgeColor(role.value)} me-2`}>
                        {role.label}
                      </span>
                      <small className="text-muted">{role.description}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Pengurus Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <FiUserCheck className="me-2" />
                  Tambah Pengurus Baru
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                />
              </div>
              <div className="modal-body">
                <div className="alert alert-warning small">
                  <FiAlertTriangle className="me-2" />
                  <strong>Syarat:</strong> Warga harus sudah memiliki akun di SIRW13 (sudah mendaftar dan login). 
                  Pencarian hanya menampilkan warga yang sudah punya akun dan belum menjadi pengurus.
                  {wargaWithAccount > 0 && (
                    <div className="mt-1">
                      <small className="text-success">✓ {wargaWithAccount} warga dengan akun tersedia untuk dijadikan pengurus</small>
                    </div>
                  )}
                  {wargaWithAccount === 0 && (
                    <div className="mt-1">
                      <small className="text-danger">✗ Tidak ada warga dengan akun yang bisa dijadikan pengurus</small>
                    </div>
                  )}
                </div>

                {/* Search Warga */}
                <div className="mb-3">
                  <label className="form-label">Cari Warga <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ketik nama atau NIK warga..."
                    value={searchWarga}
                    onChange={(e) => setSearchWarga(e.target.value)}
                  />
                  {loadingWarga && (
                    <small className="text-muted">Mencari...</small>
                  )}
                </div>

                {/* Warga List */}
                {wargaList.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Pilih Warga</label>
                    <div className="list-group" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {wargaList.map(warga => (
                        <button
                          key={warga.id}
                          type="button"
                          className={`list-group-item list-group-item-action ${selectedWargaId === warga.id ? 'active' : ''}`}
                          onClick={() => setSelectedWargaId(warga.id)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{warga.nama_lengkap}</strong>
                              <br />
                              <small className={selectedWargaId === warga.id ? 'text-white-50' : 'text-muted'}>
                                NIK: {warga.nik} | No. {warga.nomor_rumah}, {warga.kelurahan || ''}
                              </small>
                            </div>
                            {selectedWargaId === warga.id && (
                              <FiCheckCircle />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchWarga.length >= 2 && wargaList.length === 0 && !loadingWarga && (
                  <div className="alert alert-info small">
                    Tidak ditemukan warga dengan nama/NIK tersebut, atau warga sudah menjadi pengurus.
                  </div>
                )}

                {/* Role Selection */}
                <div className="mb-3">
                  <label className="form-label">Pilih Jabatan <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                  >
                    <optgroup label="Tingkat RW">
                      <option value="wakil_ketua_rw">Wakil Ketua RW</option>
                      <option value="sekretaris_rw">Sekretaris RW</option>
                      <option value="bendahara_rw">Bendahara RW</option>
                      <option value="koordinator_rw">Koordinator RW</option>
                    </optgroup>
                    <optgroup label="Tingkat RT">
                      <option value="ketua_rt">Ketua RT</option>
                      <option value="sekretaris_rt">Sekretaris RT</option>
                      <option value="bendahara_rt">Bendahara RT</option>
                    </optgroup>
                  </select>
                  <small className="text-muted">
                    {ASSIGNABLE_ROLES.find(r => r.value === newRole)?.description}
                  </small>
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
                  onClick={handleAddPengurus}
                  disabled={saving || !selectedWargaId}
                >
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                  ) : (
                    <><FiUserCheck className="me-2" />Tambah Pengurus</>
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