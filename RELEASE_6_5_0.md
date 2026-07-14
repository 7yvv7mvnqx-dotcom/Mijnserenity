# MijnSerenity Cloud 6.5.0

## Waterkaarten-integratie verbeterd

- Reisplanner vraagt een echte waterwegroute op via een server-side
  waterwegrouter.
- Route volgt kanalen en rivieren in plaats van alleen een rechte lijn.
- OpenSeaMap-nautische objecten worden als kaartlaag weergegeven.
- Opgeslagen MijnSerenity-POI's langs de route worden automatisch gevonden.
- POI's verschijnen als markeringen en in routevolgorde onder de kaart.
- Een POI kan met één tik als tussenstop worden toegevoegd.
- GPX bevat nu:
  - de volledige gerouteerde waterweg als track;
  - vertrek, bestemming en tussenstops als routepunten;
  - POI's langs de route als waypoints.
- Bij uitval van de externe router blijft de bestaande noodschatting werken.

## Netlify

De ZIP bevat een nieuwe Netlify Function:

`netlify/functions/waterway-route.js`

`netlify.toml` wijst automatisch naar deze map.

## Installatie

Upload de volledige inhoud van deze ZIP naar GitHub. Netlify bouwt en
publiceert de Function automatisch. Er is geen nieuwe Supabase-SQL nodig.

## Veiligheid

De gerouteerde lijn gebruikt open data en is een planhulp. Controleer
brughoogtes, sluizen, stremmingen, dieptes en actuele vaarinformatie altijd
in Waterkaarten.
