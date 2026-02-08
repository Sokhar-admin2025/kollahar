# 🚀 Start Här - Kollahär Marketplace

Välkommen till Kollahär! Detta är din guide för att komma igång med projektet.

## 📋 Projektets Syfte & Vision

**Kollahär** är en modern marknadsplats (Blocket-stil) där användare kan köpa och sälja produkter. Projektet är byggt med fokus på:

- **Säkerhet först**: Row Level Security (RLS), autentisering och validering
- **Användarvänlighet**: Ren, minimalistisk design med mycket whitespace
- **Tillgänglighet**: EAA-kompatibel design med fokus på tangentbordsnavigation och skärmläsare
- **Prestanda**: Server Components där det är möjligt, optimerad bildhantering

### Designfilosofi

- **Mobile-first**: Alla komponenter är designade för mobil först
- **Vimla-stil**: Tydlig typografi, mycket whitespace, minimalistisk
- **Ton**: Professionell, hjälpsam, rolig och tydlig

## 🛠 Tech Stack Översikt

| Teknologi | Version | Användning |
|-----------|---------|------------|
| **Next.js** | 16.0.10 | React-framework med App Router |
| **TypeScript** | ^5 | Typ-säkerhet |
| **Supabase** | ^2.87.3 | Backend (Auth, Database, Storage) |
| **Tailwind CSS** | ^4 | Styling |
| **Lucide React** | ^0.561.0 | Ikoner |

### Viktiga Paket

- `@supabase/ssr`: För korrekt cookie-hantering i Next.js
- `@supabase/auth-helpers-nextjs`: Auth-hjälpfunktioner
- `next/image`: Optimerad bildhantering

## 🏃 Hur Man Startar Lokalt

### Förutsättningar

- Node.js 18+ installerat
- Supabase-projekt skapat med rätt miljövariabler

### Steg-för-steg

1. **Klona och installera dependencies**
   ```bash
   npm install
   ```

2. **Konfigurera miljövariabler**
   
   Skapa en `.env.local` fil i root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=din_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=din_anon_key
   ```

3. **Starta utvecklingsservern**
   ```bash
   npm run dev
   ```

4. **Öppna i webbläsaren**
   
   Gå till [http://localhost:3000](http://localhost:3000)

### Bygga för Produktion

```bash
npm run build
npm start
```

## 📁 Mappstruktur Översikt

```
kollahar/
├── app/                    # Next.js App Router
│   ├── annons/[id]/       # Detaljsida för annonser
│   ├── components/         # React-komponenter
│   │   ├── atoms/         # Små, återanvändbara komponenter (Button)
│   │   └── organisms/     # Större komponenter (Footer)
│   ├── dashboard/         # Användardashboard
│   │   ├── create/        # Skapa ny annons
│   │   ├── edit/[id]/     # Redigera annons
│   │   ├── favorites/     # Sparade favoriter (separat sida)
│   │   ├── messages/      # Meddelanden/chatt
│   │   └── settings/      # Användarinställningar
│   ├── lib/               # Hjälpfunktioner & konfiguration
│   ├── login/             # Inloggningssida
│   ├── services/          # Service-lager (API-anrop)
│   ├── types/              # TypeScript-typer
│   └── page.tsx            # Startsida
├── lib/                    # Delade bibliotek
│   ├── supabase/          # Supabase-klienter (client/server)
│   └── constants.ts        # Konstanter
├── docs/                   # Dokumentation (denna mapp)
├── supabase/
│   └── migrations/        # Databasmigreringar
└── public/                 # Statiska filer
```

### Viktiga Mappar Förklaras

- **`app/components/`**: Alla UI-komponenter, organiserade efter Atomic Design-principer
- **`app/services/`**: Kvarvarande API-abstraktioner (tomt efter flytt). Listing-data via `lib/features/listings/listing-service.ts`, meddelanden via `lib/features/messages/message-service.ts` och `app/actions/message-actions.ts`.
- **`lib/supabase/`**: Supabase-klienter för client/server-kontext
- **`app/lib/content.ts`**: Centraliserad text-hantering (SOURCE OF TRUTH för alla texter)

## 🎯 Viktiga Koncept

### Dashboard Centralisering

**VIKTIGT**: Alla användarspecifika listor (Mina Annonser, Favoriter, Sålda, Meddelanden) ska implementeras som **tabs eller sektioner** inom `/dashboard`-sidan. Skapa INTE separata sidor (som `/favorites` eller `/my-ads`) om inte explicit efterfrågat.

### Supabase Auth

- **Client Components**: Använd `createBrowserClient` från `@supabase/ssr`
- **Server Components**: Använd `createServerClient` från `@supabase/ssr`
- **Middleware**: Skyddar `/dashboard`-routes och redirectar till `/login` om inte inloggad

### Bildhantering

- Alla annonsbilder lagras i `listing-images`-bucketen
- Max 5 bilder per annons
- Max 2MB per bild
- Bilder komprimeras och optimeras automatiskt

## 📚 Ytterligare Dokumentation

- **[Systemarkitektur](./01-SYSTEM_ARCHITECT.md)**: Djupgående systemöversikt med flödesscheman
- **[Backend & Databas](./02-BACKEND_DATABASE.md)**: Server Actions, Supabase Schema, RLS Policies
- **[Frontend & UI](./03-FRONTEND_UI.md)**: Designsystem, komponenter, sidstruktur
- **[Changelog](./04-CHANGELOG.md)**: Versionshistorik och ändringar
- **[Roadmap & Go-Live Checklist](./05-ROADMAP.md)**: Planerade features, tekniska förbättringar och go-live-krav

## 🆘 Felsökning

### "Multiple GoTrueClient" Varningar

Detta händer när Supabase-klienter instansieras flera gånger. Lösning:

1. Skapa klienten **utanför** komponenten (för client components)
2. Använd `@supabase/ssr` korrekt med `createBrowserClient` eller `createServerClient`

### Bilder laddas inte upp

- Kontrollera att `listing-images`-bucketen finns i Supabase
- Verifiera att RLS-policies tillåter upload för autentiserade användare
- Kolla konsolen för felmeddelanden

### Auth fungerar inte

- Verifiera miljövariabler i `.env.local`
- Kontrollera att Supabase Auth är aktiverat i projektet
- Se till att cookies fungerar korrekt (använd `@supabase/ssr`)

## 🎓 Nästa Steg

1. Läs [Systemarkitektur](./01-SYSTEM_ARCHITECT.md) för att förstå dataflöden
2. Kolla [Backend-dokumentationen](./02-BACKEND_DATABASE.md) för att förstå databasstrukturen
3. Utforska [Frontend-dokumentationen](./03-FRONTEND_UI.md) för att lära dig komponentstrukturen

---

**Glad kodning! 🚀**
