<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, season } from '$lib/domain/dates';
	import { STATUSES } from '$lib/domain/kinds';
	import { whenTimeLabel } from '$lib/domain/occurrences';
	import { relParts } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Photo from './Photo.svelte';

	let { o }: { o: Occurrence } = $props();
	const mo = $derived(o.moment);
	const st = $derived(mo.status ? STATUSES.find((s) => s.id === mo.status) : null);
	const cat = $derived(mo.virtual ? null : app.catOf(mo.categoryId));
	const rel = $derived(relParts(o, app.tl, app.now));

	function open() {
		if (!mo.virtual) ui.editor = { id: mo.id, y: o.y, m: o.m, d: o.d };
		else if (app.role === 'owner') ui.tlEdit = { id: app.tl.id, first: false };
	}
</script>

<button
	class="item"
	class:whole={o.m == null}
	class:virtual={mo.virtual}
	style:--s={o.m == null ? 'var(--accent)' : `var(--${season(o.m)})`}
	aria-label="{labelFull(o.y, o.m, o.d)}: {mo.title}.{mo.virtual ? (app.role === 'owner' ? ' Instellingen van de tijdlijn' : '') : app.canEdit ? ' Bewerken' : ' Bekijken'}"
	onclick={open}
>
	<div class="when">{whenTimeLabel(o)}</div>
	<div class="em">{mo.emoji}</div>
	<div class="body">
		<div class="ttl">{mo.title}</div>
		<div class="meta">
			{#if st}<span class="sst" style:--c={st.color}>{st.name}</span>{/if}
			{#if cat}<span class="cat" style:--c={cat.color}>{cat.name}</span>{/if}
			{#each rel as r, i (i)}<span class="rel {r.kind}">{r.text}</span>{/each}
			{#if mo.repeat && !mo.virtual}<span class="rel">{o.age ? `↻ ${o.age} jaar` : '↻ jaarlijks'}</span>{/if}
			{#if mo.photos.length > 1}<span class="rel">{mo.photos.length} foto's</span>{/if}
		</div>
		{#if mo.note}<div class="note">{mo.note}</div>{/if}
	</div>
	{#if mo.photos.length}<Photo path={mo.photos[0]} class="thumb" />{:else}<span></span>{/if}
</button>

<style>
	.item { --s: var(--accent); display: grid; grid-template-columns: 104px 28px 1fr auto; gap: 12px; align-items: start; text-align: left; background: transparent; border: none; border-radius: 10px; padding: 10px 10px 10px 0; width: 100%; font: inherit; color: inherit; cursor: pointer; transition: background-color 0.25s; }
	.item:hover { background: var(--surface); }
	.when { font-size: 14px; color: var(--muted); padding-top: 3px; padding-left: 12px; border-left: 4px solid var(--s); line-height: 1.3; }
	.em { font-size: 22px; line-height: 1.1; text-align: center; }
	.body { min-width: 0; }
	.ttl { font-size: 18px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
	.note { font-size: 14px; color: var(--muted); margin-top: 3px; white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
	.item :global(.thumb) { display: block; width: 64px; height: 64px; border-radius: 8px; object-fit: cover; background: var(--faint, var(--line)); }
	.whole { background: var(--surface); border: 1px solid var(--line); padding: 14px 12px 14px 0; margin-bottom: 10px; }
	.whole .ttl { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; }
	.virtual { opacity: 0.92; }
	.meta { display: flex; flex-wrap: wrap; gap: 3px 10px; align-items: center; margin-top: 3px; font-size: 13px; color: var(--muted); }
	.cat { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; color: var(--ink); }
	.cat::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
	.sst { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--c); }
	.sst::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	.rel.soon { color: var(--accent); font-weight: 600; }
	.rel.age { color: var(--ink); font-weight: 600; }
	.rel.late { color: var(--danger); font-weight: 700; }
	@media (max-width: 640px) {
		.item { grid-template-columns: 74px 24px 1fr auto; gap: 10px; }
		.item :global(.thumb) { width: 52px; height: 52px; }
	}
	@media (min-width: 1200px) {
		.item { grid-template-columns: 140px 34px minmax(0, 1fr) auto; padding: 12px 14px 12px 0; }
		.ttl { font-size: 20px; }
		.note { font-size: 15px; }
		.item :global(.thumb) { width: 88px; height: 88px; }
	}
</style>
