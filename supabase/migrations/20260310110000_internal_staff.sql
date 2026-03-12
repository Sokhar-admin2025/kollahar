-- Internal staff isolation for Kollahär! Command Center
-- Skapar tabellen public.internal_staff med hårt RLS-skydd ("administrative lock")

CREATE TABLE public.internal_staff (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin', 'sales', 'support')),
  access_level integer NOT NULL CHECK (access_level BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.internal_staff IS
  'Intern staff-tabell för Kollahär! Command Center. Endast för interna användare, aldrig kundexponerad.';

COMMENT ON COLUMN public.internal_staff.id IS
  'FK-liknande koppling mot auth.users.id (krävs inte som formell FK av Supabase, men bör matcha).';

COMMENT ON COLUMN public.internal_staff.email IS
  'Intern e-post för staff-användaren. Unik per staff.';

COMMENT ON COLUMN public.internal_staff.full_name IS
  'Fullständigt namn för intern staff-användare.';

COMMENT ON COLUMN public.internal_staff.role IS
  'Roll i Command Center: superadmin, admin, sales eller support.';

COMMENT ON COLUMN public.internal_staff.access_level IS
  'Access-nivå 1–10 där 10 motsvarar superadmin.';

COMMENT ON COLUMN public.internal_staff.created_at IS
  'Tidpunkt då staff-posten skapades.';

-- Aktivera Row Level Security
ALTER TABLE public.internal_staff ENABLE ROW LEVEL SECURITY;

-- Administrative lock:
-- Endast användare som själva finns i internal_staff med role = ''superadmin''
-- får SELECT/INSERT/UPDATE/DELETE på tabellen.
CREATE POLICY "internal_staff_superadmin_full_access"
  ON public.internal_staff
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.internal_staff s
      WHERE s.id = auth.uid()
        AND s.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.internal_staff s
      WHERE s.id = auth.uid()
        AND s.role = 'superadmin'
    )
  );

-- Initial seed (justeras manuellt innan körning i respektive miljö).
-- TODO: ERSÄTT följande värden med ditt riktiga auth.users.id och e-post innan du kör migrationen:
--   - '00000000-0000-0000-0000-000000000000'  -> ditt auth.users.id
--   - 'you@example.com'                      -> din interna e-post
--   - 'Ditt Namn'                            -> ditt fullständiga namn
INSERT INTO public.internal_staff (id, email, full_name, role, access_level)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'you@example.com',
  'Ditt Namn',
  'superadmin',
  10
);

