// lib/ai-scoring.ts — Varsity Visa AI Lead Scoring Engine

import type { Lead, ScoreBreakdown } from '@/types'

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
// SCORING WRAPPER — rule-based only, no paid API required
// ============================================================

export async function aiScoreLead(lead: Lead): Promise<{
  score: number
  breakdown: ScoreBreakdown
  summary: string
}> {
  const ruleScore = ruleBasedScore(lead)
  return {
    score: ruleScore.total,
    breakdown: ruleScore,
    summary: `Scored ${ruleScore.total}/100 using Varsity Visa rule-based qualification. ${ruleScore.reasoning}`,
  }
}

export async function batchScoreLeads(leads: Lead[]): Promise<void> {
  await Promise.all(leads.map(lead => aiScoreLead(lead)))
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
