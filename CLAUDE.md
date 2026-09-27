# Tijdlijn

A timeline app for a life, a child, a house, a relationship, a business or a plan. Years you swipe through, months coloured by season, moments with photos, ages and statuses, and a presentation mode for large screens. The interface is in Dutch.

## Where things are

- `prototype/tijdlijn.html` is the original single-file prototype (built in claude.ai). **It is the functional spec**: when in doubt about how something should look or behave, open it in a browser and match it. Do not keep adding to it.
- `src/lib/domain/` holds the pure logic with tests: dates, timeline kinds, ages, occurrences (repeats, periods, overdue), view helpers (filters, scope, labels), slides and the year-slide layout, backup parsing (also the prototype's v3 format), print and standalone presentation HTML, EXIF date, zip. No DOM, no globals: "today" is passed in.
- `src/lib/data/` is storage behind one `Backend` interface: `local.ts` (localStorage + IndexedDB for photos) and `cloud.ts` (Supabase tables, storage, realtime, share links). `photos.ts` resizes photos and reads their date.
- `src/lib/state/app.svelte.ts` is the app state (runes): data, current timeline, filter, scope, pager position, and the actions that save. `ui.svelte.ts` says which sheet or dialog is open.
- `src/lib/components/` are the screens: `TopBar`, `Pager` with `YearPage` (with `MonthAccordion`: the months fold open to show their days) and `MonthPage`, `Content`/`MomentRow`, `Menu`, `Editor`, `DaySheet`, `TimelinePicker`, `TimelineEditor` + `ShareBox`, `Gallery`, `Presenter` (presenting: the year screen itself full screen, the months along the bottom; `state/present.ts` morphs into it with a view transition), `SignIn`, `Toast`. Small building blocks: `Btn`, `Chip`, `Seg`, `Dialog`, `Photo`, `Icon`.
- `src/routes/+page.svelte` puts it together; `src/routes/deel/[token]` accepts an invite link. The app runs client-side only (`ssr = false`).
- `supabase/schema.sql` is the database: timelines, moments, members, share links, private photo bucket, row level security, realtime.

## Stack

SvelteKit + Svelte 5 (runes) + TypeScript, Supabase (auth, Postgres, storage), Vitest. Deploy to Vercel or Netlify (swap `adapter-auto` for the matching adapter).

## Commands

- `npm run dev` start locally
- `npm test` unit tests
- `npm run check` type check

Run `npm test` and `npm run check` before every commit.

## Conventions

- Component styles stay scoped in their `.svelte` file. Only design tokens live in `src/app.css`. Form styles for dialogs live in `Dialog.svelte`, scoped under `.card`. (The prototype broke twice from global class names colliding, e.g. `.year` and `.month`.)
- Keep domain logic in `src/lib/domain` as pure functions with tests. Components only render.
- Dates keep their precision as strings: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`. Months are 0-based in code, 1-based in strings.
- User-facing text is Dutch and plain. No jargon in the UI.
- Respect `prefers-reduced-motion`, support keyboard and screen readers, test on a phone width (390px) and a wide monitor.

## Roadmap

Steps 1 to 6 are built. Supabase login, sharing and realtime are written against the schema but still need a check against a real project.

1. **Core views**: year pager with swipe, seasons bar, month view (calendar and the one-row accordion), day sheet, editor. Match the prototype.
2. **Supabase**: sign in (magic link), load and save timelines and moments, realtime updates, the demo loader.
3. **Photos**: upload to the `photos` bucket (resize first, read the date from EXIF), gallery, photo grid per year.
4. **Sharing**: invite links (`share_links` + `accept_share_link`), viewer and editor roles.
5. **Presentation mode**: the year screen itself in full screen, morphing in with a view transition: the year on top, one moment at a time in the middle, the months along the bottom with the moment's day marked; keyboard and swipe.
6. **Backup and export**: JSON with photos as a zip, a standalone presentation file to share offline, print or PDF with photos.
7. **Ideas**: search, tagging people on moments, progress amounts for savings goals, PWA install and offline, then Capacitor for app stores.
