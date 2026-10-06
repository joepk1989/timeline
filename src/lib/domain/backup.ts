import { isDate, parseDate, parseTime } from './dates';
import { KINDS, STATUSES } from './kinds';
import type { Category, Day, Moment, Status, Timeline, TimelineKind } from './types';
import { defaultScope } from './view';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

type Raw = Record<string, unknown>;
const obj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Cleans a timeline from a backup. Also reads the prototype's format (`type`, `cats` with `c`). */
export function normalizeTimeline(raw: unknown, id: string, now: Day): Timeline | null {
	if (!obj(raw)) return null;
	const k = (raw.kind ?? raw.type) as string;
	const kind: TimelineKind = k in KINDS ? (k as TimelineKind) : 'anders';
	const list = Array.isArray(raw.categories) ? raw.categories : Array.isArray(raw.cats) ? raw.cats : [];
	let categories: Category[] = list
		.filter((c): c is Raw => obj(c) && typeof c.id === 'string' && !!c.id && typeof c.name === 'string')
		.map((c) => {
			const color = (c.color ?? c.c) as string;
			return { id: str(c.id, 40), name: str(c.name, 30) || 'Categorie', color: HEX.test(color) ? color : '#6B7785' };
		});
	if (!categories.length) categories = KINDS[kind].categories.map((c) => ({ ...c }));
	const anchor = typeof raw.anchor === 'string' && DAY.test(raw.anchor) ? raw.anchor : null;
	const s = raw.scope as Raw | undefined;
	const scope =
		obj(s) && Number.isFinite(s.from) && Number.isFinite(s.to) && (s.from as number) <= (s.to as number)
			? { from: s.from as number, to: Math.min(s.to as number, (s.from as number) + 199) }
			: defaultScope(anchor, now);
	const name = str(raw.name, 60).trim() || KINDS[kind].defaultName || KINDS[kind].label;
	return { id, name, kind, anchor, categories, scope, demo: !!raw.demo };
}

/** Cleans a moment from a backup. Also reads the prototype's format (`tl`, `cat`). */
export function normalizeMoment(raw: unknown, id: string, timelineId: string): Moment | null {
	if (!obj(raw) || !isDate(raw.date)) return null;
	const date = raw.date;
	const s = parseDate(date);
	const end = typeof raw.end === 'string' && s.d != null && DAY.test(raw.end) && raw.end > date ? raw.end : null;
	const status = STATUSES.some((x) => x.id === raw.status) ? (raw.status as Status) : null;
	return {
		id,
		timelineId,
		title: str(raw.title, 80).trim() || 'Zonder naam',
		note: str(raw.note, 1000),
		emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji.slice(0, 16) : '⭐',
		categoryId: str(raw.categoryId ?? raw.cat, 40) || 'overig',
		date,
		end,
		repeat: !!raw.repeat && s.m != null && !end,
		status,
		photos: Array.isArray(raw.photos) ? raw.photos.filter((p): p is string => typeof p === 'string' && p.length < 300) : [],
		// A time of day only on a day, and only when there is one.
		...(s.d != null && parseTime(raw.time) != null ? { time: raw.time as string } : {}),
		...(s.d != null && parseTime(raw.endTime) != null ? { endTime: raw.endTime as string } : {})
	};
}

export interface Backup {
	app: 'tijdlijn';
	version: 4;
	exported: string;
	timelines: Timeline[];
	moments: Moment[];
}

export function makeBackup(timelines: Timeline[], moments: Moment[], exported: string): Backup {
	return { app: 'tijdlijn', version: 4, exported, timelines, moments: moments.filter((m) => !m.virtual) };
}

/**
 * Reads a backup (this app, or the prototype's v3 file). Ids that are not UUIDs get new ones,
 * so they can be stored in the database. Moments whose timeline is missing are dropped.
 */
export function parseBackup(o: unknown, now: Day, makeId: () => string): { timelines: Timeline[]; moments: Moment[] } | null {
	if (!obj(o)) return null;
	const rawTls = Array.isArray(o.timelines) ? o.timelines : [];
	const rawMos = Array.isArray(o.moments) ? o.moments : Array.isArray(o.items) ? o.items : [];
	if (!rawTls.length && !rawMos.length) return null;
	const ids = new Map<string, string>();
	const mapId = (id: unknown) => {
		const k = String(id ?? '');
		if (isUuid(k)) return k;
		if (!ids.has(k)) ids.set(k, makeId());
		return ids.get(k)!;
	};
	const timelines: Timeline[] = [];
	for (const raw of rawTls) {
		const t = obj(raw) ? normalizeTimeline(raw, mapId(raw.id), now) : null;
		if (t) timelines.push(t);
	}
	const known = new Set(timelines.map((t) => t.id));
	const moments: Moment[] = [];
	for (const raw of rawMos) {
		if (!obj(raw)) continue;
		const tl = mapId(raw.timelineId ?? raw.tl ?? 'main');
		if (!known.has(tl)) {
			// Old prototype files kept moments of the first timeline without a timeline record.
			if (!(raw.tl === 'main' || raw.tl == null)) continue;
			const t = normalizeTimeline({ name: 'Mijn tijdlijn', kind: 'anders' }, tl, now)!;
			timelines.push(t);
			known.add(tl);
		}
		const m = normalizeMoment(raw, isUuid(raw.id) ? raw.id : makeId(), tl);
		if (m) moments.push(m);
	}
	return { timelines, moments };
}
