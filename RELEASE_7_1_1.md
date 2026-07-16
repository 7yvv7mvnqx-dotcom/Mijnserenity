# MijnSerenity Cloud 7.1.1 — AIS boten volgen

## Nieuw AIS-scherm

De nieuwe pagina `📡 AIS` toont boten rond de actuele positie van Serenity.

Functies:

- interactieve OpenStreetMap-kaart;
- actuele AIS-posities binnen 5, 10, 20, 50 of 100 kilometer;
- automatisch verversen per 15, 30, 60 of 120 seconden;
- sorteren op afstand tot Serenity;
- naam, MMSI, snelheid, koers, heading en navigatiestatus;
- alarmmarkering voor boten binnen een instelbare afstand;
- boten zoeken op naam of MMSI;
- boten toevoegen aan `Mijn boten`;
- gevolgde boten blijven op de kaart en worden apart bijgewerkt;
- details met vlag, type, roepnaam, bestemming en ETA wanneer beschikbaar;
- Serenity-marker beweegt mee met de bekende GPS-positie.

## Veilige API-koppeling

AIS-gegevens worden via VesselAPI opgehaald door:

`netlify/functions/ais.mjs`

De API-sleutel wordt uitsluitend server-side gelezen uit:

`VESSELAPI_KEY`

De sleutel staat dus niet in de browsercode, de PWA of GitHub.

## Belangrijk

AIS is ondersteunende informatie. Niet iedere boot zendt AIS uit en gegevens
kunnen vertraagd of onjuist zijn. Gebruik altijd zicht, goed zeemanschap en
de officiële navigatiemiddelen aan boord.

## Installatie

Deze ZIP bevat voor het eerst een vereiste map:

`netlify/functions/ais.mjs`

Upload daarom de volledige mappenstructuur naar GitHub.

Daarna:

1. Maak een VesselAPI-account en API-sleutel.
2. Voeg in Netlify de omgevingsvariabele `VESSELAPI_KEY` toe.
3. Start een nieuwe deploy.
4. Sluit MijnSerenity volledig en open versie 7.1.1 opnieuw.

Geen nieuwe Supabase-SQL nodig.
