import { describe, expect, it } from 'vitest';
import { demoTimeline } from './demo';
import { occurrenceInYear } from './occurrences';
import type { Moment, Timeline } from './types';
import { monthGrid, clampScope, countInScope, defaultScope, isFuture, pickStartYear, relParts, visibleMoments } from './view';

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
});
