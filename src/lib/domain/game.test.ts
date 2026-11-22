import { describe, expect, it } from 'vitest';
import { gameDemo } from './game';
import { isOverdue, yearOccurrences } from './occurrences';
import { statusList } from './kinds';
import { dayPlan } from './view';

const now = { y: 2026, m: 10, d: 22 };

describe('game', () => {
	it('speaks of tasks that are done, behind or cut', () => {
		expect(statusList('game').map((s) => s.name)).toEqual(['Gepland', 'Bezig', 'Klaar', 'Loopt achter', 'Geschrapt']);
	});
	it('has a demo from concept to release around today', () => {
		let n = 0;
		const { timeline, moments } = gameDemo(now, () => `g${n++}`);
		expect(timeline).toMatchObject({ kind: 'game', demo: true, anchor: '2026-08-30' });
		expect(new Set(moments.map((m) => m.id)).size).toBe(moments.length);
		const by = (s: string) => moments.filter((m) => m.status === s).map((m) => m.title);
		expect(by('bijstellen')).toEqual(['Vijanden en hun gedrag']);
		expect(by('vervallen')).toEqual(['Samen klimmen (multiplayer)']);
		expect(moments.at(-1)).toMatchObject({ title: 'Release', date: '2027-03-02' });
		// The playtest bugs were never ticked off: overdue. A cut task is never overdue.
		const occs = [...yearOccurrences(moments, 2026), ...yearOccurrences(moments, 2027)];
		const late = occs.filter((o) => isOverdue(o, now)).map((o) => o.moment.title);
		expect(late).toContain('Bugs uit de playtest oplossen');
		expect(late).not.toContain('Samen klimmen (multiplayer)');
		// A build is a moment at the time it was made; the playtest in two days has its afternoon.
		expect(dayPlan(occs, 2026, 10, 24).timed.map((t) => t.label)).toEqual(['14:00–17:00']);
	});
});
