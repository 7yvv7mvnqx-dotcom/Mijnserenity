# MijnSerenity Cloud 6.6.0 — Next Level Live Cockpit

## Nieuw

- Focusmodus voor een rustige, grote vaarcockpit.
- Nachtmodus met minder verblinding.
- Digitale-schipperkaart met:
  - bestemming;
  - resterende afstand over een actieve waterwegroute;
  - verwachte aankomsttijd;
  - volgende POI langs de route;
  - windkracht en windrichting;
  - diepte wanneer een NMEA/Home Assistant-sensor beschikbaar is;
  - geschat brandstofbereik met 15% reserve;
  - cloud- en meekijkstatus.
- Automatische waarschuwingen voor:
  - bilgepomp en bilge-alarm;
  - hoge motortemperatuur;
  - lage oliedruk;
  - lage huishoud- en startaccuspanning;
  - brandstofreserve;
  - lage watervoorraad;
  - zwak GPS-signaal;
  - zware windstoten;
  - offline varen.
- Kritieke waarschuwingen komen groot in beeld.
- Snelle cockpitknoppen voor kaart, camera, Waterkaarten en volgen.
- Live vaarkaart op alle apparaten uit 6.4/6.5 blijft behouden.
- Waterwegrouter en POI-GPX uit 6.5 blijven behouden.

## Installatie

Deze ZIP bevat uitsluitend bestanden voor de hoofdmap van GitHub en heeft
geen onderliggende mappen. Upload alle bestanden uit de ZIP naar de hoofdmap.

De bestaande map `netlify/functions` uit versie 6.5.1 moet in GitHub blijven
staan; die map is niet opnieuw opgenomen omdat de waterwegrouter ongewijzigd is.

Geen nieuwe Supabase-SQL nodig.
