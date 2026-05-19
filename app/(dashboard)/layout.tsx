'use client'
// app/(dashboard)/layout.tsx
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  LayoutDashboard, Users, Kanban, GraduationCap,
  MessageSquare, Settings, LogOut, Menu, X, Bell, ChevronRight
} from 'lucide-react'
import type { AdminUser } from '@/types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { href: '/students', icon: GraduationCap, label: 'Students' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(profile)
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-0)' }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? 240 : 64,
          background: 'var(--surface-1)',
          borderRight: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>

        {/* Header */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-subtle)', height: 60 }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #00e5ff)' }}>
            <GraduationCap size={16} color="white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-sm truncate">Varsity Visa</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? 'white' : 'var(--text-secondary)',
                  background: active ? 'var(--brand-primary)' : 'transparent',
                  textDecoration: 'none',
                }}>
                <Icon size={17} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
                {sidebarOpen && active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--brand-primary)' }}>
                {user.full_name?.charAt(0) || 'A'}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.role}</p>
                </div>
              )}
              {sidebarOpen && (
                <button onClick={handleLogout} className="ml-auto"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <LogOut size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6"
          style={{ height: 60, borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <h1 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-secondary)' }}>
            {pathname.replace('/', '') || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Bell size={18} />
            </button>
            <Link href="/" target="_blank"
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'var(--brand-primary)', color: 'white', textDecoration: 'none' }}>
              + New Lead
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
