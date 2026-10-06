import { describe, expect, it } from 'vitest';
import { demoTimeline } from './demo';
import { countdown, covers, isOverdue, occurrenceInYear, virtualMoments, whenLabel, whenTimeLabel, yearOccurrences } from './occurrences';
import { KINDS } from './kinds';
import type { Moment, Timeline } from './types';

const base: Moment = { id: 'm', timelineId: 't', title: 'x', note: '', emoji: '⭐', categoryId: 'overig', date: '2026-09-25', end: null, repeat: false, status: null, photos: [] };
const now = { y: 2026, m: 8, d: 26 };

describe('occurrences', () => {
	it('places a single day in its own year only', () => {
		expect(occurrenceInYear(base, 2026)?.d).toBe(25);
		expect(occurrenceInYear(base, 2027)).toBeNull();
	});
	it('repeats birthdays with the right age, and moves 29 February', () => {
		const b = { ...base, date: '2020-02-29', repeat: true };
		expect(occurrenceInYear(b, 2019)).toBeNull();
		expect(occurrenceInYear(b, 2025)).toMatchObject({ m: 1, d: 28, age: 5 });
		expect(occurrenceInYear(b, 2028)).toMatchObject({ d: 29, age: 8 });
	});
	it('shows a period in every year it touches, and covers its days', () => {
		const p = { ...base, date: '2026-12-27', end: '2027-01-03' };
		const o26 = occurrenceInYear(p, 2026)!, o27 = occurrenceInYear(p, 2027)!;
		expect(o26 && o27).toBeTruthy();
		expect(covers(o27, 2027, 0, 2)).toBe(true);
		expect(covers(o27, 2027, 0, 4)).toBe(false);
		expect(whenLabel(o26)).toBe('27 dec 2026 – 3 jan 2027');
	});
	it('labels periods within one month compactly', () => {
		expect(whenLabel(occurrenceInYear({ ...base, date: '2026-08-03', end: '2026-08-12' }, 2026)!)).toBe('3–12 aug');
	});
	it('generates birth and birthdays from the anchor, but no birthday in the birth year', () => {
		const tl: Timeline = { id: 't', name: 'Emma', kind: 'kind', anchor: '2022-04-12', categories: KINDS.kind.categories, scope: { from: 2022, to: 2027 } };
		const v = virtualMoments(tl);
		expect(yearOccurrences(v, 2022).map((o) => o.moment.id)).toEqual(['__anchor']);
		expect(yearOccurrences(v, 2026)[0]).toMatchObject({ age: 4 });
	});
	it('flags overdue goals and counts down to upcoming ones', () => {
		const late = occurrenceInYear({ ...base, date: '2026-06-30', status: 'bezig' }, 2026)!;
		const done = occurrenceInYear({ ...base, date: '2026-06-30', status: 'behaald' }, 2026)!;
		expect(isOverdue(late, now)).toBe(true);
		expect(isOverdue(done, now)).toBe(false);
		expect(countdown(occurrenceInYear({ ...base, date: '2026-10-03' }, 2026)!, now)).toBe('over 7 dagen');
	});
	it('builds a demo where every year shows something (including birthdays)', () => {
		let n = 0;
		const { timeline, moments } = demoTimeline(now, () => `id${n++}`);
		expect(moments.length).toBeGreaterThan(60);
		const all = [...moments, ...virtualMoments(timeline)];
		for (let y = timeline.scope.from; y <= timeline.scope.to; y++) {
			expect(yearOccurrences(all, y).length, `year ${y}`).toBeGreaterThan(0);
		}
	});
	it('adds the time of day to the date', () => {
		const base = { id: 'a', timelineId: 't', title: 'x', note: '', emoji: '', categoryId: 'c', end: null, repeat: false, status: null, photos: [] };
		const at = (extra: object) => yearOccurrences([{ ...base, date: '2026-10-05', ...extra }], 2026)[0];
		expect(whenTimeLabel(at({}))).toBe('5 okt');
		expect(whenTimeLabel(at({ time: '09:00' }))).toBe('5 okt · 09:00');
		expect(whenTimeLabel(at({ time: '09:00', endTime: '10:30' }))).toBe('5 okt · 09:00–10:30');
		expect(whenTimeLabel(yearOccurrences([{ ...base, date: '2026-10', time: '09:00' }], 2026)[0])).toBe('oktober');
	});
});
