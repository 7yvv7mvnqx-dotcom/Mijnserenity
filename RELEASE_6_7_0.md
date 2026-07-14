# MijnSerenity Cloud 6.7.0 — Smart Route

## Nieuw

- Scheepsprofiel voor Serenity:
  - lengte;
  - breedte;
  - diepgang;
  - doorvaarthoogte;
  - maximale vaartijd per dag;
  - starttijd;
  - brug- en sluisbuffers.
- Automatische Smart Route Check op bekende openbare kaartgegevens.
- Mogelijke blokkades en krappe marges worden duidelijk gemarkeerd.
- Bruggen, sluizen, havens en tankpunten staan in vaarvolgorde.
- Bekende hoogtes, breedtes, dieptes en openingstijden worden getoond.
- Extra wachttijd voor beweegbare bruggen en sluizen wordt meegerekend.
- Meerdaagse routeplanning met suggesties voor overnachtingshavens.
- Verwachte aankomstdag en aankomsttijd.
- Smart Route-objecten verschijnen als markers op de kaart.
- GPX bevat naast de volledige waterweg ook bruggen, sluizen, havens,
  tankpunten en bestaande MijnSerenity-POI's als waypoints.

## Belangrijk

OpenStreetMap-gegevens zijn niet volledig en zijn geen officiële
vaarweginformatie. Een ontbrekende beperking betekent niet dat de route
geschikt is. Controleer de route altijd in Waterkaarten en bij de
vaarwegbeheerder.

## Installatie

De ZIP bevat uitsluitend bestanden voor de hoofdmap van GitHub.
Upload alle bestanden uit de ZIP naar de hoofdmap.

Laat de bestaande map `netlify/functions` uit versie 6.5.1 staan.
De waterwegrouter daarin blijft nodig en is niet gewijzigd.

Geen nieuwe Supabase-SQL nodig.
