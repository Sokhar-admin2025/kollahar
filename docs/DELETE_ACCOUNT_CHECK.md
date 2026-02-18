# Radera konto – checklista och felsökning

När en användare inte kan radera sitt konto, gå igenom följande.

---

## 1. Är `SUPABASE_SERVICE_ROLE_KEY` satt?

**Krävs** för att faktiskt ta bort användaren från Supabase Auth (`auth.users`).

- **Lokal utveckling:** `.env.local` måste innehålla  
  `SUPABASE_SERVICE_ROLE_KEY=eyJ...`  
  (hämta under Supabase → Project Settings → API → `service_role`).
- **Vercel (produktion/preview):** Under Project → Settings → Environment Variables ska  
  `SUPABASE_SERVICE_ROLE_KEY` finnas för respektive miljö (Production/Preview).

**Om nyckeln saknas:**  
API:et faller tillbaka till att bara radera från `favorites`, `listings` och `profiles` med användarens session, och loggar ut – men **användaren i Auth raderas inte**. Personen kan alltså logga in igen.  
Från och med nu returnerar API:et ett tydligt fel om service role saknas så att användaren inte får “success” i onöjan.

---

## 2. Kontrollera serverloggar vid fel

När användaren får meddelandet *"Kunde inte radera ditt konto just nu. Försök igen."*:

- **Lokal:** titta i terminalen där `npm run dev` körs.
- **Vercel:** Project → Logs (eller Deployment → Functions) och sök efter  
  `Kunde inte radera konto via admin.deleteUser`  
  eller  
  `Fel vid radering av konto`.

Loggen innehåller nu Supabase-felets `message` och `code` så du kan se exakt varför `deleteUser` misslyckades.

---

## 3. "Database error deleting user" (AuthApiError / unexpected_failure)

Det här felet betyder att Supabase inte kunde radera raden i `auth.users` eftersom något i databasen blockerar (t.ex. FK utan ON DELETE CASCADE).

**Lösning i koden:** API:et rensar nu **all användardata i public-schemat** med service role *innan* `deleteUser()` anropas (user_hidden_conversations, conversations, leads, import_logs, deletion_logs, favorites, listings, profiles). Därefter anropas `deleteUser()`, så inga public-tabeller ska längre blockera.

Om felet kvarstår efter deploy: kontrollera i Supabase om någon annan tabell har FK mot `auth.users(id)` utan ON DELETE CASCADE.

---

## 4. Övriga orsaker till att `admin.deleteUser()` misslyckas

| Orsak | Åtgärd |
|--------|--------|
| **Rate limit / tillfälligt fel** | Användaren kan försöka igen efter en stund. |
| **Användaren redan borttagen** | Kontrollera i Supabase → Authentication → Users. Om användaren inte finns är inget att göra. |
| **Projekt-inställningar** | I Supabase finns inget “inaktivera kontoraderering”, men kolla Authentication-inställningar om något nyligen ändrats. |
| **Nätverksfel mot Supabase** | Kontrollera Vercel → Logs för timeout eller nätverksfel. |

---

## 5. Databas – CASCADE

Raderande av användaren i `auth.users` (via service role) ska trigga CASCADE i alla tabeller som refererar användaren:

- `profiles.id` → `auth.users(id) ON DELETE CASCADE`
- `listings.user_id`, `favorites.user_id`, `deletion_logs.user_id`, `user_hidden_conversations.user_id` m.m. → `auth.users(id) ON DELETE CASCADE`
- `conversations` (buyer_id, seller_id), `messages` (sender_id) → `auth.users(id) ON DELETE CASCADE`

Om radering lyckas i Auth men något fel uppstår i databasen syns det i Supabase-loggarna (Postgres). Normalt ska CASCADE rensa all användardata.

---

## 6. Snabbkontroll

1. Bekräfta att `SUPABASE_SERVICE_ROLE_KEY` finns i rätt miljö (.env.local / Vercel).
2. Låt användaren försöka igen och kontrollera direkt efter i Supabase → Authentication → Users om användaren försvunnit.
3. Om felet kvarstår: kopiera felmeddelande och eventuellt `code` från serverloggen och sök i Supabase-dokumentationen eller support.
