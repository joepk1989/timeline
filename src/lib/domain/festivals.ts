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
				id: makeId(), timelineId: timeline.id, title: f.name, emoji: f.emoji, categoryId: f.cat, date, end, repeat: false, status: null, photos: [],
				note: `${f.place}. Datum geschat: meestal ${f.pattern}. Controleer de officiële datum bij de organisatie.`
			});
		}
	}
	return { timeline, moments };
}
