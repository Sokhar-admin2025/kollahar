# 🚀 Go Live Checklist - Kolla här! Marketplace

Detta är en checklista för åtgärder som ska göras **precis innan eller vid lansering** av Kolla här! Marketplace.

**Användning:**
- Gå igenom varje sektion och kryssa av när åtgärden är klar
- Verifiera att alla kritiska punkter är genomförda innan publik lansering
- Uppdatera checklistan när nya krav identifieras

**Post Go-Live status:** Domän/SSL, Vercel, RLS, Auth, bilduppladdning och Sentry är klara. Se `docs/05-ROADMAP.md` → "Post Go-Live (Slutfört)" och "Kommande Actions (Todo)".

**Kommande Todo (prioriterat):** 1) Ta bort sentry-example-page (🟡), 2) Båt-attribut (🟢). Cookie-banner ✅ klar. Se `docs/05-ROADMAP.md`.

**Kvar (checklistan):** Cross-browser/device-test, prestanda/Lighthouse, EAA-tillgänglighet, backup-strategi, dokumentation, post-launch övervakning.

---

## 🌍 Miljöer (Dev / Preview / Production)

**Se `docs/ENVIRONMENTS.md`** för fullständig guide.

- [x] **Dev (Local)** – `.env.local` konfigurerad, appen kör lokalt
- [x] **Preview (Vercel)** – Environment Variables satta för Preview-miljö
- [x] **Production (Vercel)** – Environment Variables satta för Production-miljö
- [x] **Inga dev-nycklar** i Production

---

## 🔐 Säkerhet & Databas

### RLS (Row Level Security) Verifiering
- [x] **Kör alla RLS setup-filer i produktionsdatabasen**
  - [x] `supabase/setup_listings.sql` - Verifiera att RLS är aktiverat
  - [x] `supabase/setup_deletion_logs.sql` - Verifiera att RLS är aktiverat
  - [x] `supabase/setup_listing_images.sql` - Verifiera storage bucket RLS policies
  - [x] `supabase/setup_profiles.sql` - Verifiera att RLS är aktiverat
  - [x] `supabase/setup_conversations_messages.sql` - Verifiera att RLS är aktiverat
  - [x] `supabase/migrations/20260116090000_create_favorites.sql` - Verifiera att RLS är aktiverat

- [x] **Testa RLS policies manuellt i Supabase Dashboard**
  - [x] Verifiera att anonyma användare INTE kan läsa `deleted`/`sold` annonser
  - [x] Verifiera att användare INTE kan uppdatera andra användares annonser
  - [x] Verifiera att användare INTE kan läsa andra användares `deletion_logs`
  - [x] Verifiera att användare INTE kan läsa andra användares meddelanden

- [x] **Granska RLS_AUDIT_REPORT.md** (`docs/RLS_AUDIT_REPORT.md`)
  - [x] Alla kritiska problem är åtgärdade
  - [x] Alla tabeller har RLS aktiverat

### Databas-migrationer
- [x] **Kör alla migrations i produktionsdatabasen**
  - [x] Verifiera att alla migrations har körts i korrekt ordning
  - [x] Kontrollera att inga migrations saknas

- [x] **Verifiera databasstruktur**
  - [x] Alla tabeller finns (`profiles`, `listings`, `favorites`, `conversations`, `messages`, `deletion_logs`)
  - [x] Alla foreign keys är korrekt konfigurerade
  - [x] Alla triggers fungerar (t.ex. `handle_new_user()` för profiles)

---

## 🌐 Environment Variables & Konfiguration

### Vercel Environment Variables
- [x] **Dubbelkolla alla Environment Variables i Vercel**
  - [x] `NEXT_PUBLIC_SUPABASE_URL` - Korrekt produktions-URL
  - [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Korrekt anon key för produktion
  - [x] `SUPABASE_SERVICE_ROLE_KEY` - Endast i server-miljö (INTE `NEXT_PUBLIC_`)
  - [x] Verifiera att inga development-nycklar finns i produktion

- [x] **Supabase-konfiguration**
  - [x] Verifiera att produktionsprojektet är korrekt konfigurerat
  - [x] Kontrollera att email-templates är uppsatta (OTP-verifiering)
  - [x] Verifiera att storage buckets är publika om de ska vara det

### API-nycklar & Tredjepartstjänster
- [x] **Verifiera alla API-nycklar**
  - [x] Alla nycklar är för produktion (inte development/test)
  - [x] Rate limits är konfigurerade korrekt
  - [x] Webhooks är konfigurerade (om tillämpligt)

---

## 🧪 Testing & Verifiering

### Funktionella Tester
- [x] **Testa användarflöden från början till slut**
  - [x] Registrering → OTP-verifiering → Login → Dashboard
  - [x] Skapa annons → Redigera annons → Radera annons
  - [x] Spara favorit → Ta bort favorit
  - [x] Skapa konversation → Skicka meddelande → Markera som läst
  - [x] Uppdatera profil → Byt lösenord → Radera konto

- [ ] **Testa edge cases**
  - [ ] Vad händer om användare försöker redigera annons de inte äger?
  - [ ] Vad händer om användare försöker läsa meddelanden de inte har tillgång till?
  - [ ] Vad händer vid nätverksfel? (visas tydliga felmeddelanden?)

### Cross-browser & Enheter
- [ ] **Testa på olika webbläsare**
  - [ ] Chrome (desktop + mobil)
  - [ ] Safari (desktop + mobil)
  - [ ] Firefox (desktop)
  - [ ] Edge (desktop)

- [ ] **Testa responsiv design**
  - [ ] Mobil (iPhone, Android)
  - [ ] Tablet (iPad)
  - [ ] Desktop (olika skärmstorlekar)

### Prestanda
- [ ] **Laddningstider**
  - [ ] Startsidan laddas snabbt (< 2 sekunder)
  - [ ] Bilder optimeras korrekt
  - [ ] Inga stora bundle sizes

- [ ] **Lighthouse-test**
  - [ ] Performance score > 80
  - [ ] Accessibility score > 90 (EAA-krav)
  - [ ] Best Practices score > 90
  - [ ] SEO score > 90

---

## 📱 UI/UX & Tillgänglighet

### EAA-kompatibilitet (Tillgänglighet)
- [ ] **Tangentbordsnavigation**
  - [ ] Alla interaktiva element kan nås med tangentbord
  - [ ] Focus states är tydliga och synliga
  - [ ] Tab-ordning är logisk

- [ ] **Skärmläsare**
  - [ ] ARIA-labels finns på alla viktiga element
  - [ ] Semantisk HTML används korrekt
  - [ ] Formulär har korrekta labels

- [ ] **Kontrast & Synlighet**
  - [ ] Text har tillräcklig kontrast (WCAG AA-minimum)
  - [ ] Alla knappar och länkar är tydligt synliga
  - [ ] Placeholder-text har tillräcklig kontrast

### Cookie Consent
- [x] **Cookie Consent-banner fungerar korrekt**
  - [x] Visas för nya besökare
  - [x] Försvinner efter "OK"-klick
  - [x] Kommer inte tillbaka efter att användaren klickat "OK"
  - [x] "Läs mer"-länk fungerar och leder till `/cookies`

---

## 🔍 SEO & Metadata

- [ ] **Metadata är korrekt konfigurerad**
  - [ ] Title och description i `app/layout.tsx` är korrekta
  - [ ] Open Graph tags är konfigurerade
  - [x] Favicon laddas korrekt (app/icon.png, Next.js file convention)

- [ ] **Sitemap & Robots.txt**
  - [ ] Sitemap genereras korrekt (om implementerad)
  - [ ] Robots.txt är korrekt konfigurerad

---

## 📊 Monitoring & Hälsa

### Error Tracking
- [x] **Sentry installerat** (`@sentry/nextjs`, konfiguration: `sentry.*.config.ts`, `instrumentation.ts`, `global-error.tsx`)
- [x] **Sentry i produktion**
  - [x] `NEXT_PUBLIC_SENTRY_DSN` och eventuella auth token satta i Vercel
  - [x] Verifiera att fel rapporteras (t.ex. via `/sentry-example-page`)
  - [x] Error alerts är uppsatta i Sentry
  - [x] Source maps laddas upp vid build (automatiskt med `withSentryConfig`)

### Analytics & Monitoring
- [ ] **Analytics-integration** (om implementerad)
  - [ ] Analytics respekterar GDPR-samtycke (`consent_analytics`)
  - [ ] Tracking fungerar korrekt
  - [ ] Dashboard är konfigurerat

- [ ] **Uptime monitoring**
  - [ ] Uptime monitoring är uppsatt (t.ex. UptimeRobot, Pingdom)
  - [ ] Alerts är konfigurerade för downtime

### Logging
- [ ] **Logging är konfigurerat**
  - [ ] Viktiga events loggas (t.ex. användarregistrering, annonsskapande)
  - [ ] Error logs är tillgängliga
  - [ ] Log rotation är konfigurerad (om tillämpligt)

---

## 🚀 Deployment & Infrastruktur

### Vercel Deployment
- [x] **Produktionsdeployment är korrekt**
  - [x] Production domain är konfigurerad
  - [x] Custom domain är uppsatt (huvuddomän + Å-domän)
  - [x] SSL-certifikat är aktivt (HTTPS)
  - [x] Redirects fungerar korrekt

- [x] **Build & Deployment**
  - [x] Build går igenom utan fel
  - [x] Inga varningar i build-logg
  - [x] Environment variables är korrekt konfigurerade i Vercel

### Supabase Production
- [x] **Produktionsdatabas är korrekt konfigurerad**
  - [x] Alla migrations är körda
  - [x] RLS policies är aktiverade
  - [x] Storage buckets är konfigurerade
  - [x] Email-templates är uppsatta

---

## 📧 Email & Kommunikation

### Email-konfiguration
- [x] **Supabase Email är konfigurerat**
  - [x] OTP-verifiering fungerar (testa att skicka OTP)
  - [x] Email-templates är korrekta
  - [x] "Glömt lösenord"-funktion fungerar

- [ ] **Email-notifikationer** (om implementerad)
  - [ ] Email-notifikationer för nya meddelanden fungerar
  - [ ] Användare kan slå av/på notiser i Settings

---

## 🔄 Backup & Disaster Recovery

- [ ] **Backup-strategi**
  - [ ] Databasbackup är konfigurerad (Supabase har automatiskt backup)
  - [ ] Backup-frekvens är känd
  - [ ] Restore-procedur är dokumenterad

- [ ] **Disaster Recovery Plan**
  - [ ] Plan finns för vad som ska göras vid större incidenter
  - [ ] Kontaktinformation för kritiska personer är tillgänglig

---

## 📝 Dokumentation & Support

### Dokumentation
- [ ] **Teknisk dokumentation är uppdaterad**
  - [ ] `docs/01-SYSTEM_ARCHITECT.md` är korrekt
  - [ ] `docs/02-BACKEND_DATABASE.md` är korrekt
  - [ ] `docs/03-FRONTEND_UI.md` är korrekt
  - [ ] `docs/04-CHANGELOG.md` är uppdaterad

- [ ] **Användardokumentation** (om tillämpligt)
  - [ ] FAQ-sida finns (om implementerad)
  - [ ] Hjälpsektion finns (om implementerad)

### Support
- [ ] **Support-kanaler är uppsatta**
  - [ ] Kontaktformulär fungerar (om implementerad)
  - [ ] Support-email är konfigurerad
  - [ ] Support-process är dokumenterad

---

## ✅ Final Verification

- [x] **Smoke test i produktion**
  - [x] Alla viktiga funktioner fungerar i produktion
  - [x] Inga kritiska buggar finns
  - [x] Prestanda är acceptabel

- [x] **Team review**
  - [x] Alla teammedlemmar har granskat checklistan
  - [x] Alla kritiska punkter är godkända

- [x] **Go Live sign-off**
  - [x] Projektledare har godkänt lansering
  - [x] Alla kritiska blockerare är lösta

---

## 📌 Post-Launch

### Efter lansering (första 24 timmarna)
- [ ] **Övervaka systemet aktivt**
  - [ ] Kolla Sentry för errors
  - [ ] Kolla analytics för användaraktivitet
  - [ ] Kolla server logs för ovanliga mönster

- [ ] **Användarfeedback**
  - [ ] Samla in användarfeedback
  - [ ] Identifiera kritiska buggar snabbt
  - [ ] Ha en plan för snabba hotfixes

---

**Senast uppdaterad:** 2026-02-12  
**Nästa granskning:** Vid lansering
**Post go-live:** Checklistan uppdaterad med slutförda punkter (miljöer, RLS, migrationer, deployment, Sentry, auth, cookie consent)