# MijnSerenity Cloud 6.7.2

## Opgelost

- Bruggen, sluizen en POI's werden niet gevonden doordat de browser de
  openbare Overpass-kaartdienst niet betrouwbaar kon bereiken.
- Nieuwe Netlify-proxy's in `netlify.toml` voor twee Overpass-servers.
- De app probeert de eigen proxy, back-upproxy en daarna directe servers.

## Meer POI's langs de route

Smart Route zoekt nu ook naar:

- restaurants;
- cafés;
- supermarkten;
- toiletten;
- drinkwaterpunten;
- trailerhellingen;
- aanlegplaatsen;
- bezienswaardigheden.

Deze verschijnen in de tijdlijn, op de kaart, in het POI-overzicht en in GPX.

## Delen op iPhone en iPad

De knop heet nu `Deel GPX-route` en opent het normale iOS-deelvenster.
Daarmee kun je delen via AirDrop, Berichten, Mail, Bestanden en GPX-apps.

Geen nieuwe SQL nodig.
