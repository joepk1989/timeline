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

export interface MonthBar {
	o: Occurrence;
	/** First and last day of the bar within the month. */
	from: number;
	to: number;
	/** Row, so overlapping periods do not cover each other. */
	lane: number;
	/** The period started before this month / goes on after it. */
	before: boolean;
	after: boolean;
}

/** Periods in a month as bars under the days, spread over at most `lanes` rows. */
export function monthBars(occs: Occurrence[], y: number, m: number, lanes = 3): MonthBar[] {
	const dim = daysInMonth(y, m), first = dayNumber(y, m, 1), last = dayNumber(y, m, dim);
	const periods = occs
		.filter((o) => o.end && o.m != null && o.d != null && inMonth(o, y, m))
		.map((o) => ({ o, s: dayNumber(o.y, o.m!, o.d!), e: dayNumber(o.end!.y, o.end!.m, o.end!.d) }))
		.sort((a, b) => a.s - b.s || b.e - a.e);
	const ends: number[] = [];
	const out: MonthBar[] = [];
	for (const { o, s, e } of periods) {
		const from = s < first ? 1 : o.d!, to = e > last ? dim : o.end!.d;
		let lane = ends.findIndex((x) => x < from);
		if (lane < 0) {
			if (ends.length >= lanes) continue;
			lane = ends.length;
		}
		ends[lane] = to;
		out.push({ o, from, to, lane, before: s < first, after: e > last });
	}
	return out;
}

/** Day of the year, 0-based (1 January = 0). */
export const dayOfYear = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / 86_400_000);

export interface YearLineItem {
	o: Occurrence;
	/** First and last day of the year it covers (0-based, clipped to the year). */
	from: number;
	to: number;
	/** Column, so things on the same days sit side by side. */
	lane: number;
}

/**
 * The year as one line per day: every dated moment and period as a run of days, spread over
 * side-by-side lanes where they overlap. A month without a day covers the whole month, a year without a month the whole year.
 */
export function yearLines(occs: Occurrence[], y: number): { days: number; items: YearLineItem[]; lanes: number } {
	const days = Math.round((Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 86_400_000);
	const spans = occs
		.map((o) => {
			if (o.m == null) return { o, from: 0, to: days - 1 };
			const start = o.y < y ? 0 : dayOfYear(y, o.m!, o.d ?? 1);
			let end: number;
			if (o.end) end = o.end.y > y ? days - 1 : dayOfYear(y, o.end.m, o.end.d);
			else end = o.d != null ? start : dayOfYear(y, o.m!, daysInMonth(y, o.m!));
			return { o, from: start, to: end };
		})
		.sort((a, b) => a.from - b.from || b.to - a.to);
	const ends: number[] = [];
	const items = spans.map(({ o, from, to }) => {
		let lane = ends.findIndex((e) => e < from);
		if (lane < 0) lane = ends.length;
		ends[lane] = to;
		return { o, from, to, lane };
	});
	return { days, items, lanes: ends.length };
}

/**
 * Places labels of height `h` as close as possible to where they belong (`wanted`, sorted top to bottom),
 * without overlapping: a label that would overlap is pushed down, and a crowd at the bottom is pushed back up.
 */
export function placeLabels(wanted: number[], h: number, max = Infinity): number[] {
	const out: number[] = [];
	for (const w of wanted) out.push(Math.max(w, out.length ? out[out.length - 1] + h : -Infinity));
	for (let i = out.length - 1; i >= 0; i--) {
		const limit = i === out.length - 1 ? max - h : out[i + 1] - h;
		if (out[i] > limit) out[i] = Math.max(limit, 0);
	}
	return out;
}

export interface MonthSpan { m: number; start: number; days: number; left: number; width: number; }

/** How wide each month is on a line of `total` px. An open month takes `share` of it, the rest share what is left by length. */
export function monthSpans(y: number, total: number, open: number | null = null, share = 0.35): MonthSpan[] {
	const days = Array.from({ length: 12 }, (_, m) => daysInMonth(y, m));
	const year = days.reduce((a, b) => a + b, 0);
	const openW = open == null ? 0 : total * share;
	const per = (total - openW) / (year - (open == null ? 0 : days[open]));
	let left = 0, start = 0;
	return days.map((n, m) => {
		const width = m === open ? openW : n * per;
		const s = { m, start, days: n, left, width };
		left += width;
		start += n;
		return s;
	});
}

/** Where day `doy` of the year (0-based, may be fractional) starts on the line. */
export function yearX(spans: MonthSpan[], doy: number): number {
	const s = spans.find((s) => doy < s.start + s.days) ?? spans[spans.length - 1];
	return s.left + ((Math.min(doy, s.start + s.days) - s.start) * s.width) / s.days;
}

/** Stacks boxes on rows so none overlap (with `gap` between them): the first row that is free at a box's left edge. */
export function packRows(boxes: { left: number; right: number }[], gap = 0): { rows: number[]; count: number } {
	const ends: number[] = [];
	const rows = new Array<number>(boxes.length);
	boxes
		.map((b, i) => ({ ...b, i }))
		.sort((a, b) => a.left - b.left || b.right - a.right)
		.forEach((b) => {
			let r = ends.findIndex((e) => e + gap <= b.left);
			if (r < 0) r = ends.length;
			ends[r] = b.right;
			rows[b.i] = r;
		});
	return { rows, count: ends.length };
}

/** How high the sun stands at `hour` (0–24), from 0 at midnight to 1 at noon: the arc over the day view. */
export const sunHeight = (hour: number): number => (1 - Math.cos((2 * Math.PI * hour) / 24)) / 2;

/** What is on one day: moments on or around it, month-long ones that month, and year-long ones that year. */
export function dayMoments(occs: Occurrence[], y: number, m: number, d: number): Occurrence[] {
	return occs.filter((o) => covers(o, y, m, d) || (o.y === y && o.d == null && !o.end && (o.m === m || o.m == null)));
}

/** The first and last day a moment covers: a year without a month is all of it, a month without a day all of that. */
export function spanOf(o: Occurrence): { from: Day; to: Day } {
	if (o.m == null) return { from: { y: o.y, m: 0, d: 1 }, to: { y: o.y, m: 11, d: 31 } };
	if (o.d == null) return { from: { y: o.y, m: o.m, d: 1 }, to: { y: o.y, m: o.m, d: daysInMonth(o.y, o.m) } };
	return { from: { y: o.y, m: o.m, d: o.d }, to: o.end ?? { y: o.y, m: o.m, d: o.d } };
}

/** Parts of a line of `total` px: all alike, or one open part taking `share` of it and the rest sharing what is left. */
export function partSpans(total: number, n: number, open: number | null = null, share = 1 / n): { left: number; width: number }[] {
	const openW = open == null ? 0 : total * share;
	const rest = (total - openW) / (open == null ? n : n - 1);
	let left = 0;
	return Array.from({ length: n }, (_, i) => {
		const width = i === open ? openW : rest;
		const s = { left, width };
		left += width;
		return s;
	});
}
/** Where a point `i` (a part's number, with a fraction) sits on a line of parts. */
export function partX(parts: { left: number; width: number }[], i: number): number {
	const k = Math.max(0, Math.min(parts.length - 1, Math.floor(i)));
	return parts[k].left + (Math.min(i, parts.length) - k) * parts[k].width;
}
