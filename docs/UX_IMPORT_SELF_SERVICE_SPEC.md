# UX-spec: XML/CSV Import Self-Service

**Referens:** Annonssida `/annons/[id]`, design language, befintlig import  
**Syfte:** Strukturera framtida XML/CSV-importverktyg så att det följer Kollahärs UX/UI och design language.

---

## 1. Design Language (sammanfattning)

### Färger
| Token | Värde | Användning |
|-------|-------|------------|
| `brand-green` | #2C4638 | Primär CTA, rubriker, ikoner, badges |
| `brand-beige` | #f2eeec | Bakgrund, korta sektioner |
| `brand-text` | #1A1A1A | Brödtext |
| `brand-text/70`, `/60` | Opacity | Sekundär text, metadata |

### Typografi
- **Display:** Knewave (cursive) – rubriker, logo
- **Body:** DM Sans – brödtext, formulär
- **Letter-spacing:** Tätare på display (0.0425em)

### Komponenter
- **Kort:** `bg-white rounded-xl shadow-md border border-gray-200`
- **Knappar:** `rounded-xl`, primary = `bg-brand-green text-white shadow-lg`
- **Ikoner:** Lucide, `text-brand-green` för accent
- **Badges:** `bg-brand-green/95 text-white px-3 py-1 rounded-full text-xs font-bold uppercase`

### Layout
- **Max bredd:** `max-w-4xl` (annons), `max-w-xl` (import)
- **Spacing:** `py-10 px-4`, `gap-8` (grid), `mb-6` mellan sektioner
- **Tillbaka-länk:** `text-sm font-medium text-brand-text/70 hover:text-brand-green transition`

---

## 2. Annonssida som referens

### Struktur (2-kolumns grid)
1. **Vänster:** Bildgalleri (aspect-square, thumbnails under)
2. **Höger:** Info-kort med:
   - Metadata (plats, datum)
   - Rubrik (h1, `text-3xl font-bold text-brand-green`)
   - Pris (stort, högerjusterat)
   - Beskrivning (prose)
   - Attribut-grid (ikon + label + värde per ruta)
   - Säljarkort (avatar, namn, plats)
   - CTA-knapp

### Attribut-visning (bilar)
- Grid: `grid-cols-2 md:grid-cols-3 gap-3`
- Varje attribut: `bg-brand-beige/50 p-3 rounded-lg border border-gray-200`
- Ikon (Calendar, Gauge, Fuel, etc.) + label (text-xs) + värde (text-sm font-semibold)

### Feedback
- Laddning: `Loader2 animate-spin text-brand-green`
- Fel: `bg-red-600 text-white rounded-full shadow-lg`
- Success: `bg-brand-green text-white rounded-full` (toast)

---

## 3. Import Self-Service – UX-struktur

### Flöde (steg-för-steg)
1. **Välj fil** – Ladda upp CSV/XML
2. **Förhandsgranska** – Visa parsad data, mappning, eventuella varningar
3. **Mappning** – Vid oklarheter: låt användaren välja (t.ex. "Automatisk" → Automat/Manuell)
4. **Validering** – Visa fel per rad, möjlighet att rätta
5. **Import** – Kör import, visa resultat

### Sidlayout (enligt annons)
```
┌─────────────────────────────────────────────────────────┐
│ ← Tillbaka till Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Importera XML/CSV                    [Steg 1 av 4]     │
│  Ladda upp din fil och vi guidar dig genom mappningen.  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Drag & drop eller klicka för att välja fil]    │   │
│  │  CSV, XML (max 5 MB)                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Nästa steg]                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Mappning-vy (steg 2–3)
- **Vänster:** Kolumnlista från fil med exempelvärden
- **Höger:** Kollahär-fält med dropdown (titel, pris, beskrivning, märke, modell, …)
- **Pedagogisk text:** "Vi tolkar '194 800 kr' som 194800. Ändra om något ser fel ut."
- **Oklarheter:** Highlight + fråga: "Växellåda 'Automatisk' – mappa till Automat eller Manuell?"

### Förhandsgranskning (steg 4)
- Tabell med första 5–10 rader
- Kolumner: Titel, Pris, Märke, Modell, Status (✓ / ⚠️ / ✗)
- Sammanfattning: "24 rader redo, 2 behöver justering"

---

## 4. Komponenter att återanvända

| Komponent | Användning |
|-----------|------------|
| `Button` | Primär CTA (Importera, Nästa), sekundär (Tillbaka, Avbryt) |
| `Loader2` | Laddning under parsing/import |
| Kort-struktur | Varje steg i en `bg-white rounded-xl shadow-md border` |
| Attribut-grid | Visa mappning (källa → mål) i rutor |
| Toast/feedback | Success/error som på annonssidan |

---

## 5. Globala UX-principer

1. **Konsekvent tillbaka-navigation** – Alltid synlig, samma stil som annonssidan
2. **Stegindikator** – "Steg 1 av 4" för långa flöden
3. **Pedagogisk ton** – Korta förklaringar, inte tekniskt språk
4. **Felhantering** – Visa fel per rad, inte bara "Import misslyckades"
5. **Tillgänglighet** – `aria-live` för dynamiskt innehåll, `focus:ring` på interaktiva element
6. **Mobil** – En kolumn på små skärmar, samma som annonssidan

---

## 6. CSS/Tailwind – återanvänd

```css
/* Bakgrund */
min-h-screen bg-brand-beige

/* Kort */
bg-white rounded-xl shadow-md border border-gray-200 p-6

/* Rubrik */
text-3xl font-display text-brand-green

/* Sekundär text */
text-brand-text/70 text-sm

/* Attribut-ruta */
bg-brand-beige/50 p-3 rounded-lg border border-gray-200

/* CTA */
Button variant="primary" className="w-full py-4"
```

---

## 7. Nästa steg (implementation)

1. Skapa `/dashboard/import` med stegindikator och filuppladdning
2. Bygg parser-preview (visa kolumner + exempelvärden)
3. Lägg till mappnings-UI (dropdown per kolumn)
4. Lägg till valideringsvy med rad-fel
5. Anslut till befintlig import-API (utöka för XML)
