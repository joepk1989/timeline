// Time scales, from eons to weeks, for the "Tijdschalen" demo: click a stretch of time and zoom into it.
// Time is a number of years on the calendar (astronomical: year 0 is 1 BC), with fractions for days,
// so 2026.5 is mid 2026 and 4.6 billion years ago is roughly -4.6e9. "Now" is passed in.

import { MONTHS, MONTHS_SHORT } from './dates';
import type { Moment, Timeline } from './types';

export const SCALES_DEMO_NAME = 'Demo: tijdschalen';

export type ScaleId =
	| 'eon' | 'era' | 'period'
	| 'millennium' | 'century' | 'decade' | 'lustrum'
	| 'olympiad' | 'year' | 'semester' | 'trimester' | 'quarter' | 'month' | 'week';

export interface Scale { id: ScaleId; name: string; many: string; hint: string }
export interface ScaleGroup { name: string; hint: string; scales: Scale[] }

export const SCALE_GROUPS: ScaleGroup[] = [
	{
		name: 'Astronomisch en kosmisch', hint: 'miljarden tot miljoenen jaren',
		scales: [
			{ id: 'eon', name: 'Eon', many: 'eonen', hint: 'miljarden jaren' },
			{ id: 'era', name: 'Tijdperk', many: 'tijdperken', hint: 'honderden miljoenen jaren' },
			{ id: 'period', name: 'Periode', many: 'perioden', hint: 'tientallen miljoenen jaren' }
		]
	},
	{
		name: 'Historisch', hint: 'eeuwen tot millennia',
		scales: [
			{ id: 'millennium', name: 'Millennium', many: 'millennia', hint: '1000 jaar' },
			{ id: 'century', name: 'Eeuw', many: 'eeuwen', hint: '100 jaar' },
			{ id: 'decade', name: 'Decennium', many: 'decennia', hint: '10 jaar' },
			{ id: 'lustrum', name: 'Lustrum', many: 'lustra', hint: '5 jaar' }
		]
	},
	{
		name: 'Kalender', hint: 'een mensenleven',
		scales: [
			{ id: 'olympiad', name: 'Olympiade', many: 'olympiaden', hint: '4 jaar' },
			{ id: 'year', name: 'Jaar', many: 'jaren', hint: '365 of 366 dagen' },
			{ id: 'semester', name: 'Semester', many: 'semesters', hint: '6 maanden' },
			{ id: 'trimester', name: 'Trimester', many: 'trimesters', hint: '4 maanden' },
			{ id: 'quarter', name: 'Kwartaal', many: 'kwartalen', hint: '3 maanden' },
			{ id: 'month', name: 'Maand', many: 'maanden', hint: '28 tot 31 dagen' },
			{ id: 'week', name: 'Week', many: 'weken', hint: '7 dagen' }
		]
	}
];
export const SCALES: Scale[] = SCALE_GROUPS.flatMap((g) => g.scales);

/** A stretch of time on one scale. */
export interface Segment { from: number; to: number; label: string; note?: string }

/* ---------- the geological time scale, in millions of years ago (ICS 2023) ---------- */

type Geo = [name: string, fromMa: number, toMa: number, note?: string];
const EONS: Geo[] = [
	['Hadeïcum', 4600, 4000, 'De aarde ontstaat, nog zonder vaste korst'],
	['Archeïcum', 4000, 2500, 'Het eerste leven: bacteriën'],
	['Proterozoïcum', 2500, 538.8, 'Zuurstof in de lucht, de eerste meercelligen'],
	['Phanerozoïcum', 538.8, 0, 'Zichtbaar leven: planten en dieren']
];
const ERAS: Geo[] = [
	['Eoarcheïcum', 4000, 3600], ['Paleoarcheïcum', 3600, 3200], ['Mesoarcheïcum', 3200, 2800], ['Neoarcheïcum', 2800, 2500],
	['Paleoproterozoïcum', 2500, 1600], ['Mesoproterozoïcum', 1600, 1000], ['Neoproterozoïcum', 1000, 538.8],
	['Paleozoïcum', 538.8, 251.9, 'Oud leven: vissen, de eerste landdieren'],
	['Mesozoïcum', 251.9, 66, 'Het tijdperk van de dinosauriërs'],
	['Cenozoïcum', 66, 0, 'Het tijdperk van de zoogdieren']
];
const PERIODS: Geo[] = [
	['Siderium', 2500, 2300], ['Rhyacium', 2300, 2050], ['Orosirium', 2050, 1800], ['Statherium', 1800, 1600],
	['Calymmium', 1600, 1400], ['Ectasium', 1400, 1200], ['Stenium', 1200, 1000],
	['Tonium', 1000, 720], ['Cryogenium', 720, 635, 'Sneeuwbal-aarde'], ['Ediacarium', 635, 538.8],
	['Cambrium', 538.8, 485.4, 'De Cambrische explosie'], ['Ordovicium', 485.4, 443.8], ['Siluur', 443.8, 419.2],
	['Devoon', 419.2, 358.9, 'Het tijdperk van de vissen'], ['Carboon', 358.9, 298.9, 'Steenkoolbossen'], ['Perm', 298.9, 251.9],
	['Trias', 251.9, 201.4, 'De eerste dinosauriërs'], ['Jura', 201.4, 145], ['Krijt', 145, 66, 'Eindigt met de inslag'],
	['Paleogeen', 66, 23.03], ['Neogeen', 23.03, 2.58], ['Kwartair', 2.58, 0, 'IJstijden en de mens']
];
const GEO: Partial<Record<ScaleId, Geo[]>> = { eon: EONS, era: ERAS, period: PERIODS };

/** From "millions of years ago" to a year on the calendar. */
export const fromMa = (ma: number, now: number) => now - ma * 1e6;

/** The whole of time the demo shows: from the birth of the earth to now. */
export const allTime = (now: number): [number, number] => [fromMa(4600, now), now];

/* ---------- the calendar ---------- */

/** Milliseconds since 1970 for a day, also in years before 100 (which Date.UTC would read as 19xx). */
function utc(y: number, m: number, d = 1): number {
	const t = new Date(Date.UTC(2000, 0, 1));
	t.setUTCFullYear(y, m, d);
	return t.getTime();
}
/** A day as a year with a fraction: 2026-07-01 is about 2026.496. */
export function yearOf(y: number, m = 0, d = 1): number {
	const y0 = Math.floor(y + Math.floor(m / 12));
	const start = utc(y0, 0, 1);
	return y0 + (utc(y0, m - (y0 - y) * 12, d) - start) / (utc(y0 + 1, 0, 1) - start);
}
/** The calendar only goes back as far as dates can be counted. */
export const CALENDAR_LIMIT = 270_000;

/** Year numbers as people say them: 0 is 1 v.Chr. */
export const yearName = (y: number) => (y > 0 ? String(y) : `${1 - y} v.Chr.`);

interface Fixed { len: number; offset: number; label: (start: number) => string }
const FIXED: Partial<Record<ScaleId, Fixed>> = {
	millennium: { len: 1000, offset: 1, label: (s) => ordinal(Math.floor((s - 1) / 1000) + 1, 'millennium') },
	century: { len: 100, offset: 1, label: (s) => ordinal(Math.floor((s - 1) / 100) + 1, 'eeuw') },
	decade: { len: 10, offset: 0, label: (s) => (s >= 1900 && s < 2000 ? `jaren '${String(s % 100).padStart(2, '0')}` : `${yearName(s)}–${yearName(s + 9)}`) },
	lustrum: { len: 5, offset: 0, label: (s) => `${yearName(s)}–${yearName(s + 4)}` },
	olympiad: { len: 4, offset: 0, label: (s) => `${yearName(s)}–${yearName(s + 3)}` },
	year: { len: 1, offset: 0, label: (s) => yearName(s) }
};
function ordinal(n: number, what: string): string {
	return n > 0 ? `${n}e ${what}` : `${1 - n}e ${what} v.Chr.`;
}

/** Parts of a year, by the months they start in. */
const PARTS: Partial<Record<ScaleId, { starts: number[]; label: (i: number) => string }>> = {
	semester: { starts: [0, 6], label: (i) => `${i + 1}e semester` },
	trimester: { starts: [0, 4, 8], label: (i) => `${i + 1}e trimester` },
	quarter: { starts: [0, 3, 6, 9], label: (i) => `kwartaal ${i + 1}` },
	month: { starts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], label: (i) => MONTHS[i] }
};
/** About how long one unit of a scale is, in years. */
export function unitYears(id: ScaleId): number {
	if (FIXED[id]) return FIXED[id]!.len;
	if (PARTS[id]) return 1 / PARTS[id]!.starts.length;
	if (id === 'week') return 7 / 365.2425;
	return { eon: 1e9, era: 3e8, period: 3e7 }[id as 'eon' | 'era' | 'period'];
}

export type Row = { kind: 'segments'; list: Segment[] } | { kind: 'fine'; count: number } | { kind: 'none'; reason: string };

/**
 * The stretches of one scale that fall in the window [a, b], or, when there would be more than `max`
 * of them, how many there are (too fine to show: zoom in first).
 */
export function scaleRow(id: ScaleId, a: number, b: number, now: number, max = 60): Row {
	const geo = GEO[id];
	if (geo) {
		const list = geo
			.map(([label, f, t, note]) => ({ from: fromMa(f, now), to: fromMa(t, now), label, note }))
			.filter((s) => s.to > a && s.from < b);
		return list.length ? { kind: 'segments', list } : { kind: 'none', reason: id === 'eon' ? 'Voor de aarde' : 'Geen indeling hier' };
	}
	const count = (b - a) / unitYears(id);
	if (count > max) return { kind: 'fine', count: Math.round(count) };
	if (Math.abs(a) > CALENDAR_LIMIT || Math.abs(b) > CALENDAR_LIMIT) return { kind: 'none', reason: 'Zo ver terug telt geen kalender' };

	const list: Segment[] = [];
	const fixed = FIXED[id];
	if (fixed) {
		let s = Math.floor((a - fixed.offset) / fixed.len) * fixed.len + fixed.offset;
		for (; s < b; s += fixed.len) list.push({ from: s, to: s + fixed.len, label: fixed.label(s) });
		return { kind: 'segments', list };
	}
	const parts = PARTS[id];
	if (parts) {
		for (let y = Math.floor(a); y < b; y++) {
			parts.starts.forEach((m, i) => {
				const from = yearOf(y, m), to = yearOf(y, parts.starts[i + 1] ?? 12);
				if (to > a && from < b) list.push({ from, to, label: parts.label(i), note: yearName(y) });
			});
		}
		return { kind: 'segments', list };
	}
	// ISO weeks: Monday to Sunday, numbered from the week with the year's first Thursday.
	const start = new Date(utc(Math.floor(a), 0, 1) + (a - Math.floor(a)) * (utc(Math.floor(a) + 1, 0, 1) - utc(Math.floor(a), 0, 1)));
	// Floor to the day, forgiving the tiny rounding of a day that was turned into a fraction of a year.
	const day = Math.floor(start.getTime() / 86_400_000 + 1e-6) * 86_400_000;
	let t = new Date(day - ((new Date(day).getUTCDay() + 6) % 7) * 86_400_000);
	for (;;) {
		const from = yearOf(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
		if (from >= b) break;
		const next = new Date(t.getTime() + 7 * 86_400_000);
		list.push({ from, to: yearOf(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()), label: `week ${isoWeek(t)}`, note: `${t.getUTCDate()} ${MONTHS_SHORT[t.getUTCMonth()]}` });
		t = next;
	}
	return { kind: 'segments', list };
}
function isoWeek(monday: Date): number {
	const thursday = new Date(monday.getTime() + 3 * 86_400_000);
	const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1);
	return Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000)) + 1;
}

/** For each scale, the stretch that holds all of the window, as far down as there is one. */
export function pathOf(a: number, b: number, now: number): { scale: Scale; seg: Segment }[] {
	const out: { scale: Scale; seg: Segment }[] = [];
	const eps = (b - a) * 1e-9;
	for (const scale of SCALES) {
		if (unitYears(scale.id) < (b - a) * 0.999) continue;
		const row = scaleRow(scale.id, a, b, now, 3);
		if (row.kind !== 'segments') continue;
		const seg = row.list.find((s) => s.from <= a + eps && s.to >= b - eps);
		if (seg) out.push({ scale, seg });
	}
	return out;
}

/* ---------- how far back, in words ---------- */

const nl = (n: number, digits = 0) => n.toLocaleString('nl-NL', { maximumFractionDigits: digits });

/** "4,6 miljard jaar geleden", "12.000 jaar geleden", "1969" or "juli 2026". */
export function whenName(t: number, now: number, span = 1): string {
	const ago = now - t;
	if (ago >= 1e9) return `${nl(ago / 1e9, 1)} miljard jaar geleden`;
	if (ago >= 1e6) return `${nl(ago / 1e6, ago >= 1e8 ? 0 : 1)} miljoen jaar geleden`;
	if (ago >= 10_000) return `${nl(Math.round(ago / 1000) * 1000)} jaar geleden`;
	const y = Math.floor(t);
	if (span >= 1 || Math.abs(t) > CALENDAR_LIMIT) return yearName(y);
	const m = Math.min(11, Math.floor((t - y) * 12));
	return `${MONTHS[m]} ${yearName(y)}`;
}

/* ---------- the indicator: how far back, on a logarithmic bar ---------- */

export const AGO_MAX = 4.6e9;
export const AGO_MIN = 1 / 365;
/** Where "years ago" sits on the indicator, 0 (the birth of the earth) to 1 (today). */
export function agoPos(ago: number): number {
	const g = Math.min(AGO_MAX, Math.max(AGO_MIN, ago));
	return (Math.log10(AGO_MAX) - Math.log10(g)) / (Math.log10(AGO_MAX) - Math.log10(AGO_MIN));
}
export const AGO_TICKS: [number, string][] = [
	[4.6e9, '4,6 mld'], [1e9, '1 mld'], [1e8, '100 mln'], [1e7, '10 mln'], [1e6, '1 mln'], [1e5, '100.000'],
	[1e4, '10.000'], [1e3, '1000'], [100, '100'], [10, '10'], [1, '1 jaar'], [1 / 12, '1 mnd'], [7 / 365, 'week']
];

/* ---------- moments in the history of the earth ---------- */

export interface Landmark { t: number; emoji: string; label: string }
export function landmarks(now: number): Landmark[] {
	return [
		{ t: fromMa(4540, now), emoji: '🌍', label: 'De aarde ontstaat' },
		{ t: fromMa(3700, now), emoji: '🦠', label: 'Het eerste leven' },
		{ t: fromMa(2400, now), emoji: '🫧', label: 'Zuurstof in de lucht' },
		{ t: fromMa(538.8, now), emoji: '🐚', label: 'De Cambrische explosie' },
		{ t: fromMa(230, now), emoji: '🦕', label: 'De eerste dinosauriërs' },
		{ t: fromMa(66, now), emoji: '☄️', label: 'Inslag: einde van de dinosauriërs' },
		{ t: now - 300_000, emoji: '🧍', label: 'De eerste mensen' },
		{ t: -3199, emoji: '✍️', label: 'Het schrift' },
		{ t: 1969.55, emoji: '🌕', label: 'Een mens op de maan' },
		{ t: now, emoji: '📍', label: 'Vandaag' }
	];
}

/* ---------- zooming ---------- */

/**
 * The window between two windows, at `p` (0 to 1): the width changes evenly on a logarithmic scale and
 * the middle moves along with it, so zooming from billions of years to a week stays smooth.
 */
export function zoomBetween(from: [number, number], to: [number, number], p: number): [number, number] {
	const wf = from[1] - from[0], wt = to[1] - to[0];
	const w = wf === wt ? wf : Math.exp(Math.log(wf) + (Math.log(wt) - Math.log(wf)) * p);
	const k = wf === wt ? p : (w - wf) / (wt - wf);
	const c = (from[0] + from[1]) / 2 + ((to[0] + to[1]) / 2 - (from[0] + from[1]) / 2) * k;
	return [c - w / 2, c + w / 2];
}

/** A window `factor` times wider around its middle, kept within all of time. */
export function zoomOut(w: [number, number], now: number, factor = 10): [number, number] {
	const [lo, hi] = allTime(now);
	const width = Math.min(hi - lo, (w[1] - w[0]) * factor);
	let a = (w[0] + w[1]) / 2 - width / 2;
	a = Math.max(lo, Math.min(a, hi - width));
	// At billions of years a sum loses its last digits: end exactly at now when that is where it ends.
	return [a, hi - (a + width) < width * 1e-9 ? hi : a + width];
}
/** A window `factor` times narrower around the time `t`. */
export function zoomInAt(w: [number, number], t: number, factor = 20): [number, number] {
	const width = (w[1] - w[0]) / factor;
	const a = Math.max(w[0], Math.min(t - width / 2, w[1] - width));
	return [a, a + width];
}

/** The demo: a timeline with no moments of its own, shown as the time scales. */
export function scalesTimeline(now: { y: number }, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	return {
		timeline: {
			id: makeId(), name: SCALES_DEMO_NAME, kind: 'anders', anchor: null, demo: true,
			categories: [{ id: 'tijd', name: 'Tijd', color: '#6B7785' }], scope: { from: now.y, to: now.y }
		},
		moments: []
	};
}
export const isScales = (t: Pick<Timeline, 'name' | 'demo'>) => !!t.demo && t.name === SCALES_DEMO_NAME;
