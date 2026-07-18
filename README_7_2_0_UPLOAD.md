# MijnSerenity Cloud 7.2.1 — GitHub-upload

Deze ZIP is plat opgebouwd: alle bestanden staan direct in de hoofdmap.

## Uploaden

1. Open de bestaande MijnSerenity-repository in GitHub.
2. Kies **Add file → Upload files**.
3. Upload alle losse bestanden uit deze ZIP en laat bestaande bestanden vervangen.
4. Kies **Commit changes**.
5. Wacht tot Netlify de nieuwe versie heeft gepubliceerd.
6. Sluit MijnSerenity volledig en open de app opnieuw.

## Home Assistant instellen

Open na de update **🏡 Home Assistant → Instellen**.

1. Vul het externe HTTPS-adres van Home Assistant in, bij voorkeur Home Assistant Cloud.
2. Vul alleen de apparaten in die je wilt bedienen:
   - Ring `camera` en eventueel de `switch` voor bewegingsdetectie.
   - Philips Hue `light`-entiteiten of lichtgroepen.
   - Sonos `media_player`-entiteiten.
   - Apple TV `media_player` en `remote`.
   - Home Assistant `scene`-entiteiten.
3. Laat MijnSerenity een beveiligde webhookcode maken.
4. Kopieer de gegenereerde YAML naar één nieuwe automatisering in Home Assistant.
5. Sla de instellingen op in MijnSerenity.

De instellingen worden via de bestaande `technical_state`-cloudgegevens met alle apparaten van Serenity gesynchroniseerd. Er is geen nieuwe Supabase-SQL nodig. De openbare GitHub-code bevat geen Home Assistant-token, API-sleutel, Ring-pincode of vooraf ingevulde webhookcode.

## Beveiliging

- Deel de webhook-URL niet.
- Maak een nieuwe webhookcode wanneer je vermoedt dat de huidige code bekend is geworden.
- Ring livebeeld en opnamen blijven achter je beveiligde Home Assistant-login; MijnSerenity opent daarvoor je ingestelde dashboard.
