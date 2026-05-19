-- ============================================================
-- Varsity Visa CRM — Initial Database Schema
-- Run this in your Supabase SQL editor for a fresh install.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'consultation_booked',
  'application_started',
  'documents_pending',
  'documents_submitted',
  'offer_received',
  'fees_paid',
  'visa_applied',
  'visa_approved',
  'enrolled',
  'deferred',
  'dropped_out',
  'lost'
);

CREATE TYPE lead_source AS ENUM (
  'website',
  'smart_major',
  'study_match',
  'whatsapp',
  'referral',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'social_media',
  'walk_in',
  'phone',
  'email',
  'google_sheet_import',
  'other'
);

CREATE TYPE study_destination AS ENUM (
  'poland', 'lithuania', 'dubai_uae', 'malaysia', 'india',
  'romania', 'hungary', 'turkey', 'georgia',
  'uk', 'canada', 'australia', 'usa', 'germany',
  'new_zealand', 'south_africa', 'other'
);

CREATE TYPE study_level AS ENUM (
  'undergraduate', 'postgraduate', 'phd',
  'diploma', 'short_course', 'language'
);

CREATE TYPE budget_range AS ENUM (
  'under_2k', '2k_5k', 'under_5k', '5k_10k', '10k_20k',
  '20k_30k', 'over_30k', 'scholarship_only'
);

CREATE TYPE user_role AS ENUM ('admin', 'agent', 'viewer');

CREATE TYPE activity_type AS ENUM (
  'status_change', 'note_added', 'email_sent',
  'whatsapp_sent', 'call_logged', 'document_uploaded',
  'payment_logged', 'follow_up_scheduled', 'score_updated'
);

CREATE TYPE document_type AS ENUM (
  'passport', 'academic_certificate', 'transcript', 'english_test',
  'cv', 'motivation_letter', 'proof_of_funds', 'sponsor_letter',
  'police_clearance', 'medical', 'visa_form', 'other'
);

CREATE TYPE document_status AS ENUM (
  'missing', 'requested', 'uploaded', 'verified', 'rejected', 'expired'
);

CREATE TYPE payment_purpose AS ENUM (
  'consultation_fee', 'agent_fee', 'application_fee', 'tuition_deposit', 'visa_fee', 'other'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'partial', 'paid', 'overdue', 'refunded', 'cancelled'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'agent',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- LEADS: marketing + pre-application pipeline
-- ============================================================

CREATE TABLE public.leads (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  full_name               TEXT NOT NULL CHECK (length(trim(full_name)) >= 3),
  email                   TEXT NOT NULL CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  phone                   TEXT NOT NULL CHECK (length(regexp_replace(phone, '\D', '', 'g')) >= 9),
  city                    TEXT NOT NULL DEFAULT 'Harare',
  country                 TEXT NOT NULL DEFAULT 'Zimbabwe',

  desired_destination     study_destination NOT NULL,
  study_level             study_level NOT NULL,
  field_of_study          TEXT NOT NULL,
  intended_start_date     TEXT,
  budget_range            budget_range NOT NULL,

  status                  lead_status NOT NULL DEFAULT 'new',
  source                  lead_source NOT NULL DEFAULT 'study_match',
  assigned_to             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  ai_score                SMALLINT CHECK (ai_score BETWEEN 0 AND 100),
  ai_score_breakdown      JSONB,
  ai_summary              TEXT,
  ai_scored_at            TIMESTAMPTZ,

  last_contacted_at       TIMESTAMPTZ,
  next_follow_up_at       TIMESTAMPTZ,
  notes                   TEXT,

  whatsapp_number         TEXT,
  whatsapp_opt_in         BOOLEAN NOT NULL DEFAULT FALSE,
  last_whatsapp_at        TIMESTAMPTZ,

  -- Legacy quick flags retained for dashboard speed. Detailed tracking lives in documents.
  passport_uploaded       BOOLEAN NOT NULL DEFAULT FALSE,
  transcripts_uploaded    BOOLEAN NOT NULL DEFAULT FALSE,
  english_test_uploaded   BOOLEAN NOT NULL DEFAULT FALSE,
  financial_docs_uploaded BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert leads via form"
  ON public.leads FOR INSERT
  WITH CHECK (true);

CREATE UNIQUE INDEX leads_email_unique_idx ON public.leads (lower(email));
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_destination_idx ON public.leads(desired_destination);
CREATE INDEX leads_source_idx ON public.leads(source);
CREATE INDEX leads_follow_up_idx ON public.leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX leads_assigned_idx ON public.leads(assigned_to);
CREATE INDEX leads_score_idx ON public.leads(ai_score DESC);
CREATE INDEX leads_created_idx ON public.leads(created_at DESC);
CREATE INDEX leads_search_idx ON public.leads USING GIN (to_tsvector('english', full_name || ' ' || email || ' ' || phone));

-- ============================================================
-- STUDENTS: operational record after a lead becomes an active client
-- ============================================================

CREATE TABLE public.students (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id           UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  student_number    TEXT UNIQUE,
  full_name         TEXT NOT NULL,
  destination       study_destination NOT NULL,
  institution_name  TEXT,
  programme_name    TEXT,
  intake            TEXT,
  stage             lead_status NOT NULL DEFAULT 'application_started',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage students"
  ON public.students FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX students_lead_idx ON public.students(lead_id);
CREATE INDEX students_stage_idx ON public.students(stage);

-- ============================================================
-- DOCUMENTS: scalable document tracking, verification and expiry
-- ============================================================

CREATE TABLE public.documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id        UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  student_id     UUID REFERENCES public.students(id) ON DELETE CASCADE,
  document_type  document_type NOT NULL,
  status         document_status NOT NULL DEFAULT 'requested',
  file_url       TEXT,
  notes          TEXT,
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at    TIMESTAMPTZ,
  verified_at    TIMESTAMPTZ,
  expires_at     DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, document_type)
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage documents"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX documents_lead_idx ON public.documents(lead_id);
CREATE INDEX documents_status_idx ON public.documents(status);
CREATE INDEX documents_expiry_idx ON public.documents(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- PAYMENTS: agent fee, consultation fee and other payment tracking
-- ============================================================

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES public.students(id) ON DELETE CASCADE,
  purpose         payment_purpose NOT NULL DEFAULT 'agent_fee',
  amount_due      NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          payment_status NOT NULL DEFAULT 'pending',
  payment_method  TEXT,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  reference       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_due >= 0),
  CHECK (amount_paid >= 0)
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX payments_lead_idx ON public.payments(lead_id);
CREATE INDEX payments_status_idx ON public.payments(status);
CREATE INDEX payments_due_idx ON public.payments(due_date) WHERE due_date IS NOT NULL;

-- ============================================================
-- NOTES
-- ============================================================

CREATE TABLE public.notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage notes"
  ON public.notes FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE INDEX notes_lead_idx ON public.notes(lead_id);

-- ============================================================
-- ACTIVITIES (audit log)
-- ============================================================

CREATE TABLE public.activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type         activity_type NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view activities"
  ON public.activities FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert activities"
  ON public.activities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE INDEX activities_lead_idx ON public.activities(lead_id, created_at DESC);

-- ============================================================
-- COMMUNICATIONS / WHATSAPP LOGS
-- ============================================================

CREATE TABLE public.whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id       UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_body  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  provider      TEXT NOT NULL DEFAULT 'placeholder',
  provider_id   TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
CREATE INDEX whatsapp_lead_idx ON public.whatsapp_messages(lead_id, sent_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'agent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activities (lead_id, type, description, metadata)
    VALUES (
      NEW.id,
      'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lead_status_change_log
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

CREATE OR REPLACE FUNCTION create_student_from_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('application_started', 'documents_pending', 'documents_submitted', 'offer_received', 'fees_paid', 'visa_applied', 'visa_approved', 'enrolled')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.students (lead_id, full_name, destination, intake, stage)
    VALUES (NEW.id, NEW.full_name, NEW.desired_destination, NEW.intended_start_date, NEW.status)
    ON CONFLICT (lead_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      destination = EXCLUDED.destination,
      intake = EXCLUDED.intake,
      stage = EXCLUDED.stage,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_student_from_lead
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION create_student_from_lead();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW public.leads_with_score AS
SELECT
  l.*,
  p.full_name AS assigned_agent_name,
  (SELECT COUNT(*) FROM public.notes n WHERE n.lead_id = l.id) AS note_count,
  (SELECT COUNT(*) FROM public.activities a WHERE a.lead_id = l.id) AS activity_count,
  (SELECT COUNT(*) FROM public.documents d WHERE d.lead_id = l.id AND d.status IN ('uploaded', 'verified')) AS document_count,
  (SELECT COALESCE(SUM(pay.amount_due - pay.amount_paid), 0) FROM public.payments pay WHERE pay.lead_id = l.id AND pay.status NOT IN ('paid', 'cancelled', 'refunded')) AS outstanding_balance
FROM public.leads l
LEFT JOIN public.profiles p ON l.assigned_to = p.id;

-- ============================================================
-- SEED NOTE
-- ============================================================
-- After creating your first user via Supabase Auth, run:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
