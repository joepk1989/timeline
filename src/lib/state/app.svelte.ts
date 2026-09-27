import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';
import { KINDS } from '$lib/domain/kinds';
import { today } from '$lib/domain/dates';
import { demoTimeline } from '$lib/domain/demo';
import { festivalTimeline } from '$lib/domain/festivals';
import { makeBackup, parseBackup } from '$lib/domain/backup';
import { clampScope, countInScope, pickStartYear, visibleMoments, type Filter, type Scope } from '$lib/domain/view';
import type { Moment, Status, Timeline } from '$lib/domain/types';
import { newId, type Backend, type Role } from '$lib/data/backend';
import { clearLocalData, hasLocalData, localBackend } from '$lib/data/local';
import { cloudBackend } from '$lib/data/cloud';
import { createZip, readZip } from '$lib/domain/zip';

const store = {
	get(k: string) {
		try { return localStorage.getItem('tijdlijn.' + k); } catch { return null; }
	},
	set(k: string, v: string) {
		try { localStorage.setItem('tijdlijn.' + k, v); } catch { /* ignore */ }
	}
};

export interface ToastAction {
	label: string;
	fn: () => void;
}

/** Everything the screens need: data, what is selected, and the actions that change it. */
class AppState {
	now = today();
	backend: Backend = localBackend();
	sb: SupabaseClient | null = supabase;

	user = $state<{ id: string; email: string } | null>(null);
	ready = $state(false);
	timelines = $state<Timeline[]>([]);
	moments = $state<Moment[]>([]);
	roles = $state<Record<string, Role>>({});
	/** Placeholder shown before the first timeline is made; not stored. */
	temp = $state<Timeline | null>(null);
	curId = $state<string | null>(store.get('current'));
	/** Period on screen. Follows the timeline, but a viewer can change it without saving. */
	scope = $state<Scope>({ from: 0, to: 0 });
	filter = $state<Filter>({ categoryId: null, status: null });
	mode = $state<'year' | 'month'>('year');
	/** Current page: a year index in year mode, a month index (years × 12) in month mode. */
	idx = $state(0);
	/** Bumped to ask the pager to scroll to `idx`. */
	scrollReq = $state({ n: 0, smooth: false });
	viewMode = $state<'list' | 'photos'>(store.get('view') === 'photos' ? 'photos' : 'list');
	monthView = $state<'cal' | 'row'>(store.get('monthview') === 'row' ? 'row' : 'cal');
	toastMsg = $state<{ text: string; action?: ToastAction; id: number } | null>(null);

	tl = $derived<Timeline>(this.timelines.find((t) => t.id === this.curId) ?? this.timelines[0] ?? this.temp ?? blank(this.now.y));
	kind = $derived(KINDS[this.tl.kind]);
	role = $derived<Role>(this.roles[this.tl.id] ?? 'owner');
	canEdit = $derived(this.role !== 'viewer');
	own = $derived(this.moments.filter((m) => m.timelineId === this.tl.id));
	visible = $derived(visibleMoments(this.tl, this.moments, this.filter));
	count = $derived(countInScope(this.own.filter((m) => (!this.filter.categoryId || m.categoryId === this.filter.categoryId) && (!this.filter.status || m.status === this.filter.status)), this.scope));
	years = $derived(this.scope.to - this.scope.from + 1);
	pageCount = $derived(this.mode === 'year' ? this.years : this.years * 12);
	year = $derived(this.mode === 'year' ? this.scope.from + this.idx : this.scope.from + Math.floor(this.idx / 12));
	month = $derived(this.mode === 'year' ? this.now.m : this.idx % 12);

	/* ---------- start ---------- */

	async start() {
		if (this.sb) {
			const { data } = await this.sb.auth.getSession();
			this.useSession(data.session);
			this.sb.auth.onAuthStateChange((_e, s) => {
				if ((s?.user.id ?? null) !== (this.user?.id ?? null)) {
					this.useSession(s);
					this.reload(true);
				}
			});
		}
		await this.reload(true);
		this.ready = true;
	}

	private unsub: (() => void) | null = null;
	private useSession(s: Session | null) {
		this.user = s ? { id: s.user.id, email: s.user.email ?? '' } : null;
		this.backend = s && this.sb ? cloudBackend(this.sb, s.user.id) : localBackend();
		this.unsub?.();
		this.unsub = this.backend.subscribe(() => this.reload(false));
	}

	/** Loads everything from the backend. `fresh` resets the view to the current timeline's start. */
	async reload(fresh: boolean) {
		try {
			const d = await this.backend.load();
			this.timelines = d.timelines;
			this.moments = d.moments;
			this.roles = d.roles;
		} catch {
			this.toast('Laden lukte niet. Controleer je verbinding.');
			return;
		}
		if (this.timelines.length) this.temp = null;
		else this.temp ??= blank(this.now.y);
		if (!this.timelines.some((t) => t.id === this.curId)) this.curId = this.timelines[0]?.id ?? null;
		const t = this.tl;
		if (fresh || t.scope.from !== this.scope.from || t.scope.to !== this.scope.to) {
			this.scope = { ...t.scope };
			if (fresh) this.mode = 'year';
			this.jumpToStart();
		}
		if (this.filter.categoryId && !t.categories.some((c) => c.id === this.filter.categoryId)) this.filter.categoryId = null;
	}

	/* ---------- pager ---------- */

	goTo(i: number, smooth = true) {
		this.idx = Math.max(0, Math.min(this.pageCount - 1, i));
		this.scrollReq = { n: this.scrollReq.n + 1, smooth };
	}
	/** Called by the pager when the user swiped. */
	setIdx(i: number) {
		if (i >= 0 && i < this.pageCount) this.idx = i;
	}
	enterMonth(y: number, m: number) {
		this.mode = 'month';
		this.goTo((y - this.scope.from) * 12 + m, false);
	}
	exitMonth() {
		const y = this.year;
		this.mode = 'year';
		this.goTo(y - this.scope.from, false);
	}
	jumpToStart() {
		const y = pickStartYear(this.own, this.scope, this.now);
		this.goTo(this.mode === 'year' ? y - this.scope.from : (y - this.scope.from) * 12 + (y === this.now.y ? this.now.m : 0), false);
	}
	async setScope(s: Scope) {
		const c = clampScope(s);
		if (c.to - c.from < s.to - s.from) this.toast('Maximaal 200 jaar tegelijk');
		this.scope = c;
		this.jumpToStart();
		if (this.role === 'owner' && !this.temp) await this.saveTimeline({ ...this.tl, scope: c }, true);
	}

	/* ---------- view settings ---------- */

	setView(v: 'list' | 'photos') { this.viewMode = v; store.set('view', v); }
	setMonthView(v: 'cal' | 'row') { this.monthView = v; store.set('monthview', v); }
	setCategory(id: string | null) { this.filter.categoryId = id; }
	setStatus(s: Status | null) { this.filter.status = this.filter.status === s ? null : s; }
	catOf(id: string) {
		return this.tl.categories.find((c) => c.id === id) ?? { id: '?', name: 'Overig', color: '#6B7785' };
	}

	/* ---------- timelines ---------- */

	switchTo(id: string) {
		if (!this.timelines.some((t) => t.id === id)) return;
		this.curId = id;
		store.set('current', id);
		this.filter = { categoryId: null, status: null };
		this.mode = 'year';
		this.scope = { ...this.tl.scope };
		this.jumpToStart();
	}

	/** Stores a timeline (new or changed). `quiet` skips the reload of the view. */
	async saveTimeline(t: Timeline, quiet = false): Promise<boolean> {
		const i = this.timelines.findIndex((x) => x.id === t.id);
		if (i >= 0) this.timelines[i] = t;
		else {
			this.timelines.push(t);
			this.roles[t.id] = 'owner';
		}
		this.temp = null;
		try {
			await this.backend.saveTimeline(t);
		} catch (e) {
			this.fail(e);
			return false;
		}
		if (!quiet && t.id === this.tl.id && (t.scope.from !== this.scope.from || t.scope.to !== this.scope.to)) {
			this.scope = { ...t.scope };
			this.jumpToStart();
		}
		return true;
	}

	async deleteTimeline(id: string) {
		const t = this.timelines.find((x) => x.id === id);
		if (!t) return;
		const photos = this.moments.filter((m) => m.timelineId === id).flatMap((m) => m.photos);
		this.timelines = this.timelines.filter((x) => x.id !== id);
		this.moments = this.moments.filter((m) => m.timelineId !== id);
		if (!this.timelines.length) this.temp = blank(this.now.y);
		if (this.curId === id || !this.timelines.some((x) => x.id === this.curId)) {
			const next = this.timelines[0];
			if (next) this.switchTo(next.id);
			else { this.curId = null; this.scope = { ...this.tl.scope }; this.jumpToStart(); }
		}
		try {
			await this.backend.deleteTimeline(id);
			await this.backend.deletePhotos(photos).catch(() => {});
			this.toast(`“${t.name}” is verwijderd`);
		} catch {
			this.toast('Niet alles kon worden verwijderd');
		}
	}

	/** For a shared timeline: stop following it. */
	async leaveTimeline(id: string) {
		if (!this.sb || !this.user) return;
		await this.sb.from('timeline_members').delete().eq('timeline_id', id).eq('user_id', this.user.id);
		await this.reload(true);
		this.toast('Je volgt deze tijdlijn niet meer');
	}

	/** Loads a demo: a whole life, or the festivals in the Netherlands for the coming ten years. */
	async loadDemo(which: 'leven' | 'festivals' = 'leven') {
		const { timeline, moments } = (which === 'festivals' ? festivalTimeline : demoTimeline)(this.now, newId);
		const existing = this.timelines.find((t) => t.demo && t.name === timeline.name);
		if (existing) {
			this.switchTo(existing.id);
			this.toast('De demo staat er al');
			return;
		}
		this.toast('Demo wordt geladen…');
		if (!(await this.saveTimeline(timeline))) return;
		this.moments.push(...moments);
		this.switchTo(timeline.id);
		try {
			await this.backend.saveMoments(moments);
			this.toast('Demo geladen. Verwijderen kan via Instellingen van de tijdlijn.', undefined, 4500);
		} catch (e) {
			this.fail(e);
		}
	}

	/* ---------- moments ---------- */

	async saveMoment(m: Moment): Promise<boolean> {
		if (this.temp && m.timelineId === this.temp.id && !(await this.saveTimeline(this.temp))) return false;
		const i = this.moments.findIndex((x) => x.id === m.id);
		if (i >= 0) this.moments[i] = m;
		else this.moments.push(m);
		try {
			await this.backend.saveMoments([m]);
			return true;
		} catch (e) {
			this.fail(e);
			return false;
		}
	}

	async deleteMoment(id: string) {
		const m = this.moments.find((x) => x.id === id);
		if (!m) return;
		this.moments = this.moments.filter((x) => x.id !== id);
		try {
			await this.backend.deleteMoment(id);
		} catch {
			this.toast('Verwijderen lukte niet. Probeer het opnieuw.');
			return;
		}
		let undone = false;
		this.toast(`“${m.title}” verwijderd`, { label: 'Ongedaan maken', fn: () => { undone = true; this.saveMoment(m); this.toast('Moment teruggezet'); } }, 7000);
		setTimeout(() => { if (!undone) this.backend.deletePhotos(m.photos).catch(() => {}); }, 7600);
	}

	/* ---------- account ---------- */

	async signIn(email: string, next = location.pathname + location.search): Promise<boolean> {
		if (!this.sb) return false;
		const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + next } });
		if (error) {
			this.toast(error.status === 429 ? 'Even wachten, er is net een link verstuurd' : 'Versturen lukte niet. Klopt het e-mailadres?');
			return false;
		}
		return true;
	}
	async signOut() {
		await this.sb?.auth.signOut();
	}

	get hasLocalData() {
		return this.backend.kind === 'cloud' && hasLocalData();
	}

	/** Copies the timelines on this device (with photos) to the signed-in account, then clears them locally. */
	async moveLocalToCloud() {
		const local = localBackend();
		const d = await local.load();
		const own = d.timelines.filter((t) => !t.demo);
		let n = 0;
		for (const t of own) {
			const t2 = { ...t, id: newId() };
			await this.backend.saveTimeline(t2);
			const list: Moment[] = [];
			for (const m of d.moments.filter((m) => m.timelineId === t.id)) {
				const photos: string[] = [];
				for (const p of m.photos) {
					const blob = await local.photoBlob(p);
					if (blob) photos.push(await this.backend.uploadPhoto(t2.id, blob));
				}
				list.push({ ...m, id: newId(), timelineId: t2.id, photos });
			}
			await this.backend.saveMoments(list);
			await local.deletePhotos(d.moments.filter((m) => m.timelineId === t.id).flatMap((m) => m.photos));
			n++;
		}
		clearLocalData();
		await this.reload(true);
		this.toast(n === 1 ? 'Je tijdlijn staat nu online' : `${n} tijdlijnen staan nu online`);
	}

	/* ---------- backup ---------- */

	/** A zip with backup.json and every photo. */
	async backupZip(onProgress?: (done: number, total: number) => void): Promise<Uint8Array<ArrayBuffer>> {
		const own = this.timelines.filter((t) => this.roles[t.id] === 'owner');
		const ids = new Set(own.map((t) => t.id));
		const moments = this.moments.filter((m) => ids.has(m.timelineId));
		const enc = new TextEncoder();
		const files = [{ name: 'backup.json', data: enc.encode(JSON.stringify(makeBackup(own, moments, new Date().toISOString()), null, 2)) }];
		const paths = moments.flatMap((m) => m.photos);
		for (const [i, p] of paths.entries()) {
			const blob = await this.backend.photoBlob(p).catch(() => null);
			if (blob) files.push({ name: 'photos/' + p, data: new Uint8Array(await blob.arrayBuffer()) });
			onProgress?.(i + 1, paths.length);
		}
		return createZip(files);
	}

	/** Restores a .json or .zip backup, merged with what is already there. */
	async restore(file: File) {
		let json: unknown, photos = new Map<string, Uint8Array<ArrayBuffer>>();
		try {
			if (/\.zip$/i.test(file.name) || file.type.includes('zip')) {
				const entries = await readZip(new Uint8Array(await file.arrayBuffer()));
				const main = entries.find((e) => e.name.endsWith('backup.json'));
				json = main ? JSON.parse(new TextDecoder().decode(main.data)) : null;
				for (const e of entries) if (e.name.startsWith('photos/')) photos.set(e.name.slice(7), e.data as Uint8Array<ArrayBuffer>);
			} else json = JSON.parse(await file.text());
		} catch {
			this.toast('Dit bestand is geen geldige back-up');
			return;
		}
		const parsed = parseBackup(json, this.now, newId);
		if (!parsed) {
			this.toast('Geen momenten gevonden in dit bestand');
			return;
		}
		this.toast('Back-up wordt teruggezet…', undefined, 20_000);
		try {
			for (const t of parsed.timelines) {
				// Someone else's timeline with the same id: restore it as a copy of your own.
				if (this.roles[t.id] && this.roles[t.id] !== 'owner') {
					const id = newId();
					parsed.moments.forEach((m) => m.timelineId === t.id && (m.timelineId = id));
					t.id = id;
				}
				await this.backend.saveTimeline(t);
			}
			for (const m of parsed.moments) {
				const out: string[] = [];
				for (const p of m.photos) {
					const data = photos.get(p);
					if (data) out.push(await this.backend.uploadPhoto(m.timelineId, new Blob([data], { type: 'image/jpeg' })));
				}
				m.photos = out;
			}
			await this.backend.saveMoments(parsed.moments);
		} catch (e) {
			this.fail(e);
			return;
		}
		await this.reload(false);
		if (parsed.timelines[0]) this.switchTo(parsed.timelines[0].id);
		const n = parsed.moments.length;
		this.toast(`${n} ${n === 1 ? 'moment' : 'momenten'} teruggezet`);
	}

	/* ---------- toast ---------- */

	private toastTimer: ReturnType<typeof setTimeout> | undefined;
	toast(text: string, action?: ToastAction, ms = 2600) {
		this.toastMsg = { text, action, id: Date.now() };
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => (this.toastMsg = null), ms);
	}
	hideToast() {
		clearTimeout(this.toastTimer);
		this.toastMsg = null;
	}
	private fail(e: unknown) {
		this.toast(e instanceof Error && e.message === 'vol' ? 'De opslag is vol. Verwijder eerst een paar momenten of foto’s.' : 'Opslaan lukte niet. Probeer het opnieuw.');
	}
}

function blank(y: number): Timeline {
	return { id: newId(), name: 'Mijn tijdlijn', kind: 'anders', anchor: null, categories: KINDS.anders.categories.map((c) => ({ ...c })), scope: { from: y - 5, to: y + 5 } };
}

export const app = new AppState();
