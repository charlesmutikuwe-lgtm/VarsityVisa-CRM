// lib/constants.ts — Shared Varsity Visa CRM constants

import type { LeadStatus, StudyDestination } from '@/types'

export const DESTINATIONS: { value: StudyDestination; label: string; shortLabel: string; flag: string; popular?: boolean }[] = [
  { value: 'poland', label: '🇵🇱 Poland', shortLabel: 'Poland', flag: '🇵🇱', popular: true },
  { value: 'lithuania', label: '🇱🇹 Lithuania', shortLabel: 'Lithuania', flag: '🇱🇹', popular: true },
  { value: 'dubai_uae', label: '🇦🇪 Dubai / UAE', shortLabel: 'Dubai/UAE', flag: '🇦🇪', popular: true },
  { value: 'malaysia', label: '🇲🇾 Malaysia', shortLabel: 'Malaysia', flag: '🇲🇾', popular: true },
  { value: 'india', label: '🇮🇳 India', shortLabel: 'India', flag: '🇮🇳' },
  { value: 'romania', label: '🇷🇴 Romania', shortLabel: 'Romania', flag: '🇷🇴' },
  { value: 'hungary', label: '🇭🇺 Hungary', shortLabel: 'Hungary', flag: '🇭🇺' },
  { value: 'turkey', label: '🇹🇷 Turkey', shortLabel: 'Turkey', flag: '🇹🇷' },
  { value: 'georgia', label: '🇬🇪 Georgia', shortLabel: 'Georgia', flag: '🇬🇪' },
  { value: 'uk', label: '🇬🇧 United Kingdom', shortLabel: 'UK', flag: '🇬🇧' },
  { value: 'canada', label: '🇨🇦 Canada', shortLabel: 'Canada', flag: '🇨🇦' },
  { value: 'australia', label: '🇦🇺 Australia', shortLabel: 'Australia', flag: '🇦🇺' },
  { value: 'usa', label: '🇺🇸 United States', shortLabel: 'USA', flag: '🇺🇸' },
  { value: 'germany', label: '🇩🇪 Germany', shortLabel: 'Germany', flag: '🇩🇪' },
  { value: 'new_zealand', label: '🇳🇿 New Zealand', shortLabel: 'New Zealand', flag: '🇳🇿' },
  { value: 'south_africa', label: '🇿🇦 South Africa', shortLabel: 'South Africa', flag: '🇿🇦' },
  { value: 'other', label: '🌍 Other / Not Sure', shortLabel: 'Other', flag: '🌍' },
]

export const DESTINATION_FLAGS: Record<StudyDestination | string, string> = Object.fromEntries(
  DESTINATIONS.map(destination => [destination.value, destination.flag])
)

export const destinationLabel = (value: string | null | undefined) => {
  if (!value) return 'Not selected'
  const destination = DESTINATIONS.find(item => item.value === value)
  return destination ? `${destination.flag} ${destination.shortLabel}` : value.replace(/_/g, ' ').toUpperCase()
}

export const PIPELINE_STAGES: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New Leads', color: '#6c63ff' },
  { status: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { status: 'qualified', label: 'Qualified', color: '#8b5cf6' },
  { status: 'consultation_booked', label: 'Consultation', color: '#ec4899' },
  { status: 'application_started', label: 'Application', color: '#f97316' },
  { status: 'documents_pending', label: 'Docs Pending', color: '#f59e0b' },
  { status: 'documents_submitted', label: 'Docs Submitted', color: '#eab308' },
  { status: 'offer_received', label: 'Offer Received', color: '#14b8a6' },
  { status: 'fees_paid', label: 'Fees Paid', color: '#84cc16' },
  { status: 'visa_applied', label: 'Visa Applied', color: '#06b6d4' },
  { status: 'visa_approved', label: 'Visa Approved ✓', color: '#10b981' },
  { status: 'enrolled', label: 'Enrolled 🎓', color: '#22c55e' },
  { status: 'deferred', label: 'Deferred', color: '#a855f7' },
  { status: 'dropped_out', label: 'Dropped Out', color: '#ef4444' },
  { status: 'lost', label: 'Lost', color: '#64748b' },
]

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map(stage => [stage.status, stage.label])
)

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map(stage => [stage.status, stage.color])
)
