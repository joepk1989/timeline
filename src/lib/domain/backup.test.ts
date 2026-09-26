import { describe, expect, it } from 'vitest';
import { isUuid, makeBackup, parseBackup } from './backup';
import { demoTimeline } from './demo';

const now = { y: 2026, m: 8, d: 26 };
let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`;

describe('backup', () => {
	it('round-trips this app’s backups', () => {
		const d = demoTimeline(now, uuid);
		const back = parseBackup(JSON.parse(JSON.stringify(makeBackup([d.timeline], d.moments, 'x'))), now, uuid)!;
		expect(back.timelines).toEqual([{ ...d.timeline }]);
		expect(back.moments).toEqual(d.moments);
	});
	it('reads the prototype’s v3 format and gives new ids', () => {
		const v3 = {
			app: 'tijdlijn', version: 3,
			timelines: [{ id: 'tabc', name: 'Emma', type: 'kind', anchor: '2022-03-14', cats: [{ id: 'school', name: 'School', c: '#2F6FD1' }], scope: { from: 2022, to: 2027 } }],
			items: [
				{ id: 'l1', tl: 'tabc', title: 'Eerste schooldag', cat: 'school', date: '2026-08-31', emoji: '🎒', photos: ['0123'] },
				{ id: 'l2', tl: 'main', title: 'Los moment', date: '2025' },
				{ id: 'l3', tl: 'onbekend', title: 'Weg', date: '2025' },
				{ id: 'l4', tl: 'tabc', title: 'Kapot', date: '25-01' }
			]
		};
		const r = parseBackup(v3, now, uuid)!;
		expect(r.timelines).toHaveLength(2);
		expect(r.timelines[0]).toMatchObject({ name: 'Emma', kind: 'kind', categories: [{ id: 'school', color: '#2F6FD1' }] });
		expect(r.timelines.every((t) => isUuid(t.id))).toBe(true);
		expect(r.moments).toHaveLength(2);
		expect(r.moments[0]).toMatchObject({ title: 'Eerste schooldag', categoryId: 'school', timelineId: r.timelines[0].id });
	});
	it('rejects files without timelines or moments', () => {
		expect(parseBackup({ hello: 1 }, now, uuid)).toBeNull();
		expect(parseBackup('nee', now, uuid)).toBeNull();
	});
});
