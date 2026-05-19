'use client'
// app/(dashboard)/leads/page.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getLeads, updateLeadStatus } from '@/lib/supabase'
import { getScoreColor, getScoreLabel } from '@/lib/ai-scoring'
import { Search, Filter, Download, RefreshCw, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Lead, LeadStatus } from '@/types'
import { PIPELINE_STAGES, STATUS_COLORS, DESTINATION_FLAGS } from '@/lib/constants'
import { format } from 'date-fns'

const STATUSES: { value: LeadStatus | 'all', label: string }[] = [
  { value: 'all', label: 'All Leads' },
  ...PIPELINE_STAGES.map(stage => ({ value: stage.status, label: stage.label })),
]
export default function LeadsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState<'created_at' | 'ai_score'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLeads({ status: status === 'all' ? undefined : status, search })
      setLeads(data)
    } catch (err) {
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    const timer = setTimeout(loadLeads, search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [loadLeads])

  const sorted = [...leads].sort((a, b) => {
    const va = (a as any)[sortBy] ?? 0
    const vb = (b as any)[sortBy] ?? 0
    return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1)
  })

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await updateLeadStatus(leadId, newStatus)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const openWhatsApp = (lead: Lead) => {
    const num = (lead.whatsapp_number || lead.phone).replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Leads</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {leads.length} lead{leads.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadLeads} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px 12px' }}>
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            style={{ paddingLeft: 34 }}
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-base"
          style={{ width: 'auto', minWidth: 140 }}
          value={status}
          onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map(s => {
          const count = s.value === 'all' ? leads.length : leads.filter(l => l.status === s.value).length
          return (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: status === s.value ? (STATUS_COLORS[s.value] || 'var(--brand-primary)') + '22' : 'var(--surface-2)',
                color: status === s.value ? (STATUS_COLORS[s.value] || 'var(--brand-primary)') : 'var(--text-secondary)',
                border: `1px solid ${status === s.value ? (STATUS_COLORS[s.value] || 'var(--brand-primary)') + '44' : 'var(--border-subtle)'}`,
              }}>
              {s.label}
              {count > 0 && (
                <span className="text-xs rounded-full px-1.5 py-0.5" style={{
                  background: 'rgba(255,255,255,0.08)', fontSize: 10
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading leads…
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No leads found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {[
                    { label: 'Name', key: null },
                    { label: 'Destination', key: null },
                    { label: 'Status', key: null },
                    { label: 'AI Score', key: 'ai_score' },
                    { label: 'Date', key: 'created_at' },
                    { label: 'Actions', key: null },
                  ].map(col => (
                    <th key={col.label}
                      onClick={() => col.key && handleSort(col.key as any)}
                      style={{
                        padding: '12px 16px', textAlign: 'left', fontWeight: 500,
                        color: 'var(--text-muted)', cursor: col.key ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.key === sortBy && (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((lead, i) => (
                  <tr key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                    {/* Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div className="font-medium">{lead.full_name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.email}</div>
                    </td>

                    {/* Destination */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {DESTINATION_FLAGS[lead.desired_destination] || '🌍'} {lead.desired_destination?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={lead.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{
                          background: STATUS_COLORS[lead.status] + '22',
                          color: STATUS_COLORS[lead.status],
                          border: `1px solid ${STATUS_COLORS[lead.status]}44`,
                          cursor: 'pointer',
                        }}>
                        {STATUSES.filter(s => s.value !== 'all').map(s => (
                          <option key={s.value} value={s.value}
                            style={{ background: '#1a1a2e', color: 'white' }}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* AI Score */}
                    <td style={{ padding: '12px 16px' }}>
                      {lead.ai_score !== null ? (
                        <span className="score-badge"
                          style={{ background: getScoreColor(lead.ai_score) + '22', color: getScoreColor(lead.ai_score) }}>
                          {lead.ai_score}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                      {format(new Date(lead.created_at), 'dd MMM yyyy')}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); openWhatsApp(lead) }}
                        className="btn-whatsapp"
                        style={{ padding: '5px 10px', fontSize: 12 }}>
                        <MessageSquare size={12} />
                        WA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
