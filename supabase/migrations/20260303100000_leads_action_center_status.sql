-- Level 2: Lead Action Center foundation
-- - New lead statuses for workflow management
-- - buyer_email for richer lead list
-- - ensure new leads always have listing_id (conversion readiness)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS buyer_email text;

COMMENT ON COLUMN public.leads.buyer_email IS 'Kundens e-post (för lead action center)';

-- Drop prior status check(s) safely
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

-- Migrate old status values to new workflow
UPDATE public.leads
SET status = CASE
  WHEN status = 'hot' THEN 'new'
  WHEN status = 'closed' THEN 'archived'
  ELSE status
END
WHERE status IN ('hot', 'closed');

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'sold', 'archived'));

-- Keep historical rows with NULL listing_id, but enforce listing_id for all new/updated rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_listing_id_required'
      AND conrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_listing_id_required
      CHECK (listing_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_org_status_created
  ON public.leads(organization_id, status, created_at DESC);

-- Allow dealers to update lead status within own organization.
DROP POLICY IF EXISTS "Org members update leads by organization_id" ON public.leads;
CREATE POLICY "Org members update leads by organization_id"
  ON public.leads
  FOR UPDATE
  USING (
    COALESCE(organization_id, seller_id) = public.current_user_organization_id()
  )
  WITH CHECK (
    COALESCE(organization_id, seller_id) = public.current_user_organization_id()
  );
