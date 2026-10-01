import { describe, expect, it } from 'vitest';
import { photoMoments } from './photoImport';

describe('photo import', () => {
	it('makes one moment per day the photos were taken, photos without a date on today', () => {
		let n = 0;
		const list = photoMoments(
			[
				{ path: 'b1', taken: '2025-08-20' },
				{ path: 'a', taken: '2025-08-12' },
				{ path: 'x', taken: null },
				{ path: 'b2', taken: '2025-08-20' }
			],
			'tl', 'cat', { y: 2026, m: 9, d: 1 }, () => `id${++n}`
		);
		expect(list.map((m) => [m.date, m.title, m.photos])).toEqual([
			['2025-08-12', 'Foto 12 aug', ['a']],
			['2025-08-20', "Foto's 20 aug", ['b1', 'b2']],
			['2026-10-01', 'Foto 1 okt', ['x']]
		]);
		expect(list[0]).toMatchObject({ timelineId: 'tl', categoryId: 'cat', emoji: '📷', end: null, repeat: false, status: null });
		expect(new Set(list.map((m) => m.id)).size).toBe(3);
	});
});
