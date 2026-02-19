-- RLS: Säkerställ att dealers kan läsa sina leads via seller_id
-- Kör detta i Supabase SQL Editor om dashboard fortfarande visar 0

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Sellers read leads by seller_id') THEN
    CREATE POLICY "Sellers read leads by seller_id"
      ON public.leads FOR SELECT
      USING (leads.seller_id = auth.uid());
  END IF;
END $$;
