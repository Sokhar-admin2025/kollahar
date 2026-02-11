# Miljöer: Dev / Preview / Production

Detta dokument beskriver hur de tre miljöerna ska konfigureras för Kolla här!

| Miljö | Syfte | Var | Supabase |
|-------|-------|-----|----------|
| **Dev** | Lokal utveckling | `localhost:3000` | Lokalt projekt eller dev-projekt |
| **Preview** | Testa PR innan merge | Vercel Preview URL | Preview-projekt eller samma som dev |
| **Production** | Live webbplats | Din domän | Produktionsprojekt |

---

## 1. Dev (Lokal utveckling)

### Setup

1. **Skapa `.env.local`** (kopiera från `.env.example`):
   ```bash
   cp .env.example .env.local
   ```

2. **Fyll i variablerna** med ditt lokala/dev Supabase-projekt:
   - `NEXT_PUBLIC_SUPABASE_URL` – från Supabase Dashboard → Project Settings → API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` – service_role key (för delete-account m.m.)

3. **Kör appen**:
   ```bash
   npm run dev
   ```

4. **Kör migrationer** mot dev-databasen:
   ```bash
   supabase db push
   # eller: supabase link + supabase db push
   ```

---

## 2. Preview (Vercel Preview)

Preview-deployments skapas automatiskt vid varje PR/push till icke-main-branches.

### Setup i Vercel

1. Gå till **Vercel Dashboard** → Ditt projekt → **Settings** → **Environment Variables**

2. **Lägg till variabler** – välj miljö: **Preview** (inte Production):

   | Namn | Värde | Miljö |
   |------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Din Preview-Supabase URL | Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview anon key | Preview |
   | `SUPABASE_SERVICE_ROLE_KEY` | Preview service_role key | Preview |

3. **Supabase-projekt för Preview**
   - **Alternativ A:** Använd samma projekt som Dev (bra för små team)
   - **Alternativ B:** Skapa eget Supabase-projekt för Preview (isolering, säkrare)

4. **Migrationer i Preview-databasen**
   - Kör `supabase db push` med Preview-projektet länkat, eller
   - Kör migrationer manuellt i Supabase SQL Editor för Preview-projektet

---

## 3. Production (Live)

### Setup i Vercel

1. Gå till **Vercel Dashboard** → Ditt projekt → **Settings** → **Environment Variables**

2. **Lägg till variabler** – välj miljö: **Production**:

   | Namn | Värde | Miljö |
   |------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Din Production-Supabase URL | Production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Production |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production service_role key | Production |

3. **Supabase-projekt för Production**
   - Använd **egnat** produktionsprojekt (inte dev/preview)
   - Köra alla migrationer innan go-live
   - Konfigurera email-templates, storage, RLS enligt GO_LIVE_CHECKLIST.md

4. **Kritiskt**
   - Använd aldrig dev/test-nycklar i Production
   - Verifiera att RLS är aktiverat och korrekt konfigurerat
   - Kontrollera att `listing-images`-bucketen finns och har rätt policies

---

## Översikt: Vercel Environment Variables

I Vercel kan du sätta olika värden per miljö:

| Variabel | Development (lokalt) | Preview | Production |
|----------|----------------------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Vercel Preview | Vercel Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Vercel Preview | Vercel Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | Vercel Preview | Vercel Production |

**Viktigt:** Vercel "Development" = lokala env vars när du kör `vercel dev`. För riktig lokal utveckling använd alltid `.env.local`.

---

## Bilder (Next.js Image)

Supabase storage-hostname måste tillåtas i `next.config.ts`. Om du har **olika Supabase-projekt** per miljö (olika hostnames), lägg till alla i `remotePatterns`:

```ts
// next.config.ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'xxx-dev.supabase.co', pathname: '/**' },
    { protocol: 'https', hostname: 'xxx-preview.supabase.co', pathname: '/**' },
    { protocol: 'https', hostname: 'xxx-prod.supabase.co', pathname: '/**' },
  ],
},
```

Om alla miljöer använder **samma** Supabase-projekt räcker en hostname.

---

## Checklista före go-live

- [ ] Dev: `.env.local` konfigurerad, appen kör lokalt
- [ ] Preview: Vercel Preview-variabler satta, testa en PR
- [ ] Production: Vercel Production-variabler satta
- [ ] Production: Supabase-projekt för produktion, alla migrationer körda
- [ ] Production: Email-templates, storage, RLS verifierade (se GO_LIVE_CHECKLIST.md)
