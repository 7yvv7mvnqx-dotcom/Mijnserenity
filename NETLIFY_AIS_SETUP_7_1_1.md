# Eenmalige AIS-instelling voor MijnSerenity 7.1.1

## 1. VesselAPI-sleutel

Maak een account bij VesselAPI en maak een API key aan. De gekozen
abonnementsvorm en de terrestrische AIS-dekking bepalen welke actuele
posities beschikbaar zijn.

## 2. Sleutel veilig in Netlify zetten

Open het MijnSerenity-project in Netlify:

Project configuration → Environment variables → Add a variable

Naam:

VESSELAPI_KEY

Waarde:

jouw VesselAPI-sleutel

Plaats de sleutel nooit in `index.html`, `ais-page.js`, GitHub of Supabase.

## 3. Nieuwe deploy

Een wijziging van een Netlify-omgevingsvariabele wordt actief na een nieuwe
deploy. Controleer daarna onder Functions of `ais` is gepubliceerd.

## 4. Testen

Open MijnSerenity → 📡 AIS.

Bij een werkende koppeling verdwijnt de gele instelkaart en worden AIS-boten
rond de GPS-positie opgehaald.

## Problemen

- `AIS-databron nog niet ingesteld`: variabele ontbreekt of deploy is niet opnieuw gestart.
- `feature_not_available`: de gebruikte VesselAPI-abonnementsvorm ondersteunt de gevraagde functie niet.
- Geen boten: er zijn geen recente terrestrische AIS-posities binnen het gekozen gebied of de dekking is beperkt.
- 429-fout: wacht tot de aangegeven rate-limitperiode voorbij is.
