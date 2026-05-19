'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getLeadById, getActivitiesByLead, getDocumentsByLead, getPaymentsByLead } from '@/lib/supabase'
import { destinationLabel, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import { getScoreColor, getScoreLabel } from '@/lib/ai-scoring'
import type { Lead } from '@/types'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const idParam = params?.id
    const id = Array.isArray(idParam) ? idParam[0] : idParam
    if (!id) return
    Promise.all([
      getLeadById(id),
      getActivitiesByLead(id).catch(() => []),
      getDocumentsByLead(id).catch(() => []),
      getPaymentsByLead(id).catch(() => []),
    ])
      .then(([leadData, activityData, documentData, paymentData]) => {
        setLead(leadData)
        setActivities(activityData || [])
        setDocuments(documentData || [])
        setPayments(paymentData || [])
      })
      .finally(() => setLoading(false))
  }, [params?.id])

  if (loading) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading lead…</div>
  if (!lead) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Lead not found.</div>

  const statusColor = STATUS_COLORS[lead.status] || 'var(--brand-primary)'
  const phone = (lead.whatsapp_number || lead.phone || '').replace(/\D/g, '')

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => router.back()} className="btn-secondary text-sm">← Back</button>

      <div className="card" style={{ padding: 24 }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{lead.full_name}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{lead.email} · {lead.phone}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{lead.city}, {lead.country}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: statusColor + '22', color: statusColor }}>
              {STATUS_LABELS[lead.status] || lead.status}
            </span>
            {phone && (
              <a href={`https://wa.me/${phone}`} target="_blank" className="btn-whatsapp text-xs" style={{ textDecoration: 'none' }}>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Study Profile</h3>
          <Info label="Destination" value={destinationLabel(lead.desired_destination)} />
          <Info label="Level" value={lead.study_level.replace(/_/g, ' ')} />
          <Info label="Field" value={lead.field_of_study} />
          <Info label="Start" value={lead.intended_start_date || 'Not set'} />
          <Info label="Budget" value={lead.budget_range.replace(/_/g, ' ')} />
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Lead Score</h3>
          <div className="text-3xl font-bold" style={{ color: getScoreColor(lead.ai_score) }}>{lead.ai_score ?? '—'}</div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{getScoreLabel(lead.ai_score)}</p>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{lead.ai_summary || 'No score summary yet.'}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Documents</h3>
          {documents.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No detailed document records yet.</p>
          ) : documents.slice(0, 5).map(doc => (
            <Info key={doc.id} label={String(doc.document_type).replace(/_/g, ' ')} value={doc.status} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Payments</h3>
          {payments.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No payments recorded yet.</p> : payments.map(payment => (
            <Info key={payment.id} label={payment.purpose} value={`${payment.currency} ${payment.amount_paid || 0}/${payment.amount_due || 0} · ${payment.status}`} />
          ))}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          {activities.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet.</p> : activities.slice(0, 8).map(activity => (
            <p key={activity.id} className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{activity.description}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-right capitalize">{value}</span>
    </div>
  )
}
