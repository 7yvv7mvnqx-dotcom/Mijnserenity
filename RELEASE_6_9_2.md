# MijnSerenity Cloud 6.9.2 — Gewaardeerde havens

## Nieuw

- Nieuwe havenbibliotheek bovenaan POI.
- Zoekt in heel Nederland naar jachthavens met een openbare numerieke
  beoordeling of classificatie.
- Standaard worden alleen havens met een score **hoger dan 3,0** toegevoegd.
- De grens kan worden verhoogd naar 3,5, 4,0 of 4,5.
- Alle gevonden havens worden in één keer toegevoegd als categorie `Haven`.
- Naam, plaats, adres, GPS-positie, score, website, telefoon, VHF en bekende
  voorzieningen worden waar beschikbaar meegenomen.
- Bestaande havens worden herkend op OSM-ID, naam of positie en overgeslagen.
- Beoordelingen met decimalen, zoals 4,5, worden ondersteund.
- Het resultaat toont gevonden, nieuw toegevoegde en reeds aanwezige havens.

## Datakwaliteit

De importeur gebruikt openbare OpenStreetMap-gegevens. Alleen havens met een
daadwerkelijk aanwezige numerieke `rating`, `stars` of vergelijkbare brontag
worden toegevoegd. Havens zonder score krijgen niet automatisch een
verzonnen beoordeling.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
Open daarna POI en tik op `Zoek en voeg alle havens toe`.

Geen nieuwe Supabase-SQL nodig.
