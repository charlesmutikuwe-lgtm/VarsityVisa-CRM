// lib/ai-scoring.ts — Varsity Visa AI Lead Scoring Engine

import type { Lead, ScoreBreakdown } from '@/types'
import { destinationLabel } from '@/lib/constants'

// ============================================================
// RULE-BASED PRE-SCORE (fast, no API call)
// Runs synchronously before AI scoring
// ============================================================

export function ruleBasedScore(lead: Partial<Lead>): ScoreBreakdown {
  let budget_fit = 0
  let timeline_urgency = 0
  let document_readiness = 0
  let engagement_level = 0

  // ── Budget Fit (0–25) ─────────────────────────────────────
  const baseBudgetScores: Record<string, number> = {
    over_30k: 25,
    '20k_30k': 22,
    '10k_20k': 18,
    '5k_10k': 14,
    '2k_5k': 10,
    under_5k: 8,
    under_2k: 4,
    scholarship_only: 6,
  }
  budget_fit = baseBudgetScores[lead.budget_range || ''] || 0

  // Zimbabwe-specific destination affordability adjustment.
  // Lower-cost destinations should not be punished the same way as UK/Canada/Australia.
  const affordableDestinations = ['india', 'malaysia', 'poland', 'lithuania', 'romania', 'turkey', 'georgia', 'dubai_uae']
  if (affordableDestinations.includes(lead.desired_destination || '') && ['2k_5k', 'under_5k', '5k_10k'].includes(lead.budget_range || '')) {
    budget_fit = Math.min(25, budget_fit + 6)
  }
  if (['uk', 'canada', 'australia', 'usa'].includes(lead.desired_destination || '') && ['under_2k', '2k_5k', 'scholarship_only'].includes(lead.budget_range || '')) {
    budget_fit = Math.max(0, budget_fit - 4)
  }

  // ── Timeline Urgency (0–25) ───────────────────────────────
  const dateStr = lead.intended_start_date
  if (dateStr) {
    const months = getMonthsUntil(dateStr)
    if (months <= 3) timeline_urgency = 25       // applying now
    else if (months <= 6) timeline_urgency = 20
    else if (months <= 12) timeline_urgency = 14
    else if (months <= 18) timeline_urgency = 8
    else timeline_urgency = 3
  }

  // ── Document Readiness (0–25) ─────────────────────────────
  const docs = [
    lead.passport_uploaded,
    lead.transcripts_uploaded,
    lead.english_test_uploaded,
    lead.financial_docs_uploaded,
  ]
  const uploadedCount = docs.filter(Boolean).length
  document_readiness = Math.round((uploadedCount / 4) * 25)

  // ── Engagement Level (0–25) ───────────────────────────────
  if (lead.whatsapp_opt_in) engagement_level += 10
  if (lead.last_contacted_at) engagement_level += 5
  if (lead.last_whatsapp_at) engagement_level += 5
  if (lead.source === 'referral') engagement_level += 5
  engagement_level = Math.min(25, engagement_level)

  const total = budget_fit + timeline_urgency + document_readiness + engagement_level

  return {
    budget_fit,
    timeline_urgency,
    document_readiness,
    engagement_level,
    total,
    reasoning: generateRuleReasoning({ budget_fit, timeline_urgency, document_readiness, engagement_level }),
  }
}

function generateRuleReasoning(breakdown: Omit<ScoreBreakdown, 'total' | 'reasoning'>): string {
  const parts: string[] = []

  if (breakdown.budget_fit >= 20) parts.push('strong budget alignment')
  else if (breakdown.budget_fit <= 8) parts.push('budget may be limiting')

  if (breakdown.timeline_urgency >= 20) parts.push('urgent timeline (high conversion potential)')
  else if (breakdown.timeline_urgency <= 5) parts.push('distant timeline (nurture sequence recommended)')

  if (breakdown.document_readiness >= 20) parts.push('documents largely ready')
  else if (breakdown.document_readiness === 0) parts.push('no documents uploaded yet')

  if (breakdown.engagement_level >= 15) parts.push('highly engaged')
  else if (breakdown.engagement_level <= 5) parts.push('low engagement so far')

  return parts.length > 0 ? parts.join('; ') + '.' : 'Initial assessment pending.'
}

// ============================================================
// AI SCORING (calls GPT-4o for deep analysis)
// ============================================================

export async function aiScoreLead(lead: Lead): Promise<{
  score: number
  breakdown: ScoreBreakdown
  summary: string
}> {
  const ruleScore = ruleBasedScore(lead)

  const prompt = `You are an expert student visa consultant for Varsity Visa, a Zimbabwean consultancy specializing in international study placements.

Analyze this student lead and provide a lead quality score from 0–100.

## Lead Data:
- Name: ${lead.full_name}
- City: ${lead.city}, ${lead.country}
- Destination: ${destinationLabel(lead.desired_destination)}
- Study Level: ${lead.study_level}
- Field: ${lead.field_of_study}
- Start Date: ${lead.intended_start_date || 'Not specified'}
- Budget: ${formatBudget(lead.budget_range)}
- Source: ${lead.source}
- Documents: Passport=${lead.passport_uploaded}, Transcripts=${lead.transcripts_uploaded}, English Test=${lead.english_test_uploaded}, Financial=${lead.financial_docs_uploaded}
- WhatsApp Opt-in: ${lead.whatsapp_opt_in}
- Rule-based pre-score: ${ruleScore.total}/100

## Context:
- Varsity Visa frequently places Zimbabwean students into Poland, Lithuania, Dubai/UAE, Malaysia, India, Romania, Hungary, Turkey and Georgia, plus premium destinations such as the UK, Canada, Australia and USA.
- Common barriers: passport delays, document legalization, financial proof, visa refusals, limited budgets, delayed agent-fee payments and unrealistic scholarship expectations.
- Low-budget leads can still be viable for India, Malaysia, Poland, Lithuania, Romania, Turkey, Georgia and selected Dubai/UAE scholarship routes.
- Referral leads and WhatsApp opt-ins usually convert faster than cold website leads.
- Students starting within 3–6 months are urgent, but may need strong document readiness to remain viable.

## Your Task:
Return ONLY a JSON object (no markdown, no explanation outside JSON):
{
  "score": <0–100 integer>,
  "budget_fit": <0–25>,
  "timeline_urgency": <0–25>,
  "document_readiness": <0–25>,
  "engagement_level": <0–25>,
  "summary": "<2–3 sentence consultant's assessment of this lead>",
  "recommended_action": "<specific next step for the agent>",
  "risk_flags": ["<any concerns>"]
}`

  try {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    })

    const raw = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const breakdown: ScoreBreakdown = {
      budget_fit: parsed.budget_fit ?? ruleScore.budget_fit,
      timeline_urgency: parsed.timeline_urgency ?? ruleScore.timeline_urgency,
      document_readiness: parsed.document_readiness ?? ruleScore.document_readiness,
      engagement_level: parsed.engagement_level ?? ruleScore.engagement_level,
      total: parsed.score ?? ruleScore.total,
      reasoning: parsed.recommended_action || ruleScore.reasoning,
    }

    return {
      score: Math.min(100, Math.max(0, parsed.score ?? ruleScore.total)),
      breakdown,
      summary: parsed.summary || `Lead scored ${ruleScore.total}/100 via rule-based analysis.`,
    }
  } catch (err) {
    console.error('AI scoring failed, falling back to rule-based:', err)
    return {
      score: ruleScore.total,
      breakdown: ruleScore,
      summary: `Scored ${ruleScore.total}/100. ${ruleScore.reasoning}`,
    }
  }
}

// ============================================================
// BATCH SCORING (for unscored leads)
// ============================================================

export async function batchScoreLeads(leads: Lead[]): Promise<void> {
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize)
    await Promise.allSettled(
      batch.map(lead => aiScoreLead(lead))
    )
    if (i + batchSize < leads.length) {
      await new Promise(r => setTimeout(r, 1000)) // 1s delay between batches
    }
  }
}

// ============================================================
// SCORE LABEL HELPERS
// ============================================================

export function getScoreLabel(score: number | null): string {
  if (score === null) return 'Not scored'
  if (score >= 80) return 'Hot 🔥'
  if (score >= 60) return 'Warm ✨'
  if (score >= 40) return 'Cool 🌤'
  return 'Cold ❄️'
}

export function getScoreColor(score: number | null): string {
  if (score === null) return '#94a3b8'
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f97316'
  if (score >= 40) return '#eab308'
  return '#60a5fa'
}

// ============================================================
// HELPERS
// ============================================================

function getMonthsUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()))
}

function formatBudget(budget: string | undefined): string {
  const labels: Record<string, string> = {
    under_2k: 'Under $2,000/yr',
    '2k_5k': '$2,000–$5,000/yr',
    under_5k: 'Under $5,000/yr',
    '5k_10k': '$5,000–$10,000/yr',
    '10k_20k': '$10,000–$20,000/yr',
    '20k_30k': '$20,000–$30,000/yr',
    over_30k: 'Over $30,000/yr',
    scholarship_only: 'Scholarship Only',
  }
  return labels[budget || ''] || 'Not specified'
}
