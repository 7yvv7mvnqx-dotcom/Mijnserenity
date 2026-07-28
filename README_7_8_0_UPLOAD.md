# MijnSerenity 7.8.1 uploaden

1. Pak deze ZIP uit.
2. Open de GitHub-repository van MijnSerenity en kies branch `main`.
3. Verwijder geen gegevens uit Supabase; vervang alleen de websitebestanden.
4. Upload **alle losse bestanden** uit de uitgepakte map.
5. Kies **Replace files** wanneer GitHub dit vraagt.
6. Gebruik als commitbericht: `MijnSerenity 7.8.1 volledige cache-update`.
7. Wacht tot de publicatie klaar is.
8. Open MijnSerenity eerst één keer in Safari en tik daarna in de app op **Ververs**.

De vernieuwde service worker verwijdert de oude MijnSerenity-cache automatisch. Bestaande Supabase-gegevens, Home Assistant-koppeling en lokale instellingen blijven behouden.
