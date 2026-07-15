# MijnSerenity 7.1.1 — complete GitHub-upload

Upload alle bestanden rechtstreeks naar de hoofdmap van de GitHub-repository.

## Herstel in 7.1.1

- Bootafmetingen staan nu bij **Instellingen > Bootinstellingen**.
- Lengte, breedte, diepgang en doorvaarthoogte zijn verplicht vóór routeberekening.
- Smart Route vraagt routeobjecten op in kleine vaarcorridors in plaats van één groot gebied.
- Alle bruggen, sluizen en bekende maatbeperkingen worden meegenomen, ook bruggen zonder ingevulde hoogte.
- De status toont duidelijk volledig, gedeeltelijk of niet geverifieerd.
- Een route met een bekende maatblokkade wordt niet opgeslagen of naar Waterkaarten geëxporteerd.
- Bij ontbrekende objectgegevens wordt de route niet als veilig gepresenteerd.

De afmetingen worden per boot lokaal opgeslagen in de bestaande Smart Route-profielopslag. De overige bootinstellingen blijven via Supabase synchroniseren.
