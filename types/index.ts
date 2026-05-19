// types/index.ts — Varsity Visa CRM Type Definitions

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'consultation_booked'
  | 'application_started'
  | 'documents_pending'
  | 'documents_submitted'
  | 'offer_received'
  | 'fees_paid'
  | 'visa_applied'
  | 'visa_approved'
  | 'enrolled'
  | 'deferred'
  | 'dropped_out'
  | 'lost';

export type LeadSource =
  | 'website'
  | 'smart_major'
  | 'study_match'
  | 'whatsapp'
  | 'referral'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'social_media'
  | 'walk_in'
  | 'phone'
  | 'email'
  | 'google_sheet_import'
  | 'other';

export type StudyDestination =
  | 'poland'
  | 'lithuania'
  | 'dubai_uae'
  | 'malaysia'
  | 'india'
  | 'romania'
  | 'hungary'
  | 'turkey'
  | 'georgia'
  | 'uk'
  | 'canada'
  | 'australia'
  | 'usa'
  | 'germany'
  | 'new_zealand'
  | 'south_africa'
  | 'other';

export type StudyLevel =
  | 'undergraduate'
  | 'postgraduate'
  | 'phd'
  | 'diploma'
  | 'short_course'
  | 'language';

export type BudgetRange =
  | 'under_2k'
  | '2k_5k'
  | 'under_5k'
  | '5k_10k'
  | '10k_20k'
  | '20k_30k'
  | 'over_30k'
  | 'scholarship_only';

export type DocumentType =
  | 'passport'
  | 'academic_certificate'
  | 'transcript'
  | 'english_test'
  | 'cv'
  | 'motivation_letter'
  | 'proof_of_funds'
  | 'sponsor_letter'
  | 'police_clearance'
  | 'medical'
  | 'visa_form'
  | 'other';

export type DocumentStatus = 'missing' | 'requested' | 'uploaded' | 'verified' | 'rejected' | 'expired';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded' | 'cancelled';
export type PaymentPurpose = 'consultation_fee' | 'agent_fee' | 'application_fee' | 'tuition_deposit' | 'visa_fee' | 'other';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;

  // Personal Info
  full_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;

  // Study Preferences
  desired_destination: StudyDestination;
  study_level: StudyLevel;
  field_of_study: string;
  intended_start_date: string;
  budget_range: BudgetRange;

  // Pipeline
  status: LeadStatus;
  source: LeadSource;
  assigned_to: string | null;

  // AI Scoring
  ai_score: number | null;          // 0–100
  ai_score_breakdown: ScoreBreakdown | null;
  ai_summary: string | null;
  ai_scored_at: string | null;

  // Engagement
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;

  // WhatsApp
  whatsapp_number: string | null;
  whatsapp_opt_in: boolean;
  last_whatsapp_at: string | null;

  // Legacy quick document flags. Full tracking lives in the documents table.
  passport_uploaded: boolean;
  transcripts_uploaded: boolean;
  english_test_uploaded: boolean;
  financial_docs_uploaded: boolean;
}

export interface Student {
  id: string;
  lead_id: string;
  student_number: string | null;
  full_name: string;
  destination: StudyDestination;
  institution_name: string | null;
  programme_name: string | null;
  intake: string | null;
  stage: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentDocument {
  id: string;
  lead_id: string;
  student_id: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  file_url: string | null;
  notes: string | null;
  requested_at: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  expires_at: string | null;
}

export interface Payment {
  id: string;
  lead_id: string;
  student_id: string | null;
  purpose: PaymentPurpose;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  due_date: string | null;
  paid_at: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreBreakdown {
  budget_fit: number;       // 0–25
  timeline_urgency: number; // 0–25
  document_readiness: number; // 0–25
  engagement_level: number; // 0–25
  total: number;
  reasoning: string;
}

export interface Note {
  id: string;
  lead_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  type: 'status_change' | 'note_added' | 'email_sent' | 'whatsapp_sent' | 'call_logged' | 'document_uploaded' | 'payment_logged' | 'follow_up_scheduled' | 'score_updated';
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent' | 'viewer';
  avatar_url: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_leads: number;
  new_this_week: number;
  conversion_rate: number;
  avg_score: number;
  by_status: Record<LeadStatus, number>;
  by_destination: Record<StudyDestination, number>;
  by_source: Record<LeadSource, number>;
  weekly_trend: { date: string; count: number }[];
}

export interface StudyMatchFormData {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  desired_destination: StudyDestination;
  study_level: StudyLevel;
  field_of_study: string;
  intended_start_date: string;
  budget_range: BudgetRange;
  has_passport: boolean;
  has_english_test: boolean;
  whatsapp_opt_in: boolean;
}
