import { describe, expect, it } from 'vitest';
import { ageLabel, yearLine } from './age';
import { KINDS } from './kinds';
import type { Timeline } from './types';

const child: Timeline = { id: 't', name: 'Emma', kind: 'kind', anchor: '2022-04-12', categories: KINDS.kind.categories, scope: { from: 2022, to: 2027 } };
const house: Timeline = { ...child, name: 'Huis', kind: 'huis', anchor: '2020-06-01' };

describe('ageLabel', () => {
	it('counts days, months and years for a child', () => {
		expect(ageLabel(child, 2022, 3, 20)).toBe('8 dagen oud');
		expect(ageLabel(child, 2023, 1, 14)).toBe('10 maanden');
		expect(ageLabel(child, 2024, 7, 12)).toBe('2 jaar en 4 mnd');
		expect(ageLabel(child, 2025, 3, 12)).toBe('3 jaar');
	});
	it('does not count a month until the day is reached', () => {
		expect(ageLabel(child, 2022, 4, 11)).toBe('29 dagen oud');
		expect(ageLabel(child, 2022, 4, 12)).toBe('1 maand');
	});
	it('marks moments before birth', () => {
		expect(ageLabel(child, 2022, 1, 1)).toBe('voor de geboorte');
	});
	it('counts duration for a house', () => {
		expect(ageLabel(house, 2020, 7, 1)).toBe('jaar 1 in huis');
		expect(ageLabel(house, 2023, 6, 1)).toBe('jaar 4 in huis');
	});
	it('returns null without an anchor or for whole years', () => {
		expect(ageLabel({ ...child, anchor: null }, 2024, 1, 1)).toBeNull();
		expect(ageLabel(child, 2024, null, null)).toBeNull();
	});
});

describe('yearLine', () => {
	it('uses the name for a child', () => {
		expect(yearLine(child, 2022)).toBe('Geboortejaar');
		expect(yearLine(child, 2026)).toBe('Emma wordt 4');
		expect(yearLine(child, 2021)).toBeNull();
	});
});
