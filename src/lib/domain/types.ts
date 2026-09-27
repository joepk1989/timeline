/** Kinds of timeline a user can create. Each kind sets default categories and how time is counted. */
export type TimelineKind = 'kind' | 'mij' | 'relatie' | 'huisdier' | 'huis' | 'bedrijf' | 'plan' | 'anders';

/** Status of a goal or plan item. Only shown for timelines whose kind supports it, or items that already have one. */
export type Status = 'gepland' | 'bezig' | 'behaald' | 'bijstellen' | 'vervallen';

export interface Category {
	id: string;
	name: string;
	/** Hex colour, e.g. `#C8507A`. */
	color: string;
}

export interface Timeline {
	id: string;
	name: string;
	kind: TimelineKind;
	/** Birth date, start date, key handover, etc. ISO day `YYYY-MM-DD`, or null. */
	anchor: string | null;
	categories: Category[];
	scope: { from: number; to: number };
	demo?: boolean;
}

/**
 * A moment on a timeline.
 * `date` has three precisions: `YYYY` (whole year), `YYYY-MM` (a month) or `YYYY-MM-DD` (a day).
 * `end` is only used with day precision and turns the moment into a period.
 */
export interface Moment {
	id: string;
	timelineId: string;
	title: string;
	note: string;
	emoji: string;
	categoryId: string;
	date: string;
	end: string | null;
	/** Comes back every year from `date` onwards (birthdays, anniversaries). Not combined with `end`. */
	repeat: boolean;
	status: Status | null;
	/** Storage paths of photos. */
	photos: string[];
	/** Generated moments (birth, yearly birthday) that are not stored. */
	virtual?: boolean;
	anniversary?: boolean;
}

/** Parsed date. `m` is 0-based. `m` and `d` are null for lower precisions. */
export interface DateParts {
	y: number;
	m: number | null;
	d: number | null;
}

/** One appearance of a moment within a given year (a repeating moment appears in many years). */
export interface Occurrence {
	moment: Moment;
	y: number;
	m: number | null;
	d: number | null;
	/** End of a period. */
	end?: { y: number; m: number; d: number };
	/** For repeating moments: years since the first time. */
	age?: number;
}

/** A calendar day, used to pass "today" into pure functions so they stay testable. */
export interface Day {
	y: number;
	m: number;
	d: number;
}
