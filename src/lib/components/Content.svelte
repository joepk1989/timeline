<script lang="ts">
	// The list of moments, or the photo grid, for a year or a month.
	import { app } from '$lib/state/app.svelte';
	import { ui, type GalleryItem } from '$lib/state/ui.svelte';
	import { whenLabel } from '$lib/domain/occurrences';
	import type { Occurrence } from '$lib/domain/types';
	import Btn from './Btn.svelte';
	import MomentRow from './MomentRow.svelte';
	import Photo from './Photo.svelte';
	import Seg from './Seg.svelte';

	let { occs, emptyTitle, emptySub, onadd }: { occs: Occurrence[]; emptyTitle: string; emptySub: string; onadd: () => void } = $props();
	const view = $derived(app.viewMode);
	const photos = $derived<GalleryItem[]>(occs.filter((o) => !o.moment.virtual).flatMap((o) => o.moment.photos.map((path) => ({ path, o }))));
	const real = $derived(occs.filter((o) => !o.moment.virtual));
</script>

<div class="toggle">
	<Seg label="Weergave" value={view} onchange={(v) => app.setView(v)} options={[['list', 'Momenten'], ['photos', `Foto's${photos.length ? ` (${photos.length})` : ''}`]]} />
</div>

{#if view === 'photos'}
	{#if photos.length}
		<div class="grid">
			{#each photos as p, i (p.path + i)}
				<button class="tile" onclick={() => (ui.gallery = { list: photos, i, canEdit: app.canEdit })}>
					<Photo path={p.path} alt={p.o.moment.title} />
					<span>{whenLabel(p.o)} · {p.o.moment.title}</span>
				</button>
			{/each}
		</div>
	{:else}
		<div class="empty-s">Nog geen foto's in deze periode.{app.canEdit ? ' Voeg ze toe via een moment.' : ''}</div>
	{/if}
{:else}
	{#if occs.length}
		<div class="items">
			{#each occs as o (o.moment.id + ':' + o.y)}<MomentRow {o} />{/each}
		</div>
	{/if}
	{#if !real.length}
		<div class="empty">
			<p>{emptyTitle}</p>
			{#if app.canEdit}
				<div>{emptySub}</div>
				<Btn variant="pill-solid" onclick={onadd}>Moment toevoegen</Btn>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.toggle { display: flex; margin: 0 0 16px; }
	.items { display: flex; flex-direction: column; gap: 2px; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 4px; }
	.tile { position: relative; aspect-ratio: 1; border: none; padding: 0; border-radius: 6px; overflow: hidden; background: var(--line); cursor: zoom-in; }
	.tile :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
	.tile span { position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 6px 4px; font-size: 11px; font-weight: 600; color: #fff; text-align: left; background: linear-gradient(transparent, rgba(0, 0, 0, 0.6)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.empty-s { color: var(--muted); padding: 6px 0; }
	.empty { padding: 5vh 0; color: var(--muted); }
	.empty p { font-size: 20px; color: var(--ink); margin: 0 0 4px; font-weight: 600; }
	.empty :global(button) { margin-top: 16px; }
	@media (min-width: 1200px) { .grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 6px; } }

	/* Hover */
	.tile :global(img) { transition: transform 0.25s ease, filter 0.15s; }
	@media (hover: hover) { .tile:hover :global(img) { transform: scale(1.04); filter: var(--hover-filter); } }
</style>
