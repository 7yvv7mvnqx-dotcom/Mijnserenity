# MijnSerenity Cloud 6.8.0 — Auto Logbook

## Automatische vertrekdetectie

- Activeer `Wacht op vertrek`.
- MijnSerenity bewaakt GPS-beweging terwijl de app geopend is.
- De opname start pas na voldoende snelheid, afstand en bevestigingstijd.
- GPS-jitter aan de steiger veroorzaakt daardoor niet zomaar een vaartocht.
- Een actieve planning vult de bestemming alvast in.

## Automatische tijdlijn

MijnSerenity registreert:

- wachtmodus;
- vertrek;
- vaarbeweging;
- tussenstops;
- hervatten;
- aankomst;
- onderweg toegevoegde foto’s.

De tijdlijn wordt ook in de notities van het logboek opgeslagen.

## Slimme aankomstdetectie

- Automatisch stoppen na instelbare stilstand.
- Aftelkaart wanneer Serenity mogelijk is afgemeerd.
- Knop `Nog niet aangekomen` voor wachten bij bruggen, sluizen of tanken.
- Knop `Nu aankomst vastleggen` om direct af te ronden.
- Na opnieuw varen wordt aankomstdetectie vanzelf hersteld.

## Foto onderweg

De knop `Foto onderweg` opent direct de camera op iPhone of iPad.
De foto wordt klaargezet voor het automatisch opgeslagen logboek.

## Herstel en offline

- De actieve opname en tijdlijn blijven lokaal bewaard.
- Bij opnieuw openen kan een onderbroken opname worden hersteld.
- Bij ontbrekend internet blijft de GPS-route lokaal beschikbaar.

## Beperking iOS/iPadOS

Automatische vertrekdetectie werkt zolang MijnSerenity geopend is en
locatietoegang heeft. iOS kan GPS in een webapp pauzeren wanneer de app
volledig naar de achtergrond gaat.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
Geen onderliggende mappen en geen nieuwe SQL.
