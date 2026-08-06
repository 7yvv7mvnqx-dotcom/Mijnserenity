# MijnSerenity 7.10.2 — Ruuvi klimaat

- Ondersteuning voor twee Ruuvi-klimaatsensoren via Home Assistant.
- Aparte selectie voor **Salon** en **Voorhut / slaapcabine**.
- Temperatuur, luchtvochtigheid en luchtdruk van dezelfde RuuviTag worden automatisch bij elkaar gezocht.
- Startdashboard toont live salon-, voorhut- en buitentemperatuur.
- Salon en voorhut tonen ook relatieve luchtvochtigheid.
- Home Assistant-entiteiten worden uitsluitend via de bestaande beveiligde OAuth-koppeling gelezen; er wordt geen HA-token in de app opgeslagen.
- Wanneer een sensor tijdelijk niet beschikbaar is, toont het dashboard een streepje in plaats van een oude of verzonnen waarde.
