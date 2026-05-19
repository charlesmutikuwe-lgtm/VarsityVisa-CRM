-- ============================================================
-- Varsity Visa CRM — Operational Upgrade Migration
-- Use this if you already ran 001_initial.sql before this patch.
-- Fresh installs can run only the updated 001_initial.sql.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'consultation_booked') THEN ALTER TYPE lead_status ADD VALUE 'consultation_booked'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'documents_pending') THEN ALTER TYPE lead_status ADD VALUE 'documents_pending'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'offer_received') THEN ALTER TYPE lead_status ADD VALUE 'offer_received'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'fees_paid') THEN ALTER TYPE lead_status ADD VALUE 'fees_paid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'deferred') THEN ALTER TYPE lead_status ADD VALUE 'deferred'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_status'::regtype AND enumlabel = 'dropped_out') THEN ALTER TYPE lead_status ADD VALUE 'dropped_out'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'smart_major') THEN ALTER TYPE lead_source ADD VALUE 'smart_major'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'study_match') THEN ALTER TYPE lead_source ADD VALUE 'study_match'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'facebook') THEN ALTER TYPE lead_source ADD VALUE 'facebook'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'instagram') THEN ALTER TYPE lead_source ADD VALUE 'instagram'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'tiktok') THEN ALTER TYPE lead_source ADD VALUE 'tiktok'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'youtube') THEN ALTER TYPE lead_source ADD VALUE 'youtube'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'lead_source'::regtype AND enumlabel = 'google_sheet_import') THEN ALTER TYPE lead_source ADD VALUE 'google_sheet_import'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'poland') THEN ALTER TYPE study_destination ADD VALUE 'poland'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'lithuania') THEN ALTER TYPE study_destination ADD VALUE 'lithuania'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'dubai_uae') THEN ALTER TYPE study_destination ADD VALUE 'dubai_uae'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'malaysia') THEN ALTER TYPE study_destination ADD VALUE 'malaysia'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'india') THEN ALTER TYPE study_destination ADD VALUE 'india'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'romania') THEN ALTER TYPE study_destination ADD VALUE 'romania'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'hungary') THEN ALTER TYPE study_destination ADD VALUE 'hungary'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'turkey') THEN ALTER TYPE study_destination ADD VALUE 'turkey'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'study_destination'::regtype AND enumlabel = 'georgia') THEN ALTER TYPE study_destination ADD VALUE 'georgia'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'budget_range'::regtype AND enumlabel = 'under_2k') THEN ALTER TYPE budget_range ADD VALUE 'under_2k'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'budget_range'::regtype AND enumlabel = '2k_5k') THEN ALTER TYPE budget_range ADD VALUE '2k_5k'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'activity_type'::regtype AND enumlabel = 'payment_logged') THEN ALTER TYPE activity_type ADD VALUE 'payment_logged'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'activity_type'::regtype AND enumlabel = 'follow_up_scheduled') THEN ALTER TYPE activity_type ADD VALUE 'follow_up_scheduled'; END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'passport', 'academic_certificate', 'transcript', 'english_test',
      'cv', 'motivation_letter', 'proof_of_funds', 'sponsor_letter',
      'police_clearance', 'medical', 'visa_form', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
    CREATE TYPE document_status AS ENUM (
      'missing', 'requested', 'uploaded', 'verified', 'rejected', 'expired'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_purpose') THEN
    CREATE TYPE payment_purpose AS ENUM (
      'consultation_fee', 'agent_fee', 'application_fee', 'tuition_deposit', 'visa_fee', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'pending', 'partial', 'paid', 'overdue', 'refunded', 'cancelled'
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique_idx ON public.leads (lower(email));
CREATE INDEX IF NOT EXISTS leads_destination_idx ON public.leads(desired_destination);
CREATE INDEX IF NOT EXISTS leads_source_idx ON public.leads(source);
CREATE INDEX IF NOT EXISTS leads_follow_up_idx ON public.leads(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.students (
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
DROP POLICY IF EXISTS "Authenticated users can manage students" ON public.students;
CREATE POLICY "Authenticated users can manage students"
  ON public.students FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.documents (
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
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
CREATE POLICY "Authenticated users can manage documents"
  ON public.documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.payments (
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
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'placeholder';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS provider_id TEXT;

CREATE INDEX IF NOT EXISTS students_lead_idx ON public.students(lead_id);
CREATE INDEX IF NOT EXISTS students_stage_idx ON public.students(stage);
CREATE INDEX IF NOT EXISTS documents_lead_idx ON public.documents(lead_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);
CREATE INDEX IF NOT EXISTS documents_expiry_idx ON public.documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_lead_idx ON public.payments(lead_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);
CREATE INDEX IF NOT EXISTS payments_due_idx ON public.payments(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_lead_idx ON public.whatsapp_messages(lead_id, sent_at DESC);

DROP TRIGGER IF EXISTS students_updated_at ON public.students;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

DROP TRIGGER IF EXISTS auto_create_student_from_lead ON public.leads;
CREATE TRIGGER auto_create_student_from_lead
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION create_student_from_lead();

DROP VIEW IF EXISTS public.leads_with_score;
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
