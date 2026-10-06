import { dayNumber, daysBetween, daysInMonth, MONTHS, MONTHS_SHORT, parseDate } from './dates';
import { KINDS } from './kinds';
import type { Day, Moment, Occurrence, Timeline } from './types';

/** Birth / start moment and the yearly anniversary, generated from the timeline's anchor. */
export function virtualMoments(tl: Timeline): Moment[] {
	if (!tl.anchor) return [];
	const kind = KINDS[tl.kind];
	const base = { timelineId: tl.id, note: '', categoryId: '', end: null, status: null, photos: [], virtual: true };
	const out: Moment[] = [{ ...base, id: '__anchor', title: kind.anchorTitle(tl.name), emoji: kind.anchorEmoji, date: tl.anchor, repeat: false }];
	if (!kind.noAnniversary) out.push({ ...base, id: '__anniversary', anniversary: true, title: kind.anniversaryTitle, emoji: kind.anniversaryEmoji, date: tl.anchor, repeat: true });
	return out;
}

/** Where (if anywhere) a moment appears in year Y. */
export function occurrenceInYear(mo: Moment, Y: number): Occurrence | null {
	const s = parseDate(mo.date);
	if (mo.repeat) {
		if (Y < s.y || (mo.anniversary && Y === s.y)) return null;
		const d = s.d == null || s.m == null ? null : Math.min(s.d, daysInMonth(Y, s.m)); // 29 Feb -> 28 Feb
		return { moment: mo, y: Y, m: s.m, d, age: Y - s.y };
	}
	if (mo.end) {
		const e = parseDate(mo.end);
		if (Y < s.y || Y > e.y) return null;
		return { moment: mo, y: s.y, m: s.m, d: s.d, end: { y: e.y, m: e.m!, d: e.d! } };
	}
	return s.y === Y ? { moment: mo, y: s.y, m: s.m, d: s.d } : null;
}

function sortKey(o: Occurrence, Y: number): number {
	if (o.m == null) return -1;
	if (o.end && o.y < Y) return 0;
	return (o.m + 1) * 100 + (o.d ?? 0);
}

/** All occurrences in a year, sorted: whole-year first, then by date. */
export function yearOccurrences(moments: Moment[], Y: number): Occurrence[] {
	return moments
		.map((mo) => occurrenceInYear(mo, Y))
		.filter((o): o is Occurrence => o != null)
		.sort((a, b) => sortKey(a, Y) - sortKey(b, Y) || Number(!!b.moment.virtual) - Number(!!a.moment.virtual) || a.moment.title.localeCompare(b.moment.title));
}

export function inMonth(o: Occurrence, Y: number, M: number): boolean {
	if (o.m == null) return false;
	if (o.end) return dayNumber(o.y, o.m, o.d ?? 1) <= dayNumber(Y, M, daysInMonth(Y, M)) && dayNumber(o.end.y, o.end.m, o.end.d) >= dayNumber(Y, M, 1);
	return o.m === M;
}

/** True when a day-precision occurrence (or period) covers the given day. */
export function covers(o: Occurrence, Y: number, M: number, D: number): boolean {
	if (o.d == null || o.m == null) return false;
	if (o.end) {
		const n = dayNumber(Y, M, D);
		return n >= dayNumber(o.y, o.m, o.d) && n <= dayNumber(o.end.y, o.end.m, o.end.d);
	}
	return o.m === M && o.d === D;
}

/** "Heel het jaar", "september", "25 sep", "3–12 aug" or "27 dec 2026 – 3 jan 2027". */
export function whenLabel(o: Occurrence): string {
	if (o.m == null) return 'Heel het jaar';
	if (o.d == null) return MONTHS[o.m];
	if (o.end) {
		const sameYear = o.y === o.end.y;
		if (sameYear && o.m === o.end.m) return `${o.d}–${o.end.d} ${MONTHS_SHORT[o.m]}`;
		const y1 = sameYear ? '' : ` ${o.y}`, y2 = sameYear ? '' : ` ${o.end.y}`;
		return `${o.d} ${MONTHS_SHORT[o.m]}${y1} – ${o.end.d} ${MONTHS_SHORT[o.end.m]}${y2}`;
	}
	return `${o.d} ${MONTHS_SHORT[o.m]}`;
}

/** A planned / running goal whose (end) date has passed. */
export function isOverdue(o: Occurrence, now: Day): boolean {
	const st = o.moment.status;
	if (!(st === 'gepland' || st === 'bezig' || st === 'bijstellen')) return false;
	const end = o.end ? dayNumber(o.end.y, o.end.m, o.end.d)
		: o.d != null && o.m != null ? dayNumber(o.y, o.m, o.d)
		: o.m != null ? dayNumber(o.y, o.m, daysInMonth(o.y, o.m))
		: dayNumber(o.y, 11, 31);
	return end < dayNumber(now.y, now.m, now.d);
}

/** "vandaag", "over 12 dagen", "nu bezig", or null. Only within the coming year. */
export function countdown(o: Occurrence, now: Day): string | null {
	if (o.d == null || o.m == null) return null;
	const diff = daysBetween(now, { y: o.y, m: o.m, d: o.d });
	if (o.end) {
		const toEnd = daysBetween(now, o.end);
		if (diff <= 0 && toEnd >= 0) return 'nu bezig';
	} else if (diff === 0) return 'vandaag';
	return diff > 0 && diff <= 365 ? `over ${diff} ${diff === 1 ? 'dag' : 'dagen'}` : null;
}

/** The date with its time of day, when it has one: "5 okt · 09:00", "5 okt · 09:00–10:30". */
export function whenTimeLabel(o: Occurrence): string {
	const t = o.d != null ? o.moment.time : null;
	if (!t) return whenLabel(o);
	return `${whenLabel(o)} · ${t}${o.moment.endTime && !o.end ? `–${o.moment.endTime}` : ''}`;
}
