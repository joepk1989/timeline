import { formatDate, MONTHS_SHORT, parseDate } from './dates';
import type { Day, Moment } from './types';

/** A photo that is already stored, with the date it was taken (`YYYY-MM-DD`) if known. */
export interface ImportedPhoto {
	path: string;
	taken: string | null;
}

/**
 * Turns a batch of photos into moments: one per day they were taken on, with that day's photos in it,
 * named after the day ("Foto's 12 aug"). Photos without a date go together on today.
 */
export function photoMoments(photos: ImportedPhoto[], timelineId: string, categoryId: string, now: Day, makeId: () => string): Moment[] {
	const byDay = new Map<string, string[]>();
	for (const p of photos) {
		const day = p.taken ?? formatDate(now.y, now.m, now.d);
		byDay.set(day, [...(byDay.get(day) ?? []), p.path]);
	}
	return [...byDay.keys()].sort().map((date) => {
		const d = parseDate(date), list = byDay.get(date)!;
		return {
			id: makeId(), timelineId, title: `${list.length === 1 ? 'Foto' : "Foto's"} ${d.d} ${MONTHS_SHORT[d.m!]}`, note: '', emoji: '📷',
			categoryId, date, end: null, repeat: false, status: null, photos: list
		};
	});
}
