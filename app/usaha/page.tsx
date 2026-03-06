'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Usaha } from '@/types'
import {
  FiSearch, FiBriefcase, FiPhone, FiMapPin, FiInstagram,
  FiGlobe, FiExternalLink, FiEdit2, FiTrash2, FiPlus, FiX,
  FiUser, FiMessageCircle
} from 'react-icons/fi'

interface UsahaWithOwner extends Usaha {
  warga?: {
    nama_lengkap: string
    no_hp: string
    jalan?: { nama_jalan: string } | null
    nomor_rumah: string
    rt?: { nomor_rt: string } | null
  }
}

export default function UsahaDirectoryPage() {
  const { userData, loading: userLoading } = useUser()
  const supabase = createClient()

  const [usahaList, setUsahaList] = useState<UsahaWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUsaha, setSelectedUsaha] = useState<UsahaWithOwner | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchUsaha()
  }, [])

  const fetchUsaha = async () => {
    setLoading(true)
    try {
      // Use SECURITY DEFINER function to get usaha with owner names
      const { data, error } = await supabase.rpc('get_usaha_directory')

      if (error) throw error
      setUsahaList(data || [])
    } catch (error) {
      console.error('Error fetching usaha:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (usahaId: string) => {
    if (!confirm('Hapus usaha ini dari direktori?')) return
    setDeleting(usahaId)
    try {
      const { error } = await supabase.from('usaha').delete().eq('id', usahaId)
      if (error) throw error
      setUsahaList((prev: UsahaWithOwner[]) => prev.filter((u: UsahaWithOwner) => u.id !== usahaId))
      if (selectedUsaha?.id === usahaId) setSelectedUsaha(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus')
    } finally {
      setDeleting(null)
    }
  }

  const formatWaLink = (no: string) => {
    const cleaned = no.replace(/^0/, '62').replace(/[^0-9]/g, '')
    return `https://wa.me/${cleaned}`
  }

  const ensureUrl = (url: string) => url.match(/^https?:\/\//) ? url : 'https://' + url

  const isOwn = (usaha: UsahaWithOwner) => userData?.warga_id === usaha.warga_id

  // Filter
  const filtered = usahaList.filter((u: UsahaWithOwner) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.nama_usaha.toLowerCase().includes(q) ||
      u.deskripsi_usaha?.toLowerCase().includes(q) ||
      u.warga?.nama_lengkap?.toLowerCase().includes(q) ||
      u.alamat_usaha?.toLowerCase().includes(q)
    )
  })

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
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">Direktori Usaha Warga</h1>
          <p className="text-muted mb-0">Dukung usaha tetangga di lingkungan RW 013</p>
        </div>
        {userData?.warga_id && (
          <Link href={`/warga/edit/${userData.warga_id}#usaha`} className="btn btn-primary">
            <FiPlus className="me-2" />
            Tambah Usaha Saya
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text"><FiSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama usaha, pemilik, atau deskripsi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <small className="text-muted">{filtered.length} usaha ditemukan</small>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5">
          <FiBriefcase size={48} className="text-muted mb-3" />
          <p className="text-muted">{search ? 'Tidak ada usaha yang cocok dengan pencarian' : 'Belum ada usaha terdaftar'}</p>
          {userData?.warga_id && !search && (
            <Link href={`/warga/edit/${userData.warga_id}#usaha`} className="btn btn-primary mt-2">
              <FiPlus className="me-2" />Daftarkan Usaha Anda
            </Link>
          )}
        </div>
      ) : (
        <div className="row">
          {filtered.map((u: UsahaWithOwner) => {
            const warga = u.warga
            const hasSocial = u.link_instagram || u.link_tiktok || u.link_website || u.link_twitter

            return (
              <div key={u.id} className="col-lg-6 col-xl-4 mb-3">
                <div className="card h-100 border-0 shadow-sm" style={{ transition: 'transform 0.15s', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}
                >
                  <div className="card-body">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                        <div className="rounded-circle bg-warning bg-opacity-25 text-warning d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40 }}>
                          <FiBriefcase size={18} />
                        </div>
                        <div className="ms-2" style={{ minWidth: 0 }}>
                          <h6 className="fw-bold mb-0 text-truncate">{u.nama_usaha}</h6>
                          <small className="text-muted">
                            <FiUser size={11} className="me-1" />
                            {warga?.nama_lengkap || 'Warga'}
                          </small>
                        </div>
                      </div>
                      {isOwn(u) && (
                        <span className="badge bg-primary flex-shrink-0 ms-2">Milik Saya</span>
                      )}
                    </div>

                    {/* Description */}
                    {u.deskripsi_usaha && (
                      <p className="small text-muted mb-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {u.deskripsi_usaha}
                      </p>
                    )}

                    {/* Location */}
                    {u.alamat_usaha && (
                      <div className="small text-muted mb-2">
                        <FiMapPin size={12} className="me-1" />
                        {u.alamat_usaha}
                      </div>
                    )}

                    {/* Social links */}
                    {hasSocial && (
                      <div className="d-flex gap-2 mb-2">
                        {u.link_instagram && (
                          <a href={ensureUrl(u.link_instagram)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger py-0 px-1" onClick={(e) => e.stopPropagation()}>
                            <FiInstagram size={14} />
                          </a>
                        )}
                        {u.link_tiktok && (
                          <a href={ensureUrl(u.link_tiktok)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark py-0 px-1" onClick={(e) => e.stopPropagation()}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>TT</span>
                          </a>
                        )}
                        {u.link_website && (
                          <a href={ensureUrl(u.link_website)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary py-0 px-1" onClick={(e) => e.stopPropagation()}>
                            <FiGlobe size={14} />
                          </a>
                        )}
                        {u.link_twitter && (
                          <a href={ensureUrl(u.link_twitter)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info py-0 px-1" onClick={(e) => e.stopPropagation()}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>X</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedUsaha(u)}>
                        Lihat Detail
                      </button>
                      <div className="d-flex gap-1">
                        {u.no_whatsapp_usaha && (
                          <a href={formatWaLink(u.no_whatsapp_usaha)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-success" onClick={(e) => e.stopPropagation()}>
                            <FiMessageCircle size={14} />
                          </a>
                        )}
                        {isOwn(u) && (
                          <>
                            <Link href={`/warga/edit/${userData?.warga_id}#usaha`} className="btn btn-sm btn-outline-warning" onClick={(e) => e.stopPropagation()}>
                              <FiEdit2 size={14} />
                            </Link>
                            <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); handleDelete(u.id) }} disabled={deleting === u.id}>
                              {deleting === u.id ? <span className="spinner-border spinner-border-sm" /> : <FiTrash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedUsaha && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedUsaha(null)}>
          <div className="card" style={{ maxWidth: '550px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header bg-warning bg-opacity-25 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><FiBriefcase className="me-2" />{selectedUsaha.nama_usaha}</h6>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedUsaha(null)}><FiX /></button>
            </div>
            <div className="card-body">
              {/* Pemilik */}
              <div className="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                  {(selectedUsaha.warga?.nama_lengkap || '?')[0].toUpperCase()}
                </div>
                <div className="ms-2">
                  <div className="fw-bold small">{selectedUsaha.warga?.nama_lengkap || 'Warga'}</div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {selectedUsaha.warga?.jalan?.nama_jalan && `${selectedUsaha.warga.jalan.nama_jalan} No. ${selectedUsaha.warga.nomor_rumah}`}
                    {selectedUsaha.warga?.rt?.nomor_rt && ` · RT ${selectedUsaha.warga.rt.nomor_rt}`}
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              {selectedUsaha.deskripsi_usaha && (
                <div className="mb-3">
                  <label className="form-label text-muted small mb-1">Deskripsi Usaha</label>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selectedUsaha.deskripsi_usaha}</p>
                </div>
              )}

              {/* Alamat */}
              {selectedUsaha.alamat_usaha && (
                <div className="mb-3">
                  <label className="form-label text-muted small mb-1">Alamat Usaha</label>
                  <p className="mb-0"><FiMapPin size={14} className="me-1 text-muted" />{selectedUsaha.alamat_usaha}</p>
                </div>
              )}

              {/* Kontak */}
              {selectedUsaha.no_whatsapp_usaha && (
                <div className="mb-3">
                  <label className="form-label text-muted small mb-1">WhatsApp</label>
                  <div>
                    <a href={formatWaLink(selectedUsaha.no_whatsapp_usaha)} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm">
                      <FiPhone size={14} className="me-1" />{selectedUsaha.no_whatsapp_usaha}
                    </a>
                  </div>
                </div>
              )}

              {/* Social Media */}
              {(selectedUsaha.link_instagram || selectedUsaha.link_tiktok || selectedUsaha.link_website || selectedUsaha.link_twitter) && (
                <div className="mb-3">
                  <label className="form-label text-muted small mb-1">Media Sosial</label>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedUsaha.link_instagram && (
                      <a href={ensureUrl(selectedUsaha.link_instagram)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-danger">
                        <FiInstagram size={14} className="me-1" />Instagram
                      </a>
                    )}
                    {selectedUsaha.link_tiktok && (
                      <a href={ensureUrl(selectedUsaha.link_tiktok)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark">
                        TikTok <FiExternalLink size={11} className="ms-1" />
                      </a>
                    )}
                    {selectedUsaha.link_website && (
                      <a href={ensureUrl(selectedUsaha.link_website)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                        <FiGlobe size={14} className="me-1" />Website
                      </a>
                    )}
                    {selectedUsaha.link_twitter && (
                      <a href={ensureUrl(selectedUsaha.link_twitter)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                        X/Twitter <FiExternalLink size={11} className="ms-1" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="d-flex gap-2 mt-3 pt-3 border-top">
                {selectedUsaha.no_whatsapp_usaha && (
                  <a href={formatWaLink(selectedUsaha.no_whatsapp_usaha)} target="_blank" rel="noopener noreferrer" className="btn btn-success flex-fill">
                    <FiMessageCircle className="me-1" /> Hubungi via WA
                  </a>
                )}
                {isOwn(selectedUsaha) && (
                  <Link href={`/warga/edit/${userData?.warga_id}#usaha`} className="btn btn-outline-warning">
                    <FiEdit2 className="me-1" /> Edit
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}