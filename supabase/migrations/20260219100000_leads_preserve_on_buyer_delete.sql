-- När en privat användare (köpare) raderar sitt konto ska företagets lead-statistik
-- inte påverkas: lead-rader ska bevaras men kopplingen till konversationen nollställas.

-- Ta bort befintlig FK (namn kan variera)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT tc.constraint_name INTO conname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'leads'
    AND kcu.column_name = 'conversation_id';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT %I', conname);
  END IF;
END $$;

-- Gör conversation_id nullable och lägg till FK med ON DELETE SET NULL
ALTER TABLE public.leads
  ALTER COLUMN conversation_id DROP NOT NULL;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES public.conversations(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.conversation_id IS 'Konversation där lead skapades; NULL om köparen raderat sitt konto (lead behålls för företagets statistik).';
