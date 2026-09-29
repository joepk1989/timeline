<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
		import { yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { isOverdue, yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel } from '$lib/domain/view';
	import MonthTabs from './MonthTabs.svelte';
	import Photo from './Photo.svelte';
	import type { GalleryItem } from '$lib/state/ui.svelte';
	import YearLines from './YearLines.svelte';

	let { y }: { y: number } = $props();
	// Only the page on screen takes part in the morph into presenting (names must be unique).
	const morphs = $derived(y === app.year && app.mode === 'year' && !ui.present);
	const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
	const occs = $derived(yearOccurrences(app.visible, y));
	const real = $derived(occs.filter((o) => !o.moment.virtual));
	const line = $derived(yearLine(app.tl, y));
	const photos = $derived<GalleryItem[]>(real.flatMap((o) => o.moment.photos.map((path) => ({ path, o }))));
	const stats = $derived(
		app.kind.hasStatus && real.length
			? [
					...STATUSES.map((st) => ({ n: real.filter((o) => o.moment.status === st.id).length, name: st.name.toLowerCase(), color: st.color })),
					{ n: real.filter((o) => isOverdue(o, app.now)).length, name: 'over tijd', color: 'var(--danger)' }
				].filter((s) => s.n)
			: []
	);
</script>

{#snippet head()}
	<h2 class="big" class:now={y === app.now.y} style:view-transition-name={morphs ? 'pres-year' : null}>{y}</h2>
	<div class="info" style:view-transition-name={morphs ? 'pres-info' : null}>
		<div class="count">
			{#if line}<span class="ageline">{line}{real.length ? ' · ' : ''}</span>{/if}{real.length ? momentsLabel(real.length) : line ? '' : 'Nog niets bijzonders'}
		</div>
		{#if stats.length}
			<div class="stsum">{#each stats as s (s.name)}<span class="sst" style:--c={s.color}>{s.n} {s.name}</span>{/each}</div>
		{/if}
	</div>
{/snippet}

{#if app.yearView === 'lijn'}
	<!-- The upper half: the year, centred, with its photos to the right. The lower half: the Jaarlijn, edge to edge. -->
	<div class="yp">
		<div class="upper">
			<div class="yr">{@render head()}</div>
			<div class="photos" role="group" aria-label="Foto's uit {y}">
				{#each photos as p, i (p.path + i)}
					<button class="ph" aria-label="{p.o.moment.title}, foto bekijken" onclick={() => (ui.gallery = { list: photos, i, canEdit: app.canEdit })}>
						<Photo path={p.path} alt={p.o.moment.title} />
					</button>
				{/each}
			</div>
		</div>
		<div class="lines" style:view-transition-name={morphs ? 'pres-months' : null}><YearLines {y} {occs} half /></div>
	</div>
{:else}
	<div class="page-in">
		{@render head()}
		<div class="acc">
			<div style:view-transition-name={morphs ? 'pres-months' : null}><MonthTabs {y} {occs} /></div>
			<p class="tip">{canHover ? 'Beweeg over de maanden om ze te bekijken, klik om er een te kiezen' : 'Tik op een maand om de dagen te zien'}</p>
		</div>
	</div>
{/if}

<style>
	/* The month tabs: a centred column, with room at the bottom for the add button. */
	.page-in { max-width: 860px; margin: 0 auto; padding: 18px 24px 120px; }
	/* The Jaarlijn: the screen split in two, the year and its photos on top, the line below. */
	.yp { min-height: 100%; display: flex; flex-direction: column; }
	.upper { flex: 1 1 0; min-height: 0; display: flex; align-items: stretch; gap: 3vw; padding: 2vh 0 2vh 3vw; }
	.yr { flex: 0 0 auto; align-self: center; }
	.yr .count { margin-bottom: 0; }
	/* The photos fill the rest of the upper half, in one row that scrolls sideways. */
	.photos { flex: 1 1 0; min-width: 0; display: flex; gap: 10px; align-items: center; overflow-x: auto; overflow-y: hidden; padding-right: 3vw; scrollbar-width: none; }
	.photos::-webkit-scrollbar { display: none; }
	.ph { flex: 0 0 auto; height: 100%; max-height: 420px; aspect-ratio: 4 / 3; padding: 0; border: none; border-radius: 10px; overflow: hidden; background: var(--line); cursor: zoom-in; transition: filter 0.15s, transform 0.2s; }
	.ph :global(img) { display: block; width: 100%; height: 100%; object-fit: cover; }
	@media (hover: hover) { .ph:hover { filter: var(--hover-filter); } }
	.lines { flex: 0 0 auto; }
	.big { margin: 0; font-size: clamp(84px, 20vw, 168px); font-weight: 800; letter-spacing: -0.055em; line-height: 0.85; }
	.big.now { color: var(--accent); }
	.count { color: var(--muted); font-size: 15px; margin: 10px 0 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.stsum { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: -8px 0 18px; font-size: 14px; }
	.sst { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--c); }
	.sst::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	.tip { font-size: 12px; color: var(--muted); margin: 0 0 20px; }
	@media (max-width: 640px) {
		.page-in { padding: 14px 14px 110px; }
		/* On a phone the photos go under the year. */
		.upper { flex-direction: column; gap: 10px; padding: 14px 0 12px 14px; }
		.yr { align-self: flex-start; }
		.photos { flex: 1 1 0; min-height: 0; padding-right: 14px; }
	}
	@media (min-width: 1200px) {
		.page-in { max-width: none; padding: 3vh 3vw 120px; }
		/* Year and its line side by side, then the months across the full width. */
		.page-in { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'year info' 'acc acc'; gap: 0 3vw; align-items: end; }
		.big { grid-area: year; font-size: clamp(100px, min(11vw, 15vh), 260px); }
		.info { grid-area: info; padding-bottom: 1vh; }
		.count { margin: 0 0 8px; font-size: 18px; }
		.yr .count { margin: 12px 0 0; }
		.stsum { margin: 0 0 8px; }
		.acc { grid-area: acc; margin-top: 3vh; }
	}
	/* Large screens zoom in; the Jaarlijn already spans the screen, so it keeps its own size. */
	@media (min-width: 2300px) and (min-height: 1250px) { .page-in > *, .yr { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .page-in > *, .yr { zoom: 1.5; } }
</style>
