-- RLS: Säljare kan läsa leads där leads.seller_id = auth.uid()
-- Säkerställer att dealer-dashboard visar leads även när conversation-baserad policy har begränsningar

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Sellers read leads by seller_id') THEN
    CREATE POLICY "Sellers read leads by seller_id"
      ON public.leads FOR SELECT
      USING (leads.seller_id = auth.uid());
  END IF;
END $$;
