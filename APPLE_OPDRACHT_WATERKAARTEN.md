# Apple Opdracht: Bewaar in MijnSerenity

Deze opdracht is eenmalig nodig omdat een iPhone/iPad-webapp in het iOS-deelmenu
niet rechtstreeks GPX-bestanden kan ontvangen. Daarna is de dagelijkse route:

**Waterkaarten → Route delen → Bewaar in MijnSerenity**

Er hoeft niets in Bestanden of iCloud Drive te worden opgeslagen.

## Vooraf

1. Upload MijnSerenity 7.2.0 naar GitHub/Netlify.
2. Voer `SQL_WATERKAARTEN_DIRECT_IMPORT_7_2_0.sql` één keer uit in Supabase.
3. Open MijnSerenity → Instellingen → Bootinstellingen.
4. Tik bij **Directe Waterkaarten-koppeling** op **Kopieer Opdrachtgegevens**.

## Opdracht maken op iPhone of iPad

1. Open **Opdrachten** en tik op **+**.
2. Geef de opdracht de naam **Bewaar in MijnSerenity**.
3. Open de details van de opdracht en zet **Toon in deelmenu** aan.
4. Beperk de ontvangen invoer tot **Bestanden**.
5. Voeg de actie **Haal naam op uit invoer van opdracht** toe.
6. Voeg de actie **Codeer met Base64** toe:
   - invoer: **Invoer van opdracht**;
   - regeleinden: uit/geen.
7. Voeg de actie **Haal inhoud van URL op** toe.

### URL

Gebruik de `Endpoint` uit de gekopieerde Opdrachtgegevens.

### Methode

`POST`

### Headers

Voeg de volgende vier headers toe:

- `apikey` → de gekopieerde waarde;
- `Authorization` → `Bearer ` gevolgd door dezelfde gekopieerde sleutel;
- `Content-Type` → `application/json`;
- `Prefer` → `return=representation`.

### Aanvraagtekst: JSON

Voeg deze velden toe:

- `p_token` → de persoonlijke importcode uit MijnSerenity;
- `p_file_name` → de magische variabele **Naam**;
- `p_file_base64` → de uitvoer van **Codeer met Base64**;
- `p_content_type` → `application/gpx+xml`.

8. Voeg als laatste **Open URL** toe met:

`https://mijnserenity.nl/?open=logbook&waterkaarten=check`

9. Bewaar de opdracht.

## Dagelijks gebruik

1. Maak of open een route in Waterkaarten.
2. Kies **Delen**.
3. Tik op **Bewaar in MijnSerenity**.
4. MijnSerenity opent automatisch en vult route, vertrek, bestemming, afstand en
   beschikbare routegegevens in.
5. Controleer de gegevens en tik op **Vaartocht opslaan**.

De laatste stap blijft bewust staan, zodat een geplande route niet per ongeluk als
reeds gevaren tocht in het logboek en de motoruren wordt verwerkt.

## Beveiliging

De persoonlijke importcode is lang en willekeurig. MijnSerenity bewaart alleen een
SHA-256-hash in de route-inbox. Gedeelde bestanden worden na zeven dagen automatisch
opgeruimd. Met **Nieuwe code** kun je de bestaande koppeling direct ongeldig maken.
