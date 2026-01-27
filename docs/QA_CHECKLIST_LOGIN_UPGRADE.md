# QA Checklist - Login & Registrering Upgrade

## 📋 Översikt
Detta dokument innehåller en komplett QA-checklista för alla ändringar i login- och registreringsflödet.

---

## 🔐 Login-sida (`/login`)

### Tabs & Navigation
- [ ] **Tab-funktionalitet**
  - [ ] "Logga in"-tab är aktiv som standard
  - [ ] "Skapa konto"-tab fungerar och växlar korrekt
  - [ ] URL uppdateras med `?tab=signup` när signup-tab är aktiv
  - [ ] URL-state bevaras vid siduppdatering
  - [ ] Tab-visuell feedback (grön understrykning) fungerar

- [ ] **Tillbaka-knapp**
  - [ ] Navigerar till startsidan (`/`)
  - [ ] Text: "← Tillbaka till annonserna"
  - [ ] Hover-effekt fungerar
  - [ ] Keyboard navigation fungerar (Tab, Enter)

### Formulär & Inputs

- [ ] **Email-input**
  - [ ] Email-validering fungerar (visuell feedback)
  - [ ] Placeholder: "din@email.com"
  - [ ] Auto-complete fungerar (`autocomplete="email"`)
  - [ ] Focus-ring syns tydligt
  - [ ] Error-state visas vid ogiltig email

- [ ] **Lösenords-input**
  - [ ] Visa/dölj-lösenord fungerar (öga-ikon)
  - [ ] Placeholder: "Ditt lösenord" (login) / "Minst 8 tecken" (signup)
  - [ ] Auto-complete fungerar korrekt
  - [ ] Röd border visas vid för kort lösenord (signup)
  - [ ] Felmeddelande visas under input vid för kort lösenord

- [ ] **Keyboard Navigation**
  - [ ] Enter-tangent submitar formuläret
  - [ ] Tab-navigation fungerar logiskt
  - [ ] Focus syns tydligt på alla element

### Inloggning (Login Tab)

- [ ] **Lyckad inloggning**
  - [ ] Success-meddelande visas: "Inloggad! Skickar vidare..."
  - [ ] Redirect till `/?showWelcome=true` efter 1 sekund
  - [ ] Välkomst-popup visas (om användaren inte stängt den permanent)

- [ ] **Felhantering**
  - [ ] Ogiltiga credentials: "Fel e-post eller lösenord. Försök igen."
  - [ ] Nätverksfel: "Nätverksfel. Kontrollera din anslutning."
  - [ ] Tomma fält: "Vänligen fyll i både e-post och lösenord."
  - [ ] Ogiltig email-format: "Ogiltig e-postadress."

- [ ] **Glömt lösenord**
  - [ ] Länk "Glömt lösenord?" syns under lösenordsfältet
  - [ ] Klick visar meddelande: "Funktionen kommer snart!" (tillfälligt)

### Registrering (Signup Tab)

- [ ] **Lyckad registrering**
  - [ ] Email-validering fungerar
  - [ ] Lösenordsvalidering (minst 8 tecken)
  - [ ] Redirect till `/login/verify?email=...&type=signup`
  - [ ] OTP-kod skickas till email

- [ ] **Felhantering**
  - [ ] Email redan registrerat: "Detta e-post är redan registrerat. Logga in istället."
  - [ ] För kort lösenord: "Lösenordet måste vara minst 8 tecken långt."
  - [ ] Ogiltig email: "Ogiltig e-postadress."
  - [ ] Tomma fält: "Vänligen fyll i både e-post och lösenord."

---

## ✅ Verifieringssida (`/login/verify`)

### Layout & Design
- [ ] **Sidstruktur**
  - [ ] Centrerad layout
  - [ ] Tillbaka-knapp fungerar (← Tillbaka)
  - [ ] Email visas: "Vi har skickat en 6-siffrig kod till [email]"
  - [ ] Responsiv på mobil

### Kod-input (6 siffror)
- [ ] **Input-fält**
  - [ ] 6 separata input-fält
  - [ ] Auto-focus på första fältet vid sidladdning
  - [ ] Auto-focus nästa fält när siffra skrivs
  - [ ] Backspace går tillbaka till föregående fält
  - [ ] Endast siffror accepteras
  - [ ] Paste fungerar (6 siffror)

- [ ] **Auto-verifiering**
  - [ ] Verifierar automatiskt när alla 6 siffror är ifyllda
  - [ ] Ingen manuell "Verifiera"-knapp behövs (men finns som backup)

- [ ] **Visuell feedback**
  - [ ] Röd border vid fel kod
  - [ ] Röd bakgrund vid utgången kod eller för många försök
  - [ ] Disabled-state när kod gått ut eller försök slut

### Countdown & Timer
- [ ] **Timer-funktionalitet**
  - [ ] Countdown startar vid sidladdning (15 minuter)
  - [ ] Visas som "Koden är giltig i MM:SS"
  - [ ] Uppdateras varje sekund
  - [ ] Visar "0:00" när koden gått ut
  - [ ] "Koden har gått ut"-meddelande visas

### Försöksräknare
- [ ] **Försök-hantering**
  - [ ] Startar med 5 försök
  - [ ] Minskar med 1 vid fel kod
  - [ ] Visar: "Du har X försök kvar"
  - [ ] Visar "För många felaktiga försök" vid 0 försök
  - [ ] Rensa fält automatiskt vid fel kod

### Felhantering
- [ ] **Felmeddelanden**
  - [ ] Fel kod: "Fel kod. Försök igen. Du har X försök kvar"
  - [ ] Utgången kod: "Koden har gått ut. Skicka en ny kod."
  - [ ] För många försök: "För många felaktiga försök. Skicka en ny kod."
  - [ ] Generiskt fel: "Ett fel uppstod. Försök igen."

### "Skicka ny kod"
- [ ] **Resend-funktionalitet**
  - [ ] Knapp syns när koden går ut
  - [ ] Knapp syns även som backup (alltid tillgänglig)
  - [ ] Loading-state: "Skickar ny kod..."
  - [ ] Success-meddelande: "Ny kod skickad! Kontrollera din e-post."
  - [ ] Resetar countdown till 15 minuter
  - [ ] Resetar försök till 5
  - [ ] Rensar input-fält

### Lyckad verifiering
- [ ] **Efter verifiering**
  - [ ] Success-meddelande: "E-post verifierad! Loggar in..."
  - [ ] Auto-redirect till `/?showWelcome=true` efter 1 sekund
  - [ ] Lösenord sätts korrekt (för nya användare)
  - [ ] Användaren är inloggad

### Edge Cases
- [ ] **Saknad email i URL**
  - [ ] Visar: "Ingen e-post angiven."
  - [ ] Tillbaka-knapp fungerar

- [ ] **Ogiltig kod-format**
  - [ ] Endast siffror accepteras
  - [ ] Max 1 siffra per fält

---

## 🎉 Välkomst-popup

### Visning & Timing
- [ ] **När popupen visas**
  - [ ] Efter lyckad inloggning (ny användare)
  - [ ] Efter lyckad verifiering (ny användare)
  - [ ] För befintliga användare vid första inloggning (om inte stängd permanent)
  - [ ] URL-parameter: `?showWelcome=true`

- [ ] **När popupen INTE visas**
  - [ ] Om användaren stängt den permanent (`welcome_popup_dismissed = true`)
  - [ ] Om användaren inte är inloggad
  - [ ] Om `showWelcome` saknas i URL

### Design & Layout
- [ ] **Modal**
  - [ ] Overlay (mörk bakgrund, 50% opacity)
  - [ ] Centrerad modal (max-width, rounded corners)
  - [ ] Stäng-knapp (X) i övre högra hörnet
  - [ ] Klick på overlay stänger popupen

- [ ] **Innehåll**
  - [ ] Rubrik: "Välkommen till Kollahär!"
  - [ ] Underrubrik: "Vad vill du göra idag?"
  - [ ] 3 knappar: Bläddra annonser, Lägg upp annons, Gå till min profil
  - [ ] Checkbox: "Visa inte detta igen"

### Knappar
- [ ] **Bläddra annonser**
  - [ ] Navigerar till `/`
  - [ ] Stänger popupen
  - [ ] Primär knapp (grön bakgrund)

- [ ] **Lägg upp annons**
  - [ ] Navigerar till `/dashboard/create`
  - [ ] Stänger popupen
  - [ ] Sekundär knapp (grön border)

- [ ] **Gå till min profil**
  - [ ] Navigerar till `/dashboard`
  - [ ] Stänger popupen
  - [ ] Tertiär knapp (grå border)

- [ ] **Stäng (X)**
  - [ ] Stänger popupen
  - [ ] Tar bort `showWelcome` från URL
  - [ ] Respekterar checkbox om den är ikryssad

### Checkbox "Visa inte detta igen"
- [ ] **Funktionalitet**
  - [ ] Checkbox kan klickas
  - [ ] Visuell feedback (checkmark)
  - [ ] Om ikryssad + stängd → sparas i databas (`welcome_popup_dismissed = true`)
  - [ ] Popupen visas inte igen efter permanent stängning

### Databas-spårning
- [ ] **Tracking**
  - [ ] `welcome_popup_view_count` ökar med 1 vid varje visning
  - [ ] `welcome_popup_last_shown` uppdateras med nuvarande tid
  - [ ] `welcome_popup_dismissed` sätts till `true` när checkbox är ikryssad
  - [ ] Spårning fungerar även om det finns fel (non-blocking)

### Animationer
- [ ] **Transitions**
  - [ ] Smooth fade-in för overlay
  - [ ] Scale-animation för modal
  - [ ] Smooth fade-out vid stängning

---

## 🗄️ Databas & Migration

### Migration
- [ ] **Kolumner skapade**
  - [ ] `welcome_popup_dismissed` (boolean, default false)
  - [ ] `welcome_popup_last_shown` (timestamptz)
  - [ ] `welcome_popup_view_count` (integer, default 0)

- [ ] **RLS-policies**
  - [ ] Användare kan läsa sin egen profil
  - [ ] Användare kan uppdatera sin egen profil

### Testdata
- [ ] **Existerande användare**
  - [ ] Migration fungerar på existerande profiler
  - [ ] Default-värden sätts korrekt

---

## 📧 Email-template

### Konfiguration
- [ ] **Supabase Dashboard**
  - [ ] Email-template är konfigurerad
  - [ ] Ämnesrad: "Bekräfta ditt konto på Kollahär!"
  - [ ] Innehåll matchar dokumentationen

### Email-innehåll
- [ ] **Text-version**
  - [ ] Korrekt text enligt `docs/EMAIL_TEMPLATE_OTP.md`
  - [ ] 6-siffrig kod visas tydligt
  - [ ] Giltighetstid: 15 minuter
  - [ ] "Bortse från meddelande"-text finns

- [ ] **HTML-version** (om använd)
  - [ ] Responsiv design
  - [ ] Brand-färger (grön #2C4638)
  - [ ] Kod visas stort och tydligt

---

## ♿ Accessibility (EAA)

### Keyboard Navigation
- [ ] **Tab-navigation**
  - [ ] Alla interaktiva element är nåbara via Tab
  - [ ] Focus-ring syns tydligt
  - [ ] Tab-order är logisk

- [ ] **Enter-tangent**
  - [ ] Submitar formulär på login/signup
  - [ ] Verifierar kod när alla 6 siffror är ifyllda

### Screen Readers
- [ ] **ARIA-labels**
  - [ ] Alla inputs har `aria-label`
  - [ ] Alla knappar har `aria-label`
  - [ ] Modal har `role="dialog"` och `aria-modal="true"`
  - [ ] Checkbox har `role="checkbox"` och `aria-checked`

- [ ] **ARIA-live regions**
  - [ ] Felmeddelanden har `role="alert"` och `aria-live="polite"`
  - [ ] Success-meddelanden har `aria-live="polite"`

### Fokus-hantering
- [ ] **Focus management**
  - [ ] Auto-focus på första input vid sidladdning
  - [ ] Focus fångas i modal (trap focus)
  - [ ] Focus återställs vid stängning

---

## 📱 Responsivitet

### Mobil (iPhone Chrome)
- [ ] **Login-sida**
  - [ ] Tabs fungerar på mobil
  - [ ] Inputs är tillräckligt stora (min 44px höjd)
  - [ ] Text är läsbar
  - [ ] Knappar är lätta att klicka

- [ ] **Verifieringssida**
  - [ ] 6 input-fält passar på skärmen
  - [ ] Countdown är läsbar
  - [ ] Knappar är tillräckligt stora

- [ ] **Välkomst-popup**
  - [ ] Modal passar på mobil
  - [ ] Knappar är stora nog
  - [ ] Checkbox är lätt att klicka

### Desktop
- [ ] **Alla sidor**
  - [ ] Layout ser bra ut på större skärmar
  - [ ] Max-width fungerar korrekt

---

## 🔒 Säkerhet

### Validering
- [ ] **Client-side**
  - [ ] Email-validering (regex)
  - [ ] Lösenordslängd (minst 8 tecken)
  - [ ] Kod-validering (endast 6 siffror)

### Session Management
- [ ] **SessionStorage**
  - [ ] Lösenord sparas temporärt (endast vid signup)
  - [ ] Rensas efter verifiering
  - [ ] Rensas vid fel

### Error Messages
- [ ] **Säkerhet**
  - [ ] Inga känsliga felmeddelanden exponeras
  - [ ] Generiska meddelanden för okända fel

---

## 🐛 Edge Cases & Felhantering

### Nätverksfel
- [ ] **Offline/Timeout**
  - [ ] Tydligt felmeddelande
  - [ ] Möjlighet att försöka igen

### Ogiltiga inputs
- [ ] **Email**
  - [ ] Tom email
  - [ ] Ogiltigt format
  - [ ] För lång email

- [ ] **Lösenord**
  - [ ] Tom lösenord
  - [ ] För kort lösenord
  - [ ] Specialtecken (bör fungera)

- [ ] **Kod**
  - [ ] Tom kod
  - [ ] För kort kod (< 6 siffror)
  - [ ] För lång kod (> 6 siffror)
  - [ ] Bokstäver i kod

### Supabase-fel
- [ ] **Auth-fel**
  - [ ] Användare redan finns
  - [ ] Ogiltiga credentials
  - [ ] Nätverksfel
  - [ ] Serverfel

---

## 🧪 Testscenarier

### Scenario 1: Ny användare registrerar sig
1. [ ] Gå till `/login`
2. [ ] Välj "Skapa konto"-tab
3. [ ] Fyll i email och lösenord (minst 8 tecken)
4. [ ] Klicka "Skapa konto"
5. [ ] Redirect till `/login/verify`
6. [ ] Kontrollera email för 6-siffrig kod
7. [ ] Ange koden (auto-verifiering)
8. [ ] Redirect till `/?showWelcome=true`
9. [ ] Välkomst-popup visas
10. [ ] Klicka på en knapp → navigerar korrekt
11. [ ] Kontrollera att användaren är inloggad

### Scenario 2: Befintlig användare loggar in
1. [ ] Gå till `/login`
2. [ ] Fyll i email och lösenord
3. [ ] Klicka "Logga in"
4. [ ] Redirect till `/?showWelcome=true`
5. [ ] Välkomst-popup visas (första gången)
6. [ ] Stäng popupen (utan checkbox)
7. [ ] Logga ut och in igen
8. [ ] Popupen visas igen

### Scenario 3: Permanent stängning av popup
1. [ ] Logga in
2. [ ] Välkomst-popup visas
3. [ ] Kryssa i "Visa inte detta igen"
4. [ ] Stäng popupen
5. [ ] Logga ut och in igen
6. [ ] Popupen visas INTE

### Scenario 4: Fel kod vid verifiering
1. [ ] Registrera ny användare
2. [ ] Gå till verifieringssidan
3. [ ] Ange fel kod
4. [ ] Felmeddelande visas
5. [ ] Försök minskar (5 → 4)
6. [ ] Input-fält rensas
7. [ ] Ange rätt kod
8. [ ] Verifiering lyckas

### Scenario 5: Kod går ut
1. [ ] Registrera ny användare
2. [ ] Vänta 15 minuter (eller ändra countdown för test)
3. [ ] Försök ange kod
4. [ ] "Koden har gått ut"-meddelande
5. [ ] "Skicka ny kod"-knapp syns
6. [ ] Klicka "Skicka ny kod"
7. [ ] Ny kod skickas
8. [ ] Countdown resetas

---

## 📝 Dokumentation

- [ ] **Kod-kommentarer**
  - [ ] Viktiga funktioner är kommenterade
  - [ ] Komplex logik är förklarad

- [ ] **Dokumentation**
  - [ ] `docs/EMAIL_TEMPLATE_OTP.md` finns
  - [ ] Migration-fil är dokumenterad
  - [ ] README uppdaterad (om nödvändigt)

---

## ✅ Slutgiltig Checklista

- [ ] Alla testscenarier fungerar
- [ ] Inga console-errors
- [ ] Inga TypeScript-errors
- [ ] Inga linter-warnings
- [ ] Migration körts i Supabase
- [ ] Email-template konfigurerad
- [ ] Testat på mobil (iPhone Chrome)
- [ ] Testat på desktop
- [ ] Accessibility testad (keyboard navigation)
- [ ] Säkerhetstestad (validering, felhantering)

---

## 🚨 Kända Problem / TODO

- [ ] "Glömt lösenord"-funktion är inte implementerad (visar "Funktionen kommer snart!")
- [ ] Email-template måste konfigureras manuellt i Supabase Dashboard
- [ ] Migration måste köras manuellt i Supabase

---

**Testat av:** _______________  
**Datum:** _______________  
**Status:** ⬜ Klar för produktion / ⬜ Behöver fixar
