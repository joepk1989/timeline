import { describe, expect, it } from 'vitest';
import { agoPos, allTime, fromMa, pathOf, scaleRow, whenName, yearName, yearOf, zoomBetween, zoomInAt, zoomOut } from './scales';

const now = yearOf(2026, 8, 29);
const labels = (r: ReturnType<typeof scaleRow>) => (r.kind === 'segments' ? r.list.map((s) => s.label) : r);

describe('time scales', () => {
	it('turns days into years with a fraction, also long ago', () => {
		expect(yearOf(2026, 0, 1)).toBe(2026);
		expect(yearOf(2026, 6, 1)).toBeCloseTo(2026 + 181 / 365);
		expect(yearOf(2026, 12, 1)).toBe(2027);
		expect(yearOf(50, 0, 1)).toBe(50);
		expect(yearName(0)).toBe('1 v.Chr.');
		expect(yearName(-499)).toBe('500 v.Chr.');
	});
	it('shows the geological scale from eons to periods', () => {
		const [a, b] = allTime(now);
		expect(labels(scaleRow('eon', a, b, now))).toEqual(['Hadeïcum', 'Archeïcum', 'Proterozoïcum', 'Phanerozoïcum']);
		const meso = [fromMa(251.9, now), fromMa(66, now)];
		expect(labels(scaleRow('period', meso[0], meso[1], now))).toEqual(['Trias', 'Jura', 'Krijt']);
		expect(scaleRow('era', a, fromMa(4000, now), now).kind).toBe('none');
	});
	it('says how many there would be when a scale is too fine to show', () => {
		const [a, b] = allTime(now);
		expect(scaleRow('century', a, b, now)).toEqual({ kind: 'fine', count: 46_000_000 });
		expect(scaleRow('year', 1000, 1100, now, 60)).toEqual({ kind: 'fine', count: 100 });
	});
	it('counts the calendar as people do', () => {
		expect(labels(scaleRow('millennium', 900, 2100, now))).toEqual(['1e millennium', '2e millennium', '3e millennium']);
		expect(labels(scaleRow('century', 1901, 2001, now))).toEqual(['20e eeuw']);
		expect(labels(scaleRow('decade', 1985, 2005, now))).toEqual(["jaren '80", "jaren '90", '2000–2009']);
		expect(labels(scaleRow('lustrum', 2020, 2030, now))).toEqual(['2020–2024', '2025–2029']);
		expect(labels(scaleRow('olympiad', 2024, 2028, now))).toEqual(['2024–2027']);
		expect(labels(scaleRow('year', -2, 1, now))).toEqual(['3 v.Chr.', '2 v.Chr.', '1 v.Chr.']);
		expect(labels(scaleRow('semester', 2026, 2027, now))).toEqual(['1e semester', '2e semester']);
		expect(labels(scaleRow('trimester', 2026, 2027, now))).toEqual(['1e trimester', '2e trimester', '3e trimester']);
		expect(labels(scaleRow('quarter', 2026, 2027, now))).toEqual(['kwartaal 1', 'kwartaal 2', 'kwartaal 3', 'kwartaal 4']);
		expect(labels(scaleRow('month', yearOf(2026, 8), yearOf(2026, 10), now))).toEqual(['september', 'oktober']);
	});
	it('numbers weeks the ISO way, Monday to Sunday', () => {
		const r = scaleRow('week', yearOf(2026, 8, 28), yearOf(2026, 9, 6), now);
		expect(r.kind === 'segments' && r.list.map((s) => `${s.label} ${s.note}`)).toEqual(['week 40 28 sep', 'week 41 5 okt']);
		const mar = scaleRow('week', yearOf(2026, 2, 2), yearOf(2026, 2, 3), now);
		expect(mar.kind === 'segments' && mar.list[0].note).toBe('2 mrt');
		const jan = scaleRow('week', yearOf(2027, 0, 1), yearOf(2027, 0, 5), now);
		expect(jan.kind === 'segments' && jan.list.map((s) => s.label)).toEqual(['week 53', 'week 1']);
	});
	it('does not count a calendar in deep time', () => {
		const a = fromMa(150, now);
		expect(scaleRow('year', a, a + 3, now)).toMatchObject({ kind: 'none' });
	});
	it('finds the path down to where you are', () => {
		const p = pathOf(yearOf(1990), yearOf(2000), now).map((x) => x.seg.label);
		expect(p).toEqual(['Phanerozoïcum', 'Cenozoïcum', 'Kwartair', '2e millennium', '20e eeuw', "jaren '90"]);
		expect(pathOf(...allTime(now), now)).toEqual([]);
	});
	it('names how far back a time is', () => {
		expect(whenName(fromMa(4600, now), now)).toBe('4,6 miljard jaar geleden');
		expect(whenName(fromMa(66, now), now)).toBe('66 miljoen jaar geleden');
		expect(whenName(now - 12_345, now)).toBe('12.000 jaar geleden');
		expect(whenName(1969.5, now)).toBe('1969');
		expect(whenName(yearOf(2026, 6, 10), now, 0.1)).toBe('juli 2026');
	});
	it('puts how far back on a logarithmic bar', () => {
		expect(agoPos(4.6e9)).toBe(0);
		expect(agoPos(0)).toBe(1);
		expect(agoPos(1e6)).toBeGreaterThan(agoPos(1e8));
	});
	it('zooms smoothly and keeps within all of time', () => {
		const from: [number, number] = [0, 1000], to: [number, number] = [500, 510];
		expect(zoomBetween(from, to, 0)[0]).toBeCloseTo(0);
		expect(zoomBetween(from, to, 0)[1]).toBeCloseTo(1000);
		expect(zoomBetween(from, to, 1)[0]).toBeCloseTo(500);
		expect(zoomBetween(from, to, 1)[1]).toBeCloseTo(510);
		const mid = zoomBetween(from, to, 0.5);
		expect(mid[1] - mid[0]).toBeCloseTo(100); // halfway on a log scale
		expect(zoomOut([1900, 1910], now, 10)).toEqual([1855, 1955]);
		expect(zoomOut([2000, 2010], now, 10)[1]).toBe(now); // not past today
		const out = zoomOut(allTime(now), now);
		expect(Math.abs(out[0] - allTime(now)[0])).toBeLessThan(1);
		expect(out[1]).toBe(now);
		expect(zoomInAt([0, 1000], 10, 10)).toEqual([0, 100]);
	});
});
