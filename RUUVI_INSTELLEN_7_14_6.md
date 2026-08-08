# Ruuvi – MijnSerenity 7.14.6

Deze versie gebruikt Home Assistant als veilige brug tussen Victron VRM en MijnSerenity.

Vaste indeling:
- Ruuvi 5D29 = Salon Serenity (VRM instance 24)
- Ruuvi 52E6 = Machinekamer Serenity (VRM instance 25)

Aanbevolen Home Assistant entity IDs:
- sensor.salon_serenity_temperatuur
- sensor.salon_serenity_luchtvochtigheid
- sensor.salon_serenity_luchtdruk
- sensor.machinekamer_serenity_temperatuur
- sensor.machinekamer_serenity_luchtvochtigheid
- sensor.machinekamer_serenity_luchtdruk

MijnSerenity 7.14.6 kiest de twee temperatuur-entiteiten standaard automatisch. Luchtvochtigheid en luchtdruk worden als siblings van dezelfde Ruuvi gekoppeld.
