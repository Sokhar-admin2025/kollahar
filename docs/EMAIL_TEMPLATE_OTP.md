# Email Template - OTP Verifieringskod

Detta dokument beskriver email-meddelandet som skickas när användare registrerar sig och behöver verifiera sin e-post med en 6-siffrig kod.

## Avsändare – inte "Supabase"

Så att mailet **inte visas som från Supabase** i klienten (t.ex. iPhone Mail):

- I **Supabase Dashboard** → **Authentication** → **SMTP**: sätt **Sender name** till t.ex. **Kolla här!** eller **Kollahar.se**.
- Vid egen SMTP: använd **Sender email** från er domän (t.ex. `noreply@kollahar.se`).

Detaljer: `docs/SUPABASE_EMAIL_SETUP.md` (avsnitt "Avsändarnamn").

## Konfiguration i Supabase

Email-templaten konfigureras i Supabase Dashboard under **Authentication > Email Templates > Magic Link**.

**OBS:** Supabase använder "Magic Link" som standard, men vi använder OTP (One-Time Password) istället. Du behöver antingen:
1. Använda Supabase's inbyggda OTP-funktionalitet (rekommenderat)
2. Eller skapa en Edge Function för att skicka anpassade emails

## Email-innehåll

### Ämnesrad
```
Bekräfta ditt konto på Kollahär!
```

### Meddelande (Text-version)

```
Hej!

Du har precis skapat ett konto på Kollahär! - nya marknadsplatsen för användarna.

För att aktivera ditt konto, ange denna 6-siffriga kod:

[STOR, TYDLIG KOD: 123456]

Koden är giltig i 15 minuter.

Om du inte skapade detta konto kan du bortse från detta meddelande.

Välkommen till Kollahär!
```

### HTML-version (för anpassad Edge Function)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2C4638; font-size: 24px; margin: 0;">Kollahär!</h1>
  </div>

  <div style="background-color: #f2eeec; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
    <h2 style="color: #2C4638; margin-top: 0;">Bekräfta ditt konto</h2>
    
    <p>Hej!</p>
    
    <p>Du har precis skapat ett konto på <strong>Kollahär!</strong> - nya marknadsplatsen för användarna.</p>
    
    <p>För att aktivera ditt konto, ange denna 6-siffriga kod:</p>
    
    <div style="background-color: #ffffff; border: 2px solid #2C4638; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2C4638; font-family: monospace;">
        {{CODE}}
      </div>
    </div>
    
    <p style="font-size: 14px; color: #666;">Koden är giltig i 15 minuter.</p>
  </div>

  <div style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
    <p>Om du inte skapade detta konto kan du bortse från detta meddelande.</p>
    <p style="margin-top: 10px;">© 2026 Kollahär! Alla rättigheter reserverade.</p>
  </div>

</body>
</html>
```

## Variabler

- `{{CODE}}` - 6-siffrig verifieringskod (t.ex. "123456")
- `{{EMAIL}}` - Användarens e-postadress
- `{{EXPIRY}}` - Giltighetstid (15 minuter)

## Design-principer

1. **Enkel och kort**: Meddelandet är koncist och går direkt till saken
2. **Tydlig kod**: Koden visas stort och tydligt
3. **Säkerhet**: Information om vad man ska göra om meddelandet landat fel
4. **Branding**: Minimal branding, fokus på funktionalitet
5. **Responsiv**: Fungerar på både desktop och mobil

## Implementation

### Supabase Dashboard (Enklast)

1. Gå till Supabase Dashboard > Authentication > Email Templates
2. Välj "Magic Link" template (används för OTP)
3. Anpassa ämnesrad och innehåll enligt ovan
4. Använd `{{ .Token }}` för koden (Supabase's variabel)

### Edge Function (För full kontroll)

Om du vill ha full kontroll kan du skapa en Edge Function som:
1. Tar emot signup-event från Supabase
2. Genererar 6-siffrig kod
3. Sparar koden i databas med expiry-tid
4. Skickar email via tredjepartstjänst (SendGrid, Resend, etc.)

## Testning

Testa email-meddelandet genom att:
1. Skapa ett testkonto
2. Kontrollera att koden är 6 siffror
3. Verifiera att koden fungerar i verifieringssidan
4. Testa att koden går ut efter 15 minuter
