<script lang="ts">
	// Invite links and the people a timeline is shared with. Only for the owner, only when signed in.
	import { app } from '$lib/state/app.svelte';
	import { createShareLink, deleteShareLink, listSharing, removeMember, type Member, type ShareLink } from '$lib/data/cloud';
	import Btn from './Btn.svelte';
	import Seg from './Seg.svelte';

	let { timelineId }: { timelineId: string } = $props();
	let links = $state<ShareLink[]>([]);
	let members = $state<Member[]>([]);
	let role = $state<'viewer' | 'editor'>('viewer');
	let loading = $state(true);
	const sb = app.sb!;

	async function refresh() {
		try { ({ links, members } = await listSharing(sb, timelineId)); } catch { app.toast('Delen kon niet worden geladen'); }
		loading = false;
	}
	$effect(() => { refresh(); });

	const url = (token: string) => `${location.origin}/deel/${encodeURIComponent(token)}`;
	async function copy(token: string) {
		try { await navigator.clipboard.writeText(url(token)); app.toast('Link gekopieerd'); }
		catch { app.toast('Kopiëren lukte niet. Selecteer de link en kopieer hem zelf.'); }
	}
	async function make() {
		try {
			const l = await createShareLink(sb, timelineId, role);
			links.push(l);
			if (navigator.share) navigator.share({ title: 'Tijdlijn', url: url(l.token) }).catch(() => {});
			else copy(l.token);
		} catch { app.toast('Link maken lukte niet'); }
	}
	async function revoke(token: string) {
		await deleteShareLink(sb, token).catch(() => {});
		links = links.filter((l) => l.token !== token);
	}
	async function remove(m: Member) {
		await removeMember(sb, timelineId, m.user_id).catch(() => {});
		members = members.filter((x) => x.user_id !== m.user_id);
	}
	const until = (s: string | null) => (s ? `tot ${new Date(s).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}` : '');
</script>

<div class="lab">Delen
	<span class="tip">Maak een link voor bijvoorbeeld opa en oma. Wie hem opent en inlogt, kan de tijdlijn zien{role === 'editor' ? ' en momenten toevoegen' : ''}.</span>
	<div class="row">
		<Seg label="Wat mag de ander" value={role} onchange={(v) => (role = v)} options={[['viewer', 'Alleen bekijken'], ['editor', 'Ook bewerken']]} />
		<Btn variant="ghost" onclick={make}>Link maken</Btn>
	</div>
	{#if loading}<span class="tip">Laden…</span>{/if}
	{#each links as l (l.token)}
		<div class="item">
			<input type="text" readonly value={url(l.token)} aria-label="Uitnodigingslink" onfocus={(e) => e.currentTarget.select()} />
			<small>{l.role === 'editor' ? 'bewerken' : 'bekijken'} {until(l.expires_at)}</small>
			<button type="button" onclick={() => copy(l.token)}>Kopieer</button>
			<button type="button" onclick={() => revoke(l.token)}>Intrekken</button>
		</div>
	{/each}
	{#if members.length}
		<span>Gedeeld met</span>
		{#each members as m (m.user_id)}
			<div class="item">
				<span class="who">{m.email ?? 'Iemand'}</span><small>{m.role === 'editor' ? 'mag bewerken' : 'mag bekijken'}</small>
				<button type="button" onclick={() => remove(m)}>Verwijderen</button>
			</div>
		{/each}
	{/if}
</div>

<style>
	.item { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--ink); font-size: 14px; }
	.item input { flex: 1 1 180px; min-width: 0; font-size: 13px !important; }
	.item small { color: var(--muted); }
	.who { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
	.item button { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 13px; font-weight: 600; color: var(--ink); cursor: pointer; }
</style>
