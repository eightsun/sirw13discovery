'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useNotifications } from '@/hooks/useNotifications'
import { useStore } from '@/store/useStore'
import { getInitials, getRoleLabel } from '@/utils/helpers'
import {
  FiMenu,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiChevronDown,
  FiCheckCircle
} from 'react-icons/fi'
import Dropdown from 'react-bootstrap/Dropdown'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { user, userData, role, loading } = useUser()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(5)
  const { resetUserState } = useStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      // Reset store first
      resetUserState()
      // Clear localStorage
      localStorage.removeItem('sirw13-storage')
      // Sign out from Supabase
      await supabase.auth.signOut()
      // Force redirect
      window.location.href = '/login'
    } catch (error) {
      console.error('Error logging out:', error)
      window.location.href = '/login'
    }
  }

  const handleNotifClick = async (notifId: string, link: string | null) => {
    await markAsRead(notifId)
    if (link) {
      router.push(link)
    }
  }

  const getTimeAgo = (dateStr: string) => {
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
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getTipeBadgeClass = (tipe: string) => {
    const map: Record<string, string> = {
      pengajuan: 'bg-warning',
      pembayaran: 'bg-success',
      keluhan: 'bg-danger',
      kegiatan: 'bg-info',
      info: 'bg-primary',
      umum: 'bg-secondary',
    }
    return map[tipe] || 'bg-secondary'
  }

  const displayName = userData?.nama_lengkap || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  return (
    <nav className="topbar">
      <div className="d-flex align-items-center">
        <button
          className="btn btn-link text-secondary d-md-none"
          onClick={onToggleSidebar}
        >
          <FiMenu size={24} />
        </button>
      </div>

      <div className="d-flex align-items-center">
        {/* Notifications */}
        <Dropdown align="end" className="me-3">
          <Dropdown.Toggle
            variant="link"
            className="text-secondary position-relative p-0 border-0"
            id="notification-dropdown"
          >
            <FiBell size={20} />
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu-end py-0" style={{ minWidth: '340px' }}>
            <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold text-primary">Notifikasi</h6>
              {unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-link text-primary p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    markAllAsRead()
                  }}
                  title="Tandai semua dibaca"
                >
                  <FiCheckCircle size={16} />
                </button>
              )}
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted">
                  <FiBell size={24} className="mb-2 opacity-50" />
                  <p className="small mb-0">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <Dropdown.Item
                    key={notif.id}
                    className={`py-2 border-bottom ${!notif.is_read ? 'bg-light' : ''}`}
                    onClick={() => handleNotifClick(notif.id, notif.link)}
                  >
                    <div className="d-flex align-items-start gap-2">
                      {!notif.is_read && (
                        <span className="badge rounded-pill bg-primary mt-1" style={{ width: '8px', height: '8px', minWidth: '8px', padding: 0 }}>&nbsp;</span>
                      )}
                      <div className={!notif.is_read ? '' : 'ms-3'}>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <span className={`badge ${getTipeBadgeClass(notif.tipe)} rounded-pill`} style={{ fontSize: '0.6rem' }}>
                            {notif.tipe}
                          </span>
                          <small className="text-muted">{getTimeAgo(notif.created_at)}</small>
                        </div>
                        <div className="fw-semibold small">{notif.judul}</div>
                        <div className="small text-muted text-wrap">{notif.pesan}</div>
                      </div>
                    </div>
                  </Dropdown.Item>
                ))
              )}
            </div>
            <div className="p-2 border-top text-center">
              <Link href="/notifikasi" className="small text-primary text-decoration-none">
                Lihat Semua Notifikasi
              </Link>
            </div>
          </Dropdown.Menu>
        </Dropdown>

        <div className="topbar-divider d-none d-sm-block"></div>

        {/* User Menu */}
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="link"
            className="d-flex align-items-center text-decoration-none text-secondary p-0 border-0"
            id="user-dropdown"
          >
            <div className="me-2 d-none d-sm-block text-end">
              <div className="small fw-bold text-dark">{displayName}</div>
              <div className="small text-muted">
                {role ? getRoleLabel(role) : 'Warga'}
              </div>
            </div>
            <div className="user-avatar">
              {loading ? '...' : initials}
            </div>
            <FiChevronDown className="ms-1" />
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu-end">
            <Dropdown.Item href={userData?.warga_id ? `/warga/edit/${userData.warga_id}` : '/profil/lengkapi'}>
              <FiUser className="me-2" />
              Profil Saya
            </Dropdown.Item>
            <Dropdown.Item href="/pengaturan">
              <FiSettings className="me-2" />
              Ubah Password
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-danger"
            >
              <FiLogOut className="me-2" />
              {loggingOut ? 'Keluar...' : 'Keluar'}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </nav>
  )
}
