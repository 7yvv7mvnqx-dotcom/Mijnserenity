# Release 7.3.8 LIVE

## Waterkaarten vertrekassistent

- Toont bij het activeren van automatisch varen een duidelijke Waterkaarten-assistent.
- Toont opnieuw een melding wanneer daadwerkelijk vertrek wordt gedetecteerd en Waterkaarten nog niet recent is geopend.
- Opent de bestaande iOS-opdracht `Open Waterkaarten` na één gebruikersactie.
- Geeft op de iPad stappen voor `Apps in vensters` en plaatsing naast MijnSerenity.
- Houdt een permanente knop beschikbaar zolang de automatische vaartregistratie actief is.
- iPhone krijgt een normale appstart, maar geen Split View.
- Automatische beste GPS-bron en betrouwbaarheid van 7.3.7 blijven behouden.

## Platformbeperking

iPadOS laat een webapp niet zelfstandig een andere app openen én beide vensters rangschikken. Daarom is één tik noodzakelijk.

## Productiepublicatie

- Voor branch `main` en het live domein `mijnserenity.nl`.
- Geen DEV-markering of testgegevens.
- Bestaande Supabase-, Home Assistant- en camera-instellingen blijven behouden.
- Storage Safety blijft actief.
