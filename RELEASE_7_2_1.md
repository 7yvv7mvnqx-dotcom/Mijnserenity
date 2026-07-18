# MijnSerenity Cloud 7.2.1

## Login- en cachehotfix

- Betrouwbare loginbootstrap toegevoegd.
- Supabase wordt eerst via jsDelivr geladen en bij storing via unpkg.
- Nieuwe knop **App herstellen en vernieuwen** wist uitsluitend de MijnSerenity-cache en service worker.
- De bestaande Supabase-sessie en lokale gebruikersgegevens worden niet bewust verwijderd.
- Service-workerinstallatie faalt niet meer volledig wanneer één cachebestand tijdelijk ontbreekt.
- `index.html`, `sw.js` en de loginbootstrap worden door Netlify niet langdurig gecachet.
- Home Assistant Smart Home uit 7.2.0 blijft aanwezig.
