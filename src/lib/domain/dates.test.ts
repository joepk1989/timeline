import { describe, expect, it } from 'vitest';
import { daysBetween, daysInMonth, formatDate, labelFull, parseDate, season } from './dates';

describe('dates', () => {
	it('round-trips all three precisions', () => {
		for (const s of ['2026', '2026-09', '2026-09-25']) {
			const p = parseDate(s);
			expect(formatDate(p.y, p.m, p.d)).toBe(s);
		}
	});
	it('knows leap years', () => {
		expect(daysInMonth(2024, 1)).toBe(29);
		expect(daysInMonth(2026, 1)).toBe(28);
	});
	it('uses Dutch meteorological seasons', () => {
		expect([0, 3, 6, 9, 11].map(season)).toEqual(['winter', 'lente', 'zomer', 'herfst', 'winter']);
	});
	it('counts days across daylight saving time', () => {
		expect(daysBetween({ y: 2026, m: 2, d: 28 }, { y: 2026, m: 3, d: 1 })).toBe(4);
	});
	it('writes full Dutch labels', () => {
		expect(labelFull(2026, 8, 25)).toBe('vrijdag 25 september 2026');
		expect(labelFull(2026, 8, null)).toBe('september 2026');
	});
});
