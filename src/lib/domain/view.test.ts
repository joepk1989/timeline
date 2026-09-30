import { describe, expect, it } from 'vitest';
import { demoTimeline } from './demo';
import { occurrenceInYear } from './occurrences';
import type { Moment, Timeline } from './types';
import { driftCards, yearPos, yearsSpans, dayLabel, yearAge, yearShort, dayMoments, dayOfYear, partSpans, partX, spanOf, monthSpans, packRows, sunHeight, yearX, yearLines, monthBars, monthGrid, clampScope, countInScope, defaultScope, isFuture, pickStartYear, relParts, visibleMoments } from './view';

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
			['f', 0, 364, 0], ['e', 0, 2, 1], ['c', 124, 124, 1], ['b', 162, 171, 1], ['a', 169, 171, 2], ['d', 243, 272, 1]
		]);
		expect(r.lanes).toBe(3);
		expect(yearLines([], 2028).days).toBe(366);
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

describe('packRows', () => {
	it('puts boxes on the first free row, keeping a gap, in the order given', () => {
		const { rows, count } = packRows([{ left: 100, right: 200 }, { left: 0, right: 150 }, { left: 195, right: 300 }, { left: 160, right: 190 }], 8);
		expect(rows).toEqual([1, 0, 2, 0]); // 195 is too close to 190 on row 0, and to 200 on row 1
		expect(count).toBe(3);
		expect(packRows([]).count).toBe(0);
	});
});

describe('the day view', () => {
	it('lets the sun rise from midnight to noon and set again', () => {
		expect(sunHeight(0)).toBeCloseTo(0);
		expect(sunHeight(12)).toBeCloseTo(1);
		expect(sunHeight(6)).toBeCloseTo(0.5);
		expect(sunHeight(24)).toBeCloseTo(0);
	});
	it('finds what is on a day: days, periods around it and the whole month', () => {
		const occs = [
			{ y: 2027, m: 6, d: 9, end: null },
			{ y: 2027, m: 6, d: 7, end: { y: 2027, m: 6, d: 10 } },
			{ y: 2027, m: 6, d: null, end: null },
			{ y: 2027, m: 6, d: 12, end: null },
			{ y: 2027, m: null, d: null, end: null }
		].map((o, i) => ({ ...o, moment: { id: String(i) } })) as unknown as Parameters<typeof dayMoments>[0];
		expect(dayMoments(occs, 2027, 6, 9).map((o) => o.moment.id)).toEqual(['0', '1', '2', '4']);
		expect(spanOf(occs[2])).toEqual({ from: { y: 2027, m: 6, d: 1 }, to: { y: 2027, m: 6, d: 31 } });
		expect(spanOf(occs[4])).toEqual({ from: { y: 2027, m: 0, d: 1 }, to: { y: 2027, m: 11, d: 31 } });
		expect(spanOf(occs[1])).toEqual({ from: { y: 2027, m: 6, d: 7 }, to: { y: 2027, m: 6, d: 10 } });
		expect(dayMoments(occs, 2027, 7, 9).map((o) => o.moment.id)).toEqual(['4']); // the whole year
	});
});

describe('parts of a line', () => {
	it('shares a line evenly, or gives one part more', () => {
		expect(partSpans(300, 3)).toEqual([{ left: 0, width: 100 }, { left: 100, width: 100 }, { left: 200, width: 100 }]);
		const p = partSpans(300, 3, 1, 0.5);
		expect(p.map((x) => x.width)).toEqual([75, 150, 75]);
		expect(partX(p, 1.5)).toBe(150);
		expect(partX(p, 3)).toBe(300);
		expect(partX(p, 0)).toBe(0);
	});
});

describe('labels for the rows of years and days', () => {
	it('puts the day number first and shortens the name as room runs out', () => {
		expect(dayLabel(2027, 6, 20, 120)).toBe('20 dinsdag');
		expect(dayLabel(2027, 6, 20, 50)).toBe('20 Di');
		expect(dayLabel(2027, 6, 20, 24)).toBe('20');
		expect(dayLabel(2027, 6, 20, 12)).toBe('');
		expect(dayLabel(2027, 6, 21, 12)).toBe('21');
	});
	it('says how old in a year, and fits a year into its room', () => {
		expect(yearAge(tl, 2021)).toBeNull();
		expect(yearAge(tl, 2022)).toBe('geboren');
		expect(yearAge(tl, 2026)).toBe('4 jaar');
		expect(yearAge({ ...tl, anchor: null }, 2026)).toBeNull();
		expect(yearShort(2026, 60)).toBe("'26");
		expect(yearShort(2026, 20)).toBe("'26");
		expect(yearShort(2026, 12)).toBe('');
		expect(yearShort(2025, 12)).toBe("'25");
		expect(yearShort(2025, 6)).toBe('');
		expect(yearShort(2030, 6)).toBe("'30");
	});
});

describe('the line of all years', () => {
	it('places days as years with a fraction', () => {
		expect(yearPos({ y: 2026, m: 0, d: 1 })).toBe(2026);
		expect(yearPos({ y: 2026, m: 6, d: 2 })).toBeCloseTo(2026.5, 2);
	});
	it('lists each moment once over the years, without generated or yearly ones', () => {
		const long = occurrenceInYear({ ...base, id: 'l', date: '2026-12-30', end: '2027-01-02' }, 2026)!;
		const long27 = occurrenceInYear({ ...base, id: 'l', date: '2026-12-30', end: '2027-01-02' }, 2027)!;
		const yr = occurrenceInYear({ ...base, id: 'y', date: '2027' }, 2027)!;
		const bday = occurrenceInYear({ ...base, id: 'b', date: '2020-05-01', repeat: true }, 2027)!;
		const s = yearsSpans([[long], [long27, yr, bday]]);
		expect(s.map((x) => x.o.moment.id)).toEqual(['l', 'y']);
		expect(s[0].from).toBeCloseTo(2026 + 363 / 365, 6);
		expect(s[0].to).toBeCloseTo(2027 + 2 / 365, 6);
		expect(s[1]).toMatchObject({ from: 2027, to: 2028 });
	});
});

describe('placeholder photos', () => {
	it('drift the same way for the same year, spread over the band and the crossing', () => {
		const a = driftCards(7, 2026);
		expect(driftCards(7, 2026)).toEqual(a);
		expect(driftCards(7, 2027)).not.toEqual(a);
		expect(a.every((c) => c.top >= 0 && c.top <= 1 && c.start >= 0 && c.start < 1 && c.secs >= 26 && c.secs <= 44 && Math.abs(c.tilt) <= 7)).toBe(true);
		expect(new Set(a.map((c) => Math.floor(c.start * 7))).size).toBe(7);
	});
});
