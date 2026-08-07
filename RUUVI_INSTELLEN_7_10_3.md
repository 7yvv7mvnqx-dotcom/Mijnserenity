# Twee RuuviTags instellen

## 1. RuuviTags op de Cerbo GX

1. Verwijder het batterijlipje en leg beide sensoren eerst dicht bij de Cerbo.
2. Open de Victron Remote Console.
3. Ga naar **Instellingen → Integraties → Bluetooth-sensoren**.
4. Schakel Bluetooth-sensoren in en zet **Continu scannen** tijdelijk aan.
5. Schakel beide gevonden `Ruuvi ####`-sensoren in.
6. Geef ze herkenbare namen, bijvoorbeeld:
   - `Salon Serenity`
   - `Voorhut Serenity`
7. Kies bij type **Algemeen / Generic**.
8. Zet continu scannen daarna weer uit.

## 2. Sensoren in Home Assistant

De Ruuvi-entiteiten moeten in Home Assistant zichtbaar zijn als temperatuur, luchtvochtigheid en luchtdruk. De lokale officiële **Victron GX**-integratie gebruikt MQTT en vereist een netwerkroute van Home Assistant naar de Cerbo GX. De oudere VRM API-integratie ondersteunt losse Ruuvi-apparaten niet.

## 3. Sensoren kiezen in MijnSerenity

1. Open **Meer → Home Assistant → Instellen**.
2. Tik op **Apparaten ontdekken**.
3. Open het blok **Ruuvi / klimaat**.
4. Kies de temperatuur-entiteit van `Salon Serenity` en `Voorhut Serenity`.
5. Tik op **Klimaatsensoren gebruiken**.

MijnSerenity koppelt de luchtvochtigheid en luchtdruk van dezelfde RuuviTag automatisch.
