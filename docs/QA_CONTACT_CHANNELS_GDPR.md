# QA – Privacy-First kontaktkanaler (privatannonser)

Syfte: verifiera dataminimering och korrekt kanalvisning utan att skapa ny chattfunktion.

## Guardrails

- Endast befintlig chatt används (`contact_via_chat` styr synlighet).
- Minst en kontaktkanal måste vara aktiv (`chat`, `telefon`, `e-post`).
- Telefon/e-post visas endast när respektive flagga är aktiv.
- För icke-ägare ska inaktiva kontaktfält inte exponeras i annonsdata.

## Testscenarier (manuell)

1. **Privat – default vid skapa annons**
   - Förväntat: chat aktiv, telefon/e-post inaktiva.
   - Förväntat: formuläret kan skickas utan telefon/e-post när chat är aktiv.

2. **Privat – alla kanaler av**
   - Steg: stäng av chat, telefon och e-post.
   - Förväntat: inline-validering blockerar submit med fel "Välj minst en kontaktkanal."

3. **Privat – telefon aktiverad utan värde**
   - Steg: slå på "Visa telefon", lämna fält tomt.
   - Förväntat: valideringsfel och blockerad submit.

4. **Privat – e-post aktiverad utan värde**
   - Steg: slå på "Visa e-post", lämna fält tomt.
   - Förväntat: valideringsfel och blockerad submit.

5. **Detaljsida – endast aktiverade kanaler**
   - Steg: publicera annons med chat + telefon (utan e-post).
   - Förväntat: kontaktkort visar telefon, döljer e-post, chat-knapp syns.

6. **Detaljsida – chat av**
   - Steg: publicera annons med chat av men telefon/e-post på.
   - Förväntat: ingen chat-knapp; ersättningstext visas om att chat inte tas emot.

7. **Icke-ägare dataskydd**
   - Steg: öppna annons som annan användare/anon med `show_email=false` eller `show_phone=false`.
   - Förväntat: motsvarande kontaktvärde är null/ej exponerat till klienten.

## Regression

- Chattstart (`createConversationAction`) ska fortsatt skapa/öppna befintlig konversation.
- Såld annons ska fortsatt blockera kontaktknappar.
