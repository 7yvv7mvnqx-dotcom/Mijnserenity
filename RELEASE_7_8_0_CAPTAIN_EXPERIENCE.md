# MijnSerenity 7.8.0 — volledige cache-update

## Technische correctie

- Alle zichtbare versienummers staan op **7.8.0**.
- Alle lokale CSS-, JavaScript-, manifest- en afbeeldingsverwijzingen gebruiken cachecode **78000**.
- De service worker registreert nu met `sw.js?v=78000`.
- De PWA-cache heet `mijnserenity-7.8.0-captain-experience-r1`, waardoor oude 7.6.0-caches automatisch worden verwijderd.
- De ZIP bevat alle bestanden los in de hoofdmap en kan de bestaande GitHub-bestanden volledig vervangen.

## Nieuw

- Dynamisch Captain-dashboard dat onderscheid maakt tussen haven, vertrekklaar, varen, pauze en aankomst.
- Live statusstrook voor huishoudaccu, walstroom, drinkwater, diesel, wind en verbinding.
- Contextafhankelijke hoofdacties.
- Vraag het de Captain met voorbeeldvragen en vrije invoer.
- Snelle bediening voor varen, Waterkaarten, kaart, zoeken, Home Assistant, radio, logboek, weer en alle onderdelen.
- Favoriete havenkaarten met Storage Safety en lazy loading.
- Interactieve routebeleving met bewegende boot, tijdlijn, snelheid en routefoto's.
- Knop **Beleef vaart** bij opgeslagen routes in het logboek.
- Home Assistant-filter voor alles, media, verlichting, camera/beveiliging en scènes.
- Inklapbare Sonos/radio-minispeler boven de vaste navigatie.
- Automatische dag-, avond- en nachtvaartweergave, handmatig te kiezen via Meer.
- Subtiele animaties en voelbare bevestiging waar het apparaat dit ondersteunt.

## Behouden

- Storage Safety en zuinige fotolading.
- Supabase-data en gedeelde accounts.
- Garmin/iOS GPS, automatische vaarregistratie en GPS Continuity Guard.
- Waterkaarten-splitview.
- Home Assistant OAuth, camera's en hoog contrast.
- Factuur- en polislezer.
- Eenvoudige vaste navigatie.

## Dataverbruik

De nieuwe haven- en routefoto's gebruiken dezelfde lazy-loading en URL-cache als Storage Safety. Er wordt geen volledige fotocollectie automatisch gedownload.