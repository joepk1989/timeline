import { formatDate } from './dates';
import { KINDS } from './kinds';
import type { Day, Moment, Timeline } from './types';

export const WEEK_DEMO_NAME = 'Demo: een week van Thomas';

/** Monday of the week `now` falls in. */
export function weekStart(now: Day): Day {
	const t = new Date(Date.UTC(now.y, now.m, now.d));
	t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
	return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

/**
 * Demo: one full week in the life of Thomas (38), who works at an office, with Lisa and their children
 * Noah (8) and Fien (5). Every day of this week, Monday to Sunday, is full, most things at a time of day;
 * around it only birthdays.
 */
export function weekDemo(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const mon = weekStart(now);
	/** Day `i` of this week (0 = Monday) as `YYYY-MM-DD`. */
	const W = (i: number) => {
		const t = new Date(Date.UTC(mon.y, mon.m, mon.d + i));
		return formatDate(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
	};
	const B = now.y - 38;
	// [date, emoji, title, category, note, { end, repeat, time, endTime }]
	type Extra = { end?: string; repeat?: boolean; time?: string; endTime?: string };
	const E: [string, string, string, string, string, Extra?][] = [
		// Maandag
		[W(0), '🚲', 'Noah en Fien naar school brengen', 'gezin', 'Fien wil per se zelf fietsen, het laatste stuk.', { time: '08:15', endTime: '08:40' }],
		[W(0), '💼', 'Weekstart met het team', 'werk', 'Wie doet wat deze week, en wie is er vrijdag niet.', { time: '09:00', endTime: '09:30' }],
		[W(0), '📊', 'Kwartaalcijfers afronden', 'werk', 'Deadline donderdag, dus vandaag de cijfers rond.', { time: '10:00', endTime: '12:30' }],
		[W(0), '🏋️', 'Sportschool na het werk', 'overig', '', { time: '17:30', endTime: '18:30' }],
		[W(0), '🍝', 'Pasta-avond, Thomas kookt', 'gezin', '', { time: '18:45', endTime: '19:30' }],
		// Dinsdag
		[W(1), '🚆', 'Met de trein naar kantoor in Utrecht', 'werk', '', { time: '07:42', endTime: '08:20' }],
		[W(1), '🤝', 'Klantgesprek bij de verzekeraar', 'werk', 'Nieuw contract voor drie jaar bespreken.', { time: '10:30', endTime: '12:00' }],
		[W(1), '🦷', 'Fien naar de tandarts', 'gezin', 'Lisa gaat mee, Thomas haalt Noah op.', { time: '15:15', endTime: '15:45' }],
		[W(1), '⚽', 'Voetbaltraining Noah', 'gezin', '', { time: '18:00', endTime: '19:15' }],
		// Woensdag
		[W(2), '🏠', 'Thuiswerkdag', 'werk', ''],
		[W(2), '🎤', 'Lisa op congres in Gent', 'gezin', 'Drie dagen alleen met de kinderen.', { end: W(4), time: '07:00', endTime: '18:30' }],
		[W(2), '🩰', 'Balletles Fien', 'gezin', '', { time: '14:00', endTime: '15:00' }],
		[W(2), '🧺', 'Was draaien en boodschappen', 'huis', '', { time: '19:30', endTime: '20:30' }],
		// Donderdag
		[W(3), '📽️', 'Presentatie voor de directie', 'werk', 'De kwartaalcijfers, in tien minuten.', { time: '11:00', endTime: '11:15' }],
		[W(3), '🥪', 'Lunch met oud-collega Ruben', 'vrienden', '', { time: '12:30', endTime: '13:30' }],
		[W(3), '📚', 'Ouderavond groep 5', 'gezin', 'Over Noah: lezen gaat goed, rekenen kan beter.', { time: '19:30', endTime: '20:15' }],
		[W(3), '🗑️', 'Groene container aan de straat', 'huis', '', { time: '21:30' }],
		// Vrijdag
		[W(4), '🧒', 'Kinderen vroeg ophalen', 'gezin', '', { time: '14:30' }],
		[W(4), '🍻', 'Vrijdagmiddagborrel', 'werk', 'Afscheid van Marieke van finance.', { time: '16:30', endTime: '18:00' }],
		[W(4), '🚗', 'Lisa ophalen van het station', 'gezin', '', { time: '18:52' }],
		[W(4), '🎬', 'Filmavond met popcorn', 'gezin', '', { time: '19:30', endTime: '21:15' }],
		// Zaterdag
		[W(5), '⚽', 'Voetbalwedstrijd Noah (uit)', 'gezin', 'Thomas rijdt, drie kinderen achterin.', { time: '09:30', endTime: '11:30' }],
		[W(5), '🧺', 'Weekmarkt', 'huis', '', { time: '12:00', endTime: '13:00' }],
		[W(5), '🔧', 'Fietsband van Fien plakken', 'huis', '', { time: '14:00', endTime: '14:45' }],
		[W(5), '🎈', 'Verjaardag van oma Ria', 'gezin', 'Taart meenemen, de kinderen maken een tekening.', { time: '15:30', endTime: '20:00' }],
		// Zondag
		[W(6), '🥐', 'Uitgebreid ontbijt', 'gezin', '', { time: '09:00', endTime: '10:30' }],
		[W(6), '🌳', 'Boswandeling met Bobby', 'gezin', '', { time: '11:00', endTime: '13:00' }],
		[W(6), '🗓️', 'Week voorbereiden', 'werk', 'Agenda nalopen, tassen inpakken.', { time: '20:30', endTime: '21:00' }],
		[W(6), '🛁', 'Kinderen in bad en vroeg naar bed', 'gezin', '', { time: '18:30', endTime: '19:15' }],
		// Around the week: the family's birthdays and the wedding day, every year.
		[formatDate(now.y - 36, 4, 12), '🎂', 'Lisa jarig', 'gezin', '', { repeat: true }],
		[formatDate(now.y - 8, 2, 3), '👶', 'Noah geboren', 'gezin', '', { repeat: true }],
		[formatDate(now.y - 5, 10, 21), '👶', 'Fien geboren', 'gezin', '', { repeat: true }],
		[formatDate(now.y - 11, 5, 9), '💒', 'Trouwdag Thomas en Lisa', 'gezin', '', { repeat: true }]
	];
	const timeline: Timeline = {
		id: makeId(), name: WEEK_DEMO_NAME, kind: 'mij', anchor: formatDate(B, 7, 23),
		categories: KINDS.mij.categories.map((c) => ({ ...c })), scope: { from: now.y - 1, to: now.y + 1 }, demo: true
	};
	const moments: Moment[] = E.map(([date, emoji, title, categoryId, note, x]) => ({
		id: makeId(), timelineId: timeline.id, date, emoji, title, categoryId, note, end: x?.end ?? null, repeat: !!x?.repeat, status: null, photos: [],
		time: x?.time ?? null, endTime: x?.endTime ?? null
	}));
	return { timeline, moments };
}
