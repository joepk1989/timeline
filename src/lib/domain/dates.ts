import type { DateParts, Day } from './types';

export const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const WEEKDAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

export type Season = 'winter' | 'lente' | 'zomer' | 'herfst';
/** Meteorological seasons, as used in the Netherlands. */
export function season(m: number): Season {
	if (m === 11 || m <= 1) return 'winter';
	if (m <= 4) return 'lente';
	if (m <= 7) return 'zomer';
	return 'herfst';
}
export const SEASON_NAMES: Record<Season, string> = { winter: 'Winter', lente: 'Lente', zomer: 'Zomer', herfst: 'Herfst' };

const pad = (n: number) => String(n).padStart(2, '0');

/** Days in month `m` (0-based) of year `y`. */
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Sortable number for a day: 20260926. */
export const dayNumber = (y: number, m: number, d: number) => y * 10000 + (m + 1) * 100 + d;

export function formatDate(y: number, m: number | null = null, d: number | null = null): string {
	if (m == null) return String(y);
	if (d == null) return `${y}-${pad(m + 1)}`;
	return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function parseDate(s: string): DateParts {
	const p = s.split('-').map(Number);
	return { y: p[0], m: p.length > 1 ? p[1] - 1 : null, d: p.length > 2 ? p[2] : null };
}

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(s);

export function today(now = new Date()): Day {
	return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

/** "vrijdag 25 september 2026", "september 2026" or "het jaar 2026". */
export function labelFull(y: number, m: number | null, d: number | null): string {
	if (d != null && m != null) return `${WEEKDAYS[new Date(y, m, d).getDay()]} ${d} ${MONTHS[m]} ${y}`;
	if (m != null) return `${MONTHS[m]} ${y}`;
	return `het jaar ${y}`;
}

/** Whole days from a to b (b - a), safe across daylight saving changes. */
export function daysBetween(a: Day, b: Day): number {
	return Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / 86_400_000);
}
