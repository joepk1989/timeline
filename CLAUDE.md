# Tijdlijn

A timeline app for a life, a child, a house, a relationship, a business or a plan. Years you swipe through, months coloured by season, moments with photos, ages and statuses, and a presentation mode for large screens. The interface is in Dutch.

## Where things are

- `prototype/tijdlijn.html` is the original single-file prototype (built in claude.ai). **It is the functional spec**: when in doubt about how something should look or behave, open it in a browser and match it. Do not keep adding to it.
- `src/lib/domain/` holds the pure logic with tests: dates, timeline kinds, ages, occurrences (repeats, periods, overdue), view helpers (filters, scope, labels), slides and the year-slide layout, demo data (a whole life, the festivals in the Netherlands for the coming ten years, estimated from each festival's usual pattern, and `scales.ts`: time scales from eons to weeks, with the geological time scale, the calendar, landmarks and zooming), backup parsing (also the prototype's v3 format), print (a list, or `printLineHtml`: one landscape A4 page per year with its photos and the Jaarlijn) and standalone presentation HTML, EXIF date (or the date in the file name), photo import (`photoImport.ts`: a batch of photos becomes one moment per day), zip. No DOM, no globals: "today" is passed in.
- `src/lib/data/` is storage behind one `Backend` interface: `local.ts` (localStorage + IndexedDB for photos) and `cloud.ts` (Supabase tables, storage, realtime, share links). `photos.ts` resizes photos and reads their date.
- `src/lib/state/app.svelte.ts` is the app state (runes): data, current timeline, filter, scope, pager position, and the actions that save. `ui.svelte.ts` says which sheet or dialog is open.
- `src/lib/components/` are the screens: `TopBar` (on the Jaarlijn only its top row; the filters and the years fold into a panel that opens with the arrow), `YearsRow` (on the Jaarlijn, fixed under the bar, above the pages: the years of the timeline; it stays put while you swipe or scroll, `Pager` with `YearPage` (by default the upper half holds the year, centred, with a row of its photos to the right (or, when there are none, placeholder polaroids with the year's icons drifting by, a click on one adds a moment), and the lower half `YearLines`, the Jaarlijn (with `YearsRow` above: all years alike as two digits ('26), only the year on show and the one pointed at with their full number; click one to go there; a click on the year on show zooms out to all years: the months go, the years become columns with the moments of all of them as one-line blocks, and a click on a year or Esc zooms back in; Ctrl + wheel or a pinch zooms in and out around the mouse through all years, year, month and day, and Shift + wheel or a sideways swipe goes to the year, month or day before or after), then the year edge to edge with the months as columns under a bar: years, months and days each a row of the same height; a band with the month's number and name in its season's colour (the only colour there), the days below it without colour, number first as room allows ("20 dinsdag", "20 Di", "20"); each moment a plain block lying on its days (a whole-year moment spans the year) with two lines (icon and name, then the dates), blocks that would touch on rows of their own; a month opens up on hover anywhere in its column (lit up top to bottom) with its days as columns, and there the day under the mouse lights up (a click on it goes straight to that day); a small round plus appears on the month (in its bar) and the day (at the bottom of its column) the mouse is on, to add a moment there; a click or tap on a month gives it the full width, where days open up on hover the same way, and a click on a day expands it the same way (the other days thin strips, the other months still thin strips too), onto `DayLine`; a click on what is expanded, the month's bar or the day's date, folds it back, as does Esc. The day grows out of its column, its date stays in the bar with the name of the day and arrows to the day before and after, and thin days with something on them get a dot. The day view: a thin arc of the sun from midnight to midnight (the sun at the time on today, white sun and moons, no colour), the hours below, the day's moments as bars across the whole day, cut square where they run on from the day before or into the next, then a button to add a moment to that day (a double click on an empty spot does the same). Or `MonthTabs`: the months as tabs, the chosen month's days on one row below, periods as bars) and `MonthPage`, `Content`/`MomentRow` (list or photos, on the month page), `Menu` (also where you pick Jaarlijn or Maanden, and "Foto's toevoegen": pick several photos at once, each day becomes a moment), `Editor`, `DaySheet`, `TimelinePicker`, `TimelineEditor` + `ShareBox`, `Gallery`, `Presenter` (presenting: the year screen itself full screen, flush along the bottom a compact Jaarlijn of fixed height (about 38% of the screen), everything in it scaled up with the screen and the names sized to fit its rows, with the moment on show lit up and its month open (or the month tabs, if the year page shows those); a moment with a photo fills everything above it with the photo, whole and centred over a blurred copy, the text in white on the left (at the bottom on an upright screen), one slide per photo; `state/present.ts` morphs into it with a view transition), `SignIn`, `Toast`, `DemoPicker` (dropdown with the demos), `ScalesView` (the Tijdschalen demo instead of the pager: a logarithmic bar of how far back you are and the path down to the window on top, then one block per scale; click a stretch to zoom into it, a block too fine to show zooms in where you click). Small building blocks: `Btn`, `Chip`, `Seg`, `Dialog`, `Photo`, `Icon`.
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
- Every button gets a subtle hover under `@media (hover: hover)`, using the `--hover` and `--hover-filter` tokens.
- Respect `prefers-reduced-motion`, support keyboard and screen readers, test on a phone width (390px) and a wide monitor.

## Roadmap

Steps 1 to 6 are built. Supabase login, sharing and realtime are written against the schema but still need a check against a real project.

1. **Core views**: year pager with swipe, seasons bar, month view (calendar and the one-row accordion), day sheet, editor. Match the prototype.
2. **Supabase**: sign in (magic link), load and save timelines and moments, realtime updates, the demo loader.
3. **Photos**: upload to the `photos` bucket (resize first, read the date from EXIF), gallery, photo grid per year.
4. **Sharing**: invite links (`share_links` + `accept_share_link`), viewer and editor roles.
5. **Presentation mode**: the year screen itself in full screen, morphing in with a view transition: the year on top, one moment at a time in the middle, the year along the bottom (the Jaarlijn or the month tabs) with the moment marked; keyboard and swipe.
6. **Backup and export**: JSON with photos as a zip, a standalone presentation file to share offline, print or PDF with photos.
7. **Ideas**: search, tagging people on moments, progress amounts for savings goals, PWA install and offline, then Capacitor for app stores.
