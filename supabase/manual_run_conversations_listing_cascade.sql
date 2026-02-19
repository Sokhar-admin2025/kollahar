-- Fix: conversations.listings FK saknar ON DELETE CASCADE – blockar radering av annonser
-- Kör i Supabase SQL Editor om du får "violates foreign key constraint conversations_listing_id_fkey"

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_listing_id_fkey;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_listing_id_fkey
  FOREIGN KEY (listing_id)
  REFERENCES public.listings(id)
  ON DELETE CASCADE;
