# MijnSerenity Cloud 7.1.2 — GitHub-upload

Deze ZIP is plat opgebouwd: alle bestanden staan direct in de hoofdmap.

## Uploaden

1. Open de bestaande MijnSerenity-repository in GitHub.
2. Kies **Add file → Upload files**.
3. Upload alle losse bestanden uit deze ZIP en laat bestaande bestanden vervangen.
4. Kies **Commit changes**.
5. Wacht tot Netlify de nieuwe versie heeft gepubliceerd.
6. Sluit MijnSerenity volledig en open de app opnieuw.

## Entertainment instellen

Open na de update **🎵 Entertainment → Instellen**.

1. Vul het externe HTTPS-adres van Home Assistant in.
2. Vul minimaal één `media_player`-entiteit in.
3. Laat MijnSerenity een beveiligde webhookcode maken.
4. Kopieer de gegenereerde YAML naar een nieuwe automatisering in Home Assistant.
5. Sla de instellingen op in MijnSerenity.

De instellingen worden via de bestaande `technical_state`-cloudgegevens met alle apparaten van Serenity gesynchroniseerd. Er is geen nieuwe Supabase-SQL nodig. De openbare GitHub-code bevat geen Home Assistant-token, API-sleutel of vooraf ingevulde webhookcode.

Voor AIS is geen account, API-sleutel, betaalde API, Supabase-SQL of eigen AIS-ontvanger nodig. Geef op iPhone of iPad wel locatietoegang en zorg voor een internetverbinding.
