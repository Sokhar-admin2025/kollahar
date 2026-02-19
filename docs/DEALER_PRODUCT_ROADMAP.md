# 🚀 Dealer Product Roadmap – Kollahär Marketplace

Detta dokument samlar alla planerade dealer-funktioner, SaaS-features och produktutveckling.  
**Se även:** `docs/05-ROADMAP.md` för tekniska förbättringar och go-live.

---

## Var ligger vi nu? (Status februari 2025)

**Punkt 1 (Lead & Sales):** Stabil grund – leads sparas, räknas per säljare, försvinner inte vid raderad annons.  
**Punkt 5 (Kommunikation):** Grundläggande chatt, meddelanden, inbox, notiser via e-post.  
**Punkt 6 (Plattformshälsa):** Sentry för fel, RLS på plats.

**Redan implementerat:**
- Lead-tabell med seller_id, buyer_id, conversation_id
- Lead-kort i chat vid första kontakt
- Dealer Command Center: Total Views, Hot Leads, Aktiva konversationer, Inventory Health
- View tracking (listing_views) med seller_id
- Chatt mellan köpare och säljare (conversations, messages)
- E-postnotiser vid nya meddelanden (Resend)
- Persistent leads (ON DELETE SET NULL – statistik kvar efter raderad annons)
- RLS på alla tabeller

**Saknas för full Punkt 1:** Lead-center (lista alla leads med namn, kontakt, länk till båt), status-hantering (Nya/Kontaktade/Affär avslutad).

---

## 1. Lead & Sales Management (Gör datan användbar)

### Lead-center
- [ ] En vy som listar alla inkomna intresseanmälanden med namn, kontaktuppgifter och länk till den specifika båten.

### Status-hantering
- [ ] Möjlighet för handlaren att markera leads som "Nya", "Kontaktade" eller "Affär avslutad".

### Historik-bevaring
- [x] Säkerställa att statistik och leads finns kvar för handlaren även efter att en annons raderats/markerats som såld. *(Delvis klart – leads behålls, listing_id sätts till NULL.)*

---

## 2. Bulk-import & Data-motor (Skalbarhet för proffsen)

### XML-ingest
- [ ] Bygga stöd för att läsa in externa filer (från t.ex. Blocket, Bytbil eller interna affärssystem).

### Data-normalisering
- [ ] En motor som städar datan (t.ex. gör om "Diesel", "D", "Disel" till ett enhetligt fält för filter).

### Bild-processor
- [ ] En kraftfull lösning för att hantera tusentals högupplösta bilder samtidigt utan att servern kraschar (kö-system och automatisk storleksändring).

### Vattenstämpling
- [ ] Automatisk applicering av logotyp på alla uppladdade bilder.

---

## 3. Monetisering & Kundhantering (SaaS-delen)

### Stripe-integration
- [ ] Implementera prenumerationsnivåer (t.ex. Brons, Silver, Guld) baserat på antal annonser.

### Billing Portal
- [ ] Sida där handlaren kan hantera sina fakturor, betalkort och uppgradera/nedgradera sitt paket.

### Multi-tenancy/Roller
- [ ] Möjlighet för en handlare att bjuda in anställda med begränsad åtkomst (t.ex. säljare som bara ser leads men inte ekonomi).

---

## 4. Publik Marknadsplats & SEO (Synlighet)

### Publik Handlarprofil
- [ ] En snygg "butikssida" för varje handlare (t.ex. dinplattform.se/handlare/marina-vst).

### Dynamiska Sitemaps
- [ ] Automatiskt uppdaterade XML-kartor för Google så att varje ny båt indexeras direkt.

### SEO-automatisering
- [ ] System som genererar sökordsoptimerade titlar och metadata för varje annons.

---

## 5. Kommunikation & UX

### Internt meddelandesystem
- [x] En chattfunktion mellan köpare och säljare direkt på plattformen. *(Klart – conversations, messages, inbox.)*

### Notifikationsmotor
- [ ] Realtime-notiser i webbläsaren och via e-post vid nya leads eller systemhändelser. *(E-post vid nya meddelanden finns; webbläsar-notiser/PWA saknas.)*

### Advanced Analytics
- [ ] Utöka dagens dashboard med grafer (tidsserier), konverteringsgrad (klick vs leads) och jämförelse mot förra månaden.

---

## 6. Plattformshälsa & Säkerhet

### Loggning & Felhantering
- [ ] Ett robust system för att spåra misslyckade importer eller serverfel. *(Sentry finns för fel; import-loggar finns men kan utökas.)*

### Säkerhetsgranskning
- [ ] Gå igenom alla RLS-policies och API-anrop så att ingen handlare någonsin kan se en annans data "bakvägen".

---

## Prioritering (förslag)

| Fas | Fokus | Uppgifter |
|-----|-------|-----------|
| 1 | Lead-center | Lead-vy med lista, status-hantering |
| 2 | Skalbarhet | Bulk-import, bild-processor, data-normalisering |
| 3 | Monetisering | Stripe, Billing Portal, roller |
| 4 | Synlighet | Handlarprofil, sitemaps, SEO |
| 5 | UX | Realtime-notiser, Advanced Analytics |

---

## 📋 Samlad prioriteringslista (alla uppgifter)

*Kombinerar DEALER_PRODUCT_ROADMAP, 05-ROADMAP, GO_LIVE_CHECKLIST, TODO_LOGIN_COMPLETION. Alla uppgifter från samtliga dokument är med. Rangordnad efter impact, beroenden och effort.*

### 🔴 Fas 1: Gör lead-datan användbar (högsta ROI nu)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 1 | **Lead-center** – lista alla leads med namn, kontakt, länk till båt | Punkt 1 | Ni har datan – gör den synlig. Handlarens största behov. |
| 2 | **Status-hantering** – Nya / Kontaktade / Affär avslutad | Punkt 1 | Låg effort (leads.status finns), hög värde. |
| 3 | **Båt-specifika attribut** – filter längd, båttyp m.m. | 05-ROADMAP | Bättre sök för er kärnkategori. |

### 🟠 Fas 2: Synlighet & grundläggande SEO

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 4 | **Publik Handlarprofil** – /handlare/marina-vst | Punkt 4 | Varje handlare får egen butikssida – bra för SEO och förtroende. |
| 5 | **Dynamiska Sitemaps** – XML för Google | Punkt 4 | Nytt innehåll indexeras snabbare. |
| 6 | **SEO-automatisering** – titlar, metadata per annons | Punkt 4 | Låg effort, stor effekt på trafik. |

### 🟡 Fas 3: Teknisk skuld & plattformshälsa

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 7 | **Middleware → Proxy** (Next.js 16) | 05-ROADMAP | Teknisk skuld – fixa innan större uppgraderingar. |
| 8 | **Säkerhetsgranskning** – RLS, API-anrop | Punkt 6 | Viktigt innan fler handlare. |
| 9 | **Loggning & import-fel** – robust spårning | Punkt 6 | Underlättar felsökning vid bulk-import. |

### 🟢 Fas 4: Skalbarhet för proffsen

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 10 | **XML-ingest** – importera från Blocket, Bytbil m.m. | Punkt 2 | Stort värde för seriösa handlare. |
| 11 | **Data-normalisering** – enhetliga fält (Diesel/D/Disel) | Punkt 2 | Krävs för bra filter efter import. |
| 12 | **Bild-processor** – kö, storleksändring | Punkt 2 | Krävs för tusentals bilder. |

### 🔵 Fas 5: UX & Analytics

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 13 | **Advanced Analytics** – grafer, konverteringsgrad | Punkt 5 | Dashboard blir mer användbart. |
| 14 | **Realtime-notiser** – webbläsar + e-post vid leads | Punkt 5 | E-post finns; webbläsar (PWA) ökar engagemang. |
| 15 | **Full-Text Search (utökad)** | 05-ROADMAP | Bättre sökresultat. |

### ⚪ Fas 6: Monetisering & SaaS (när produkten är mogen)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 16 | **Stripe-integration** – Brons/Silver/Guld | Punkt 3 | Kräver tydlig value prop först. |
| 17 | **Billing Portal** – fakturor, uppgradera | Punkt 3 | Följer på Stripe. |
| 18 | **Multi-tenancy/Roller** – inbjudna anställda | Punkt 3 | Viktigt för större handlare. |

### ⚪ Fas 7: Nice to have (produkt & design)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 19 | **Vattenstämpling** – logotyp på bilder | Punkt 2 | Kan vänta tills bild-processor finns. |
| 20 | **Push-notifikationer (PWA)** | 05-ROADMAP | Överlappar med Realtime-notiser. |
| 21 | **Server-side bildkomprimering** | 05-ROADMAP | Client-side fungerar; kan optimera senare. |
| 22 | **Om oss-sida** | 05-ROADMAP | Enkel content-sida. |
| 23 | **Favicon, SEO metadata** | 05-ROADMAP | Snabba vinster. |
| 24 | **Chatt-styling** – justera motpartens bubblor (ta bort border) | 05-ROADMAP | Design-polish. |
| 25 | **Email-notifikationer** – verifiera inställningar i Settings UI | 05-ROADMAP | E-post finns; UI för att slå av/på kan saknas. |
| 26 | **Filter pris/plats/datum** – utöka om inte redan täckt | 05-ROADMAP | Delvis finns; verifiera vad som saknas. |
| 27 | **Sortering** – pris, datum, relevans | 05-ROADMAP | Delvis finns; verifiera. |
| 28 | **Analytics-integration** (site-wide, GDPR) | 05-ROADMAP, GO_LIVE | Plausible/GA med consent_analytics. |
| 29 | **Båt-attribut** – filter längd i fot, båttyp m.m. (kategori Båtar) | 05-ROADMAP | Produktförbättring för båtannonser. |

### ⚪ Fas 8: Plattform & infrastruktur (GO_LIVE)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 30 | **Prestanda/Lighthouse** – laddningstider, score >80 | GO_LIVE | Kvalitetssäkring. |
| 31 | **Metadata** – title, description, Open Graph | GO_LIVE | SEO-bas. |
| 32 | **Sitemap & Robots.txt** (generell) | GO_LIVE | SEO. |
| 33 | **Uptime monitoring** – UptimeRobot/Pingdom | GO_LIVE | Övervakning. |
| 34 | **Logging** – events, error logs | GO_LIVE | Felsökning. |
| 35 | **Backup-strategi** – dokumentera | GO_LIVE | Supabase har backup; dokumentera procedur. |
| 36 | **Disaster Recovery Plan** | GO_LIVE | Vid större incidenter. |

### ⚪ Fas 9: Teknisk kvalitet (05-ROADMAP)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 37 | **TypeScript strict mode** | 05-ROADMAP | Type safety. |
| 38 | **Error boundaries** – React | 05-ROADMAP | Bättre felhantering. |
| 39 | **Rate limiting** – API-anrop | 05-ROADMAP | Skydd mot missbruk. |
| 40 | **CSP Headers** | 05-ROADMAP | Säkerhet. |
| 41 | **Unit tests** | 05-ROADMAP | Kvalitet. |
| 42 | **E2E tests** | 05-ROADMAP | Användarflöden. |
| 43 | **Accessibility testing** | 05-ROADMAP | EAA. |
| 44 | **Image optimization** (utökad) | 05-ROADMAP | Prestanda. |
| 45 | **Caching-strategier** | 05-ROADMAP | Prestanda. |
| 46 | **Bundle size** – analysera | 05-ROADMAP | Prestanda. |

### ⚪ Fas 10: Dokumentation & support

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 47 | **Teknisk dokumentation** – 01–04 uppdaterad | GO_LIVE | Underhåll. |
| 48 | **Användardokumentation/FAQ** | GO_LIVE | Användarstöd. |
| 49 | **Support-kanaler** – kontakt, process | GO_LIVE | Kundservice. |

### ⚪ Fas 11: Konfiguration (produktion)

| # | Uppgift | Källa | Motivering |
|---|---------|-------|------------|
| 50 | **SMTP för produktion** – egen provider (Alternativ B) | TODO_LOGIN | Supabase default har begränsningar. |
| 51 | **Email templates** – anpassa OTP | TODO_LOGIN | Produktionsklart. |
| 52 | **Email Confirmation Settings** – Enable email confirmations OFF (OTP) | TODO_LOGIN | Supabase Auth-inställning. |

---

### Sammanfattning – rekommenderad ordning

1. **Lead-center + status** → gör befintlig data användbar  
2. **Handlarprofil + sitemaps** → synlighet och trafik  
3. **Teknisk skuld** → middleware, säkerhet  
4. **Bulk-import** → när handlare börjar kräva det  
5. **Monetisering** → när ni har tillräckligt med värde att ta betalt för  

*Totalt 52 uppgifter i 11 faser (Fas 1–11).*

---

**Senast uppdaterad:** 2025-02-04
