# Stabiliteitscontrole MijnSerenity 7.9.8

## Gevonden hoofdoorzaken

1. **Vaarwegberichten, Kosten en Boot & delen stonden buiten de iPhone/iPad-pager.**
   De pager zette zichzelf na een klik opnieuw zichtbaar en verborg deze pagina's weer. Daardoor leek een knop niets te doen of sprong de app terug naar Start.

2. **De paginakop liep achter op de zichtbare pagina.**
   De pager gebruikte een oudere navigatiefunctie en sloeg de kop-/titelupdate over. Daardoor kon bijvoorbeeld Kaart zichtbaar zijn terwijl bovenaan nog Weer stond.

3. **Secundaire pagina's hadden geen actieve navigatieknop.**
   AIS, Weer, Techniek en andere pagina's markeerden in de compacte navigatie niet automatisch Meer.

4. **Horizontaal scrollen en klikken konden elkaar op iPhone/iPad kruisen.**
   De app gebruikte een brede horizontale scrollcontainer onder alle pagina's. Een viewport- of scroll-event kon een zojuist uitgevoerde klik terugdraaien.

5. **De bovenste tabknoppen gebruikten verschillende navigatieroutes.**
   Sommige tabknoppen openden alleen een sectie en sloegen paginalogica of initialisatie over.

6. **Status vernieuwen gebruikte een niet-standaard globale browser-event.**
   Dit werkt niet in alle browsers betrouwbaar.

## Uitgevoerde correcties

- Alle 15 hoofdpagina's zitten nu in dezelfde beheerde pager.
- Er is steeds exact één actieve pagina.
- Links/rechts vegen gebeurt via een gecontroleerd swipegebaar en niet meer via een horizontale scrolllaag onder knoppen en formulieren.
- De zichtbare pagina, koptekst, documenttitel en actieve navigatieknop worden als één geheel bijgewerkt.
- Meer wordt actief bij alle secundaire pagina's.
- Alle bovenste tabs gebruiken `captainNavigate()`.
- Vaarwegberichten gebruiken dezelfde centrale navigatie.
- PWA-snelkoppelingen naar Kaart en Logboek worden verwerkt.
- De service worker heeft een veilige offline-fallback.

## Automatische controle

- Alle JavaScript-bestanden: syntactisch geldig.
- Dubbele HTML-id's: geen.
- Ontbrekende lokale bestanden: geen.
- Ontbrekende vaste onclick-functies: geen.
- Automatisch geopend en gecontroleerd:
  - Start
  - Varen
  - AIS
  - Weer
  - Vaarwegberichten
  - Kaart
  - Reisplanner
  - Home Assistant
  - Techniek
  - Logboek
  - POI's
  - Kosten
  - Financieel
  - Instellingen
  - Boot en delen
- Meer-menu, onderste navigatie, IVMS-snelknoppen en Terug naar Start getest zonder JavaScript-fouten.
