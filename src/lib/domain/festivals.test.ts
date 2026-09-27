import { describe, expect, it } from 'vitest';
import { addMissingFestivalPhotos, demoPhotoSvg, easter, festivalTimeline, isDemoPhoto, lastWeekday, nthWeekday } from './festivals';

let n = 0;
const id = () => `f${n++}`;
const now = { y: 2026, m: 8, d: 27 };

describe('festivals', () => {
	it('knows when Easter is', () => {
		expect(easter(2024)).toEqual([2, 31]);
		expect(easter(2025)).toEqual([3, 20]);
		expect(easter(2027)).toEqual([2, 28]);
		expect(easter(2030)).toEqual([3, 21]);
	});
	it('finds weekdays in a month', () => {
		expect(nthWeekday(2025, 5, 5, 3)).toBe(20); // third Friday of June 2025
		expect(lastWeekday(2024, 5, 4)).toBe(27); // last Thursday of June 2024
	});
	it('matches the dates of recent years', () => {
		const past = festivalTimeline({ y: 2024, m: 0, d: 1 }, id).moments;
		const get = (t: string) => past.find((m) => m.title === t && m.date.startsWith('2024'))!;
		expect([get('Paaspop').date, get('Paaspop').end]).toEqual(['2024-03-29', '2024-03-31']);
		expect(get('Pinkpop').date).toBe('2024-06-21');
		expect(get('Lowlands').date).toBe('2024-08-16');
		expect(get('North Sea Jazz').date).toBe('2024-07-12');
		expect(get('Defqon.1').date).toBe('2024-06-27');
		expect(get('Bevrijdingsfestivals')).toMatchObject({ date: '2024-05-05', end: null });
	});
	it('covers the coming ten years, skips what has passed, and marks every date as an estimate', () => {
		const { timeline, moments } = festivalTimeline(now, id);
		expect(timeline.scope).toEqual({ from: 2026, to: 2036 });
		expect(moments.some((m) => m.date.startsWith('2036'))).toBe(true);
		expect(moments.filter((m) => m.date.startsWith('2026')).map((m) => m.title)).toEqual(['Amsterdam Dance Event', 'Le Guess Who?']);
		expect(moments.filter((m) => m.title === 'SAIL Amsterdam').map((m) => m.date.slice(0, 4))).toEqual(['2030', '2035']);
		expect(moments.every((m) => m.note.includes('geschat') && (!m.end || m.end > m.date))).toBe(true);
	});
	it('gives every festival a placeholder photo that is drawn, not stored', () => {
		const { moments } = festivalTimeline(now, id);
		expect(moments.every((m) => m.photos.length === 1 && isDemoPhoto(m.photos[0]))).toBe(true);
		const svg = demoPhotoSvg(moments.find((m) => m.title === 'Le Guess Who?')!.photos[0])!;
		expect(svg).toContain('<svg');
		expect(svg).toContain('Le Guess Who?');
		expect(svg).toContain('Voorbeeldfoto');
		expect(demoPhotoSvg(moments[0].photos[0])).toBe(demoPhotoSvg(moments[0].photos[0]));
		expect(demoPhotoSvg('demo:festival/bestaat-niet')).toBeNull();
		expect(demoPhotoSvg('abc/def.jpg')).toBeNull();
	});
	it('adds photos to a festival demo that was loaded before it had them', () => {
		const { timeline, moments } = festivalTimeline(now, id);
		const old = moments.map((m) => ({ ...m, photos: [] as string[] }));
		old[1].photos = ['eigen/foto.jpg'];
		const fixed = addMissingFestivalPhotos(timeline, old);
		expect(fixed).toHaveLength(old.length - 1);
		expect(fixed.every((m) => isDemoPhoto(m.photos[0]))).toBe(true);
		expect(addMissingFestivalPhotos({ ...timeline, name: 'Mijn festivals' }, old)).toEqual([]);
	});
});
