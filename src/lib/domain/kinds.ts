import type { Category, TimelineKind } from './types';

export interface KindDefinition {
	label: string;
	emoji: string;
	hint: string;
	anchorLabel: string;
	/** `age` counts like a person's age, `duration` counts years since the start. */
	mode: 'age' | 'duration';
	hasStatus?: boolean;
	/** No automatic yearly anniversary. */
	noAnniversary?: boolean;
	defaultName?: string;
	namePlaceholder: string;
	anchorTitle: (name: string) => string;
	anchorEmoji: string;
	anniversaryTitle: string;
	anniversaryEmoji: string;
	/** Line shown under a year, e.g. "Emma wordt 4" or "3 jaar in huis". `n` = years since the anchor year. */
	yearLine: (n: number, name: string) => string;
	/** Label before the anchor date (age mode only). */
	before?: string | null;
	/** Duration label for a moment, from whole years and remaining months since the anchor. */
	duration?: (years: number, months: number) => string;
	categories: Category[];
}

const cats = (...list: [string, string, string][]): Category[] => list.map(([id, name, color]) => ({ id, name, color }));

export const KINDS: Record<TimelineKind, KindDefinition> = {
	kind: {
		label: 'Een kind', emoji: '🧒', hint: 'Leeftijd bij elk moment, verjaardagen vanzelf', anchorLabel: 'Geboortedatum', mode: 'age',
		namePlaceholder: 'Naam van het kind', anchorTitle: (n) => `${n} is geboren`, anchorEmoji: '👶', anniversaryTitle: 'Verjaardag', anniversaryEmoji: '🎂',
		yearLine: (n, name) => (n === 0 ? 'Geboortejaar' : `${name} wordt ${n}`), before: 'voor de geboorte',
		categories: cats(['mijlpaal', 'Mijlpalen', '#C8507A'], ['eerste', 'Eerste keer', '#D0663A'], ['school', 'School', '#2F6FD1'], ['hobby', 'Sport en hobby', '#1F8A8A'], ['familie', 'Familie en vrienden', '#7A5BC4'], ['reizen', 'Reizen', '#3E8E4F'], ['overig', 'Overig', '#6B7785'])
	},
	mij: {
		label: 'Mijn eigen leven', emoji: '🙂', hint: 'Je leven in jaren, met je leeftijd erbij', anchorLabel: 'Geboortedatum', mode: 'age',
		defaultName: 'Mijn leven', namePlaceholder: 'Bijv. Mijn leven', anchorTitle: () => 'Geboren', anchorEmoji: '👶', anniversaryTitle: 'Verjaardag', anniversaryEmoji: '🎂',
		yearLine: (n) => (n === 0 ? 'Geboortejaar' : `Je wordt ${n}`), before: null,
		categories: cats(['gezin', 'Gezin', '#C8507A'], ['vrienden', 'Vrienden', '#7A5BC4'], ['werk', 'Werk', '#1F8A8A'], ['huis', 'Huis', '#D0663A'], ['reizen', 'Reizen', '#2F6FD1'], ['overig', 'Overig', '#6B7785'])
	},
	relatie: {
		label: 'Een relatie', emoji: '💞', hint: 'Hoe lang jullie samen zijn, jubilea vanzelf', anchorLabel: 'Samen sinds', mode: 'duration',
		defaultName: 'Wij samen', namePlaceholder: 'Bijv. Wij samen', anchorTitle: () => 'Samen', anchorEmoji: '💞', anniversaryTitle: 'Jubileum', anniversaryEmoji: '🥂',
		yearLine: (n) => (n === 0 ? 'Het begin' : `${n} jaar samen`),
		duration: (y, m) => (y ? `${y} jaar samen` : m ? `${m} ${m === 1 ? 'maand' : 'maanden'} samen` : 'net samen'),
		categories: cats(['samen', 'Samen', '#C8507A'], ['reizen', 'Reizen', '#2F6FD1'], ['huis', 'Huis', '#D0663A'], ['familie', 'Familie', '#7A5BC4'], ['mijlpaal', 'Mijlpalen', '#B8860B'], ['overig', 'Overig', '#6B7785'])
	},
	huisdier: {
		label: 'Een huisdier', emoji: '🐾', hint: 'Leeftijd en verjaardagen van je dier', anchorLabel: 'Geboortedatum', mode: 'age',
		namePlaceholder: 'Naam van het dier', anchorTitle: (n) => `${n} is geboren`, anchorEmoji: '🐾', anniversaryTitle: 'Verjaardag', anniversaryEmoji: '🎂',
		yearLine: (n, name) => (n === 0 ? 'Geboortejaar' : `${name} wordt ${n}`), before: null,
		categories: cats(['mijlpaal', 'Mijlpalen', '#C8507A'], ['uitje', 'Uitjes', '#3E8E4F'], ['dierenarts', 'Dierenarts', '#2F6FD1'], ['overig', 'Overig', '#6B7785'])
	},
	huis: {
		label: 'Een huis', emoji: '🏠', hint: 'Verbouwing, onderhoud en alles wat er gebeurde', anchorLabel: 'Sleuteloverdracht', mode: 'duration',
		namePlaceholder: 'Bijv. adres of naam van het huis', anchorTitle: () => 'Sleutel gekregen', anchorEmoji: '🔑', anniversaryTitle: 'Jaar in huis', anniversaryEmoji: '🏠',
		yearLine: (n) => (n === 0 ? 'Het eerste jaar' : `${n} jaar in huis`), duration: (y) => `jaar ${y + 1} in huis`,
		categories: cats(['verbouwing', 'Verbouwing', '#D0663A'], ['onderhoud', 'Onderhoud', '#1F8A8A'], ['tuin', 'Tuin', '#3E8E4F'], ['aankoop', 'Aankopen', '#B8860B'], ['moment', 'Momenten', '#C8507A'])
	},
	bedrijf: {
		label: 'Een bedrijf of project', emoji: '💼', hint: 'Mijlpalen, klanten en projecten door de jaren', anchorLabel: 'Startdatum', mode: 'duration',
		namePlaceholder: 'Naam van het bedrijf of project', anchorTitle: () => 'Gestart', anchorEmoji: '🚀', anniversaryTitle: 'Jubileum', anniversaryEmoji: '🎉',
		yearLine: (n) => (n === 0 ? 'Startjaar' : `${n} jaar sinds de start`), duration: (y) => `jaar ${y + 1}`,
		categories: cats(['mijlpaal', 'Mijlpalen', '#C8507A'], ['klant', 'Klanten', '#2F6FD1'], ['project', 'Projecten', '#D0663A'], ['team', 'Team', '#7A5BC4'], ['overig', 'Overig', '#6B7785'])
	},
	plan: {
		label: 'Doelen en plannen', emoji: '🎯', hint: 'Doelen en mijlpalen met status, om bij te sturen', anchorLabel: 'Start van het plan (optioneel)', mode: 'duration',
		hasStatus: true, noAnniversary: true, namePlaceholder: 'Bijv. Plannen 2027', anchorTitle: () => 'Start van het plan', anchorEmoji: '🚩', anniversaryTitle: '', anniversaryEmoji: '',
		yearLine: (n) => (n === 0 ? 'Startjaar van het plan' : `Jaar ${n + 1} van het plan`), duration: (y) => `jaar ${y + 1}`,
		categories: cats(['doel', 'Doelen', '#2F6FD1'], ['mijlpaal', 'Mijlpalen', '#C8507A'], ['actie', 'Acties', '#D0663A'], ['evaluatie', 'Evaluatie', '#7A5BC4'], ['risico', "Risico's", '#8E3B46'])
	},
	anders: {
		label: 'Iets anders', emoji: '✨', hint: 'Vrij in te richten', anchorLabel: 'Startdatum (optioneel)', mode: 'duration',
		defaultName: 'Mijn tijdlijn', namePlaceholder: 'Naam van de tijdlijn', anchorTitle: () => 'Start', anchorEmoji: '🚩', anniversaryTitle: 'Jubileum', anniversaryEmoji: '🎉',
		yearLine: (n) => (n === 0 ? 'Startjaar' : `${n} jaar sinds de start`), duration: (y) => `jaar ${y + 1}`,
		categories: cats(['gezin', 'Gezin', '#C8507A'], ['vrienden', 'Vrienden', '#7A5BC4'], ['werk', 'Werk', '#1F8A8A'], ['huis', 'Huis', '#D0663A'], ['reizen', 'Reizen', '#2F6FD1'], ['overig', 'Overig', '#6B7785'])
	}
};

export const KIND_ORDER: TimelineKind[] = ['kind', 'mij', 'relatie', 'huisdier', 'huis', 'bedrijf', 'plan', 'anders'];

export const STATUSES = [
	{ id: 'gepland', name: 'Gepland', color: '#6B7785' },
	{ id: 'bezig', name: 'Bezig', color: '#2F6FD1' },
	{ id: 'behaald', name: 'Behaald', color: '#3E8E4F' },
	{ id: 'bijstellen', name: 'Bijstellen', color: '#D0663A' },
	{ id: 'vervallen', name: 'Vervallen', color: '#8E3B46' }
] as const;
