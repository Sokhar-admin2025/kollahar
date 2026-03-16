-- Lägg till source-kolumn för att skilja på huvud-appen och Command Center
ALTER TABLE public.system_errors
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'main-app';

COMMENT ON COLUMN public.system_errors.source IS
  'Varifrån felet kom: main-app, main-app-client, command-center, command-center-client.';
