-- Mapping-tabell för utrustningsstädning (AI Cleaning Lab)
-- Lagrar koppling mellan rå utrustningstext och godkänd, städad lista.

CREATE TABLE public.equipment_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_string text NOT NULL UNIQUE,
  refined_list text[] NOT NULL DEFAULT '{}',
  confidence integer NOT NULL DEFAULT 0,
  confirmed boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'heuristic',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.equipment_mappings IS
  'Master-mappning för bilutrustning. Används av AI Cleaning Lab / importer för att normalisera utrustningslistor.';

COMMENT ON COLUMN public.equipment_mappings.raw_string IS
  'Rå, ofta ihopklistrad utrustningssträng (exakt som mottagen från källa).';

COMMENT ON COLUMN public.equipment_mappings.refined_list IS
  'Godkänd, städad lista med utrustningsposter (varje element en ren sträng).';

COMMENT ON COLUMN public.equipment_mappings.confidence IS
  '0–100. Bedömd säkerhet för att refined_list korrekt representerar raw_string.';

COMMENT ON COLUMN public.equipment_mappings.confidence IS
  '0–100. Bedömd säkerhet för att refined_list korrekt representerar raw_string.';

COMMENT ON COLUMN public.equipment_mappings.confirmed IS
  'True när en människa har bekräftat/refaktorerat refined_list i AI Cleaning Lab.';

COMMENT ON COLUMN public.equipment_mappings.source IS
  'Var mappningen kommer från: heuristic, ai, manual.';

COMMENT ON COLUMN public.equipment_mappings.created_at IS
  'När mappningen skapades i Cleaning Lab.';

-- OBS / TODO:
-- I nästa steg ska importflöden (t.ex. Smistabil CSV) först kolla i equipment_mappings
-- innan de kör parseEquipmentList – om raw_string finns här används refined_list direkt.

