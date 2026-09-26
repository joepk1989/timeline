# Tijdlijn

Een tijdlijn voor een leven, een kind, een huis, een relatie, een bedrijf of een plan.

## Starten

```bash
npm install
npm run dev
```

Open daarna http://localhost:5173. Zonder database draait de app op de demo-tijdlijn.

## Database koppelen

1. Maak een gratis project aan op supabase.com.
2. Open de SQL-editor en voer `supabase/schema.sql` uit.
3. Kopieer `.env.example` naar `.env` en vul de URL en de anon key in (Project settings > API).

## Controleren

```bash
npm test        # rekenlogica: leeftijden, herhalingen, periodes
npm run check   # typecontrole
```

## Mappen

- `prototype/` het werkende prototype, als voorbeeld voor hoe alles moet werken
- `src/lib/domain/` de rekenlogica met tests
- `supabase/` de database
- `CLAUDE.md` context en plan voor Claude Code
