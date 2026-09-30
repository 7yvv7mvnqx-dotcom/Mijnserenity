# Royal Sens Android — fase 1

Fase 1 maakt een installeerbare Android-app die de bestaande Royal Sens Performance Hub opent op `https://royalsens.netlify.app/`. De bestaande website en account/login blijven leidend. JavaScript, lokale webopslag en cookies zijn ingeschakeld zodat de webapp kan werken. HTTPS-downloads worden doorgestuurd naar Android Downloads.

## APK bouwen

De GitHub Actions workflow `.github/workflows/build-royalsens-apk.yml` bouwt bij een push naar de fase-1-branch een debug-APK. Het resultaat staat als workflow-artifact `Royal-Sens-APK-fase-1`.

De APK is geschikt voor installatie als testversie. Voor distributie via Google Play is een eigen release-keystore en release-build nodig.

## Volgende fasen

- Fase 2: testen met de Royal Sens-login, skills, PDF-export en downloads op de gebruikte Android-telefoons.
- Fase 3: alleen wanneer nodig, native Android-functies toevoegen die de website niet betrouwbaar kan leveren.
