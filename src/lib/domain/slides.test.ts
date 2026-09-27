import { describe, expect, it } from 'vitest';
import { demoTimeline } from './demo';
import { occurrenceInYear, virtualMoments } from './occurrences';
import { buildSlides, momentSlides, yearLayout, yearPosition } from './slides';

const now = { y: 2026, m: 8, d: 26 };
let n = 0;
const { timeline, moments } = demoTimeline(now, () => `d${n++}`);
const all = [...moments, ...virtualMoments(timeline)];

describe('slides', () => {
	it('starts with a title and adds a year slide per year with moments', () => {
		const s = buildSlides(all, timeline.scope, 2026, now, { what: 'year', years: true, photos: false });
		expect(s[0].kind).toBe('title');
		expect(s[1]).toMatchObject({ kind: 'year', y: 2026 });
		expect(s.filter((x) => x.kind === 'year')).toHaveLength(1);
		expect(s.some((x) => x.kind === 'moment' && x.o.moment.anniversary)).toBe(false);
	});
	it('shows a period only once, and only future moments when asked', () => {
		const s = buildSlides(all, timeline.scope, 2026, now, { what: 'future', years: false, photos: false });
		const ids = s.flatMap((x) => (x.kind === 'moment' && x.o.end ? [x.o.moment.id] : []));
		expect(new Set(ids).size).toBe(ids.length);
		expect(s.every((x) => x.kind !== 'moment' || x.o.y >= 2026 || x.o.end)).toBe(true);
	});
	it('gives every photo its own slide when asked', () => {
		const m = { ...moments[0], photos: ['a', 'b', 'c'] };
		const s = buildSlides([m], timeline.scope, 2026, now, { what: 'all', years: false, photos: true });
		expect(s).toHaveLength(4);
		expect(buildSlides([], timeline.scope, 2026, now, { what: 'all', years: true, photos: false })).toEqual([]);
	});
	it('places days on the year line and spreads markers over lanes', () => {
		expect(yearPosition(2026, 2025, 5, 1)).toBe(0);
		expect(yearPosition(2026, 2026, 6, 2)).toBeCloseTo(50, 0);
		const base = moments[0];
		const occs = ['2026-03-01', '2026-03-02', '2026-03-03'].map((date, i) => occurrenceInYear({ ...base, id: `x${i}`, date }, 2026)!);
		const { markers } = yearLayout(occs, 2026);
		expect(markers.map((m) => m.lane)).toEqual([0, 1, 2]);
	});
	it('makes one slide per moment for presenting on the timeline screen, starting at a given year', () => {
		const { slides, start } = momentSlides(all, timeline.scope, 2026, now, { what: 'all', photos: false });
		expect(slides.every((s) => s.kind === 'moment')).toBe(true);
		expect(slides[start].y).toBe(2026);
		expect(start > 0 && slides[start - 1].y < 2026).toBe(true);
		expect(momentSlides(all, timeline.scope, 2026, now, { what: 'year', photos: false }).slides.every((s) => s.y === 2026)).toBe(true);
	});
});
