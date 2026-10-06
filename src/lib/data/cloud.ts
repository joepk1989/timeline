import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, Moment, Status, Timeline, TimelineKind } from '$lib/domain/types';
import { newId, type Backend, type Loaded, type Role } from './backend';

interface TimelineRow {
	id: string;
	owner_id: string;
	name: string;
	kind: TimelineKind;
	anchor: string | null;
	categories: Category[];
	scope_from: number;
	scope_to: number;
	is_demo: boolean;
}
interface MomentRow {
	id: string;
	timeline_id: string;
	title: string;
	note: string;
	emoji: string;
	category_id: string;
	date: string;
	end_date: string | null;
	repeat: boolean;
	status: Status | null;
	photos: string[];
	start_time: string | null;
	end_time: string | null;
}

const toTimeline = (r: TimelineRow): Timeline => ({
	id: r.id, name: r.name, kind: r.kind, anchor: r.anchor, categories: r.categories ?? [],
	scope: { from: r.scope_from, to: r.scope_to }, demo: r.is_demo
});
const fromTimeline = (t: Timeline) => ({
	id: t.id, name: t.name, kind: t.kind, anchor: t.anchor, categories: t.categories,
	scope_from: t.scope.from, scope_to: t.scope.to, is_demo: !!t.demo, updated_at: new Date().toISOString()
});
const toMoment = (r: MomentRow): Moment => ({
	id: r.id, timelineId: r.timeline_id, title: r.title, note: r.note, emoji: r.emoji, categoryId: r.category_id,
	date: r.date, end: r.end_date, repeat: r.repeat, status: r.status, photos: r.photos ?? [], time: r.start_time ?? null, endTime: r.end_time ?? null
});
const fromMoment = (m: Moment) => ({
	id: m.id, timeline_id: m.timelineId, title: m.title, note: m.note, emoji: m.emoji, category_id: m.categoryId,
	date: m.date, end_date: m.end, repeat: m.repeat, status: m.status, photos: m.photos, start_time: m.time ?? null, end_time: m.endTime ?? null,
	updated_at: new Date().toISOString()
});

function check<T>(r: { data: T; error: { message: string } | null }): T {
	if (r.error) throw new Error(r.error.message);
	return r.data;
}

export function cloudBackend(sb: SupabaseClient, userId: string): Backend {
	const urls = new Map<string, { url: string; until: number }>();
	return {
		kind: 'cloud',
		async load(): Promise<Loaded> {
			const tls = check(await sb.from('timelines').select('*')) as TimelineRow[];
			const members = check(await sb.from('timeline_members').select('timeline_id, role').eq('user_id', userId)) as { timeline_id: string; role: Role }[];
			const ids = tls.map((t) => t.id);
			const moments: MomentRow[] = [];
			// Page through, Supabase returns at most 1000 rows at a time.
			for (let from = 0; ids.length; from += 1000) {
				const page = check(await sb.from('moments').select('*').in('timeline_id', ids).order('id').range(from, from + 999)) as MomentRow[];
				moments.push(...page);
				if (page.length < 1000) break;
			}
			const roles: Record<string, Role> = {};
			for (const t of tls) roles[t.id] = t.owner_id === userId ? 'owner' : members.find((m) => m.timeline_id === t.id)?.role ?? 'viewer';
			return { timelines: tls.map(toTimeline), moments: moments.map(toMoment), roles };
		},
		async saveTimeline(t) {
			check(await sb.from('timelines').upsert(fromTimeline(t)));
		},
		async deleteTimeline(id) {
			const { data } = await sb.storage.from('photos').list(id, { limit: 1000 });
			if (data?.length) await sb.storage.from('photos').remove(data.map((f) => `${id}/${f.name}`));
			check(await sb.from('timelines').delete().eq('id', id));
		},
		async saveMoments(list) {
			for (let i = 0; i < list.length; i += 200) check(await sb.from('moments').upsert(list.slice(i, i + 200).map(fromMoment)));
		},
		async deleteMoment(id) {
			check(await sb.from('moments').delete().eq('id', id));
		},
		async uploadPhoto(timelineId, blob) {
			const path = `${timelineId}/${newId()}.jpg`;
			check(await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' }));
			return path;
		},
		async photoUrl(path) {
			const hit = urls.get(path);
			if (hit && hit.until > Date.now()) return hit.url;
			const { data } = await sb.storage.from('photos').createSignedUrl(path, 3600);
			const url = data?.signedUrl ?? '';
			urls.set(path, { url, until: Date.now() + 3000_000 });
			return url;
		},
		async photoBlob(path) {
			const { data } = await sb.storage.from('photos').download(path);
			return data ?? null;
		},
		async deletePhotos(paths) {
			if (paths.length) await sb.storage.from('photos').remove(paths);
		},
		subscribe(onChange) {
			let t: ReturnType<typeof setTimeout> | undefined;
			const later = () => { clearTimeout(t); t = setTimeout(onChange, 400); };
			const ch = sb
				.channel('tijdlijn-' + userId)
				.on('postgres_changes', { event: '*', schema: 'public', table: 'moments' }, later)
				.on('postgres_changes', { event: '*', schema: 'public', table: 'timelines' }, later)
				.subscribe();
			return () => { clearTimeout(t); sb.removeChannel(ch); };
		}
	};
}

/* ---------- sharing ---------- */

export interface ShareLink {
	token: string;
	role: 'viewer' | 'editor';
	expires_at: string | null;
}
export interface Member {
	user_id: string;
	email: string | null;
	role: 'viewer' | 'editor';
}

export async function listSharing(sb: SupabaseClient, timelineId: string) {
	const links = check(await sb.from('share_links').select('token, role, expires_at').eq('timeline_id', timelineId).order('created_at')) as ShareLink[];
	const members = check(await sb.from('timeline_members').select('user_id, email, role').eq('timeline_id', timelineId)) as Member[];
	return { links, members };
}
export async function createShareLink(sb: SupabaseClient, timelineId: string, role: 'viewer' | 'editor') {
	const expires = new Date(Date.now() + 30 * 86_400_000).toISOString();
	return check(await sb.from('share_links').insert({ timeline_id: timelineId, role, expires_at: expires }).select('token, role, expires_at').single()) as ShareLink;
}
export async function deleteShareLink(sb: SupabaseClient, token: string) {
	check(await sb.from('share_links').delete().eq('token', token));
}
export async function removeMember(sb: SupabaseClient, timelineId: string, userId: string) {
	check(await sb.from('timeline_members').delete().eq('timeline_id', timelineId).eq('user_id', userId));
}
export async function acceptShareLink(sb: SupabaseClient, token: string): Promise<string> {
	return check(await sb.rpc('accept_share_link', { p_token: token })) as string;
}
