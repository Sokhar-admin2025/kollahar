-- Trigger: markera marketing_lead som onboarded när en ny användare registreras
-- Körs på auth.users INSERT, direkt efter att kontot skapas, oavsett
-- registreringsväg (e-post, OAuth, admin-skapad etc.).
-- Påverkar bara leads med status = 'active' – pausade/avprenumererade/
-- redan onboardade berörs inte.

CREATE OR REPLACE FUNCTION public.mark_marketing_lead_onboarded()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketing_leads
  SET status = 'onboarded'
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Separat trigger – stör inte den befintliga on_auth_user_created (handle_new_user)
DROP TRIGGER IF EXISTS on_auth_user_created_mark_marketing_lead ON auth.users;

CREATE TRIGGER on_auth_user_created_mark_marketing_lead
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_marketing_lead_onboarded();
