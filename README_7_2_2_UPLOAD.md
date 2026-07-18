# MijnSerenity Cloud 7.2.2 — Storage Safety

Deze ZIP is vlak opgebouwd voor upload naar GitHub.

## Aanbevolen upload

Upload deze versie eerst naar een aparte GitHub-branch, bijvoorbeeld `development`. Laat `main` voorlopig ongewijzigd zolang het Supabase-project wegens egress is geblokkeerd.

## Belangrijk

- Versie 7.2.2 maakt bij het starten geen tijdelijke links meer voor alle foto’s.
- Foto’s en bonnetjes worden pas geladen wanneer ze zichtbaar worden of bewust worden geopend.
- Dezelfde tijdelijke link wordt maximaal circa 50 minuten hergebruikt.
- Realtime-verversingen zijn samengevoegd om dubbele laadacties te voorkomen.
- De Home Assistant-uitbreiding uit 7.2.0 is behouden.

Na herstel van Supabase: zet eerst alleen deze versie live en controleer daarna gedurende 24 uur `Usage > Egress`.
Netlify development-deploy geactiveerd.
