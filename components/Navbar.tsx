'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { getInitials, getRoleLabel } from '@/utils/helpers'
import { 
  FiMenu, 
  FiBell, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiChevronDown
} from 'react-icons/fi'
import Dropdown from 'react-bootstrap/Dropdown'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const { user, userData, role, loading } = useUser()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
      // Force redirect dengan window.location untuk clear semua state
      window.location.href = '/login'
    } catch (error) {
      console.error('Error logging out:', error)
      // Tetap redirect meskipun error
      window.location.href = '/login'
    }
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
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
              3
            </span>
          </Dropdown.Toggle>

          <Dropdown.Menu className="dropdown-menu-end py-0" style={{ minWidth: '300px' }}>
            <div className="p-3 border-bottom bg-light">
              <h6 className="mb-0 fw-bold text-primary">Notifikasi</h6>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <Dropdown.Item className="py-2 border-bottom">
                <div className="small text-muted">12 Januari 2026</div>
                <div>Warga baru telah mendaftar</div>
              </Dropdown.Item>
              <Dropdown.Item className="py-2 border-bottom">
                <div className="small text-muted">11 Januari 2026</div>
                <div>Pembayaran iuran RT 003 masuk</div>
              </Dropdown.Item>
              <Dropdown.Item className="py-2">
                <div className="small text-muted">10 Januari 2026</div>
                <div>Rapat RT akan dilaksanakan</div>
              </Dropdown.Item>
            </div>
            <div className="p-2 border-top text-center">
              <a href="#" className="small text-primary">Lihat Semua Notifikasi</a>
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
            <Dropdown.Item href="/profil">
              <FiUser className="me-2" />
              Profil Saya
            </Dropdown.Item>
            <Dropdown.Item href="/pengaturan">
              <FiSettings className="me-2" />
              Pengaturan
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
