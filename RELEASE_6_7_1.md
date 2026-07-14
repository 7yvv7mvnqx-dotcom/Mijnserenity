# MijnSerenity Cloud 6.7.1 — Waterwegrouter hotfix

## Opgelost

- Fout `Waterwegrouter gaf HTTP 404`.
- De platte GitHub-ZIP bevat geen map `netlify/functions`.
- Daarom gebruikt MijnSerenity nu ook twee Netlify-proxyroutes die volledig
  via `netlify.toml` worden geconfigureerd.
- De app probeert eerst de bestaande Function wanneer die nog aanwezig is.
- Bij 404 schakelt hij automatisch over op de nieuwe proxy.
- Meerdere motorboot-/waterwegprofielen en een back-upserver worden geprobeerd.
- De rechte-lijnschatting blijft alleen als laatste noodoplossing beschikbaar.

## Installatie

Upload alle bestanden uit deze ZIP naar de hoofdmap van GitHub.
Er zijn geen onderliggende mappen en er is geen nieuwe SQL nodig.

Na de Netlify-publicatie MijnSerenity volledig sluiten, opnieuw openen en
controleren dat versie 6.7.1 zichtbaar is.
