-- Leads: flagga gäst-leads (skapade utan inloggat konto)

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads.is_guest IS 'Sant för leads skapade utan inloggat konto (gäst-formulär).';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.leads.source IS 'Teknisk lead-källa (t.ex. chat_lead, lead_card, guest_form).';

