# Design tokens — bilar.kollahar.se

## Typografi
- Primärt typsnitt: Urbanist (Google Fonts)
- Vikter: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Laddas via next/font/google i layout.tsx

## Färgpalett
- Primär blå: #2563EB
- Primär blå hover: #1D4ED8
- Primär blå light: #EFF6FF
- Primär blå border: #BFDBFE
- Bakgrund sida: #F7F8FA
- Bakgrund kort: #FFFFFF
- Bakgrund subtle: #F8FAFC
- Text primär: #0F172A
- Text sekundär: #64748B
- Text hint: #94A3B8
- Border standard: #E2E8F0
- Border subtle: #F1F5F9
- Grön success: #16A34A
- Grön light: #F0FDF4
- Amber varning: #D97706
- Amber light: #FEF9C3
- Röd: #EF4444

## Komponenter
- Border radius kort: 12px
- Border radius litet: 8px
- Border radius pill: 20px
- Border width standard: 0.5px solid #E2E8F0
- Kort padding: 18px
- Gap grid standard: 16px
- Gap grid tight: 10px

## Annonskortet (marketplace)
- Grid: 5 kolumner desktop, 2 mobil
- Bildbild höjd: 100px
- Favorit-ikon: hjärta uppe till höger i bilden
- Badge "Kommande": visas endast om handlaren markerat det
- Pris: Urbanist 700, #2563EB

## Annonsdetaljsidan
- Layout: 2 kolumner (1fr 320px) + full bredd längst ned
- Vänster kolumn: Bildgalleri → Utrustning → Handlarkort → Annonsinfo
- Höger kolumn: Specifikationer → Beskrivning → Pris+CTA → Finansieringsmodul
- Full bredd: Fler bilar från handlaren (5 kort)
- Huvudbild höjd: 300px
- Thumbnails: 5 st, höjd 56px, +N overlay på sista
- Priser alltid inkl. moms

## Dealer dashboard
- Sidebar: 52px bred, bakgrund #0F172A
- Aktiv ikon: #2563EB
- Inaktiv ikon: #1E293B med stroke #64748B
- KPI-kort: 5 st i rad, background #F8FAFC
- Nedre sektion: 2 kolumner, gap 16px
- Tabellrader: font-size 13px, border-bottom 0.5px #F1F5F9

## Statusfärger leads
- Ny: #2563EB (blå)
- Kontaktad: #16A34A (grön)
- Kvalificerad: #D97706 (amber)
- Såld: #0F172A (mörk)
- Arkiverad: #94A3B8 (grå)

## Källbadge
- Main: background #EFF6FF, color #1D4ED8
- Bilar: background #F0FDF4, color #15803D
