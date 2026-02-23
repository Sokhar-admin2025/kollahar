-- Manual safety script: backfill listings.organization_id from current owner (user_id).
-- Run this if migration did not run or if you need to repair data.

UPDATE public.listings l
SET organization_id = COALESCE(l.organization_id, p.organization_id, l.user_id)
FROM public.profiles p
WHERE p.id = l.user_id
  AND l.organization_id IS NULL;

UPDATE public.listings
SET organization_id = user_id
WHERE organization_id IS NULL;

-- Optional verification:
-- SELECT count(*) AS missing_org_id FROM public.listings WHERE organization_id IS NULL;
