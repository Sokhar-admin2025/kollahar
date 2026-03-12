-- Audit-logg för adminhändelser i Command Center (t.ex. impersonation)

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_logs IS
  'Audit-logg för kritiska adminhändelser (impersonation m.m.) från Command Center.';

COMMENT ON COLUMN public.admin_audit_logs.admin_id IS
  'ID (auth.users.id) för adminen som utförde åtgärden.';

COMMENT ON COLUMN public.admin_audit_logs.action IS
  'Typ av åtgärd, t.ex. impersonate_user.';

COMMENT ON COLUMN public.admin_audit_logs.target_user_id IS
  'ID (auth.users.id) för mål-användaren (t.ex. kund som impersoneras).';

COMMENT ON COLUMN public.admin_audit_logs.created_at IS
  'När åtgärden loggades.';

CREATE INDEX idx_admin_audit_logs_admin_created
  ON public.admin_audit_logs(admin_id, created_at DESC);

