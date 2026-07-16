# MijnSerenity Cloud 7.0.8 — native iPhone/iPad-veegbediening

## Volledig opnieuw opgebouwd

De handgemaakte sleepanimatie uit 7.0.7 is vervangen door de ingebouwde
scrolltechniek van Safari en iOS.

Daardoor:

- beweegt de pagina direct en continu met je vinger mee;
- verschijnt de volgende of vorige pagina tegelijk;
- werkt vertragen, versnellen en loslaten zoals een normale iPad-carrousel;
- gebruikt de overgang de eigen momentum- en veegberekening van iOS;
- zijn er geen zware JavaScript-berekeningen meer tijdens iedere vingerbeweging;
- klikt iedere pagina vanzelf exact op zijn plaats.

## Horizontaal én verticaal

Iedere hoofdpagina heeft nu een eigen verticale scrollpositie, terwijl de
volledige paginabalk horizontaal beweegt.

- horizontaal vegen wisselt van pagina;
- verticaal vegen scrolt door de inhoud;
- de vaste navigatie onderaan loopt automatisch mee;
- tikken op een navigatieknop schuift soepel naar die pagina;
- kaarten, formulieren en camerabeelden behouden hun eigen bediening.

## Techniek

De pagina’s staan in één native horizontale `scroll-snap`-balk. Safari en
iOS voeren daardoor de beweging zelf uit in plaats van JavaScript.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
`page-swipe.js` en `page-swipe.css` moeten de versies uit 7.0.7 vervangen.

Geen nieuwe SQL nodig.
