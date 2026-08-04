# MijnSerenity 7.9.8 — Stabiliteit en navigatie

Deze versie richt zich op knoppen, paginawissels en iPhone/iPad-stabiliteit.

## Opgelost

- Vaarwegberichten, Kosten en Boot & delen openen nu als normale pagina's in dezelfde paginapager.
- Er is steeds exact één pagina actief; gecontroleerd links/rechts vegen blijft mogelijk zonder dat iOS een klik terugdraait.
- De koptekst en paginatitel blijven gelijk aan de werkelijk zichtbare pagina.
- Secundaire pagina's markeren de knop Meer correct.
- Alle bovenste tabknoppen gebruiken voortaan één centrale navigatiefunctie.
- Status vernieuwen bij accountgoedkeuring gebruikt geen onbetrouwbare globale browser-event meer.
- PWA-snelkoppelingen `?open=map` en `?open=logbook` worden uitgevoerd.
- De service worker geeft bij ontbrekende netwerkcache een nette offline-respons in plaats van een lege fout.
- RWS-knoppen lopen via dezelfde navigatieroute als de rest van de app.

## Controle

- JavaScript-syntax van alle modules gecontroleerd.
- Alle statische HTML-id's gecontroleerd op dubbelen.
- Alle vaste `onclick`-functies gecontroleerd op bestaan.
- Alle 15 hoofdpagina's automatisch geopend in een headless-browsertest.
