# CSV-importanalys: smistabil-se-2026-02-20.csv

**Datum:** 2025-02-05  
**Syfte:** Kartlägga vad som matchar Kollahärs import/API idag vs vad som saknas.

---

## 1. CSV Översikt

- **Rader:** ~24 data-rader (bilannonser från Smista Bil)
- **Källa:** Webscrape från smistabil.se/bilar-i-lager
- **Kategori:** Bilar (cars)

---

## 2. Kolumn-mappning: CSV → Kollahär listings

### ✅ Direkt match eller enkel transformation

| CSV-kolumn | Kollahär-fält | Kommentar |
|------------|---------------|-----------|
| `name` | `title` | T.ex. "Toyota ProAce" – direkt |
| `name` / `Car_Name` | – | Kan användas som title |
| `price` | `price` | "194 800 kr" → parsa till 194800 (ta bort mellanslag + "kr") |
| `description` / `Car_Description` | `description` | Kort text; Car_Description kan vara längre. Min 10 tecken. |
| `Car_Make` | `attributes.make` | "Toyota" – direkt |
| `Car_Model` | `attributes.model` | "ProAce" – direkt |
| `Year` | `attributes.year` | "2021" → 2021 (nummer) |
| `Mileage` | `attributes.mileage` | "7 757 mil" → 7757 (ta bort mellanslag + "mil") |
| `Fuel` | `attributes.fuel` | "Bensin", "Diesel", "El" – matchar. "Hybrid el/bensin" behöver mappning. |
| `Gearbox` | `attributes.gearbox` | "Automatisk" → mappa till "Automat" (Kollahär har Manuell/Automat) |
| `Color` | `attributes.color` | "Vit" – direkt |
| `Registration_Number` | `attributes.reg_nr` | "JFK70Z" – direkt |
| `Contact_Information_-_Email` | `contact_email` | info@smistabil.se – kolumn finns, ingen import-UI |
| `Contact_Information_-_Phone` | – | Finns ej i listings; kan läggas i description eller ny kolumn |
| `Seller_Name` | `contact_name` | "Smista Bil" – kolumn finns |
| `image`, `image_2`, `image_3`, `image_4`, `image_5` | `images[]` | Samla till array; Kollahär lagrar URL:er. Externa URLs – behöver download + upload till Storage? |
| `item_page_link` | `external_id` / `external_url` | Objekt-ID (18967842) för sync; external_url för källa |
| `category` | `category` | Alla är bilar → `'cars'` (fixvärde för denna CSV) |

### ⚠️ Kräver hantering eller mappning

| CSV | Kollahär | Åtgärd |
|-----|----------|--------|
| **location** | `location` | Saknas som explicit kolumn. `data6` = "Smista Bil i Upplands Väsby AB" – plats kan extraheras (t.ex. "Upplands Väsby"). |
| **Fuel:** "Hybrid el/bensin", "Hybrid el/diesel" | `attributes.fuel` | Kollahär har: Bensin, Diesel, El, Hybrid, Gas. Mappa "Hybrid el/bensin" → "Hybrid". |
| **Gearbox:** "Automatisk" | `attributes.gearbox` | Kollahär: "Automat", "Manuell". Mappa "Automatisk" → "Automat". |
| **Bilder** (externa URLs) | `images` | Kollahär förväntar URL:er till Supabase Storage. Extern URL behöver antingen: (a) download + upload till Storage, eller (b) stöd för externa bild-URL:er (kan påverka CORS/säkerhet). |
| **Prisformat** | – | "194 800 kr" – parsa. Hantera också "155 840 kr exkl. moms" (data) om relevant. |

### ❌ Finns inte i Kollahär / ingen motsvarighet

| CSV-kolumn | Kommentar |
|------------|-----------|
| `web_scraper_order`, `web_scraper_start_url` | Scraper-metadata – behövs inte för import |
| `data`, `data2`–`data9` | Övrig scrape-data (pris exkl moms, år, mil, växellåda, etc.) – delvis duplicerar andra kolumner |
| `pricecurrency` | Alltid "kr" – kan ignoreras |
| `item_page_title` | Duplicerar name/title |
| `Equipment_List` | Utrustning – kan in i description eller ev. nytt attribut |
| `Car_Listing_-_Tesla_Model_3_-_Battery_Health` | Modell-specifik – sällan använd |
| `Car_Listing_-_Volkswagen_ID_4_-_*` | Modell-specifika – sällan använd |
| `Contact_Information` (fri text) | Generell kontakttext – kan i description om önskat |

---

## 3. Vad Kollahär har idag

### Import/Bulk

- **import_logs** – tabell för import-resultat (success/error)
- **import-error-notify** – API som anropas vid fel (Supabase webhook)
- **external_id** – unikt per user för inventory-sync
- **Ingen färdig import/API** – ingen route eller UI som läser CSV eller bulk-skapar listings

### Listing-schema

- **Obligatoriskt:** title, description, price, category, location  
- **Valfritt:** images, attributes, bortskankes  
- **Extra:** contact_email, contact_name, external_id, external_url (finns i DB men inte i insert-schema/validator)

---

## 4. Handlingsplan

### Fas 1: Förberedelser (ingen kod)

1. **Besluta bildhantering**
   - Alternativ A: Ladda ner externa bilder, uppladda till Storage (rekommenderat)
   - Alternativ B: Låta externa URLs vara (kräver CORS/allowlist, mindre säkert)
2. **Plats-strategi**
   - Använd `data6` och extrahera ort (t.ex. "Upplands Väsby") till `location`
   - Eller hårdkoda för Smista Bil tills mer strukturerad data finns

### Fas 2: Kolumn-mappning (vid import-utveckling)

| Prioritet | Uppgift |
|-----------|---------|
| 1 | Mappa: name → title, price (parsa) → price, description → description |
| 2 | Mappa: Car_Make, Car_Model, Year, Mileage, Fuel, Gearbox, Color, Registration_Number → attributes |
| 3 | Mappa: Fuel "Hybrid el/bensin" → "Hybrid", Gearbox "Automatisk" → "Automat" |
| 4 | Bygg `location` från data6 (eller annan kolumn med platsinfo) |
| 5 | Samla image, image_2–5 till images[] |
| 6 | Mappa: Contact_Information_-_Email → contact_email, Seller_Name → contact_name |
| 7 | Använd item_page_link för external_id (objekt-ID) och external_url |

### Fas 3: Import-flöde

1. **Skapa import-API eller Server Action**
   - Acceptera CSV (eller JSON från parsed CSV)
   - Validera rader mot insertListingSchema + attributes
   - Anropa createListing (eller bulk-insert) per rad
   - Logga till import_logs
2. **Bildhantering**
   - Om externa URL:er: fetch → Supabase Storage upload → ersätt med Storage-URL i images
3. **external_id**
   - Sätt för deduplicering vid upprepad import (upsert-logik)

---

## 5. Sammanfattning

| Område | Status |
|--------|--------|
| Grundfält (title, price, description, category) | ✅ CSV har data; behöver parsing |
| Bilattribut (make, model, year, mileage, fuel, gearbox, color) | ✅ Matchar; Fuel + Gearbox kräver mappning |
| Plats (location) | ⚠️ Indirekt via data6, behöver parsing |
| Kontakt (contact_email, contact_name) | ✅ Finns i CSV och DB; ingen import-mappning idag |
| Bilder | ⚠️ Externa URL:er; behöver download + upload eller policy |
| Import/Bulk | ❌ Ingen implementerad import; import_logs + external_id finns |
