# MijnSerenity Cloud 6.9.4 — POI Data Service

## Automatisch aanvullen

MijnSerenity kan nu alle POI’s één voor één verrijken met:

- plaats;
- volledig adres;
- website;
- telefoonnummer;
- openingstijden;
- openbare numerieke beoordeling wanneer aanwezig;
- bronlink naar OpenStreetMap;
- reviewknoppen voor Google Maps en Tripadvisor;
- één duidelijk passende rechtenvrije foto wanneer nog geen foto aanwezig is.

## Regelmatig bijwerken

Instelbaar op:

- alleen handmatig;
- iedere 7 dagen;
- iedere 30 dagen;
- iedere 90 dagen.

Bij automatisch bijwerken worden maximaal drie verouderde POI’s per
app-sessie verwerkt. Daardoor blijven openbare databronnen rustig belast.
Via `Werk alle POI’s nu bij` kan de volledige lijst handmatig worden
gecontroleerd.

## Bronnen

- Adres en plaats: PDOK Locatieserver.
- Object- en contactgegevens: OpenStreetMap via Overpass.
- Foto’s: Wikimedia Commons, inclusief bron en licentievermelding.

Externe recensieteksten van Google Maps en Tripadvisor worden niet
automatisch gekopieerd. MijnSerenity toont rechtstreekse reviewlinks en
neemt alleen openbare scores over wanneer die expliciet in de brondata staan.

## Eenmalig uitvoeren

Voer `SUPABASE_POI_VERRIJKING_6_9_4.sql` één keer uit in Supabase.

## Installatie

Upload daarna alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
De ZIP bevat geen onderliggende mappen.
