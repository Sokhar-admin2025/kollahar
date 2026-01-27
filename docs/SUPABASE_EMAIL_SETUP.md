# Supabase Email-konfiguration för OTP

## Problem
Inga email skickas vid registrering av ny användare.

## Lösning

### 1. Konfigurera Email Provider i Supabase Dashboard

1. Gå till **Supabase Dashboard** → **Project Settings** → **Auth**
2. Scrolla ner till **Email Auth**
3. Välj en av följande alternativ:

#### Alternativ A: Supabase's inbyggda email (för utveckling)
- **SMTP Host**: Lämna tomt (använder Supabase's default)
- **SMTP Port**: Lämna tomt
- **SMTP User**: Lämna tomt
- **SMTP Password**: Lämna tomt
- **Sender email**: Använd Supabase's default (fungerar endast för utveckling)

**OBS:** Supabase's inbyggda email fungerar endast för utveckling och har begränsningar.

#### Alternativ B: Egen SMTP-server (rekommenderat för produktion)
- **SMTP Host**: `smtp.gmail.com` (för Gmail) eller din email-providers SMTP
- **SMTP Port**: `587` (TLS) eller `465` (SSL)
- **SMTP User**: Din email-adress
- **SMTP Password**: App-specifikt lösenord (för Gmail: skapa i Google Account → Security → App passwords)
- **Sender email**: Din email-adress

### 2. Konfigurera Email Templates

1. Gå till **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Välj **"Magic Link"** template (används för OTP)
3. Anpassa enligt `docs/EMAIL_TEMPLATE_OTP.md`

**Viktigt:** 
- Använd `{{ .Token }}` för 6-siffrig kod (Supabase's variabel)
- Ämnesrad: "Bekräfta ditt konto på Kollahär!"
- Innehåll: Se `docs/EMAIL_TEMPLATE_OTP.md`

### 3. Aktivera Email Confirmation (om det behövs)

1. Gå till **Supabase Dashboard** → **Authentication** → **Settings**
2. Under **"Email Auth"**:
   - **Enable email confirmations**: Sätt till `OFF` (vi använder OTP istället)
   - **Enable email change confirmations**: Sätt till `ON` eller `OFF` (beroende på behov)

### 4. Testa Email-utskick

1. Försök registrera en ny användare
2. Kontrollera:
   - **Supabase Dashboard** → **Authentication** → **Users** → Se om användaren skapas
   - **Email inbox** → Se om email kommer fram
   - **Console logs** → Se om det finns fel i browser console

### 5. Felsökning

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

### 6. För produktion

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
