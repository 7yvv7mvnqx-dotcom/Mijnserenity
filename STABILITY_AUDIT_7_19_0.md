# MijnSerenity 7.19.0 — Stability audit

Datum: 27 augustus 2026

## Doel

De opstart- en dashboardketen vereenvoudigen na problemen met halve pagina's, vastzittende navigatie, wisselende builds, portrait-breedte in landscape en terugkerende login/update-schermen.

## Hoofdoorzaken die zijn verwijderd

- Meerdere UI-generaties werden tegelijk geladen: legacy dashboard, pager, Simple UI, Captain Experience, compacte navigatie, Marine Glass en Serenity Control Dashboard.
- `orientation-layout-71835.js` schreef breedtes inline terug op html/body/main/dashboard/nav en observeerde de volledige DOM.
- `navigation-compact.js` combineerde VisualViewport, resize, orientationchange, MutationObserver, ResizeObserver en herhaalde correctierondes.
- `start-dashboard-71510.js` bevatte verborgen dashboardpolling, body-wide observers, iPad-CSS-injectie en extra dashboardwidgets.
- `victron-energy-71559.js` draaide een 2-seconden renderpoll, 3-seconden DOM-scan en observers op energiewaarden.
- `start-battery-soc-71822.js` observeerde het volledige dashboard en pollde elke 5 seconden.
- `tank-systems-climate-71823.js` pollde elke 5 seconden.
- Een eerdere build laadde dezelfde responsive stylesheet via meer dan één loader.
- De service worker liep nog achter op de zichtbare applicatiebuild.

## Nieuwe architectuur

- Build: `7.19.0`, assettoken `719000`.
- Eén bootstrap: `auth-bootstrap.js`.
- Eén huidige startdashboard: Marine Glass via `dashboard-pro-71531-loader.js`.
- Eén responsive shell: `marine-glass-mobile-7184.css`.
- Geen JavaScript dat appbreedtes of portrait/landscape-afmetingen forceert.
- Onderste navigatie wordt uitsluitend met CSS gepositioneerd.
- Pager- en navigatie-hotfixes zijn compatibiliteitsstubs zonder repair-loops.
- Zware paginamodules worden lazy geladen wanneer de gebruiker die pagina opent.
- Alarm/push blijft als veilige achtergrondfunctie actief.
- Victron, startaccu en klimaat zijn event-driven; alleen VRM-netwerkrefresh blijft op rustige intervallen.
- Service worker cache: `mijnserenity-7.19.0-stable`.

## Bewust tijdelijk niet geladen op Start

De oude alternatieve Serenity Control Dashboard-laag en de daaraan gekoppelde MultiPlus-bedieningskaart worden niet tijdens Start geladen. MultiPlus-bediening moet na bevestigde stabiliteit rechtstreeks in de Marine Glass energiekaart worden geïntegreerd, zonder tweede dashboardlaag.

## Regel voor toekomstige wijzigingen

Nieuwe functies mogen geen documentbrede `MutationObserver`, inline appbreedtes, tweede dashboardcontainer, tweede navigatie-eigenaar of permanente snelle polling toevoegen. Gebruik events, bounded retries en lazy loading per pagina.
