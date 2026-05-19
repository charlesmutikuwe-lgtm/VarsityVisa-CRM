// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ruleBasedScore } from '@/lib/ai-scoring'
import type { StudyMatchFormData } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: StudyMatchFormData = await req.json()

    const normalizedEmail = body.email?.toLowerCase().trim()
    const normalizedPhone = body.phone?.replace(/[\s-]/g, '').trim()
    const hasFullName = body.full_name?.trim().split(/\s+/).length >= 2
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail || '')
    const isValidPhone = /^(\+?263|0)?7[1378]\d{7}$/.test(normalizedPhone || '') || (normalizedPhone || '').replace(/\D/g, '').length >= 9

    // Validate required fields with realistic lead-capture hygiene.
    if (!hasFullName || !isValidEmail || !isValidPhone || !body.desired_destination || !body.study_level || !body.field_of_study) {
      return NextResponse.json({ error: 'Please provide a valid full name, email, phone number, destination, level and field of study.' }, { status: 400 })
    }

    // Check for duplicate email
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'A lead with this email already exists', existing_id: existing.id },
        { status: 409 }
      )
    }

    // Run rule-based pre-score immediately
    const scoreBreakdown = ruleBasedScore(body)

    const leadData = {
      full_name: body.full_name,
      email: normalizedEmail,
      phone: normalizedPhone,
      city: body.city || 'Harare',
      country: 'Zimbabwe',
      desired_destination: body.desired_destination,
      study_level: body.study_level,
      field_of_study: body.field_of_study,
      intended_start_date: body.intended_start_date,
      budget_range: body.budget_range,
      status: 'new' as const,
      source: 'study_match' as const,
      whatsapp_opt_in: body.whatsapp_opt_in || false,
      whatsapp_number: body.whatsapp_opt_in ? normalizedPhone : null,
      passport_uploaded: body.has_passport || false,
      english_test_uploaded: body.has_english_test || false,
      // Store rule-based score immediately; AI score added async
      ai_score: scoreBreakdown.total,
      ai_score_breakdown: scoreBreakdown,
      ai_summary: `Initial rule-based score: ${scoreBreakdown.total}/100. ${scoreBreakdown.reasoning}`,
      ai_scored_at: new Date().toISOString(),
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (error) {
      console.error('Lead insert error:', error)
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }

    // Trigger async AI scoring (fire and forget)
    triggerAIScore(lead.id).catch(console.error)

    return NextResponse.json({ success: true, lead_id: lead.id, score: scoreBreakdown.total }, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')?.replace(/[,%]/g, '').trim()
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabaseAdmin
    .from('leads_with_score')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ leads: data })
}

// Trigger full AI score in background
async function triggerAIScore(leadId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await fetch(`${baseUrl}/api/ai-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
    body: JSON.stringify({ lead_id: leadId }),
  })
}
