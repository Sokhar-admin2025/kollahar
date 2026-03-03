-- LeadOS internal lead messages (seller/owner/system) tied to leads & organizations

CREATE TABLE public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('seller', 'owner', 'system')),
  content text NOT NULL
);

-- Fast lookups by org + lead + time (most recent first)
CREATE INDEX idx_lead_messages_org_lead_created
  ON public.lead_messages(organization_id, lead_id, created_at DESC);

-- Ensure organization_id always matches the lead's organization_id
CREATE OR REPLACE FUNCTION public.set_lead_message_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Look up organization_id from the referenced lead
  SELECT l.organization_id
  INTO v_org_id
  FROM public.leads l
  WHERE l.id = NEW.lead_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION
      'lead_messages: could not resolve organization_id for lead_id=%',
      NEW.lead_id;
  END IF;

  NEW.organization_id := v_org_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_lead_message_organization_id ON public.lead_messages;
CREATE TRIGGER trigger_set_lead_message_organization_id
  BEFORE INSERT OR UPDATE OF lead_id
  ON public.lead_messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_lead_message_organization_id();

-- Row Level Security: org isolation via organization_id
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read lead_messages by organization_id"
  ON public.lead_messages
  FOR SELECT
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Org members insert lead_messages by organization_id"
  ON public.lead_messages
  FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

-- Documentation
COMMENT ON TABLE public.lead_messages IS
  'Intern lead-konversation för LeadOS (endast för säljare/ägare inom samma organisation). Ej kundchatt.';

COMMENT ON COLUMN public.lead_messages.role IS
  'Roll för avsändare: seller = säljare/medarbetare, owner = ägare/ansvarig för anläggningen, system = automatiskt systemmeddelande.';

