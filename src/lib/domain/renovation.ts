import { formatDate } from './dates';
import { KINDS } from './kinds';
import type { Day, Moment, Status, Timeline } from './types';

export const RENOVATION_DEMO_NAME = 'Demo: verbouwing van het huis';

/**
 * Demo: a house being renovated, with the jobs spread around today: some done, some under way, one behind
 * schedule, one overdue, and the rest planned. Dates are relative to `now`.
 */
export function renovationDemo(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const at = (offset: number) => {
		const t = new Date(Date.UTC(now.y, now.m, now.d + offset));
		return formatDate(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
	};
	// [from (days from today), length in days (1 = a single day), emoji, title, category, status, note, time]
	type Row = [number, number, string, string, string, Status | null, string, [string, string]?];
	const R: Row[] = [
		[-70, 7, '🔨', 'Sloopwerk keuken en badkamer', 'verbouwing', 'behaald', 'Alles tot op de muren eruit. Drie containers puin.'],
		[-62, 1, '📐', 'Aannemer gekozen', 'verbouwing', 'behaald', 'Offerte van € 38.500 geaccepteerd, oplevering in december.'],
		[-56, 14, '⚡', 'Nieuwe elektra en groepenkast', 'verbouwing', 'behaald', 'Extra groepen voor inductie en oven.'],
		[-45, 1, '🍳', 'Keuken besteld', 'aankoop', 'behaald', 'Levertijd zes weken.'],
		[-41, 12, '🚿', 'Leidingwerk en afvoeren badkamer', 'verbouwing', 'behaald', ''],
		[-28, 18, '🧱', 'Stucwerk wanden en plafonds', 'verbouwing', 'bijstellen', 'Stukadoor was ziek: een week later klaar dan gepland.'],
		[-20, 27, '🛁', 'Tegelwerk badkamer', 'verbouwing', 'bezig', 'Vloer klaar, de wanden volgen.'],
		[-12, 1, '🪟', 'Kozijnen buiten schilderen', 'onderhoud', 'gepland', 'Wacht op droog weer. Staat nog open.'],
		[-1, 1, '📞', 'Overleg met aannemer over de planning', 'verbouwing', 'behaald', 'Keuken kan een week eerder.', ['09:00', '10:00']],
		[7, 8, '🍽️', 'Keuken plaatsen', 'verbouwing', 'gepland', 'Aannemer en keukenmonteur, in deze volgorde.'],
		[16, 3, '🔌', 'Apparatuur aansluiten', 'verbouwing', 'gepland', 'Inductie, oven, vaatwasser en afzuigkap.'],
		[21, 7, '🎨', 'Schilderwerk binnen', 'verbouwing', 'gepland', ''],
		[31, 7, '🪵', 'Vloer leggen in de woonkamer', 'verbouwing', 'gepland', 'Eerst de plinten, dan de vloer.'],
		[46, 1, '🥂', 'Eerste avond in de nieuwe keuken', 'moment', 'gepland', 'Met de buren.'],
		[60, 14, '🌱', 'Moestuin aanleggen', 'tuin', 'gepland', 'Plantbakken, regenton en compost.']
	];
	const timeline: Timeline = {
		id: makeId(), name: RENOVATION_DEMO_NAME, kind: 'huis', anchor: formatDate(now.y - 3, 4, 12),
		categories: KINDS.huis.categories.map((c) => ({ ...c })), scope: { from: now.y - 1, to: now.y + 1 }, demo: true
	};
	const moments: Moment[] = R.map(([from, len, emoji, title, categoryId, status, note, time]) => ({
		id: makeId(), timelineId: timeline.id, date: at(from), end: len > 1 ? at(from + len - 1) : null, emoji, title, categoryId, status, note,
		repeat: false, photos: [], time: len === 1 && time ? time[0] : null, endTime: len === 1 && time ? time[1] : null
	}));
	// Yearly maintenance comes back by itself.
	moments.push({
		id: makeId(), timelineId: timeline.id, date: at(-300), end: null, emoji: '🔥', title: 'CV-ketel laten onderhouden', categoryId: 'onderhoud', status: null,
		note: 'Elk jaar in het najaar. Afspraak maken via de installateur.', repeat: true, photos: []
	});
	return { timeline, moments };
}
