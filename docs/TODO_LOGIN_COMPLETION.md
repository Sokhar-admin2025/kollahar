# 📋 TODO: Fullända Login & Registrering

## 🎯 Översikt
Detta är en checklista för att slutföra login- och registreringsfunktionaliteten. De flesta steg kräver konfiguration i Supabase Dashboard.

---

## ✅ KOD - KLART
- [x] Login-sida med tabs
- [x] 6-siffrig OTP-verifiering
- [x] Välkomst-popup
- [x] Databas-migration för popup-spårning
- [x] Felhantering och användarvänliga meddelanden
- [x] Accessibility (EAA)
- [x] Keyboard navigation
- [x] Visa/dölj lösenord

---

## ⚠️ SUPABASE-KONFIGURATION (Kräver manuell konfiguration)

### 1. Email Provider Setup
**Prioritet: HÖG**  
**Tidsåtgång: 10-15 minuter**

- [ ] **Gå till Supabase Dashboard** → **Project Settings** → **Auth**
- [ ] **Scrolla till "Email Auth"**
- [ ] **Välj email-provider:**

  **Alternativ A: Supabase's inbyggda (för utveckling)**
  - [ ] Lämna SMTP-fält tomma
  - [ ] Använd Supabase's default sender
  - [ ] **OBS:** Fungerar endast för utveckling, begränsade rate limits

  **Alternativ B: Egen SMTP (rekommenderat för produktion)**
  - [ ] **SMTP Host**: `smtp.gmail.com` (Gmail) eller din providers SMTP
  - [ ] **SMTP Port**: `587` (TLS) eller `465` (SSL)
  - [ ] **SMTP User**: Din email-adress
  - [ ] **SMTP Password**: App-specifikt lösenord
    - För Gmail: Google Account → Security → App passwords
  - [ ] **Sender email**: Din email-adress
  - [ ] **Testa**: Skicka test-email

**Dokumentation:** Se `docs/SUPABASE_EMAIL_SETUP.md` för detaljerade instruktioner

---

### 2. Email Templates
**Prioritet: HÖG**  
**Tidsåtgång: 5-10 minuter**

- [ ] **Gå till Supabase Dashboard** → **Authentication** → **Email Templates**
- [ ] **Välj "Magic Link" template** (används för OTP)
- [ ] **Anpassa ämnesrad:**
  ```
  Bekräfta ditt konto på Kollahär!
  ```
- [ ] **Anpassa innehåll:**
  - Använd `{{ .Token }}` för 6-siffrig kod
  - Se `docs/EMAIL_TEMPLATE_OTP.md` för exakt innehåll
- [ ] **Spara template**
- [ ] **Testa:** Registrera ny användare och kontrollera email

**Dokumentation:** Se `docs/EMAIL_TEMPLATE_OTP.md` för exakt innehåll

---

### 3. Email Confirmation Settings
**Prioritet: MEDEL**  
**Tidsåtgång: 2 minuter**

- [ ] **Gå till Supabase Dashboard** → **Authentication** → **Settings**
- [ ] **Under "Email Auth":**
  - [ ] **Enable email confirmations**: `OFF` (vi använder OTP istället)
  - [ ] **Enable email change confirmations**: `ON` eller `OFF` (beroende på behov)
- [ ] **Spara inställningar**

---

### 4. Databas-migration
**Prioritet: HÖG**  
**Tidsåtgång: 1 minut**

- [ ] **Gå till Supabase Dashboard** → **SQL Editor**
- [ ] **Kör migration:**
  ```sql
  -- Kopiera innehållet från:
  supabase/migrations/20260117000000_add_welcome_popup_tracking.sql
  ```
- [ ] **Verifiera:**
  - [ ] Kolumner skapade: `welcome_popup_dismissed`, `welcome_popup_last_shown`, `welcome_popup_view_count`
  - [ ] Default-värden fungerar
  - [ ] RLS-policies är korrekta (användare kan uppdatera sin egen profil)

---

## 🧪 TESTNING (Efter Supabase-konfiguration)

### 5. Testa Registrering
**Prioritet: HÖG**  
**Tidsåtgång: 10 minuter**

- [ ] **Testa ny användare:**
  - [ ] Gå till `/login?tab=signup`
  - [ ] Fyll i email och lösenord (minst 8 tecken)
  - [ ] Klicka "Skapa konto"
  - [ ] **Kontrollera email:** Får du 6-siffrig kod?
  - [ ] Ange koden på verifieringssidan
  - [ ] Verifiera att auto-verifiering fungerar
  - [ ] Kontrollera att välkomst-popup visas
  - [ ] Kontrollera att användaren är inloggad

- [ ] **Testa fel-scenarier:**
  - [ ] För kort lösenord (< 8 tecken)
  - [ ] Ogiltig email-format
  - [ ] Email redan registrerat
  - [ ] Fel kod vid verifiering
  - [ ] Kod går ut (vänta 15 minuter eller ändra countdown för test)

---

### 6. Testa Inloggning
**Prioritet: HÖG**  
**Tidsåtgång: 5 minuter**

- [ ] **Testa befintlig användare:**
  - [ ] Gå till `/login`
  - [ ] Fyll i email och lösenord
  - [ ] Klicka "Logga in"
  - [ ] Kontrollera att välkomst-popup visas (första gången)
  - [ ] Kontrollera att användaren är inloggad

- [ ] **Testa fel-scenarier:**
  - [ ] Fel lösenord
  - [ ] Ogiltig email
  - [ ] Tomma fält

---

### 7. Testa Välkomst-popup
**Prioritet: MEDEL**  
**Tidsåtgång: 5 minuter**

- [ ] **Testa popup-visning:**
  - [ ] Logga in som ny användare → Popup visas
  - [ ] Logga in som befintlig användare → Popup visas (första gången)
  - [ ] Kryssa i "Visa inte detta igen" → Stäng popup
  - [ ] Logga ut och in igen → Popup visas INTE

- [ ] **Testa knappar:**
  - [ ] "Bläddra annonser" → Navigerar till `/`
  - [ ] "Lägg upp annons" → Navigerar till `/dashboard/create`
  - [ ] "Gå till min profil" → Navigerar till `/dashboard`
  - [ ] Stäng (X) → Stänger popupen

- [ ] **Testa databas-spårning:**
  - [ ] Kontrollera i Supabase Dashboard att `welcome_popup_view_count` ökar
  - [ ] Kontrollera att `welcome_popup_last_shown` uppdateras
  - [ ] Kontrollera att `welcome_popup_dismissed` sätts till `true` när checkbox är ikryssad

---

### 8. Testa Responsivitet
**Prioritet: MEDEL**  
**Tidsåtgång: 10 minuter**

- [ ] **Mobil (iPhone Chrome):**
  - [ ] Login-sidan fungerar korrekt
  - [ ] Tabs är lätta att klicka
  - [ ] Inputs är tillräckligt stora
  - [ ] Verifieringssidan: 6 input-fält passar på skärmen
  - [ ] Välkomst-popup passar på mobil
  - [ ] All text är läsbar

- [ ] **Desktop:**
  - [ ] Layout ser bra ut
  - [ ] Alla element är korrekt placerade

---

### 9. Testa Accessibility
**Prioritet: MEDEL**  
**Tidsåtgång: 10 minuter**

- [ ] **Keyboard navigation:**
  - [ ] Tab-navigation fungerar genom hela flödet
  - [ ] Enter-tangent submitar formulär
  - [ ] Focus-ring syns tydligt

- [ ] **Screen reader (valfritt):**
  - [ ] Testa med VoiceOver (Mac/iOS) eller NVDA (Windows)
  - [ ] Verifiera att ARIA-labels läses korrekt
  - [ ] Verifiera att felmeddelanden meddelas

---

## 🐛 FELSÖKNING (Om problem uppstår)

### 10. Email kommer inte fram
**Prioritet: HÖG** (om problem uppstår)

- [ ] **Kontrollera Spam/Junk-mappen**
- [ ] **Kontrollera Supabase Dashboard → Logs:**
  - [ ] Se om det finns fel i email-utskick
  - [ ] Kontrollera rate limits
- [ ] **Kontrollera SMTP-inställningar:**
  - [ ] SMTP Host, Port, User, Password är korrekta
  - [ ] För Gmail: Använd App Password (inte vanligt lösenord)
- [ ] **Kontrollera email-templates:**
  - [ ] Template är korrekt konfigurerad
  - [ ] `{{ .Token }}` används för koden
- [ ] **Testa med annan email-provider:**
  - [ ] Prova med Supabase's inbyggda (för utveckling)
  - [ ] Om det fungerar → problemet är med SMTP-inställningar

---

### 11. OTP-kod fungerar inte
**Prioritet: HÖG** (om problem uppstår)

- [ ] **Kontrollera att koden är 6 siffror:**
  - [ ] Supabase skickar 6-siffrig kod som standard
  - [ ] Om annat: Kontrollera email-template
- [ ] **Kontrollera verifieringssidan:**
  - [ ] Email-parametern finns i URL
  - [ ] Type-parametern är korrekt (`signup` eller `login`)
- [ ] **Kontrollera console för fel:**
  - [ ] Browser console (F12)
  - [ ] Supabase Dashboard → Logs
- [ ] **Testa "Skicka ny kod":**
  - [ ] Fungerar det att skicka ny kod?
  - [ ] Kommer ny kod fram?

---

### 12. Välkomst-popup visas inte
**Prioritet: MEDEL** (om problem uppstår)

- [ ] **Kontrollera URL-parameter:**
  - [ ] `?showWelcome=true` finns i URL efter inloggning
- [ ] **Kontrollera databas:**
  - [ ] `welcome_popup_dismissed` är `false` (eller `null`)
  - [ ] Migration är korrekt körda
- [ ] **Kontrollera console för fel:**
  - [ ] Browser console (F12)
  - [ ] Se om det finns fel i popup-komponenten

---

## 📝 DOKUMENTATION (Redan skapad)

- [x] `docs/EMAIL_TEMPLATE_OTP.md` - Email-template innehåll
- [x] `docs/SUPABASE_EMAIL_SETUP.md` - Steg-för-steg guide
- [x] `docs/QA_CHECKLIST_LOGIN_UPGRADE.md` - Komplett testlista
- [x] `docs/QA_TEST_REPORT.md` - Testresultat

---

## 🎯 PRIORITERING

### Måste göras innan produktion:
1. ✅ **Email Provider Setup** (Alternativ A eller B)
2. ✅ **Email Templates** konfiguration
3. ✅ **Databas-migration** körning
4. ✅ **Testa Registrering** (hela flödet)
5. ✅ **Testa Inloggning**

### Bör göras innan produktion:
6. ✅ **Testa Välkomst-popup**
7. ✅ **Testa Responsivitet** (mobil)
8. ✅ **Email Confirmation Settings**

### Kan göras efter produktion:
9. ✅ **Testa Accessibility** (screen reader)
10. ✅ **Felsökning** (om problem uppstår)

---

## 📊 STATUS

**Kod:** ✅ 100% klar  
**Supabase-konfiguration:** ⚠️ Kräver manuell konfiguration  
**Testning:** ⚠️ Väntar på Supabase-konfiguration  

**Nästa steg:** Konfigurera Supabase Dashboard enligt steg 1-4 ovan.

---

**Uppdaterad:** 2025-01-17  
**Ansvarig:** _______________
