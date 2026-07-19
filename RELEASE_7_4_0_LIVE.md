# MijnSerenity 7.4.0 LIVE — Adaptive GPS Speed & Route Guard

Deze live-update herstelt de tijdens de autorit gevonden snelheids- en routeproblemen:

- GPS-punten boven 80 km/u worden niet meer automatisch als fout gezien; de veilige grens is 180 km/u.
- De voorbewerking kapt snelheid niet meer af op 42 km/u.
- Garmin/iOS GPS-snelheid krijgt direct voorrang bij een nauwkeurige GPS-fix.
- Positieberekende snelheid blijft als reserve beschikbaar.
- De dubbele sterke demping is verminderd, zodat de live snelheid sneller volgt.
- Onrealistische GPS-sprongen boven 180 km/u of meer dan 5 km per segment blijven geblokkeerd.
- GPS Continuity Guard en veilige aankomstdetectie uit 7.3.9 blijven actief.

Let op: bij een webapp kan iPadOS locatie-updates nog steeds beperken wanneer MijnSerenity volledig naar de achtergrond gaat. Split View met MijnSerenity zichtbaar geeft de beste betrouwbaarheid.
