'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { 
  FiHome, 
  FiUsers, 
  FiUserPlus, 
  FiSettings, 
  FiDatabase,
  FiFileText,
  FiCreditCard,
  FiCalendar,
  FiMessageSquare,
  FiBarChart2
} from 'react-icons/fi'

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[] // Jika kosong, semua role bisa akses
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const { role, isRW, isPengurus } = useUser()

  // Menu configuration
  const menuSections: MenuSection[] = [
    {
      title: 'Utama',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
      ],
    },
    {
      title: 'Data Warga',
      items: [
        { href: '/warga', label: 'Daftar Warga', icon: <FiUsers /> },
        { 
          href: '/rumah', 
          label: 'Daftar Rumah', 
          icon: <FiHome />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
        },
        { 
          href: '/warga/tambah', 
          label: 'Tambah Warga', 
          icon: <FiUserPlus />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt', 'sekretaris_rt']
        },
      ],
    },
    {
      title: 'IPL',
      items: [
        { 
          href: '/ipl', 
          label: 'Tagihan IPL', 
          icon: <FiCreditCard />,
        },
        { 
          href: '/ipl/bayar', 
          label: 'Bayar IPL', 
          icon: <FiCreditCard />,
        },
        { 
          href: '/ipl/verifikasi', 
          label: 'Verifikasi', 
          icon: <FiFileText />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
        },
        { 
          href: '/admin/ipl/tarif', 
          label: 'Pengaturan Tarif', 
          icon: <FiSettings />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']
        },
      ],
    },
    {
      title: 'Administrasi',
      items: [
        { 
          href: '/surat', 
          label: 'Surat Menyurat', 
          icon: <FiFileText />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'ketua_rt', 'sekretaris_rt']
        },
        { 
          href: '/keuangan', 
          label: 'Keuangan', 
          icon: <FiCreditCard />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'bendahara_rw', 'ketua_rt', 'bendahara_rt']
        },
        { 
          href: '/kegiatan', 
          label: 'Kegiatan', 
          icon: <FiCalendar />,
        },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        { 
          href: '/pengumuman', 
          label: 'Pengumuman', 
          icon: <FiMessageSquare />,
        },
        { 
          href: '/laporan', 
          label: 'Laporan', 
          icon: <FiBarChart2 />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'ketua_rt']
        },
        { 
          href: '/master', 
          label: 'Data Master', 
          icon: <FiDatabase />,
          roles: ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw']
        },
        { 
          href: '/pengaturan', 
          label: 'Pengaturan', 
          icon: <FiSettings />,
        },
      ],
    },
  ]

  // Filter menu berdasarkan role
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (!item.roles || item.roles.length === 0) return true
      if (!role) return false
      return item.roles.includes(role)
    })
  }

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="sidebar-brand">
        🏘️ SIRW13
      </Link>
      
      <hr className="sidebar-divider" />
      
      <nav>
        {menuSections.map((section, sectionIndex) => {
          const filteredItems = filterMenuItems(section.items)
          
          if (filteredItems.length === 0) return null
          
          return (
            <div key={sectionIndex}>
              <div className="sidebar-heading">{section.title}</div>
              
              {filteredItems.map((item, itemIndex) => (
                <div className="nav-item" key={itemIndex}>
                  <Link 
                    href={item.href} 
                    className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </div>
              ))}
              
              {sectionIndex < menuSections.length - 1 && (
                <hr className="sidebar-divider" />
              )}
            </div>
          )
        })}
      </nav>
      
      <hr className="sidebar-divider" />
      
      <div className="px-3 py-2">
        <small className="text-white-50">
          RW 013 Desa Banjarsari
          <br />
          Kec. Manyar, Kab. Gresik
          <br />
          Permata Discovery
        </small>
      </div>
    </aside>
  )
}