-- System Health: logg för tekniska fel från huvudappen

CREATE TABLE public.system_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  stack_trace text,
  path text,
  user_id uuid,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_errors IS
  'Tekniska fel från huvudapplikationen, används av Command Center System Health.';

COMMENT ON COLUMN public.system_errors.error_message IS
  'Rått felmeddelande (t.ex. från console eller server).';

COMMENT ON COLUMN public.system_errors.stack_trace IS
  'Stack trace eller extra teknisk info (kan vara lång text).';

COMMENT ON COLUMN public.system_errors.path IS
  'Path/URL där felet inträffade (t.ex. /dashboard/seller).';

COMMENT ON COLUMN public.system_errors.user_id IS
  'ID på användaren som drabbades (om känt), auth.users.id.';

COMMENT ON COLUMN public.system_errors.status IS
  'Status för felet: open, resolved eller ignored.';

COMMENT ON COLUMN public.system_errors.created_at IS
  'När felet loggades.';

CREATE INDEX idx_system_errors_status_created
  ON public.system_errors(status, created_at DESC);

