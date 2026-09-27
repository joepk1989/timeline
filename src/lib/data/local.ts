import { parseBackup } from '$lib/domain/backup';
import { today } from '$lib/domain/dates';
import type { Moment, Timeline } from '$lib/domain/types';
import { newId, type Backend, type Loaded } from './backend';

const KEY = 'tijdlijn.v4';
const OLD = 'tijdlijn.v3';

interface Doc {
	timelines: Timeline[];
	moments: Moment[];
}

function read(): Doc {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) {
			const o = JSON.parse(raw);
			return { timelines: Array.isArray(o.timelines) ? o.timelines : [], moments: Array.isArray(o.moments) ? o.moments : [] };
		}
		// Data from the single-file prototype, if it ran on this address.
		const old = localStorage.getItem(OLD);
		const parsed = old ? parseBackup(JSON.parse(old), today(), newId) : null;
		if (parsed) {
			parsed.moments.forEach((m) => (m.photos = []));
			return parsed;
		}
	} catch {
		/* storage unavailable or broken: start empty */
	}
	return { timelines: [], moments: [] };
}

function write(doc: Doc) {
	try {
		localStorage.setItem(KEY, JSON.stringify(doc));
	} catch (e) {
		throw new Error(e instanceof DOMException && e.name === 'QuotaExceededError' ? 'vol' : 'mislukt');
	}
}

/* Photos live in IndexedDB as blobs, keyed by path. */
let dbp: Promise<IDBDatabase> | null = null;
function idb(): Promise<IDBDatabase> {
	dbp ??= new Promise((res, rej) => {
		const r = indexedDB.open('tijdlijn-photos', 1);
		r.onupgradeneeded = () => r.result.createObjectStore('photos');
		r.onsuccess = () => res(r.result);
		r.onerror = () => rej(r.error);
	});
	return dbp;
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	const db = await idb();
	return new Promise((res, rej) => {
		const r = fn(db.transaction('photos', mode).objectStore('photos'));
		r.onsuccess = () => res(r.result);
		r.onerror = () => rej(r.error);
	});
}

const urls = new Map<string, string>();

export function localBackend(): Backend {
	return {
		kind: 'local',
		async load(): Promise<Loaded> {
			const d = read();
			return { ...d, roles: Object.fromEntries(d.timelines.map((t) => [t.id, 'owner' as const])) };
		},
		async saveTimeline(t) {
			const d = read();
			d.timelines = d.timelines.filter((x) => x.id !== t.id).concat(t);
			write(d);
		},
		async deleteTimeline(id) {
			const d = read();
			d.timelines = d.timelines.filter((x) => x.id !== id);
			d.moments = d.moments.filter((m) => m.timelineId !== id);
			write(d);
		},
		async saveMoments(list) {
			const d = read();
			const ids = new Set(list.map((m) => m.id));
			d.moments = d.moments.filter((m) => !ids.has(m.id)).concat(list);
			write(d);
		},
		async deleteMoment(id) {
			const d = read();
			d.moments = d.moments.filter((m) => m.id !== id);
			write(d);
		},
		async uploadPhoto(timelineId, blob) {
			const path = `${timelineId}/${newId()}.jpg`;
			await tx('readwrite', (s) => s.put(blob, path));
			return path;
		},
		async photoUrl(path) {
			if (!urls.has(path)) {
				const blob = await tx<Blob | undefined>('readonly', (s) => s.get(path));
				urls.set(path, blob ? URL.createObjectURL(blob) : '');
			}
			return urls.get(path)!;
		},
		async photoBlob(path) {
			return (await tx<Blob | undefined>('readonly', (s) => s.get(path))) ?? null;
		},
		async deletePhotos(paths) {
			for (const p of paths) {
				await tx('readwrite', (s) => s.delete(p)).catch(() => {});
				const u = urls.get(p);
				if (u) URL.revokeObjectURL(u);
				urls.delete(p);
			}
		},
		subscribe(onChange) {
			// Other tabs on this device.
			const h = (e: StorageEvent) => e.key === KEY && onChange();
			addEventListener('storage', h);
			return () => removeEventListener('storage', h);
		}
	};
}

/** True when this device has timelines of its own (not only the demo). */
export function hasLocalData(): boolean {
	return read().timelines.some((t) => !t.demo);
}

export function clearLocalData() {
	try {
		localStorage.removeItem(KEY);
		localStorage.removeItem(OLD);
	} catch {
		/* ignore */
	}
}
