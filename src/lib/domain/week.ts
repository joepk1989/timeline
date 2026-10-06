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
 * Noah (8) and Fien (5). Every day of this week, Monday to Sunday, is full; around it only birthdays.
 */
export function weekDemo(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const mon = weekStart(now);
	/** Day `i` of this week (0 = Monday) as `YYYY-MM-DD`. */
	const W = (i: number) => {
		const t = new Date(Date.UTC(mon.y, mon.m, mon.d + i));
		return formatDate(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
	};
	const B = now.y - 38;
	// [date, emoji, title, category, note, end?, repeat?]
	const E: [string, string, string, string, string, string?, boolean?][] = [
		// Maandag
		[W(0), '🚲', 'Noah en Fien naar school brengen', 'gezin', 'Fien wil per se zelf fietsen, het laatste stuk.'],
		[W(0), '💼', 'Weekstart met het team', 'werk', 'Wie doet wat deze week, en wie is er vrijdag niet.'],
		[W(0), '📊', 'Kwartaalcijfers afronden', 'werk', 'Deadline donderdag, dus vandaag de cijfers rond.'],
		[W(0), '🏋️', 'Sportschool na het werk', 'overig', ''],
		[W(0), '🍝', 'Pasta-avond, Thomas kookt', 'gezin', ''],
		// Dinsdag
		[W(1), '🚆', 'Met de trein naar kantoor in Utrecht', 'werk', ''],
		[W(1), '🤝', 'Klantgesprek bij de verzekeraar', 'werk', 'Nieuw contract voor drie jaar bespreken.'],
		[W(1), '🦷', 'Fien naar de tandarts', 'gezin', 'Lisa gaat mee, Thomas haalt Noah op.'],
		[W(1), '⚽', 'Voetbaltraining Noah', 'gezin', ''],
		// Woensdag
		[W(2), '🏠', 'Thuiswerkdag', 'werk', ''],
		[W(2), '🎤', 'Lisa op congres in Gent', 'gezin', 'Drie dagen alleen met de kinderen.', W(4)],
		[W(2), '🩰', 'Balletles Fien', 'gezin', ''],
		[W(2), '🧺', 'Was draaien en boodschappen', 'huis', ''],
		// Donderdag
		[W(3), '📽️', 'Presentatie voor de directie', 'werk', 'De kwartaalcijfers, in tien minuten.'],
		[W(3), '🥪', 'Lunch met oud-collega Ruben', 'vrienden', ''],
		[W(3), '📚', 'Ouderavond groep 5', 'gezin', 'Over Noah: lezen gaat goed, rekenen kan beter.'],
		[W(3), '🗑️', 'Groene container aan de straat', 'huis', ''],
		// Vrijdag
		[W(4), '🧒', 'Kinderen vroeg ophalen', 'gezin', ''],
		[W(4), '🍻', 'Vrijdagmiddagborrel', 'werk', 'Afscheid van Marieke van finance.'],
		[W(4), '🚗', 'Lisa ophalen van het station', 'gezin', ''],
		[W(4), '🎬', 'Filmavond met popcorn', 'gezin', ''],
		// Zaterdag
		[W(5), '⚽', 'Voetbalwedstrijd Noah (uit)', 'gezin', 'Thomas rijdt, drie kinderen achterin.'],
		[W(5), '🧺', 'Weekmarkt', 'huis', ''],
		[W(5), '🔧', 'Fietsband van Fien plakken', 'huis', ''],
		[W(5), '🎈', 'Verjaardag van oma Ria', 'gezin', 'Taart meenemen, de kinderen maken een tekening.'],
		// Zondag
		[W(6), '🥐', 'Uitgebreid ontbijt', 'gezin', ''],
		[W(6), '🌳', 'Boswandeling met Bobby', 'gezin', ''],
		[W(6), '🗓️', 'Week voorbereiden', 'werk', 'Agenda nalopen, tassen inpakken.'],
		[W(6), '🛁', 'Kinderen in bad en vroeg naar bed', 'gezin', ''],
		// Around the week: the family's birthdays and the wedding day, every year.
		[formatDate(now.y - 36, 4, 12), '🎂', 'Lisa jarig', 'gezin', '', undefined, true],
		[formatDate(now.y - 8, 2, 3), '👶', 'Noah geboren', 'gezin', '', undefined, true],
		[formatDate(now.y - 5, 10, 21), '👶', 'Fien geboren', 'gezin', '', undefined, true],
		[formatDate(now.y - 11, 5, 9), '💒', 'Trouwdag Thomas en Lisa', 'gezin', '', undefined, true]
	];
	const timeline: Timeline = {
		id: makeId(), name: WEEK_DEMO_NAME, kind: 'mij', anchor: formatDate(B, 7, 23),
		categories: KINDS.mij.categories.map((c) => ({ ...c })), scope: { from: now.y - 1, to: now.y + 1 }, demo: true
	};
	const moments: Moment[] = E.map(([date, emoji, title, categoryId, note, end, repeat]) => ({
		id: makeId(), timelineId: timeline.id, date, emoji, title, categoryId, note, end: end ?? null, repeat: !!repeat, status: null, photos: []
	}));
	return { timeline, moments };
}
