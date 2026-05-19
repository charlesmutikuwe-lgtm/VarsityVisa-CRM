'use client'
// app/(dashboard)/dashboard/page.tsx
import { useEffect, useState } from 'react'
import { getDashboardStats } from '@/lib/supabase'
import { getScoreColor, getScoreLabel } from '@/lib/ai-scoring'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, TrendingUp, Star, Target, ArrowUpRight, Zap } from 'lucide-react'
import type { DashboardStats } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, DESTINATION_FLAGS } from '@/lib/constants'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard…</div>
      </div>
    )
  }

  if (!stats) return <div>Failed to load stats.</div>

  const statusPieData = Object.entries(stats.by_status)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] }))

  const destBarData = Object.entries(stats.by_destination)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([k, v]) => ({ name: `${DESTINATION_FLAGS[k] || '🌍'} ${k.replace(/_/g, ' ').toUpperCase()}`, value: v }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Dashboard</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Overview of your student pipeline
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Leads"
          value={stats.total_leads.toLocaleString()}
          sub="+{stats.new_this_week} this week"
          color="#6c63ff"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Conversion Rate"
          value={`${stats.conversion_rate}%`}
          sub="Lead → Enrolled"
          color="#10b981"
        />
        <StatCard
          icon={<Star size={20} />}
          label="Avg AI Score"
          value={stats.avg_score > 0 ? `${stats.avg_score}/100` : '—'}
          sub={getScoreLabel(stats.avg_score)}
          color={getScoreColor(stats.avg_score)}
        />
        <StatCard
          icon={<Target size={20} />}
          label="New This Week"
          value={stats.new_this_week.toLocaleString()}
          sub="Pending follow-up"
          color="#f97316"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly Trend */}
        <div className="card lg:col-span-2" style={{ padding: 24 }}>
          <h3 className="text-sm font-semibold mb-4">Lead Volume — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.weekly_trend} margin={{ left: -20 }}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={d => new Date(d).toLocaleDateString('en', { weekday: 'short' })} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelFormatter={d => new Date(d).toLocaleDateString()}
              />
              <Bar dataKey="count" fill="#6c63ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="card" style={{ padding: 24 }}>
          <h3 className="text-sm font-semibold mb-4">By Status</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                dataKey="value" paddingAngle={2}>
                {statusPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {statusPieData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Destinations */}
      <div className="card" style={{ padding: 24 }}>
        <h3 className="text-sm font-semibold mb-4">Top Study Destinations</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={destBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={100} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Bar dataKey="value" fill="#00e5ff" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: 20 }}>
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <QuickAction icon={<Zap size={14} />} label="Score All Unscored Leads" href="/leads?action=score" />
          <QuickAction icon={<Users size={14} />} label="View New Leads" href="/leads?status=new" />
          <QuickAction icon={<ArrowUpRight size={14} />} label="View Pipeline" href="/pipeline" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode, label: string, value: string, sub: string, color: string
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: color + '22', color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode, label: string, href: string }) {
  return (
    <a href={href} className="btn-secondary text-sm" style={{ textDecoration: 'none' }}>
      {icon}
      {label}
    </a>
  )
}
