# MijnSerenity Cloud 7.0.9 — Mission Control en live weer

## Mission Control opnieuw ingericht

- Rustiger hoofdscherm met één duidelijke gereedheidsscore.
- Vijf overzichtsblokken:
  - vertrek;
  - data;
  - weer;
  - systeem;
  - backup.
- Acties zijn ronde iconen zonder zichtbare tekst.
- Mission Control-tabs zijn icon-only.
- Statusinformatie staat naast de iconen en is daardoor sneller leesbaar.
- De weerstatus verschijnt ook direct in Mission Control.

## Nieuwe live weerpagina

De nieuwe pagina `Weer` gebruikt de actuele GPS-positie van Serenity en toont:

- huidige temperatuur en gevoelstemperatuur;
- weersituatie;
- windrichting, windsnelheid en windstoten in Beaufort en km/u;
- neerslag en kans op neerslag;
- zicht, bewolking, luchtdruk en luchtvochtigheid;
- zonsopkomst en zonsondergang;
- verwachting per uur voor de komende 12 uur;
- verwachting per dag voor de komende 7 dagen;
- automatisch vaaradvies en aandachtspunten.

Het weer wordt direct opgehaald wanneer de pagina opent en daarna iedere
5 minuten gecontroleerd. Bij tijdelijk geen internet blijft de laatst
opgehaalde informatie zichtbaar.

## Icon-only navigatie

De vaste navigatie onderaan toont alleen nog duidelijke pictogrammen.
Alle knoppen houden onzichtbare toegankelijkheidslabels en titels.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
Upload ook `weather-page.js` en `weather-page.css`.

Geen nieuwe SQL nodig.
