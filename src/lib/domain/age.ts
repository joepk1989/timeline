import { daysBetween, parseDate } from './dates';
import { KINDS } from './kinds';
import type { Day, Timeline } from './types';

function monthsBetween(a: Day, y: number, m: number, d: number): number {
	let n = (y - a.y) * 12 + (m - a.m);
	if (d < a.d) n--;
	return n;
}

/**
 * How old / how long, at a given date, counted from the timeline's anchor.
 * Age mode: "10 maanden", "2 jaar en 4 mnd", "36 jaar". Duration mode: "jaar 3 in huis", "5 jaar samen".
 * Returns null without an anchor or for whole-year dates.
 */
export function ageLabel(tl: Timeline, y: number, m: number | null, d: number | null): string | null {
	if (!tl.anchor || m == null) return null;
	const a = parseDate(tl.anchor) as Day;
	const kind = KINDS[tl.kind];
	const day = d ?? a.d;
	const n = monthsBetween(a, y, m, day);
	const days = daysBetween(a, { y, m, d: day });
	if (days < 0) return kind.mode === 'age' ? kind.before ?? null : null;
	if (kind.mode === 'duration') return kind.duration ? kind.duration(Math.floor(n / 12), n % 12) : null;
	if (n < 1) return d == null ? 'eerste maand' : days === 0 ? null : `${days} ${days === 1 ? 'dag' : 'dagen'} oud`;
	if (n < 12) return `${n} ${n === 1 ? 'maand' : 'maanden'}`;
	const years = Math.floor(n / 12), rest = n % 12;
	return years < 18 && rest ? `${years} jaar en ${rest} mnd` : `${years} jaar`;
}

/** Line under a year heading, e.g. "Emma wordt 4". Null before the anchor year or without anchor. */
export function yearLine(tl: Timeline, y: number): string | null {
	if (!tl.anchor) return null;
	const ay = parseDate(tl.anchor).y;
	if (y < ay) return null;
	return KINDS[tl.kind].yearLine(y - ay, tl.name);
}
