# MijnSerenity native app

MijnSerenity krijgt een native iPhone/iPad-laag bovenop de bestaande webapp. De huidige website/PWA blijft gewoon bestaan.

## Basis

- Capacitor 8
- Bundle ID: `nl.mijnserenity.app`
- Appnaam: `MijnSerenity`
- Webassets worden voor de app gekopieerd naar `www/`
- De native bridge wordt tijdens de build toegevoegd als `native-app-bridge.js`

## Eerste native functies

De bridge stelt `window.MijnSerenityNative` beschikbaar met:

- `isNative`
- `platform`
- `getCurrentPosition()`
- `startLocationWatch(callback)`
- `stopLocationWatch()`
- `shareGpx(gpx, filename, title)`
- `shareText(title, text)`

`shareGpx()` schrijft in de native app tijdelijk een GPX-bestand en opent de iOS-deelkaart. Daardoor kan een route naar een geïnstalleerde navigatie-app worden gestuurd zonder dat die app een API hoeft te hebben.

## Op een Mac bouwen

```bash
npm install
npm run native:add:ios
npm run native:open
```

Daarna opent Xcode. Selecteer een eigen Apple Development Team, kies een iPhone/iPad en start de app.

Na wijzigingen aan MijnSerenity:

```bash
npm run native:sync
npm run native:open
```

## iOS instellingen na eerste `cap add ios`

Voeg in Xcode bij de app de volgende locatiebeschrijvingen toe:

- `NSLocationWhenInUseUsageDescription`: `MijnSerenity gebruikt je locatie voor live varen, routeweergave en het vaarlogboek.`
- `NSLocationAlwaysAndWhenInUseUsageDescription`: `MijnSerenity gebruikt je locatie voor live varen, routeweergave en het vaarlogboek.`

Voor Filesystem moet tevens een Apple privacy manifest aanwezig zijn volgens de Capacitor Filesystem-documentatie.

## Waterkaarten

Waterkaarten wordt niet in een iframe opgenomen. De integratie wordt bestand-gebaseerd:

1. route plannen in MijnSerenity;
2. MijnSerenity maakt GPX;
3. native `shareGpx()` opent de iOS-deelkaart;
4. de gebruiker kiest Waterkaarten om de route te importeren.

Zo blijft MijnSerenity de cockpit, terwijl Waterkaarten als zelfstandige navigatie-app blijft draaien.
