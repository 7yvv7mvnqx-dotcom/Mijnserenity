# MijnSerenity Cloud 7.2.2

## Storage Safety

- POI-foto’s, routefoto’s en bonnetjes worden niet meer automatisch volledig gedownload bij aanmelden.
- Foto’s worden via lazy loading pas geladen wanneer ze in beeld komen.
- Signed URLs worden in geheugen en sessieopslag hergebruikt.
- Gelijktijdige aanvragen voor hetzelfde bestand worden samengevoegd.
- Routekaarten tonen een camera-icoon en laden de foto pas bij openen van de popup.
- Dashboardfoto gebruikt geen `Date.now()`-cachebreker meer.
- Realtime updates worden gedebounced.
- Dubbele initialisatie binnen vijf seconden wordt tegengehouden.
- Nieuwe uploads krijgen een lange browsercache omdat bestandsnamen uniek zijn.
- Instellingen tonen een Storage Safety-status met sessietellers.

## Behouden

- Home Assistant-dashboard met Ring, Hue, Sonos en Apple TV.
- Login-hotfix en PWA-herstel uit 7.2.2.
