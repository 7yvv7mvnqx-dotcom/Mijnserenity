# MijnSerenity 7.2.3 — Development Mode

Upload alle losse bestanden naar de GitHub-branch `development`.

## Testen
1. Wacht tot Netlify de branch deploy heeft gepubliceerd.
2. Open **Open branch deploy**.
3. Kies **Testomgeving openen**.
4. Controleer de rode DEV-balk bovenin.

Deze versie gebruikt een lokale Supabase-mock. Productieaccounts, database en Storage worden niet benaderd. Demo-aanpassingen worden uitsluitend in de browser van het testapparaat bewaard.

Publiceer deze development-build niet rechtstreeks naar `main`. Voor productie wordt later een aparte release gemaakt.
