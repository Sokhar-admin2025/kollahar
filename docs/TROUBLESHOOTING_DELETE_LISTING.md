# Radera annons – felsökning

När användare får "Kunde inte radera annonsen. Försök igen senare." i production.

---

## 1. Kontrollera SUPABASE_SERVICE_ROLE_KEY

**Radera annons kräver** `SUPABASE_SERVICE_ROLE_KEY` i production. Utan den returneras nu:
"Radering är tillfälligt otillgänglig. Kontakta support om det kvarstår."

- **Vercel:** Project → Settings → Environment Variables
- **Miljö:** Nyckeln måste vara satt för **Production** (inte bara Preview)
- **Namn:** Exakt `SUPABASE_SERVICE_ROLE_KEY` (inga mellanslag)
- **Värde:** Hämta från Supabase → Project Settings → API → `service_role`

Efter ändring: **Redeploy** (Vercel deployar inte om vid env-ändring – trigga manuellt eller push ny commit).

---

## 2. Kontrollera Vercel-loggarna

Vid fel loggas nu:
- `[deleteListing] SUPABASE_SERVICE_ROLE_KEY saknas` – nyckeln laddas inte
- `[deleteListing] deleteError: ... code: ...` – Supabase-fel (FK, RLS, etc.)
- `[deleteListing] Ingen rad raderad trots ägarverifiering` – RLS blockerar

**Så hittar du loggarna:** Vercel → Project → Logs (eller Deployment → Functions).

---

## 3. Vanliga orsaker

| Fel i logg | Orsak | Åtgärd |
|------------|-------|--------|
| `supabaseAdmin saknas` | Nyckel saknas eller fel miljö | Sätt `SUPABASE_SERVICE_ROLE_KEY` för Production, redeploy |
| `deleteError: ... foreign key` | FK-constraint blockerar | Kontrollera att child-tabeller har ON DELETE CASCADE |
| `Ingen rad raderad` | RLS eller filter matchar inte | Används ej med service role – kontrollera att admin används |
