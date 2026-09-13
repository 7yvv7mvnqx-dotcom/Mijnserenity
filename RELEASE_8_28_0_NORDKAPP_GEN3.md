# MijnSerenity 8.28.0 — Nordkapp Air Gen 3

## Doel
MijnSerenity is voorbereid op de nieuwste **Nordkapp Air Gen 3** via de bestaande beveiligde Home Assistant-koppeling.

De MijnSerenity-laag is bewust **entiteitgestuurd**. Daardoor is de bediening niet vastgezet op één Bluetooth-protocol of mobiele Nordkapp-app. Zodra Home Assistant de Gen 3 als kachel/thermostaat aanbiedt, kan MijnSerenity dezelfde bediening gebruiken.

## Nieuw in 8.28.0
- Nieuwe module: `nordkapp-gen3-8280.js`.
- Compacte Nordkapp-kaart op het startdashboard.
- Uitgebreide Nordkapp-kaart onder **Techniek**.
- Automatische ontdekking van Home Assistant-entiteiten met namen zoals Nordkapp, diesel heater, air heater, heater, verwarming of kachel.
- Handmatige selectie van een `climate`-entiteit wanneer automatisch herkennen niet voldoende is.
- Ondersteuning voor:
  - aan / uit;
  - ingestelde temperatuur;
  - actuele temperatuur;
  - vermogensstand 1–10 wanneer Home Assistant die aanbiedt;
  - bedrijfsmodus;
  - voedingsspanning;
  - status / afkoelcyclus;
  - foutcode / probleemstatus;
  - verbindingsstatus.
- Live verversing iedere 30 seconden en direct na een bedieningscommando.
- Service worker bijgewerkt naar cacheversie 8.28.0 zodat de nieuwe module ook in de PWA-versie wordt vernieuwd.

## Veiligheidslogica
`UIT` in MijnSerenity verstuurt uitsluitend het normale Home Assistant/Nordkapp-stopcommando. MijnSerenity schakelt **nooit** de 12/24-V voeding hard af. Hierdoor kan de dieselkachel zijn normale afkoelcyclus afmaken.

## Home Assistant-entiteiten
De module is optimaal afgestemd op een Home Assistant diesel-heater integratie die onder andere deze typen kan leveren:
- `climate.*` voor thermostaatbediening;
- `switch.*` voor power fallback;
- `fan.*` of `number.*` voor heater level;
- `select.*` voor running mode;
- `sensor.*` voor temperatuur, spanning, status en foutcode;
- `binary_sensor.*` voor connected/problem.

MijnSerenity gebruikt geen nieuw wachtwoord of los token. De module hergebruikt de reeds bestaande officiële Home Assistant OAuth-sessie van `ha-live-bridge.js`.

## Nog te doen zodra de fysieke Nordkapp Air Gen 3 is gemonteerd
1. Gen 3 eerst normaal in bedrijf stellen en controleren met de officiële bediening.
2. Home Assistant Bluetooth-bereik bij de kachel regelen, bij voorkeur via een ESP32 Bluetooth Proxy wanneer de Home Assistant-host niet dicht bij de kachel staat.
3. De geschikte diesel-heater driver/integratie in Home Assistant koppelen en controleren of minimaal een bestuurbare `climate`- of `switch`-entiteit verschijnt.
4. MijnSerenity openen. De module probeert de kachel automatisch te herkennen.
5. Zo nodig onder **Techniek** de juiste `climate`-entiteit handmatig selecteren.
6. Live testen: AAN, temperatuur, vermogensstand indien beschikbaar, UIT en vooral de status tijdens afkoelen.

## Belangrijk over Gen 3-protocolcompatibiliteit
De applicatiekant is klaar voor Gen 3, maar de exacte Bluetooth-protocolvariant van de fysieke Nordkapp-controller kan pas met het daadwerkelijke toestel worden bevestigd. Als een bestaande Home Assistant diesel-heater driver de controller niet herkent, blijft de MijnSerenity-UI bruikbaar en hoeft alleen de Home Assistant-driver/bridge aangepast te worden.
