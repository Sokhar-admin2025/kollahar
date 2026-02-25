-- LeadOS Seller Mode – tillskrivna leads och svarstid

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_org_assignee_status_created
  ON public.leads(organization_id, assigned_to, status, created_at DESC);

