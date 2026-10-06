import { describe, expect, it } from 'vitest';
import { weekDemo, weekStart } from './week';
import { dayMoments } from './view';
import { yearOccurrences } from './occurrences';

describe('week demo', () => {
	it('starts the week on Monday', () => {
		expect(weekStart({ y: 2026, m: 9, d: 6 })).toEqual({ y: 2026, m: 9, d: 5 }); // Tuesday 6 Oct → Monday 5 Oct
		expect(weekStart({ y: 2026, m: 9, d: 5 })).toEqual({ y: 2026, m: 9, d: 5 });
		expect(weekStart({ y: 2026, m: 9, d: 11 })).toEqual({ y: 2026, m: 9, d: 5 }); // Sunday
		expect(weekStart({ y: 2027, m: 0, d: 1 })).toEqual({ y: 2026, m: 11, d: 28 }); // across the new year
	});
	it('fills every day of this week', () => {
		let n = 0;
		const now = { y: 2026, m: 9, d: 6 };
		const { timeline, moments } = weekDemo(now, () => `w${n++}`);
		expect(timeline.demo).toBe(true);
		expect(new Set(moments.map((m) => m.id)).size).toBe(moments.length);
		const occs = yearOccurrences(moments, 2026);
		for (let d = 5; d <= 11; d++) expect(dayMoments(occs, 2026, 9, d).length).toBeGreaterThanOrEqual(4);
		// The congress runs Wednesday to Friday.
		expect(moments.find((m) => m.title.includes('Gent'))).toMatchObject({ date: '2026-10-07', end: '2026-10-09' });
	});
	it('keeps a week that runs into the new year whole', () => {
		const { moments } = weekDemo({ y: 2026, m: 11, d: 31 }, () => 'x');
		const dates = new Set(moments.filter((m) => !m.repeat).map((m) => m.date));
		expect([...dates].sort()).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
	});
});
