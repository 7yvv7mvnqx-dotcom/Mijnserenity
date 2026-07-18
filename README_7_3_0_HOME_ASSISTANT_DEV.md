# MijnSerenity 7.3.0 DEV — Home Assistant eenvoudig koppelen

Upload alle losse bestanden naar de GitHub-branch `development`.
Publiceer deze versie nog niet rechtstreeks naar `main`.

## Koppelen

1. Open MijnSerenity DEV en kies Testomgeving openen.
2. Ga naar Home Assistant > Instellen.
3. Plak je Nabu Casa HTTPS-adres.
4. Kies Koppel met Home Assistant.
5. Meld je aan op de officiële Home Assistant-inlogpagina en geef toestemming.
6. Kies Apparaten ontdekken.
7. Vink gewenste lampen, spelers, camera's, afstandsbedieningen en scènes aan.
8. Kies Selectie gebruiken.

Er hoeft geen YAML, webhook of langdurig toegangstoken te worden gekopieerd.

## Techniek

- De koppeling gebruikt de officiële Home Assistant OAuth-autorisatiestroom.
- Het kort geldige access token wordt automatisch vernieuwd met een intrekbaar refresh token.
- Apparaten en opdrachten lopen via de officiële Home Assistant WebSocket API.
- De verbinding geldt per browser/apparaat. Michel en Desi kunnen ieder apart toestemming geven.
- De service worker cachet geen API-verkeer.
