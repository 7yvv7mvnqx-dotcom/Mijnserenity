# MijnSerenity Cloud 6.9.3 — Havens bij mijn locatie

## Opgelost

De landelijke import leverde geen resultaten op omdat openbare kaartgegevens
bij Nederlandse havens vrijwel nooit een numerieke sterrenbeoordeling bevatten.

## Nieuwe zoekmethode

Onder POI staat nu ook `Zoek havens bij mij`.

- Gebruikt de actuele GPS-locatie van iPhone of iPad.
- Zoekstraal instelbaar op 5, 10, 20, 30, 50, 75 of 100 kilometer.
- Zoekt alle jachthavens binnen de straal.
- Geen sterrenbeoordeling vereist.
- Havens met een openbare score behouden die score.
- Havens zonder score worden als `geen score` toegevoegd.
- Resultaten worden op afstand gesorteerd.
- Bestaande havens worden automatisch overgeslagen.
- De afstand op het moment van import wordt in de POI-beschrijving opgeslagen.

## Gebruik

1. Open POI.
2. Kies de gewenste afstand.
3. Tik op `Zoek havens bij mij`.
4. Sta locatiegebruik toe wanneer Safari daarom vraagt.

Geen nieuwe SQL nodig.
