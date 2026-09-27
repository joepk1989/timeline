import { ageLabel } from './age';
import { dayNumber, daysBetween, daysInMonth, parseDate } from './dates';
import { covers, inMonth, isOverdue, virtualMoments } from './occurrences';
import type { Day, Moment, Occurrence, Status, Timeline } from './types';

export interface Scope {
	from: number;
	to: number;
}

/** Scope for a new timeline: from the anchor year (or five years back) to one year past today. */
export function defaultScope(anchor: string | null, now: Day): Scope {
	if (anchor) {
		const y = parseDate(anchor).y;
		return { from: Math.min(y, now.y), to: Math.max(y, now.y) + 1 };
	}
	return { from: now.y - 5, to: now.y + 5 };
}

/** Keeps a scope in order and at most 200 years long. */
export function clampScope(s: Scope): Scope {
	let { from, to } = s;
	if (from > to) [from, to] = [to, from];
	if (to - from > 199) to = from + 199;
	return { from, to };
}

export interface Filter {
	categoryId: string | null;
	status: Status | null;
}

export const passes = (m: Moment, f: Filter) => (!f.categoryId || m.categoryId === f.categoryId) && (!f.status || m.status === f.status);

/** Moments to show: the timeline's own moments that pass the filter, plus birth/anniversary when nothing is filtered. */
export function visibleMoments(tl: Timeline, moments: Moment[], f: Filter): Moment[] {
	const own = moments.filter((m) => m.timelineId === tl.id && passes(m, f));
	return f.categoryId || f.status ? own : own.concat(virtualMoments(tl));
}

export const monthOccurrences = (occs: Occurrence[], y: number, m: number) => occs.filter((o) => inMonth(o, y, m));

/** Number of moments that touch the scope. */
export function countInScope(moments: Moment[], scope: Scope): number {
	return moments.filter((mo) => {
		const s = parseDate(mo.date);
		if (mo.repeat) return s.y <= scope.to;
		const ey = mo.end ? parseDate(mo.end).y : s.y;
		return s.y <= scope.to && ey >= scope.from;
	}).length;
}

/** This year when it is in scope, otherwise the first year with a moment, otherwise the start. */
export function pickStartYear(moments: Moment[], scope: Scope, now: Day): number {
	if (now.y >= scope.from && now.y <= scope.to) return now.y;
	const ys = moments.map((m) => parseDate(m.date).y).filter((y) => y >= scope.from && y <= scope.to);
	return ys.length ? Math.min(...ys) : scope.from;
}

export type RelKind = 'late' | 'age' | 'soon' | '';
export interface RelPart {
	text: string;
	kind: RelKind;
}

/** Small labels next to a moment: "over tijd", the age or duration, "vandaag", "over 12 dagen", "nu bezig". */
export function relParts(o: Occurrence, tl: Timeline, now: Day): RelPart[] {
	const out: RelPart[] = [];
	const mo = o.moment;
	if (isOverdue(o, now)) out.push({ text: 'over tijd', kind: 'late' });
	if (mo.anniversary) out.push({ text: `${o.age} jaar`, kind: 'age' });
	else if (!mo.virtual && !mo.repeat) {
		const a = ageLabel(tl, o.y, o.m, o.d);
		if (a) out.push({ text: a, kind: 'age' });
	}
	if (o.d != null && o.m != null) {
		const diff = daysBetween(now, { y: o.y, m: o.m, d: o.d });
		const soon = (n: number): RelPart => ({ text: `over ${n} ${n === 1 ? 'dag' : 'dagen'}`, kind: n <= 30 ? 'soon' : '' });
		if (o.end) {
			if (diff <= 0 && daysBetween(now, o.end) >= 0) out.push({ text: 'nu bezig', kind: 'soon' });
			else if (diff > 0 && diff <= 365) out.push(soon(diff));
		} else if (diff === 0) out.push({ text: 'vandaag', kind: 'soon' });
		else if (diff > 0 && diff <= 365) out.push(soon(diff));
	}
	return out;
}

/** Last day an occurrence covers, as a sortable number. */
export function endNumber(o: Occurrence): number {
	if (o.end) return dayNumber(o.end.y, o.end.m, o.end.d);
	if (o.d != null && o.m != null) return dayNumber(o.y, o.m, o.d);
	if (o.m != null) return dayNumber(o.y, o.m, daysInMonth(o.y, o.m));
	return dayNumber(o.y, 11, 31);
}

/** Not over yet. */
export const isFuture = (o: Occurrence, now: Day) => endNumber(o) >= dayNumber(now.y, now.m, now.d);

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const momentsLabel = (n: number) => plural(n, 'moment', 'momenten');

export interface GridDay {
	d: number;
	/** 0 = Sunday. */
	wd: number;
	weekend: boolean;
	today: boolean;
	/** Occurrences that fall on or cover this day. */
	here: Occurrence[];
	/** Covered by a period (a trip, a renovation). */
	inPeriod: boolean;
}

/** The days of a month with what happens on them, plus how many empty cells come first in a Monday-first grid. */
export function monthGrid(occs: Occurrence[], y: number, m: number, now: Day): { lead: number; days: GridDay[] } {
	const lead = (new Date(y, m, 1).getDay() + 6) % 7;
	const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => {
		const d = i + 1, wd = new Date(y, m, d).getDay();
		const here = occs.filter((o) => covers(o, y, m, d));
		return { d, wd, weekend: wd === 0 || wd === 6, today: y === now.y && m === now.m && d === now.d, here, inPeriod: here.some((o) => !!o.end) };
	});
	return { lead, days };
}
