import { describe, expect, it } from 'vitest';
import { renovationDemo } from './renovation';
import { yearOccurrences, isOverdue } from './occurrences';
import { doneToggle, statusList, statusOf } from './kinds';

const now = { y: 2026, m: 9, d: 27 };

describe('renovation demo', () => {
	it('is a house with statuses, spread around today', () => {
		let n = 0;
		const { timeline, moments } = renovationDemo(now, () => `r${n++}`);
		expect(timeline).toMatchObject({ kind: 'huis', demo: true });
		expect(new Set(moments.map((m) => m.id)).size).toBe(moments.length);
		const by = (s: string) => moments.filter((m) => m.status === s).length;
		expect(by('behaald')).toBeGreaterThanOrEqual(5);
		expect([by('bezig'), by('bijstellen')]).toEqual([1, 1]);
		expect(by('gepland')).toBeGreaterThanOrEqual(6);
		// One job in the past was never ticked off: it is overdue.
		const late = yearOccurrences(moments, 2026).filter((o) => isOverdue(o, now)).map((o) => o.moment.title);
		expect(late).toContain('Kozijnen buiten schilderen');
		expect(late).not.toContain('Keuken plaatsen');
	});
});

describe('statuses of a house', () => {
	it('use the words of a job', () => {
		expect(statusList('huis').map((s) => s.name)).toEqual(['Gepland', 'Bezig', 'Klaar', 'Loopt achter', 'Geschrapt']);
		expect(statusList('plan').map((s) => s.name)).toEqual(['Gepland', 'Bezig', 'Behaald', 'Bijstellen', 'Vervallen']);
		expect(statusOf('huis', 'behaald')?.name).toBe('Klaar');
		expect(statusOf('huis', null)).toBeNull();
	});
	it('ticks a job off, and back to what it was', () => {
		const m = { id: 'a', timelineId: 't', title: 'x', note: '', emoji: '', categoryId: 'c', date: '2026-10-20', end: null, repeat: false, status: 'bezig' as const, photos: [] };
		expect(doneToggle(m, now)).toBe('behaald');
		expect(doneToggle({ ...m, status: 'gepland' }, now)).toBe('behaald');
		expect(doneToggle({ ...m, status: null }, now)).toBe('behaald');
		expect(doneToggle({ ...m, status: 'behaald' }, now)).toBe('bezig'); // it had started
		expect(doneToggle({ ...m, status: 'behaald', date: '2026-11-03' }, now)).toBe('gepland'); // it had not
		expect(doneToggle({ ...m, status: 'behaald', date: '2026-10' }, now)).toBe('bezig'); // a month: from the first
	});
});
