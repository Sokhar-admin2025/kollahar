-- GDPR hotfix: remove previously auto-populated buyer emails from leads.
-- Buyer email should only be stored when explicitly and clearly consented in the lead form.

UPDATE public.leads
SET buyer_email = NULL
WHERE buyer_email IS NOT NULL;

COMMENT ON COLUMN public.leads.buyer_email IS 'Kundens e-post. Ska endast sparas vid uttryckligt samtycke i lead-formulär.';
