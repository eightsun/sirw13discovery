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
      resetUserState()
      localStorage.removeItem('sirw13-storage')
      await supabase.auth.signOut()
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
    if (diffMin < 60) return `${diffMin}m lalu`
    if (diffHour < 24) return `${diffHour}j lalu`
    if (diffDay < 7) return `${diffDay}h lalu`
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const getTipeBadgeClass = (tipe: string) => {
    const map: Record<string, string> = {
      pengajuan: 'bg-warning text-dark',
      pembayaran: 'bg-success',
      keluhan: 'bg-danger',
      kegiatan: 'bg-info',
      verifikasi: 'bg-warning text-dark',
      info: 'bg-primary',
      umum: 'bg-secondary',
    }
    return map[tipe] || 'bg-secondary'
  }

  const displayName = userData?.nama_lengkap || user?.email?.split('@')[0] || 'User'
  const initials = getInitials(displayName)

  return (
    <nav className="topbar">
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-link p-1 d-md-none"
          onClick={onToggleSidebar}
          style={{ color: 'var(--text-heading)' }}
        >
          <FiMenu size={20} />
        </button>
      </div>

      <div className="d-flex align-items-center gap-1">
        {/* Notifications */}
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="link"
            className="position-relative p-2 border-0"
            id="notification-dropdown"
            style={{ color: 'var(--text-body)', lineHeight: 1 }}
          >
            <FiBell size={18} />
            {unreadCount > 0 && (
              <span
                className="position-absolute badge rounded-pill bg-danger"
                style={{ fontSize: '0.55rem', top: '4px', right: '2px', padding: '0.2em 0.45em' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu-end py-0 shadow-lg" style={{ minWidth: '340px', borderRadius: '0.75rem', border: '1px solid var(--card-border)' }}>
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small" style={{ color: 'var(--text-heading)' }}>Notifikasi</span>
              {unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-link text-primary p-0"
                  onClick={(e) => { e.stopPropagation(); markAllAsRead() }}
                  title="Tandai semua dibaca"
                >
                  <FiCheckCircle size={14} />
                </button>
              )}
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="p-4 text-center" style={{ color: 'var(--text-body)' }}>
                  <FiBell size={20} className="mb-2 opacity-25" />
                  <p className="small mb-0">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <Dropdown.Item
                    key={notif.id}
                    className={`py-2 px-3 border-bottom ${!notif.is_read ? '' : ''}`}
                    onClick={() => handleNotifClick(notif.id, notif.link)}
                    style={{ backgroundColor: !notif.is_read ? 'rgba(78,115,223,0.03)' : 'transparent' }}
                  >
                    <div className="d-flex align-items-start gap-2">
                      {!notif.is_read && (
                        <span className="rounded-circle bg-primary mt-1" style={{ width: '6px', height: '6px', minWidth: '6px', display: 'inline-block' }} />
                      )}
                      <div className={!notif.is_read ? '' : 'ms-3'}>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <span className={`badge ${getTipeBadgeClass(notif.tipe)} rounded-pill`} style={{ fontSize: '0.55rem' }}>
                            {notif.tipe}
                          </span>
                          <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{getTimeAgo(notif.created_at)}</small>
                        </div>
                        <div className="fw-semibold" style={{ fontSize: '0.8rem', color: 'var(--text-heading)' }}>{notif.judul}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-body)' }} className="text-wrap">{notif.pesan}</div>
                      </div>
                    </div>
                  </Dropdown.Item>
                ))
              )}
            </div>
            <div className="p-2 border-top text-center">
              <Link href="/notifikasi" className="small text-primary text-decoration-none fw-bold" style={{ fontSize: '0.8rem' }}>
                Lihat Semua
              </Link>
            </div>
          </Dropdown.Menu>
        </Dropdown>

        <div className="topbar-divider d-none d-sm-block" />

        {/* User Menu */}
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="link"
            className="d-flex align-items-center text-decoration-none p-0 border-0 gap-2"
            id="user-dropdown"
            style={{ color: 'var(--text-body)' }}
          >
            <div className="user-avatar">
              {loading ? '·' : initials}
            </div>
            <div className="d-none d-sm-block text-start" style={{ lineHeight: 1.2 }}>
              <div className="fw-bold" style={{ fontSize: '0.8rem', color: 'var(--text-heading)' }}>{displayName}</div>
              <div style={{ fontSize: '0.675rem', color: '#94a3b8' }}>
                {role ? getRoleLabel(role) : 'Warga'}
              </div>
            </div>
            <FiChevronDown size={14} className="d-none d-sm-block" style={{ opacity: 0.4 }} />
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu-end shadow-lg" style={{ borderRadius: '0.75rem', border: '1px solid var(--card-border)', minWidth: '180px' }}>
            <Dropdown.Item href={userData?.warga_id ? `/warga/edit/${userData.warga_id}` : '/profil/lengkapi'} className="py-2">
              <FiUser className="me-2" size={14} />
              <span style={{ fontSize: '0.85rem' }}>Profil Saya</span>
            </Dropdown.Item>
            <Dropdown.Item href="/pengaturan" className="py-2">
              <FiSettings className="me-2" size={14} />
              <span style={{ fontSize: '0.85rem' }}>Ubah Password</span>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout} disabled={loggingOut} className="text-danger py-2">
              <FiLogOut className="me-2" size={14} />
              <span style={{ fontSize: '0.85rem' }}>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </nav>
  )
}
