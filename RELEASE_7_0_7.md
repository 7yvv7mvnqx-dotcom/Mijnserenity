# MijnSerenity Cloud 7.0.7 — pagina volgt de vinger

## Veel soepeler zijwaarts navigeren

Het horizontaal wisselen werkt nu als een echte paginacarrousel:

- de huidige pagina beweegt direct met je vinger mee;
- de volgende of vorige pagina komt tegelijkertijd in beeld;
- langzaam slepen geeft volledige controle;
- een korte snelle veeg wisselt ook van pagina;
- laat je te vroeg los, dan veert de pagina soepel terug;
- aan het begin en einde krijg je een lichte elastische weerstand;
- de overgang wordt vanaf de positie van je vinger afgemaakt.

## Verticaal scrollen blijft normaal

MijnSerenity bepaalt eerst of je horizontaal of verticaal beweegt:

- een verticale beweging scrolt gewoon door de pagina;
- een duidelijke horizontale beweging start de paginawissel;
- kaarten, camera, formulieren, modals en horizontale lijsten blijven
  uitgesloten;
- de buitenste schermranden blijven vrij voor iOS-gebaren.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
`page-swipe.js` en `page-swipe.css` vervangen de bestanden uit 7.0.6.

Geen nieuwe SQL nodig.
