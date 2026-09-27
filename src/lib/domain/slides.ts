import { daysInMonth } from './dates';
import { yearOccurrences } from './occurrences';
import type { Day, Moment, Occurrence } from './types';
import { isFuture, type Scope } from './view';

export type Slide =
	| { kind: 'title' }
	| { kind: 'year'; y: number; occs: Occurrence[] }
	| { kind: 'moment'; o: Occurrence; photo: string | null; photoIndex: number; photoCount: number };

export type ShowWhat = 'all' | 'year' | 'future';
export interface ShowOptions {
	what: ShowWhat;
	/** A year slide before each new year. */
	years: boolean;
	/** Every photo of a moment gets its own slide. */
	photos: boolean;
}

/**
 * Slides for the presentation: a title, then per year (optionally) a year slide and one slide per moment.
 * Yearly anniversaries are left out, periods appear once. Returns [] when there is nothing to show.
 */
export function buildSlides(visible: Moment[], scope: Scope, currentYear: number, now: Day, opt: ShowOptions): Slide[] {
	const out: Slide[] = [{ kind: 'title' }];
	const seen = new Set<string>();
	let from = scope.from, to = scope.to;
	if (opt.what === 'year') from = to = currentYear;
	if (opt.what === 'future') from = Math.max(scope.from, now.y);
	for (let y = from; y <= to; y++) {
		let occs = yearOccurrences(visible, y).filter((o) => !o.moment.anniversary);
		if (opt.what === 'future') occs = occs.filter((o) => isFuture(o, now));
		occs = occs.filter((o) => {
			if (!o.end) return true;
			if (seen.has(o.moment.id)) return false;
			seen.add(o.moment.id);
			return true;
		});
		if (!occs.length) continue;
		if (opt.years) out.push({ kind: 'year', y, occs });
		for (const o of occs) {
			const ph = o.moment.photos;
			if (opt.photos && ph.length > 1) ph.forEach((p, i) => out.push({ kind: 'moment', o, photo: p, photoIndex: i, photoCount: ph.length }));
			else out.push({ kind: 'moment', o, photo: ph[0] ?? null, photoIndex: 0, photoCount: ph.length });
		}
	}
	return out.length > 1 ? out : [];
}

/** Position of a day within year `y`, in percent (0 before the year, 100 after). */
export function yearPosition(y: number, yy: number, m: number, d: number): number {
	if (yy < y) return 0;
	if (yy > y) return 100;
	const days = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 86_400_000;
	return (((Date.UTC(yy, m, d) - Date.UTC(y, 0, 1)) / 86_400_000 + 0.5) / days) * 100;
}

export interface YearMarker {
	o: Occurrence;
	x: number;
	lane: number;
}
export interface YearBar {
	o: Occurrence;
	left: number;
	width: number;
	row: number;
}

/** Layout of the year slide: markers spread over four lanes so labels do not overlap, and up to four period bars. */
export function yearLayout(occs: Occurrence[], y: number, lanes = 4, gap = 14.5): { markers: YearMarker[]; bars: YearBar[] } {
	const bars = occs.filter((o) => o.end).slice(0, 4).map((o, row) => {
		const x1 = yearPosition(y, o.y, o.m!, o.d!), x2 = yearPosition(y, o.end!.y, o.end!.m, o.end!.d);
		const width = Math.max(3, x2 - x1);
		return { o, left: Math.min(x1, 100 - width), width, row };
	});
	const last = Array<number>(lanes).fill(-99);
	const markers = occs
		.filter((o) => o.m != null && !o.end)
		.map((o) => ({ o, x: yearPosition(y, o.y, o.m!, o.d ?? Math.ceil(daysInMonth(o.y, o.m!) / 2)) }))
		.sort((a, b) => a.x - b.x)
		.map(({ o, x }) => {
			let lane = last.findIndex((l) => x - l >= gap);
			if (lane < 0) lane = last.indexOf(Math.min(...last));
			last[lane] = x;
			return { o, x: Math.min(97, Math.max(3, x)), lane };
		});
	return { markers, bars };
}
