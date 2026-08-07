# MijnSerenity 7.11.0 — mobiel, beweging en aanwezigheid

- Opstart-GIF volledig verwijderd.
- IVMS-kop op iPhone herbouwd: Serenity-foto volledig over de breedte, bediening eronder en geen horizontale overflow.
- Nieuwe pagina **Beweging & aanwezigheid**.
- Twee optionele Ruuvi-bewegingsentiteiten kunnen via Home Assistant worden gekoppeld.
- Beweging is per datum uit de Home Assistant Recorder-geschiedenis op te halen en wordt per uur in een grafiek weergegeven.
- Ruuvi meet beweging per sensor/ruimte, niet welke persoon de beweging veroorzaakte.
- Tot zes telefoon-/aanwezigheidsentiteiten kunnen worden gekozen voor een automatische schatting van personen aan boord.
- Home Assistant `device_tracker` en `person` entiteiten worden nu door de live bridge beschikbaar gemaakt.
- Personenkaart op het IVMS-dashboard gebruikt automatisch de HA-telling wanneer die is geconfigureerd; anders blijft de handmatige telling beschikbaar.
