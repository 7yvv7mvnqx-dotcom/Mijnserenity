# MijnSerenity 7.2.0 — complete GitHub-upload

Upload alle bestanden uit deze ZIP naar de hoofdmap van de MijnSerenity-repository
en laat bestaande bestanden overschrijven.

## Nieuw

- Direct GPX/KML/KMZ ontvangen vanuit het iOS-deelmenu.
- Dagelijkse route: Waterkaarten → Delen → Bewaar in MijnSerenity.
- Geen tijdelijke map in Bestanden of iCloud Drive nodig.
- Veilige persoonlijke importcode per boot.
- Automatische controle bij openen, terugkeren naar de app en iedere 30 seconden.
- Route wordt direct in het logboekformulier ingelezen.
- Handmatige bestands- en iCloud-import blijven als ingeklapt alternatief bestaan.

## Eenmalig uitvoeren

1. Voer `SQL_WATERKAARTEN_DIRECT_IMPORT_7_2_0.sql` uit in Supabase SQL Editor.
2. Volg `APPLE_OPDRACHT_WATERKAARTEN.md` om de Apple Opdracht te maken.

## Waarom nog één knop Vaartocht opslaan?

Een Waterkaarten-route kan een planning voor later zijn. Automatisch als voltooide
vaart opslaan zou de datum, brandstof en motoruren onbedoeld kunnen beïnvloeden.
Daarom vult MijnSerenity alles automatisch in, maar blijft definitief opslaan een
bewuste controlehandeling.
