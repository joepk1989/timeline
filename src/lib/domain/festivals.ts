import { daysInMonth, formatDate } from './dates';
import type { Category, Day, Moment, Timeline } from './types';

/**
 * Demo: festivals in the Netherlands for the coming ten years.
 * Future dates are not announced yet, so each date follows the festival's usual pattern
 * (Easter weekend, the third Friday of June, 5 May, ...). Every moment says it is an estimate.
 */

/** Easter Sunday (Gregorian), as [month 0-based, day]. */
export function easter(y: number): [number, number] {
	const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
	const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
	return [month - 1, day];
}

const weekday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).getUTCDay();

/** The first day on or after `from` (day of month) that falls on weekday `wd` (0 = Sunday). */
export function weekdayFrom(y: number, m: number, from: number, wd: number): number {
	return from + ((wd - weekday(y, m, from) + 7) % 7);
}
/** The n-th weekday `wd` of a month (n = 1 for the first). */
export const nthWeekday = (y: number, m: number, wd: number, n: number) => weekdayFrom(y, m, 1, wd) + 7 * (n - 1);
/** The last weekday `wd` of a month. */
export function lastWeekday(y: number, m: number, wd: number): number {
	const last = daysInMonth(y, m);
	return last - ((weekday(y, m, last) - wd + 7) % 7);
}

/** A date plus a number of days, as a day-precision string. */
function add(y: number, m: number, d: number, days: number): string {
	const t = new Date(Date.UTC(y, m, d + days));
	return formatDate(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}
const FRI = 5, SUN = 0, WED = 3, THU = 4;

interface Festival {
	name: string;
	place: string;
	emoji: string;
	cat: string;
	/** Start (month 0-based, day) and length in days for a year, or null when it is not held that year. */
	when: (y: number) => { m: number; d: number; days: number } | null;
	pattern: string;
}

const FESTIVALS: Festival[] = [
	{ name: 'Eurosonic Noorderslag', place: 'Groningen', emoji: '🎸', cat: 'pop', pattern: 'woensdag t/m zaterdag rond half januari',
		when: (y) => ({ m: 0, d: weekdayFrom(y, 0, 13, WED), days: 4 }) },
	{ name: 'Carnaval', place: 'Zuid-Nederland', emoji: '🎭', cat: 'feest', pattern: 'zondag t/m dinsdag, zeven weken voor Pasen',
		when: (y) => { const [m, d] = easter(y); const t = new Date(Date.UTC(y, m, d - 49)); return { m: t.getUTCMonth(), d: t.getUTCDate(), days: 3 }; } },
	{ name: 'Paaspop', place: 'Schijndel', emoji: '🐣', cat: 'pop', pattern: 'Goede Vrijdag t/m Paaszondag',
		when: (y) => { const [m, d] = easter(y); const t = new Date(Date.UTC(y, m, d - 2)); return { m: t.getUTCMonth(), d: t.getUTCDate(), days: 3 }; } },
	{ name: 'Bevrijdingsfestivals', place: 'In alle provincies', emoji: '🕊️', cat: 'feest', pattern: 'elk jaar op 5 mei',
		when: () => ({ m: 4, d: 5, days: 1 }) },
	{ name: 'Best Kept Secret', place: 'Hilvarenbeek', emoji: '🌲', cat: 'pop', pattern: 'eerste weekend van juni',
		when: (y) => ({ m: 5, d: nthWeekday(y, 5, FRI, 1), days: 3 }) },
	{ name: 'Oerol', place: 'Terschelling', emoji: '🏝️', cat: 'kunst', pattern: 'tien dagen vanaf de tweede vrijdag van juni',
		when: (y) => ({ m: 5, d: nthWeekday(y, 5, FRI, 2), days: 10 }) },
	{ name: 'Pinkpop', place: 'Landgraaf', emoji: '🎤', cat: 'pop', pattern: 'derde weekend van juni',
		when: (y) => ({ m: 5, d: nthWeekday(y, 5, FRI, 3), days: 3 }) },
	{ name: 'Defqon.1', place: 'Biddinghuizen', emoji: '🔥', cat: 'dance', pattern: 'laatste donderdag t/m zondag van juni',
		when: (y) => ({ m: 5, d: lastWeekday(y, 5, THU), days: 4 }) },
	{ name: 'Down The Rabbit Hole', place: 'Ewijk', emoji: '🐇', cat: 'pop', pattern: 'eerste weekend van juli',
		when: (y) => ({ m: 6, d: nthWeekday(y, 6, FRI, 1), days: 3 }) },
	{ name: 'North Sea Jazz', place: 'Rotterdam', emoji: '🎷', cat: 'jazz', pattern: 'tweede weekend van juli',
		when: (y) => ({ m: 6, d: nthWeekday(y, 6, FRI, 2), days: 3 }) },
	{ name: 'Awakenings Festival', place: 'Hilvarenbeek', emoji: '🎛️', cat: 'dance', pattern: 'tweede weekend van juli',
		when: (y) => ({ m: 6, d: nthWeekday(y, 6, FRI, 2), days: 3 }) },
	{ name: 'Zwarte Cross', place: 'Lichtenvoorde', emoji: '🏍️', cat: 'pop', pattern: 'donderdag t/m de derde zondag van juli',
		when: (y) => ({ m: 6, d: nthWeekday(y, 6, SUN, 3) - 3, days: 4 }) },
	{ name: 'Dekmantel', place: 'Amsterdamse Bos', emoji: '🌳', cat: 'dance', pattern: 'woensdag t/m de eerste zondag van augustus',
		when: (y) => { const sun = nthWeekday(y, 7, SUN, 1); const t = new Date(Date.UTC(y, 7, sun - 4)); return { m: t.getUTCMonth(), d: t.getUTCDate(), days: 5 }; } },
	{ name: 'Lowlands', place: 'Biddinghuizen', emoji: '🎪', cat: 'pop', pattern: 'weekend met de vrijdag tussen 16 en 22 augustus',
		when: (y) => ({ m: 7, d: weekdayFrom(y, 7, 16, FRI), days: 3 }) },
	{ name: 'SAIL Amsterdam', place: 'Amsterdam', emoji: '⛵', cat: 'feest', pattern: 'eens in de vijf jaar, woensdag t/m zondag in augustus',
		when: (y) => (y % 5 === 0 ? { m: 7, d: weekdayFrom(y, 7, 19, WED), days: 5 } : null) },
	{ name: 'Mysteryland', place: 'Haarlemmermeer', emoji: '🌀', cat: 'dance', pattern: 'weekend met de vrijdag tussen 22 en 28 augustus',
		when: (y) => ({ m: 7, d: weekdayFrom(y, 7, 22, FRI), days: 3 }) },
	{ name: 'Into the Great Wide Open', place: 'Vlieland', emoji: '🌅', cat: 'pop', pattern: 'laatste weekend van augustus',
		when: (y) => ({ m: 7, d: lastWeekday(y, 7, FRI), days: 3 }) },
	{ name: 'Amsterdam Dance Event', place: 'Amsterdam', emoji: '💿', cat: 'dance', pattern: 'woensdag t/m zondag, midden oktober',
		when: (y) => ({ m: 9, d: weekdayFrom(y, 9, 15, WED), days: 5 }) },
	{ name: 'Le Guess Who?', place: 'Utrecht', emoji: '❓', cat: 'jazz', pattern: 'donderdag t/m zondag, begin november',
		when: (y) => ({ m: 10, d: weekdayFrom(y, 10, 7, THU), days: 4 }) }
];

const CATEGORIES: Category[] = [
	{ id: 'pop', name: 'Pop en rock', color: '#D0663A' },
	{ id: 'dance', name: 'Dance', color: '#7A5BC4' },
	{ id: 'jazz', name: 'Jazz en meer', color: '#2F6FD1' },
	{ id: 'kunst', name: 'Theater en kunst', color: '#1F8A8A' },
	{ id: 'feest', name: 'Feest en traditie', color: '#C8507A' }
];

/** The coming ten years of festivals: what is still ahead this year, then the next ten years. */
export function festivalTimeline(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const timeline: Timeline = {
		id: makeId(), name: 'Demo: festivals in Nederland', kind: 'anders', anchor: null,
		categories: CATEGORIES.map((c) => ({ ...c })), scope: { from: now.y, to: now.y + 10 }, demo: true
	};
	const today = formatDate(now.y, now.m, now.d);
	const moments: Moment[] = [];
	for (let y = now.y; y <= now.y + 10; y++) {
		for (const f of FESTIVALS) {
			const w = f.when(y);
			if (!w) continue;
			const date = formatDate(y, w.m, w.d);
			const end = w.days > 1 ? add(y, w.m, w.d, w.days - 1) : null;
			if ((end ?? date) < today) continue;
			moments.push({
				id: makeId(), timelineId: timeline.id, title: f.name, emoji: f.emoji, categoryId: f.cat, date, end, repeat: false, status: null,
				photos: [DEMO_PHOTO + slugOf(f.name)],
				note: `${f.place}. Datum geschat: meestal ${f.pattern}. Controleer de officiële datum bij de organisatie. De foto is een voorbeeld.`
			});
		}
	}
	return { timeline, moments };
}

/* ---------- placeholder photos ---------- */

/** Photo paths of the demo start with this; they are drawn here instead of stored. */
export const DEMO_PHOTO = 'demo:festival/';
export const isDemoPhoto = (path: string) => path.startsWith('demo:');
const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function shade(hex: string, k: number): string {
	const n = parseInt(hex.slice(1), 16);
	const ch = (v: number) => Math.round(v * k).toString(16).padStart(2, '0');
	return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}
/** Small deterministic random numbers, so a festival always gets the same picture. */
function rng(seed: string) {
	let h = 2166136261;
	for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
	return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

/**
 * A placeholder photo for a demo festival: a stage with light beams and a crowd in the
 * festival's category colour, its symbol, name and place, and a "Voorbeeldfoto" label. SVG text, or null.
 */
export function demoPhotoSvg(path: string): string | null {
	if (!path.startsWith(DEMO_PHOTO)) return null;
	const f = FESTIVALS.find((x) => slugOf(x.name) === path.slice(DEMO_PHOTO.length));
	if (!f) return null;
	const color = CATEGORIES.find((c) => c.id === f.cat)!.color;
	const r = rng(f.name);
	const beams = Array.from({ length: 5 }, (_, i) => {
		const x = 140 + i * 230 + r() * 80, spread = 120 + r() * 160, to = x + (r() - 0.5) * 500;
		return `<polygon points="${x},0 ${to - spread},800 ${to + spread},800" fill="#fff" opacity="${(0.05 + r() * 0.08).toFixed(2)}"/>`;
	}).join('');
	const heads = Array.from({ length: 34 }, (_, i) => {
		const x = i * 37 + r() * 20 - 10, y = 700 + r() * 40, rad = 26 + r() * 14;
		const arm = r() < 0.25 ? `<rect x="${(x + rad * 0.6).toFixed(0)}" y="${(y - 110).toFixed(0)}" width="12" height="100" rx="6" transform="rotate(${(r() * 30 - 15).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>` : '';
		return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(0)}"/>${arm}`;
	}).join('');
	// Everything sits in the middle, so a square crop (the photo grid) still shows it; long names get smaller.
	const size = Math.round(Math.min(92, 740 / (0.56 * f.name.length)));
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(color, 1)}"/><stop offset="1" stop-color="${shade(color, 0.45)}"/></linearGradient>
<radialGradient id="glow" cx="0.72" cy="0.18" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="800" fill="url(#bg)"/>
<rect width="1200" height="800" fill="url(#glow)"/>
${beams}
<g fill="#000" opacity="0.28">${heads}<rect y="730" width="1200" height="70"/></g>
<text x="600" y="330" text-anchor="middle" font-size="170" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif">${f.emoji}</text>
<text x="600" y="${400 + size}" text-anchor="middle" font-size="${size}" font-weight="800" fill="#fff" font-family="'Bricolage Grotesque',system-ui,sans-serif" letter-spacing="-1">${xml(f.name)}</text>
<text x="600" y="${455 + size}" text-anchor="middle" font-size="38" fill="#fff" opacity="0.85" font-family="'Bricolage Grotesque',system-ui,sans-serif">${xml(f.place)}</text>
<g transform="translate(485 40)"><rect width="230" height="54" rx="27" fill="#000" opacity="0.35"/><text x="115" y="36" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">Voorbeeldfoto</text></g>
</svg>`;
}
