# MijnSerenity Cloud 7.1.0 — radarbeelden op je locatie

## Live neerslagradar toegevoegd

Op de pagina `Weer` staat nu een interactieve radarkaart rond de actuele
positie van Serenity.

De radarkaart toont:

- de huidige GPS-positie van Serenity;
- OpenStreetMap als ondergrond;
- de beschikbare neerslagradarbeelden van de afgelopen periode;
- eventueel beschikbare korte radarverwachtingen;
- datum en tijd van ieder radarbeeld;
- een schuifbalk om een specifiek moment te bekijken;
- automatische animatie met afspelen en pauzeren;
- een knop om opnieuw op Serenity te centreren;
- een knop om de actuele radar direct te vernieuwen.

## Automatisch bijwerken

- Radarmetadata wordt iedere 5 minuten gecontroleerd.
- Tijdens Live varen beweegt de Serenity-marker mee met de nieuwste GPS-positie.
- De locatie wordt iedere 15 seconden bijgewerkt zolang de weerpagina zichtbaar is.
- De kaart blijft handmatig verschuifbaar en zoombaar.
- Bij tijdelijk geen radarverbinding blijft de gewone weerpagina werken.

## Bronnen en gebruik

De radarbeelden komen van RainViewer en de kaartondergrond van
OpenStreetMap. De verplichte bronvermelding is zichtbaar onder en in de kaart.

RainViewer is een publieke best-effort radardienst; beschikbaarheid en
dekking kunnen per moment verschillen.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
Upload ook `weather-radar.js` en `weather-radar.css`.

Geen nieuwe SQL nodig.
