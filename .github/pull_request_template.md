## Sammanfattning

- **Vad ändras?**
  - [ ] Kort beskrivning av ändringen
- **Varför? (motivering / effekt)**  
  - [ ] Beskriv problemet eller målet som löses

## Tester

- [ ] Manuell test i lokal miljö (beskriv kort)
- [ ] Relevanta automatiska tester körda (`npm test`, `lint`, e2e etc.)
- [ ] Eventuella migrations körda lokalt mot dev-databas

## Säkerhet & GDPR

- [ ] Inga nya personuppgifter (PII) lagras, eller:
  - [ ] Nya PII-fält är motiverade och dokumenterade (varför behövs de?)
  - [ ] Tabeller med PII har RLS aktiverat
  - [ ] Foreign keys mot `auth.users(id)` har rätt `ON DELETE` (vanligen CASCADE, eller SET NULL om data ska bevaras anonymiserat)
- [ ] Frontend hämtar endast nödvändiga fält (ingen `select('*')` på tabeller med PII)
- [ ] Delete-account-flödet påverkas inte negativt (eller är uppdaterat vid behov)
- [ ] Ingen service role-nyckel eller andra hemligheter exponeras till klienten (`NEXT_PUBLIC_*`-regeln följs)

## Databas & migrations

- [ ] Nya tabeller har:
  - [ ] `enable row level security;`
  - [ ] RLS-policies för SELECT (och INSERT/UPDATE/DELETE där det behövs)
- [ ] Nya migrations är idempotenta och fungerar på både tom och befintlig databas

## UI/UX

- [ ] End-user-flöden testade (desktop)
- [ ] End-user-flöden testade (mobil / mindre skärm)
- [ ] Felmeddelanden är begripliga och användarvänliga (särskilt vid auth, radera konto, lead-flöden)

## Övrigt

- [ ] Dokumentation uppdaterad vid behov (README, docs/*.md, changelog)
- [ ] QA-/checklistor uppdaterade om beteendet ändrats (t.ex. delete-account, leads, dashboard)

