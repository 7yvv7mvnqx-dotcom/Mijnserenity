MIJNSERENITY 7.14.7 — RUUVI RECHTSTREEKS VIA VICTRON VRM

Nieuw:
- Salon Serenity = Ruuvi instance 24
- Machinekamer Serenity = Ruuvi instance 25
- Directe VRM-uitlezing via beveiligde Netlify Function
- Home Assistant blijft fallback en kan later verder worden afgerond

Na upload/deploy:
1. Open MijnSerenity > Meer > Home Assistant > Instellen > Ruuvi / klimaat.
2. Plak één keer je bestaande Victron VRM API-token in het nieuwe veld.
3. Tik Opslaan & VRM testen.
4. De token wordt lokaal op jouw apparaat bewaard en wordt via de Netlify proxy naar VRM gestuurd.

Optioneel veiliger: zet in Netlify de environment variable VRM_API_TOKEN; dan kan de function zonder browser-token werken.
