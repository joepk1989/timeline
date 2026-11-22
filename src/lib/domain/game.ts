import { KINDS } from './kinds';
import { dayFrom, planMoments, type PlanRow } from './renovation';
import type { Day, Moment, Timeline } from './types';

export const GAME_DEMO_NAME = 'Demo: een game maken';

/**
 * Demo: a small game made in Unity, from concept to release, around today: the prototype and the art style done,
 * the vertical slice under way, enemies behind schedule, playtest bugs overdue, multiplayer cut, and the road
 * to alpha, beta and release planned. Builds are moments with the time they were made. Dates are relative to `now`.
 */
export function gameDemo(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const R: PlanRow[] = [
		[-84, 14, '💡', 'Concept en pitch', 'ontwerp', 'behaald', 'Een klimgame over een vos die een berg op moet. Eén zin: klimmen, glijden, niet vallen.'],
		[-70, 21, '🧪', 'Prototype: klimmen en glijden', 'code', 'behaald', 'Grijpen, springen en het touw. Voelt goed.'],
		[-49, 1, '🎮', 'Eerste playtest met vrienden', 'testen', 'behaald', 'Vijf spelers. Het touw is te moeilijk, de rest leuk.', ['19:30', '21:30']],
		[-45, 28, '🎨', 'Art-stijl en de vos', 'art', 'behaald', 'Zachte kleuren, platte vormen. De vos heeft een sjaal.'],
		[-30, 36, '🗺️', 'Vertical slice: de eerste berg', 'levels', 'bezig', 'Eén level helemaal af, zoals het in de echte game wordt.'],
		[-21, 26, '🐺', 'Vijanden en hun gedrag', 'code', 'bijstellen', 'De wolven vinden hun weg slecht op steile stukken. Kost meer tijd dan gedacht.'],
		[-14, 1, '🛠️', 'Build 0.3.0 · Windows', 'release', 'behaald', 'Voor de playtest. Nieuw: het touw is makkelijker.', ['16:40']],
		[-10, 1, '🐛', 'Bugs uit de playtest oplossen', 'testen', 'gepland', 'Vastlopen achter de rots in het tweede stuk, en de camera bij het glijden.'],
		[-3, 21, '🎵', 'Muziek en geluid van de eerste berg', 'geluid', 'bezig', 'Wind, sneeuw onder de poten, en een rustig thema.'],
		[2, 1, '🎮', 'Playtest van de vertical slice', 'testen', 'gepland', 'Tien spelers, met een vragenlijst na afloop.', ['14:00', '17:00']],
		[6, 1, '🏁', 'Mijlpaal: vertical slice klaar', 'release', 'gepland', 'Hiermee op zoek naar een uitgever.'],
		[10, 28, '🏔️', 'Bergen 2 tot en met 5', 'levels', 'gepland', 'Bos, grot, ijs en de top.'],
		[14, 21, '💾', 'Opslaan, menu en instellingen', 'code', 'gepland', ''],
		[20, 30, '👥', 'Samen klimmen (multiplayer)', 'ontwerp', 'vervallen', 'Te groot voor de eerste versie. Misschien later.'],
		[38, 1, '🧪', 'Alpha', 'release', 'gepland', 'Alle bergen speelbaar, nog niet mooi.'],
		[42, 14, '🧑‍🤝‍🧑', 'Gesloten playtest met twintig spelers', 'testen', 'gepland', ''],
		[60, 1, '📣', 'Steam-pagina live', 'release', 'gepland', 'Trailer, schermafbeeldingen en de wenslijst.'],
		[75, 1, '🧪', 'Beta', 'release', 'gepland', 'Alles erin; vanaf hier alleen nog bugs.'],
		[100, 1, '🚀', 'Release', 'release', 'gepland', 'Op Steam en itch.io.']
	];
	const timeline: Timeline = {
		id: makeId(), name: GAME_DEMO_NAME, kind: 'game', anchor: dayFrom(now)(-84),
		categories: KINDS.game.categories.map((c) => ({ ...c })), scope: { from: now.y - 1, to: now.y + 1 }, demo: true
	};
	return { timeline, moments: planMoments(R, now, timeline.id, makeId) };
}
