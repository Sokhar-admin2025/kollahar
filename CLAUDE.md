# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sokhar** ("Kolla här!") is a Swedish marketplace platform (Blocket-style). UI text and code comments are in **Swedish**. Variable names, function names, and TypeScript identifiers are in English. Monorepo with two separate Next.js apps:

- **Main app** (`/` root): Customer-facing marketplace, runs on port 3000
- **Command Center** (`/command-center`): Internal admin portal for staff (separate Vercel project)

Before starting a new feature, consult [docs/01-SYSTEM_ARCHITECT.md](docs/01-SYSTEM_ARCHITECT.md).

## Commands

### Main App (root)
```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint
npm run analyze   # Bundle analysis (ANALYZE=true next build)
```

### Command Center (`/command-center`)
```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # ESLint
```

There are no automated tests in this codebase.

## Architecture

### Main App Structure
- **`app/`** – Next.js App Router pages and route handlers
- **`lib/features/<feature>/`** – Service layer (all DB queries and business logic live here, not in components)
- **`lib/supabase/`** – Three clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role)
- **`components/`** – Reusable UI components (atoms, organisms, layout)
- **`supabase/`** – DB migrations

**Dashboard centralization:** All user-specific views (My Ads, Favorites, Messages, Settings) are tabs within `/dashboard`. Do not create separate routes like `/favorites` unless explicitly requested.

**Service layer pattern:** UI components receive data via props and do not query Supabase directly. All DB access goes through `lib/features/<feature>/<feature>-service.ts`.

### Command Center Structure
- Lives entirely in `command-center/src/`
- Features: AI Cleaning Lab, System Health Monitor, User Management (impersonation), Lead Management
- Do not share UI code with the main app — copy logic or build small wrappers instead
- Communication between apps happens via Supabase (data) or explicit URLs, never shared UI code

### Supabase Clients
- Browser/Client Components: `createBrowserClient` from `lib/supabase/client.ts`
- Server Components / Server Actions: `createServerClient` from `lib/supabase/server.ts`
- Admin / sensitive ops: service role client from `lib/supabase/admin.ts`

## Critical Rules

### Command Center Imports
**Never use `@/` alias in `command-center/src/**`** — always use relative imports. This is required for Vercel builds since `command-center` is a subdirectory of the main repo.

```ts
// Correct
import { createClient } from "../lib/supabase/server";
import { parseEquipmentList } from "../../lib/parsers/equipment-parser";

// Wrong — breaks Vercel build
import { createClient } from "@/lib/supabase/server";
```

### Environment Variables
- Main app reads from root `.env.local` / its Vercel project
- Command Center has its own `command-center/.env.local` and a separate Vercel project
- When adding new env vars, decide which app uses them

### Security
- All tables must have RLS policies
- Always auth-check before sensitive operations
- Admin flows require audit logging
- Sensitive ops (service role key usage) must stay in server actions/route handlers

### Styling & Icons
- Tailwind CSS exclusively — no inline styles except edge cases
- `lucide-react` for all icons in both apps
- Main app: Clean, minimalist, mobile-first (lots of whitespace)
- Command Center: Neo-brutalist — thick borders (`border-2`/`border-4`), strong accent colors (yellow, green, orange), light backgrounds with contrast sections

### TypeScript
- Strict mode, no `any` types
- No untyped Supabase responses — use Zod validators
- Feature-specific types in `lib/features/<feature>/<feature>-types.ts`

## Keeping READMEs Updated

When adding new functionality, update the relevant README immediately after implementation.

**Main app** ([README.md](README.md)): Add a bullet to the `## Projektanteckningar` section using the existing format — bold feature name, colon, then a concise Swedish description:
```markdown
- **Funktionsnamn**: Kort beskrivning av vad som ändrades eller tillkom.
```

**Command Center** ([command-center/README.md](command-center/README.md)): Add or maintain a `## Projektanteckningar` section using the same convention as the main app.

Only document meaningful, user-facing or architecture-level changes — not internal refactors or bug fixes unless they change observable behavior.
