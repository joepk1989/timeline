# Tijdlijn

A timeline app for a life, a child, a house, a relationship, a business or a plan. Years you swipe through, months coloured by season, moments with photos, ages and statuses, and a presentation mode for large screens. The interface is in Dutch.

## Where things are

- `prototype/tijdlijn.html` is the working single-file prototype (built in claude.ai). **It is the functional spec**: when in doubt about how something should look or behave, open it in a browser and match it. Do not keep adding to it.
- `src/lib/domain/` holds the pure logic, already ported and tested: dates, timeline kinds, ages, occurrences (repeats, periods, overdue), demo data. No DOM, no globals: "today" is passed in.
- `supabase/schema.sql` is the database: timelines, moments, members, share links, private photo bucket, row level security.
- `src/routes/+page.svelte` is a minimal starting page that renders the demo with the domain logic.

## Stack

SvelteKit + Svelte 5 (runes) + TypeScript, Supabase (auth, Postgres, storage), Vitest. Deploy to Vercel or Netlify (swap `adapter-auto` for the matching adapter).

## Commands

- `npm run dev` start locally
- `npm test` unit tests
- `npm run check` type check

Run `npm test` and `npm run check` before every commit.

## Conventions

- Component styles stay scoped in their `.svelte` file. Only design tokens live in `src/app.css`. (The prototype broke twice from global class names colliding, e.g. `.year` and `.month`.)
- Keep domain logic in `src/lib/domain` as pure functions with tests. Components only render.
- Dates keep their precision as strings: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`. Months are 0-based in code, 1-based in strings.
- User-facing text is Dutch and plain. No jargon in the UI.
- Respect `prefers-reduced-motion`, support keyboard and screen readers, test on a phone width (390px) and a wide monitor.

## Roadmap

1. **Core views**: year pager with swipe, seasons bar, month view (calendar and the one-row accordion), day sheet, editor. Match the prototype.
2. **Supabase**: sign in (magic link), load and save timelines and moments, realtime updates, the demo loader.
3. **Photos**: upload to the `photos` bucket (resize first, read the date from EXIF), gallery, photo grid per year.
4. **Sharing**: invite links (`share_links` + `accept_share_link`), viewer and editor roles.
5. **Presentation mode**: title, year-at-a-glance and moment slides; widescreen layout; keyboard and swipe.
6. **Backup and export**: JSON with photos as a zip, a standalone presentation file to share offline, print or PDF with photos.
7. **Ideas**: search, tagging people on moments, progress amounts for savings goals, PWA install and offline, then Capacitor for app stores.
