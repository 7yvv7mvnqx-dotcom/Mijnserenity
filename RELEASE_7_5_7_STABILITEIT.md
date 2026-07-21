# MijnSerenity 7.5.7 — stabiliteit

Deze versie repareert drie problemen uit 7.5.6.

## Gerepareerd

1. **Live varen opslaan**
   - Een bewuste druk op **Stop opname** of **Nu aankomst vastleggen** wordt bij
     ingeschakeld automatisch opslaan ook als korte testvaart opgeslagen.
   - Minimumafstand en minimumduur gelden alleen nog voor volledig automatische
     afmeerdetectie.
   - Bij een opslagfout blijft de gestopte GPS-opname lokaal bewaard.
   - Een handmatige opname met slechts één GPS-update krijgt veilig een
     eindpunt, zodat de test niet stilletjes verdwijnt.

2. **Knoppen openen weer de juiste pagina**
   - De tijdelijke harde Start-route zette alle andere pagina's via inline
     `display:none` vast.
   - Start, ondernavigatie, snelknoppen en zoeken gebruiken weer dezelfde
     native pagerroute.
   - Oude inline verbergregels worden bij navigatie opgeruimd.

3. **Horizontaal vegen hersteld**
   - De blijvende `ms755-single-page-nav`-modus is verwijderd.
   - iPhone en iPad kunnen weer zijwaarts tussen de pagina's vegen.
   - De actieve knop en zichtbare pagina blijven synchroon.

## Upload

Upload alle bestanden uit deze map naar de hoofdmap van de GitHub-repository,
dus niet alleen de drie gewijzigde bestanden. Daarna in Netlify een nieuwe
production deploy starten.

Na openen van de app één keer **App herstellen en vernieuwen** gebruiken om de
oude 7.5.5/7.5.6 serviceworker-cache te verwijderen.
