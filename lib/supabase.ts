// lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Lead, Note, Activity, AdminUser, DashboardStats } from '@/types'

// ── Client-side (use in components) ──────────────────────────
export const supabase = createClientComponentClient()

// ============================================================
// LEADS
// ============================================================

export async function getLeads(filters?: {
  status?: string
  assigned_to?: string
  search?: string
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('leads_with_score')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    )
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Lead[]
}

export async function getLeadById(id: string) {
  const { data, error } = await supabase
    .from('leads_with_score')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Lead
}

export async function createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single()

  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Lead
}

export async function updateLeadStatus(id: string, status: Lead['status']) {
  return updateLead(id, { status })
}

// ============================================================
// NOTES
// ============================================================

export async function getNotesByLead(leadId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*, profiles(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Note[]
}

export async function createNote(leadId: string, content: string, authorId: string) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ lead_id: leadId, content, author_id: authorId })
    .select()
    .single()

  if (error) throw error
  return data as Note
}

// ============================================================
// ACTIVITIES
// ============================================================

export async function getActivitiesByLead(leadId: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as Activity[]
}

export async function logActivity(
  leadId: string,
  type: Activity['type'],
  description: string,
  metadata?: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('activities')
    .insert({ lead_id: leadId, type, description, metadata })
    .select()
    .single()

  if (error) throw error
  return data as Activity
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('status, desired_destination, source, ai_score, created_at')

  if (error) throw error

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const total_leads = leads.length
  const new_this_week = leads.filter(l => new Date(l.created_at) > weekAgo).length
  const enrolled = leads.filter(l => l.status === 'enrolled').length
  const conversion_rate = total_leads > 0 ? Math.round((enrolled / total_leads) * 100) : 0
  const scoredLeads = leads.filter(l => l.ai_score !== null)
  const avg_score = scoredLeads.length > 0
    ? Math.round(scoredLeads.reduce((sum, l) => sum + l.ai_score!, 0) / scoredLeads.length)
    : 0

  const by_status = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const by_destination = leads.reduce((acc, l) => {
    acc[l.desired_destination] = (acc[l.desired_destination] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const by_source = leads.reduce((acc, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Weekly trend — last 7 days
  const weekly_trend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    return {
      date: dateStr,
      count: leads.filter(l => l.created_at.startsWith(dateStr)).length,
    }
  })

  return {
    total_leads,
    new_this_week,
    conversion_rate,
    avg_score,
    by_status,
    by_destination,
    by_source,
    weekly_trend,
  } as DashboardStats
}

// ============================================================
// STUDENTS / DOCUMENTS / PAYMENTS
// ============================================================

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDocumentsByLead(leadId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function upsertDocumentStatus(input: {
  lead_id: string
  student_id?: string | null
  document_type: string
  status: string
  file_url?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('documents')
    .upsert(input, { onConflict: 'lead_id,document_type' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPaymentsByLead(leadId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPayment(input: {
  lead_id: string
  student_id?: string | null
  purpose: string
  amount_due: number
  amount_paid?: number
  currency?: string
  status?: string
  payment_method?: string | null
  due_date?: string | null
  reference?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}
