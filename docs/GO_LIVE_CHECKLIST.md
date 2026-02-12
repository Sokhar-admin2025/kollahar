# 🚀 Go Live Checklist - Kolla här! Marketplace

Detta är en checklista för åtgärder som ska göras **precis innan eller vid lansering** av Kolla här! Marketplace.

**Användning:**
- Gå igenom varje sektion och kryssa av när åtgärden är klar
- Verifiera att alla kritiska punkter är genomförda innan publik lansering
- Uppdatera checklistan när nya krav identifieras

---

## 🌍 Miljöer (Dev / Preview / Production)

**Se `docs/ENVIRONMENTS.md`** för fullständig guide.

- [ ] **Dev (Local)** – `.env.local` konfigurerad, appen kör lokalt
- [ ] **Preview (Vercel)** – Environment Variables satta för Preview-miljö
- [ ] **Production (Vercel)** – Environment Variables satta för Production-miljö
- [ ] **Inga dev-nycklar** i Production

---

## 🔐 Säkerhet & Databas

### RLS (Row Level Security) Verifiering
- [ ] **Kör alla RLS setup-filer i produktionsdatabasen**
  - [ ] `supabase/setup_listings.sql` - Verifiera att RLS är aktiverat
  - [ ] `supabase/setup_deletion_logs.sql` - Verifiera att RLS är aktiverat
  - [ ] `supabase/setup_listing_images.sql` - Verifiera storage bucket RLS policies
  - [ ] `supabase/setup_profiles.sql` - Verifiera att RLS är aktiverat
  - [ ] `supabase/setup_conversations_messages.sql` - Verifiera att RLS är aktiverat
  - [ ] `supabase/migrations/20260116090000_create_favorites.sql` - Verifiera att RLS är aktiverat

- [ ] **Testa RLS policies manuellt i Supabase Dashboard**
  - [ ] Verifiera att anonyma användare INTE kan läsa `deleted`/`sold` annonser
  - [ ] Verifiera att användare INTE kan uppdatera andra användares annonser
  - [ ] Verifiera att användare INTE kan läsa andra användares `deletion_logs`
  - [ ] Verifiera att användare INTE kan läsa andra användares meddelanden

- [ ] **Granska RLS_AUDIT_REPORT.md** (`docs/RLS_AUDIT_REPORT.md`)
  - [ ] Alla kritiska problem är åtgärdade
  - [ ] Alla tabeller har RLS aktiverat

### Databas-migrationer
- [ ] **Kör alla migrations i produktionsdatabasen**
  - [ ] Verifiera att alla migrations har körts i korrekt ordning
  - [ ] Kontrollera att inga migrations saknas

- [ ] **Verifiera databasstruktur**
  - [ ] Alla tabeller finns (`profiles`, `listings`, `favorites`, `conversations`, `messages`, `deletion_logs`)
  - [ ] Alla foreign keys är korrekt konfigurerade
  - [ ] Alla triggers fungerar (t.ex. `handle_new_user()` för profiles)

---

## 🌐 Environment Variables & Konfiguration

### Vercel Environment Variables
- [ ] **Dubbelkolla alla Environment Variables i Vercel**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` - Korrekt produktions-URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Korrekt anon key för produktion
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Endast i server-miljö (INTE `NEXT_PUBLIC_`)
  - [ ] Verifiera att inga development-nycklar finns i produktion

- [ ] **Supabase-konfiguration**
  - [ ] Verifiera att produktionsprojektet är korrekt konfigurerat
  - [ ] Kontrollera att email-templates är uppsatta (OTP-verifiering)
  - [ ] Verifiera att storage buckets är publika om de ska vara det

### API-nycklar & Tredjepartstjänster
- [ ] **Verifiera alla API-nycklar**
  - [ ] Alla nycklar är för produktion (inte development/test)
  - [ ] Rate limits är konfigurerade korrekt
  - [ ] Webhooks är konfigurerade (om tillämpligt)

---

## 🧪 Testing & Verifiering

### Funktionella Tester
- [ ] **Testa användarflöden från början till slut**
  - [ ] Registrering → OTP-verifiering → Login → Dashboard
  - [ ] Skapa annons → Redigera annons → Radera annons
  - [ ] Spara favorit → Ta bort favorit
  - [ ] Skapa konversation → Skicka meddelande → Markera som läst
  - [ ] Uppdatera profil → Byt lösenord → Radera konto

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
- [ ] **Cookie Consent-banner fungerar korrekt**
  - [ ] Visas för nya besökare
  - [ ] Försvinner efter "OK"-klick
  - [ ] Kommer inte tillbaka efter att användaren klickat "OK"
  - [ ] "Läs mer"-länk fungerar och leder till `/cookies`

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
- [ ] **Installera Sentry (För att fånga buggar och krascher i produktion)**
  - Kör kommandot `npx @sentry/wizard@latest -i nextjs` och skapa konto på sentry.io
  - [ ] Sentry är konfigurerat och fungerar i produktion
  - [ ] Error alerts är uppsatta
  - [ ] Source maps är konfigurerade för bättre debugging

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
- [ ] **Produktionsdeployment är korrekt**
  - [ ] Production domain är konfigurerad
  - [ ] Custom domain är uppsatt (om tillämpligt)
  - [ ] SSL-certifikat är aktivt
  - [ ] Redirects fungerar korrekt

- [ ] **Build & Deployment**
  - [ ] Build går igenom utan fel
  - [ ] Inga varningar i build-logg
  - [ ] Environment variables är korrekt konfigurerade i Vercel

### Supabase Production
- [ ] **Produktionsdatabas är korrekt konfigurerad**
  - [ ] Alla migrations är körda
  - [ ] RLS policies är aktiverade
  - [ ] Storage buckets är konfigurerade
  - [ ] Email-templates är uppsatta

---

## 📧 Email & Kommunikation

### Email-konfiguration
- [ ] **Supabase Email är konfigurerat**
  - [ ] OTP-verifiering fungerar (testa att skicka OTP)
  - [ ] Email-templates är korrekta
  - [ ] "Glömt lösenord"-funktion fungerar

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

- [ ] **Smoke test i produktion**
  - [ ] Alla viktiga funktioner fungerar i produktion
  - [ ] Inga kritiska buggar finns
  - [ ] Prestanda är acceptabel

- [ ] **Team review**
  - [ ] Alla teammedlemmar har granskat checklistan
  - [ ] Alla kritiska punkter är godkända

- [ ] **Go Live sign-off**
  - [ ] Projektledare har godkänt lansering
  - [ ] Alla kritiska blockerare är lösta

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
