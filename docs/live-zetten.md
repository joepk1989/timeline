# Timelessline live zetten op timelessline.com

Dit stappenplan zet de app online op je eigen domein, met opslag in de cloud, zodat je tijdlijnen
niet meer in één browser staan en je ze kunt delen. Reken op een uur, plus wachttijd voor het domein.

Je hebt nodig: je GitHub-account (de code staat in `joepk1989/timeline`), een e-mailadres, en
toegang tot de plek waar je timelessline.com hebt gekocht (de "registrar").

Alles hieronder is gratis.

---

## Stap 0. Eerst een back-up (5 minuten)

Je tijdlijnen staan nu in de browser waarin je de app gebruikt. Op een nieuw adres zijn ze er niet vanzelf.

1. Open de app waar je hem nu gebruikt.
2. **Menu → Download back-up**. Bewaar de zip goed (die bevat ook de foto's).

Doe dit op elk apparaat waar je tijdlijnen op staan.

## Stap 1. De code klaarzetten

Al het werk staat op de branch `claude/cool-darwin-e8ufu5`. De host bouwt vanaf `main`.
Vraag Claude om een pull request te maken en voeg die samen, of doe het zelf op GitHub.

## Stap 2. De database: Supabase (15 minuten)

1. Ga naar **supabase.com** en maak een account (inloggen met GitHub kan).
2. **New project**:
   - Naam: `timelessline`
   - Database password: kies een sterk wachtwoord en **bewaar het** (in je wachtwoordbeheerder).
   - Region: **Central EU (Frankfurt)**. Dan blijven je foto's in Europa.
3. Wacht tot het project klaar is (een paar minuten).
4. Links **SQL Editor** → **New query**. Plak de hele inhoud van `supabase/schema.sql` en klik **Run**.
   Je moet "Success" zien. Zie je een fout, kopieer die en geef hem aan Claude.
5. Links **Authentication → URL Configuration**:
   - **Site URL**: `https://timelessline.com`
   - **Redirect URLs**, voeg toe:
     - `https://timelessline.com/**`
     - `https://www.timelessline.com/**`
     - `http://localhost:5173/**` (om op je eigen computer te testen)
6. Zoek de twee sleutels op onder **Project Settings → API** (of **API Keys**):
   - de **Project URL** (begint met `https://` en eindigt op `.supabase.co`)
   - de **anon / public key** (in nieuwere versies heet die soms **publishable key**)

   Die twee zijn bedoeld om in een website te staan; de **service role / secret key** niet. Die heb je niet nodig en deel je nooit.

## Stap 3. De website: Vercel (10 minuten)

1. Ga naar **vercel.com** en maak een account met **Continue with GitHub**.
2. **Add New… → Project** en kies de repository `timeline`. Geef Vercel toegang als het daarom vraagt.
3. Laat de bouwinstellingen staan: die komen uit `vercel.json` in de code.
4. Open **Environment Variables** en voeg toe:
   - `PUBLIC_SUPABASE_URL` = de Project URL uit stap 2
   - `PUBLIC_SUPABASE_ANON_KEY` = de anon/public key uit stap 2
5. **Deploy**. Na een minuut of twee krijg je een adres als `timeline-xxxx.vercel.app`. Open het: je ziet de app.

Werkt het niet, open dan de bouw in Vercel (**Deployments → de bovenste → Build Logs**) en geef de foutmelding aan Claude.

## Stap 4. Je domein koppelen (10 minuten, plus wachten)

1. In Vercel: je project → **Settings → Domains** → voeg `timelessline.com` toe, en ook `www.timelessline.com`
   (laat Vercel die doorsturen naar `timelessline.com`).
2. Vercel laat zien welke DNS-records je moet instellen. Meestal:
   - een **A-record** voor `timelessline.com` (het IP-adres staat erbij)
   - een **CNAME-record** voor `www`
3. Log in bij je registrar, open de **DNS-instellingen** van timelessline.com en zet daar precies wat Vercel toont.
   Verwijder oude A-records of "parkeerpagina's" die er al staan.
4. Wachten: meestal binnen een uur, soms langer. Vercel zet het slotje (https) er zelf op.
   Als bij het domein in Vercel "Valid Configuration" staat, is het klaar.

## Stap 5. Inloggen testen (5 minuten)

1. Open **https://timelessline.com**.
2. Menu → **Inloggen**, vul je e-mailadres in, en klik op de link in de mail.
   Geen mail? Kijk in je spam. De ingebouwde mail van Supabase verstuurt maar een paar mails per uur;
   wacht dan even of vraag Claude om een eigen mailverzender in te stellen.
3. Na het inloggen hoor je terug te komen op timelessline.com, ingelogd.

## Stap 6. Je tijdlijnen terugzetten (5 minuten)

1. Op timelessline.com: **Menu → Zet back-up terug** en kies de zip uit stap 0.
2. Ben je ingelogd en staan je tijdlijnen nog op "dit apparaat"? Dan staat er in het menu
   **Zet tijdlijnen van dit apparaat online**. Klik erop.
3. Open timelessline.com op een ander apparaat en log daar ook in: je tijdlijnen staan er.

## Stap 7. Samen gebruiken

Open je tijdlijn → instellingen van de tijdlijn → **Delen**: maak een uitnodigingslink om mee te kijken
of mee te bewerken, en stuur die naar je partner. Die logt in via de link en ziet de tijdlijn.

## Stap 8. Op je telefoon als app

Open timelessline.com op je telefoon:
- **iPhone**: deelknop → **Zet op beginscherm**.
- **Android**: menu (⋮) → **App installeren** of **Toevoegen aan startscherm**.

---

## Als het niet gaat

Dit is de eerste keer dat de app tegen een echte database draait. Grote kans dat er iets niet
meteen goed gaat bij inloggen, delen of foto's uploaden. Dat is normaal: noteer wat je deed, wat je zag
(een schermafbeelding helpt) en geef het aan Claude. Je gegevens raak je daarbij niet kwijt zolang je de
back-up uit stap 0 hebt.

## Liever Netlify dan Vercel?

Dat kan ook: de instellingen staan in `netlify.toml`. In Netlify: **Add new site → Import an existing project**,
kies de repository, zet dezelfde twee omgevingsvariabelen, en koppel daarna onder **Domain management** je domein.
