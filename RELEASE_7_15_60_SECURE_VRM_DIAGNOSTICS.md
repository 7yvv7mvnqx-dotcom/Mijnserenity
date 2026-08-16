# MijnSerenity 7.15.60 — beveiligde Victron-accudiagnose

- Nieuwe, verplicht ingelogde Supabase Edge Function `victron-diagnostics`.
- Toegang wordt zowel met een geldige Supabase-JWT als met het bootlidmaatschap gecontroleerd.
- De bestaande VRM API-token blijft uitsluitend lokaal op het apparaat en wordt nooit in Supabase opgeslagen.
- Uitlezing van SmartShunt, huishoudaccu, MPPT, actieve alarmen en maximaal zeven dagen beschikbare VRM-historie.
- Genormaliseerde diagnose wordt per boot onder Row Level Security opgeslagen in `victron_diagnostics`.
- De technische pagina toont actuele SOC, spanning, stroom, vermogen, zonne-opbrengst en een voorzichtig onderbouwd oordeel.
- Een afwijkende SOC/spanningscombinatie leidt eerst tot controle van SmartShunt-synchronisatie, bekabeling en een belastingstest; de app verklaart een accu niet op basis van één spanning automatisch defect.

## Uitrollen

1. Voer `SUPABASE_VICTRON_DIAGNOSTICS_7_15_60.sql` uit.
2. Deploy `supabase/functions/victron-diagnostics/index.ts` met `verify_jwt = true`.
3. Publiceer de webbestanden.
4. Log in bij MijnSerenity, open **Techniek > Accuconditie** en tik op **Victron uitlezen & beoordelen**.

