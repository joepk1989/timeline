# Tijdlijn

Een tijdlijn voor een leven, een kind, een huis, een relatie, een bedrijf of een plan.
Jaren om doorheen te swipen, maanden in de kleur van hun seizoen, momenten met foto's,
leeftijden en statussen, en een presentatiemodus voor een groot scherm.

## Starten

```bash
npm install
npm run dev
```

Open daarna http://localhost:5173. Zonder database werkt alles op dit apparaat:
tijdlijnen en momenten in de browser, foto's in IndexedDB.

## Wat erin zit

- **Jaren en maanden**: swipen of pijltjestoetsen, seizoensbalk, kalender of "op een rij", dagoverzicht.
- **Momenten**: jaar, maand of dag, periodes, elk jaar terugkerend, status (bij doelen en plannen), notitie en foto's.
- **Foto's**: worden verkleind voor het opslaan; de datum uit de foto (EXIF) wordt overgenomen. Fotoraster per jaar en maand, galerij.
- **Meerdere tijdlijnen**: een kind, jezelf, een relatie, een huisdier, een huis, een bedrijf, doelen of iets anders. Met demo.
- **Presenteren**: titel, jaaroverzicht en een dia per moment; volledig scherm, toetsen en swipen.
- **Back-up en export**: zip met alles inclusief foto's (en terugzetten, ook back-ups van het oude prototype),
  printversie met of zonder foto's (print als PDF), en de presentatie als los bestand dat offline werkt.
- **Inloggen en delen** (met database): inloggen via een link in je e-mail, uitnodigingslinks om te bekijken of mee te bewerken,
  live bijwerken als iemand anders iets verandert.

## Database koppelen

1. Maak een gratis project aan op supabase.com.
2. Open de SQL-editor en voer `supabase/schema.sql` uit.
3. Zet onder Authentication > URL Configuration je adres (bijv. `http://localhost:5173` en je live-adres) bij de Redirect URLs.
4. Kopieer `.env.example` naar `.env` en vul de URL en de anon key in (Project settings > API).

Na het inloggen kun je in het menu de tijdlijnen van dit apparaat online zetten.

## Online zetten

Vervang `@sveltejs/adapter-auto` door de adapter van je host (Vercel of Netlify) en zet
`PUBLIC_SUPABASE_URL` en `PUBLIC_SUPABASE_ANON_KEY` als omgevingsvariabelen.

## Controleren

```bash
npm test        # rekenlogica: leeftijden, herhalingen, periodes, dia's, back-up, EXIF, zip
npm run check   # typecontrole
```

## Mappen

- `prototype/` het oorspronkelijke prototype, als voorbeeld voor hoe alles moet werken
- `src/lib/domain/` de rekenlogica met tests
- `src/lib/data/` opslag: op dit apparaat of in Supabase
- `src/lib/state/` de toestand van de app en welke vensters open zijn
- `src/lib/components/` de schermen
- `supabase/` de database
- `CLAUDE.md` context en plan voor Claude Code
