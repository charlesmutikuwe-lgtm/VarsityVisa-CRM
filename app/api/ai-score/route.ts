// app/api/ai-score/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { aiScoreLead } from '@/lib/ai-scoring'

export async function POST(req: NextRequest) {
  // Validate internal key
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { lead_id } = await req.json()
    if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { score, breakdown, summary } = await aiScoreLead(lead)

    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        ai_score: score,
        ai_score_breakdown: breakdown,
        ai_summary: summary,
        ai_scored_at: new Date().toISOString(),
      })
      .eq('id', lead_id)

    if (updateError) throw updateError

    // Log activity
    await supabaseAdmin.from('activities').insert({
      lead_id,
      type: 'score_updated',
      description: `AI score updated to ${score}/100`,
      metadata: { score, breakdown },
    })

    return NextResponse.json({ success: true, score, summary })
  } catch (err) {
    console.error('AI score error:', err)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}

// Bulk re-score all unscored leads
export async function PUT(req: NextRequest) {
  const internalKey = req.headers.get('x-internal-key')
  if (internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('*')
    .is('ai_scored_at', null)
    .limit(50)

  if (!leads || leads.length === 0) {
    return NextResponse.json({ message: 'No unscored leads found' })
  }

  let scored = 0
  for (const lead of leads) {
    try {
      const { score, breakdown, summary } = await aiScoreLead(lead)
      await supabaseAdmin
        .from('leads')
        .update({ ai_score: score, ai_score_breakdown: breakdown, ai_summary: summary, ai_scored_at: new Date().toISOString() })
        .eq('id', lead.id)
      scored++
    } catch (err) {
      console.error(`Failed to score lead ${lead.id}:`, err)
    }
  }

  return NextResponse.json({ scored, total: leads.length })
}
