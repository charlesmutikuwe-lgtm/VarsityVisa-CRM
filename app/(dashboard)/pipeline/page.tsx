'use client'
// app/(dashboard)/pipeline/page.tsx
import { useEffect, useState } from 'react'
import { getLeads, updateLeadStatus } from '@/lib/supabase'
import { getScoreColor } from '@/lib/ai-scoring'
import { MessageSquare, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { Lead, LeadStatus } from '@/types'
import { PIPELINE_STAGES, DESTINATION_FLAGS } from '@/lib/constants'

const COLUMNS = PIPELINE_STAGES.filter(stage => !['lost', 'dropped_out', 'deferred'].includes(stage.status))
export default function PipelinePage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null)

  useEffect(() => {
    getLeads({ limit: 200 })
      .then(setLeads)
      .finally(() => setLoading(false))
  }, [])

  const getColumnLeads = (status: LeadStatus) =>
    leads.filter(l => l.status === status).sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))

  const handleDragStart = (leadId: string) => setDragging(leadId)
  const handleDragEnd = () => { setDragging(null); setDragOver(null) }
  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    setDragOver(status)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()
    if (!dragging) return

    const oldLead = leads.find(l => l.id === dragging)
    if (!oldLead || oldLead.status === newStatus) { handleDragEnd(); return }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, status: newStatus } : l))
    handleDragEnd()

    try {
      await updateLeadStatus(dragging, newStatus)
      toast.success(`Moved to ${newStatus.replace(/_/g, ' ')}`)
    } catch {
      // Revert on error
      setLeads(prev => prev.map(l => l.id === dragging ? { ...l, status: oldLead.status } : l))
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>
      Loading pipeline…
    </div>
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Pipeline</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Drag and drop leads between stages
          </p>
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {leads.filter(l => l.status !== 'lost').length} active leads
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colLeads = getColumnLeads(col.status)
          const isDragTarget = dragOver === col.status
          return (
            <div
              key={col.status}
              className="pipeline-col"
              onDragOver={e => handleDragOver(e, col.status)}
              onDrop={e => handleDrop(e, col.status)}
              onDragLeave={() => setDragOver(null)}
              style={{
                borderColor: isDragTarget ? col.color + '88' : 'var(--border-subtle)',
                background: isDragTarget ? col.color + '08' : 'var(--surface-1)',
              }}>

              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-xs font-semibold">{col.label}</span>
                </div>
                <span className="text-xs rounded-full px-2 py-0.5 font-mono"
                  style={{ background: col.color + '22', color: col.color }}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    Drop here
                  </div>
                ) : (
                  colLeads.map(lead => (
                    <PipelineCard
                      key={lead.id}
                      lead={lead}
                      color={col.color}
                      isDragging={dragging === lead.id}
                      onDragStart={() => handleDragStart(lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PipelineCard({
  lead, color, isDragging, onDragStart, onDragEnd, onClick
}: {
  lead: Lead
  color: string
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const num = (lead.whatsapp_number || lead.phone).replace(/\D/g, '')
    window.open(`https://wa.me/${num}`, '_blank')
  }

  const docsCount = [
    lead.passport_uploaded, lead.transcripts_uploaded,
    lead.english_test_uploaded, lead.financial_docs_uploaded
  ].filter(Boolean).length

  return (
    <div
      className="lead-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1 }}>

      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{lead.full_name}</div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {DESTINATION_FLAGS[lead.desired_destination] || '🌍'} {lead.desired_destination?.replace(/_/g, ' ').toUpperCase()} · {lead.study_level}
          </div>
        </div>
        <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'grab' }} />
      </div>

      {/* Score + docs row */}
      <div className="flex items-center justify-between mt-2">
        {lead.ai_score !== null ? (
          <span className="score-badge"
            style={{ background: getScoreColor(lead.ai_score) + '22', color: getScoreColor(lead.ai_score) }}>
            {lead.ai_score}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No score</span>
        )}

        <div className="flex items-center gap-2">
          {/* Docs indicator */}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            📄 {docsCount}/4
          </span>

          {/* WhatsApp button */}
          {(lead.whatsapp_opt_in || lead.phone) && (
            <button onClick={openWhatsApp}
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{ background: '#25d36622', color: '#25d366', border: 'none', cursor: 'pointer' }}>
              <MessageSquare size={11} />
            </button>
          )}
        </div>
      </div>

      {/* AI summary snippet */}
      {lead.ai_summary && (
        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {lead.ai_summary}
        </p>
      )}
    </div>
  )
}
