# Supabase Email-konfiguration för OTP

## Problem
- Inga email skickas vid registrering av ny användare.
- Meddelandet visas som "från Supabase" – användare ska se Kolla här! / Kollahar istället.

## Lösning

### 1. Konfigurera Email Provider i Supabase Dashboard

1. Gå till **Supabase Dashboard** → **Authentication** → [SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp)  
   (eller **Project Settings** → **Auth** → scrolla till **Email**)
2. Välj en av följande alternativ:

#### Alternativ A: Supabase's inbyggda email (för utveckling)
- **SMTP Host**: Lämna tomt (använder Supabase's default)
- **SMTP Port**: Lämna tomt
- **SMTP User**: Lämna tomt
- **SMTP Password**: Lämna tomt
- **Sender email**: Använd Supabase's default (fungerar endast för utveckling)
- **Sender name** (om det finns): Sätt t.ex. `Kolla här!` så att avsändaren inte visas som "Supabase"

**OBS:** Supabase's inbyggda email fungerar endast för utveckling och har begränsningar.

#### Alternativ B: Egen SMTP-server (rekommenderat för produktion)
- **SMTP Host**: t.ex. `smtp.resend.com` (Resend), `smtp.gmail.com` (Gmail) eller din providers SMTP
- **SMTP Port**: `587` (TLS) eller `465` (SSL)
- **SMTP User**: Din SMTP-användare (Resend: API-nyckel som användarnamn)
- **SMTP Password**: App-specifikt lösenord eller API-nyckel
- **Sender email**: Din verifierade adress, t.ex. `noreply@kollahar.se`
- **Sender name**: Sätt till **Kolla här!** eller **Kollahar.se** så att mailet inte visas som "från Supabase"

### 2. Avsändarnamn – så att det inte står "Supabase"

Om mailet visas som **från Supabase** i klienten (t.ex. iPhone Mail):

1. Gå till **Authentication** → **SMTP** (eller **Project Settings** → **Auth** → **Email**).
2. Sätt **Sender name** (avsändarnamn) till t.ex. **Kolla här!** eller **Kollahar.se**.
3. Vid egen SMTP: använd **Sender email** från er domän (t.ex. `noreply@kollahar.se`).

Då visas meddelandet som "Kolla här! &lt;noreply@kollahar.se&gt;" i stället för "Supabase".

### 3. Konfigurera Email Templates

1. Gå till **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Välj **"Magic Link"** template (används för OTP)
3. Anpassa enligt `docs/EMAIL_TEMPLATE_OTP.md`

**Viktigt:** 
- Använd `{{ .Token }}` för 6-siffrig kod (Supabase's variabel)
- Ämnesrad: "Bekräfta ditt konto på Kollahar!" (ingen referens till Supabase)
- Innehåll: Se `docs/EMAIL_TEMPLATE_OTP.md` – texten ska vara från Kollahar, inte Supabase

### 4. Aktivera Email Confirmation (om det behövs)

1. Gå till **Supabase Dashboard** → **Authentication** → **Settings**
2. Under **"Email Auth"**:
   - **Enable email confirmations**: Sätt till `OFF` (vi använder OTP istället)
   - **Enable email change confirmations**: Sätt till `ON` eller `OFF` (beroende på behov)

### 5. Testa Email-utskick

1. Försök registrera en ny användare
2. Kontrollera:
   - **Supabase Dashboard** → **Authentication** → **Users** → Se om användaren skapas
   - **Email inbox** → Se om email kommer fram
   - **Console logs** → Se om det finns fel i browser console

### 6. Felsökning

#### Email kommer inte fram:
- Kontrollera **Spam/Junk**-mappen
- Kontrollera SMTP-inställningar
- Kontrollera att email-templates är korrekt konfigurerade
- Kontrollera Supabase Dashboard → **Logs** för fel

#### "Rate limit exceeded":
- Supabase har rate limits för email-utskick
- Vänta några minuter och försök igen
- För produktion: Använd egen SMTP-server

#### "Email template not found":
- Kontrollera att email-templates är konfigurerade
- Använd rätt variabel (`{{ .Token }}` för OTP)

### 7. För produktion

**Rekommenderat:** Använd egen SMTP-server eller email-tjänst som:
- **SendGrid**
- **Resend**
- **Mailgun**
- **Amazon SES**

Dessa ger bättre kontroll, högre rate limits och bättre deliverability.

---

## Snabbkontrolllista

- [ ] SMTP-inställningar konfigurerade i Supabase Dashboard
- [ ] Email-templates konfigurerade (Magic Link template)
- [ ] Testat email-utskick med riktig email-adress
- [ ] Kontrollerat Spam-mappen
- [ ] Kontrollerat Supabase Logs för fel
- [ ] Email kommer fram korrekt

---

**Nästa steg efter konfiguration:**
1. Testa registrering igen
2. Kontrollera att email kommer fram
3. Verifiera att 6-siffrig kod fungerar
