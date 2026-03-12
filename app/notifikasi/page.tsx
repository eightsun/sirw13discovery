'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Notifikasi } from '@/types'
import {
  FiBell,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiTrash2,
  FiFilter
} from 'react-icons/fi'

export default function NotifikasiPage() {
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<Notifikasi[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'semua' | 'belum_dibaca'>('semua')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 15

  const fetchNotifications = useCallback(async () => {
    if (!userData?.id) return

    try {
      setLoading(true)

      let query = supabase
        .from('notifikasi')
        .select('*', { count: 'exact' })
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (filter === 'belum_dibaca') {
        query = query.eq('is_read', false)
      }

      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error
      setNotifications(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userData?.id, filter, currentPage])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    }
  }

  const markAllAsRead = async () => {
    if (!userData?.id) return

    const { error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('user_id', userData.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifikasi')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setTotalCount((prev) => prev - 1)
    }
  }

  const handleNotifClick = async (notif: Notifikasi) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
    }
    if (notif.link) {
      router.push(notif.link)
    }
  }

  const getTimeDisplay = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Baru saja'
    if (diffMin < 60) return `${diffMin} menit lalu`
    if (diffHour < 24) return `${diffHour} jam lalu`
    if (diffDay < 7) return `${diffDay} hari lalu`
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getTipeBadgeClass = (tipe: string) => {
    const map: Record<string, string> = {
      pengajuan: 'bg-warning',
      pembayaran: 'bg-success',
      keluhan: 'bg-danger',
      kegiatan: 'bg-info',
      verifikasi: 'bg-warning',
      info: 'bg-primary',
      umum: 'bg-secondary',
    }
    return map[tipe] || 'bg-secondary'
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">
            <FiBell className="me-2" />
            Notifikasi
          </h1>
          <p className="text-muted mb-0">Semua pemberitahuan untuk Anda</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={markAllAsRead}
          >
            <FiCheckCircle className="me-1" /> Tandai Semua Dibaca
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-2">
            <FiFilter className="text-muted" />
            <button
              className={`btn btn-sm ${filter === 'semua' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('semua')}
            >
              Semua ({totalCount})
            </button>
            <button
              className={`btn btn-sm ${filter === 'belum_dibaca' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('belum_dibaca')}
            >
              Belum Dibaca
            </button>
          </div>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <FiBell size={48} className="text-muted mb-3 opacity-50" />
            <h5 className="text-muted">Tidak ada notifikasi</h5>
            <p className="text-muted small">
              {filter === 'belum_dibaca'
                ? 'Semua notifikasi sudah dibaca'
                : 'Anda belum memiliki notifikasi'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="list-group list-group-flush">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`list-group-item list-group-item-action ${!notif.is_read ? 'bg-light' : ''}`}
                style={{ cursor: notif.link ? 'pointer' : 'default' }}
              >
                <div className="d-flex align-items-start gap-3">
                  {/* Unread indicator */}
                  <div className="pt-1" style={{ minWidth: '10px' }}>
                    {!notif.is_read && (
                      <span className="badge rounded-pill bg-primary" style={{ width: '10px', height: '10px', padding: 0, display: 'block' }}>&nbsp;</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-grow-1" onClick={() => handleNotifClick(notif)}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${getTipeBadgeClass(notif.tipe)} rounded-pill`} style={{ fontSize: '0.65rem' }}>
                        {notif.tipe}
                      </span>
                      <small className="text-muted">{getTimeDisplay(notif.created_at)}</small>
                    </div>
                    <div className="fw-semibold">{notif.judul}</div>
                    <div className="text-muted small">{notif.pesan}</div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-1">
                    {!notif.is_read && (
                      <button
                        className="btn btn-sm btn-outline-primary border-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notif.id)
                        }}
                        title="Tandai dibaca"
                      >
                        <FiCheckCircle size={14} />
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-outline-danger border-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      title="Hapus"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="d-flex justify-content-center mt-4">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage((p) => p - 1)}>
                <FiChevronLeft />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, i, arr) => {
                const items = []
                if (i > 0 && p - arr[i - 1] > 1) {
                  items.push(
                    <li key={`ellipsis-${p}`} className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  )
                }
                items.push(
                  <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button>
                  </li>
                )
                return items
              })}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage((p) => p + 1)}>
                <FiChevronRight />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
