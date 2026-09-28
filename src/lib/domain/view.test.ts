import { describe, expect, it } from 'vitest';
import { demoTimeline } from './demo';
import { occurrenceInYear } from './occurrences';
import type { Moment, Timeline } from './types';
import { dayOfYear, monthSpans, placeLabels, yearX, yearLines, monthBars, monthGrid, clampScope, countInScope, defaultScope, isFuture, pickStartYear, relParts, visibleMoments } from './view';

const now = { y: 2026, m: 8, d: 26 };
const tl: Timeline = { id: 't', name: 'Emma', kind: 'kind', anchor: '2022-03-14', categories: [], scope: { from: 2022, to: 2027 } };
const base: Moment = { id: 'm', timelineId: 't', title: 'x', note: '', emoji: '⭐', categoryId: 'school', date: '2026-10-01', end: null, repeat: false, status: null, photos: [] };

describe('view helpers', () => {
	it('sets a default scope around the anchor and today', () => {
		expect(defaultScope('2022-03-14', now)).toEqual({ from: 2022, to: 2027 });
		expect(defaultScope(null, now)).toEqual({ from: 2021, to: 2031 });
	});
	it('keeps a scope ordered and at most 200 years', () => {
		expect(clampScope({ from: 2030, to: 2020 })).toEqual({ from: 2020, to: 2030 });
		expect(clampScope({ from: 1800, to: 2100 }).to).toBe(1999);
	});
	it('adds birth and birthdays only when nothing is filtered', () => {
		expect(visibleMoments(tl, [base], { categoryId: null, status: null })).toHaveLength(3);
		expect(visibleMoments(tl, [base], { categoryId: 'school', status: null })).toHaveLength(1);
		expect(visibleMoments(tl, [base], { categoryId: 'reizen', status: null })).toHaveLength(0);
	});
	it('counts moments in scope, including periods that reach into it', () => {
		const p = { ...base, date: '2019-12-20', end: '2022-01-05' };
		expect(countInScope([base, p, { ...base, date: '2031' }], { from: 2022, to: 2027 })).toBe(2);
	});
	it('starts on this year, or on the first year with a moment', () => {
		expect(pickStartYear([], { from: 2020, to: 2030 }, now)).toBe(2026);
		expect(pickStartYear([{ ...base, date: '1990-05' }], { from: 1985, to: 1995 }, now)).toBe(1990);
	});
	it('labels age, countdown and overdue', () => {
		const o = occurrenceInYear(base, 2026)!;
		expect(relParts(o, tl, now)).toEqual([{ text: '4 jaar en 6 mnd', kind: 'age' }, { text: 'over 5 dagen', kind: 'soon' }]);
		const late = occurrenceInYear({ ...base, date: '2026-01-10', status: 'bezig' }, 2026)!;
		expect(relParts(late, tl, now)[0]).toEqual({ text: 'over tijd', kind: 'late' });
		const running = occurrenceInYear({ ...base, date: '2026-09-20', end: '2026-10-02' }, 2026)!;
		expect(relParts(running, tl, now).at(-1)).toEqual({ text: 'nu bezig', kind: 'soon' });
	});
	it('knows what is still to come', () => {
		expect(isFuture(occurrenceInYear({ ...base, date: '2026-09' }, 2026)!, now)).toBe(true);
		expect(isFuture(occurrenceInYear({ ...base, date: '2026-08' }, 2026)!, now)).toBe(false);
	});
	it('works on the demo', () => {
		let n = 0;
		const d = demoTimeline(now, () => `d${n++}`);
		expect(countInScope(d.moments, d.timeline.scope)).toBe(d.moments.length);
	});
	it('lays out a month Monday-first with what happens each day', () => {
		const p = occurrenceInYear({ ...base, date: '2026-09-28', end: '2026-10-02' }, 2026)!;
		const one = occurrenceInYear({ ...base, date: '2026-09-05' }, 2026)!;
		const g = monthGrid([p, one], 2026, 8, now);
		expect(g.lead).toBe(1); // 1 September 2026 is a Tuesday
		expect(g.days).toHaveLength(30);
		expect(g.days[4]).toMatchObject({ d: 5, weekend: true, inPeriod: false });
		expect(g.days[4].here).toHaveLength(1);
		expect(g.days[29].inPeriod).toBe(true);
		expect(g.days[25].today).toBe(true);
	});
	it('lays periods out as bars in rows that do not overlap', () => {
		const long = occurrenceInYear({ ...base, id: 'a', date: '2026-01-01', end: '2026-12-31' }, 2026)!;
		const trip = occurrenceInYear({ ...base, id: 'b', date: '2026-06-10', end: '2026-06-20' }, 2026)!;
		const next = occurrenceInYear({ ...base, id: 'c', date: '2026-06-25', end: '2026-07-05' }, 2026)!;
		const bars = monthBars([trip, next, long], 2026, 5);
		expect(bars.map((b) => [b.o.moment.id, b.from, b.to, b.lane])).toEqual([['a', 1, 30, 0], ['b', 10, 20, 1], ['c', 25, 30, 1]]);
		expect(bars[0]).toMatchObject({ before: true, after: true });
		expect(bars[2]).toMatchObject({ before: false, after: true });
		expect(monthBars([trip, next, long], 2026, 5, 1)).toHaveLength(1);
	});
	it('lays out the year as one line per day, with overlapping moments side by side', () => {
		expect(dayOfYear(2026, 0, 1)).toBe(0);
		expect(dayOfYear(2026, 11, 31)).toBe(364);
		const fest = occurrenceInYear({ ...base, id: 'a', date: '2026-06-19', end: '2026-06-21' }, 2026)!;
		const long = occurrenceInYear({ ...base, id: 'b', date: '2026-06-12', end: '2026-06-21' }, 2026)!;
		const one = occurrenceInYear({ ...base, id: 'c', date: '2026-05-05' }, 2026)!;
		const month = occurrenceInYear({ ...base, id: 'd', date: '2026-09' }, 2026)!;
		const cross = occurrenceInYear({ ...base, id: 'e', date: '2025-12-27', end: '2026-01-03' }, 2026)!;
		const whole = occurrenceInYear({ ...base, id: 'f', date: '2026' }, 2026)!;
		const r = yearLines([fest, long, one, month, cross, whole], 2026);
		expect(r.days).toBe(365);
		expect(r.items.map((i) => [i.o.moment.id, i.from, i.to, i.lane])).toEqual([
			['e', 0, 2, 0], ['c', 124, 124, 0], ['b', 162, 171, 0], ['a', 169, 171, 1], ['d', 243, 272, 0]
		]);
		expect(r.lanes).toBe(2);
		expect(yearLines([], 2028).days).toBe(366);
	});
	it('places labels without overlap, as close to their spot as possible', () => {
		expect(placeLabels([0, 5, 100], 20)).toEqual([0, 20, 100]);
		expect(placeLabels([90, 95], 20, 110)).toEqual([70, 90]);
	});
});

describe('monthSpans', () => {
	it('shares the line by length, or gives an open month its share', () => {
		const even = monthSpans(2027, 365);
		expect(even.map((s) => s.width)).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
		expect(yearX(even, 0)).toBe(0);
		expect(yearX(even, 31)).toBe(31);
		expect(yearX(even, 365)).toBe(365);
		const open = monthSpans(2027, 1000, 6, 0.4);
		expect(open[6].width).toBe(400);
		expect(open[11].left + open[11].width).toBeCloseTo(1000);
		expect(open[0].width / open[1].width).toBeCloseTo(31 / 28);
		expect(yearX(open, open[6].start + 15.5)).toBeCloseTo(open[6].left + 200);
		expect(monthSpans(2028, 366)[1].days).toBe(29);
	});
});
