<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
		import { yearLine } from '$lib/domain/age';
	import { isOverdue, yearOccurrences } from '$lib/domain/occurrences';
	import { driftCards, momentsLabel } from '$lib/domain/view';
	import Photo from './Photo.svelte';
	import type { GalleryItem } from '$lib/state/ui.svelte';
	import YearLines from './YearLines.svelte';

	let { y }: { y: number } = $props();
	// Only the page on screen takes part in the morph into presenting (names must be unique).
	const morphs = $derived(y === app.year && !ui.present);
	const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
	const occs = $derived(yearOccurrences(app.visible, y));
	const real = $derived(occs.filter((o) => !o.moment.virtual));
	const line = $derived(yearLine(app.tl, y));
	const photos = $derived<GalleryItem[]>(real.flatMap((o) => o.moment.photos.map((path) => ({ path, o }))));
	// Placeholders for a year without photos: the icons of its moments, or a few cheerful ones.
	const cards = $derived(driftCards(7, y));
	try { ui.zoomHintSeen = localStorage.getItem('tijdlijn.hint.zoom') === '1'; } catch { /* no storage */ }
	// On a phone the photos make way: the year sits small on top and the Jaarlijn gets the rest of the screen.
	let vw = $state(1024);
	const phone = $derived(vw <= 640);
	let photoInput: HTMLInputElement | undefined = $state();
	function addPhotos() {
		const files = [...(photoInput?.files ?? [])];
		if (photoInput) photoInput.value = '';
		app.importPhotos(files);
	}
	const icons = $derived.by(() => {
		const own = [...new Set(real.map((o) => o.moment.emoji).filter(Boolean))];
		return own.length >= 3 ? own : [...own, '🌅', '🎈', '🌳', '🏖️', '🎉', '🚲', '☕'].slice(0, 7);
	});
	const stats = $derived(
		app.kind.hasStatus && real.length
			? [
					...app.statuses.map((st) => ({ n: real.filter((o) => o.moment.status === st.id).length, name: st.name.toLowerCase(), color: st.color })),
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

<svelte:window bind:innerWidth={vw} />

<!-- The upper half: the year, centred, with its photos to the right. The lower half: the Jaarlijn, edge to edge. -->
	<div class="yp">
		<div class="upper">
			<div class="yr">{@render head()}</div>
			{#if !phone}
			<div class="photos" role="group" aria-label="Foto's uit {y}">
				{#each photos as p, i (p.path + i)}
					<button class="ph" aria-label="{p.o.moment.title}, foto bekijken" onclick={() => (ui.gallery = { list: photos, i, canEdit: app.canEdit })}>
						<Photo path={p.path} alt={p.o.moment.title} />
					</button>
				{:else}
					<!-- No photos yet: placeholder polaroids drift by, with the year's own icons. -->
					<div class="drift" aria-hidden="true">
						{#each cards as c, i (i)}
							<button
								class="card"
								tabindex="-1"
								style:--top={c.top}
								style:--size={c.size}
								style:--secs="{c.secs}s"
								style:--start={c.start}
								style:--tilt="{c.tilt}deg"
								style:--hue={c.hue}
								onclick={() => app.canEdit && (ui.editor = { id: null, y, m: null, d: null })}
							><span class="pic">{icons[i % icons.length]}</span></button>
						{/each}
					</div>
					<p class="nophoto">
						Nog geen foto's uit {y}.
						{#if app.canEdit}<button class="addph" onclick={() => photoInput?.click()}>Foto's toevoegen</button>
							<input type="file" accept="image/*" multiple hidden bind:this={photoInput} onchange={addPhotos} />{/if}
					</p>
				{/each}
			</div>
			{/if}
		</div>
		<div class="lines" style:view-transition-name={morphs ? 'pres-months' : null}>
			{#if !ui.zoomHintSeen && real.length && app.canEdit}
				<!-- Nothing says the months can be clicked: this does, until the first time one is. -->
				<div class="hint" aria-live="polite">{canHover ? 'Klik op een maand om in te zoomen' : 'Tik op een maand om in te zoomen'}</div>
			{/if}
			<YearLines {y} {occs} half={!phone} />
		</div>
	</div>

<style>
	/* The Jaarlijn: the screen split in two, the year and its photos on top, the line below. */
	.yp { min-height: 100%; display: flex; flex-direction: column; }
	/* It never shrinks below the year itself: with a long Jaarlijn below, the page scrolls instead. */
	.upper { flex: 1 0 220px; min-height: 0; display: flex; align-items: stretch; gap: 3vw; padding: 2vh 0 2vh max(3vw, 72px); }
	.yr { flex: 0 0 auto; align-self: center; }
	.yr .count { margin-bottom: 0; }
	/* The photos fill the rest of the upper half, in one row that scrolls sideways. */
	.photos { position: relative; container-type: size; flex: 1 1 0; min-width: 0; display: flex; gap: 10px; align-items: center; overflow-x: auto; overflow-y: hidden; padding-right: 3vw; scrollbar-width: none; }
	.photos::-webkit-scrollbar { display: none; }
	.nophoto { position: absolute; left: 0; bottom: 2px; margin: 0; color: var(--muted); font-size: 13px; pointer-events: none; }
	.addph { pointer-events: auto; margin-left: 4px; padding: 3px 9px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font: inherit; font-weight: 600; cursor: pointer; }
	@media (hover: hover) { .addph:hover { background: var(--hover); filter: var(--hover-filter); } }
	/* Polaroids drifting from right to left, each at its own height, size, pace and tilt, bobbing gently. */
	.drift { position: absolute; inset: 0; overflow: hidden; mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent); }
	.card { position: absolute; left: 0; top: calc(var(--top) * 50%); height: min(calc(var(--size) * 52%), 200px); aspect-ratio: 4 / 5; padding: 0; border: none; border-radius: 4px;
		background: var(--surface); box-shadow: 0 6px 18px rgba(10, 20, 30, 0.12); cursor: pointer;
		animation: fly var(--secs) linear infinite, bob 5s ease-in-out infinite alternate; animation-delay: calc(var(--secs) * var(--start) * -1), calc(var(--start) * -5s); }
	.pic { position: absolute; inset: 7% 7% 24%; display: grid; place-items: center; border-radius: 2px; font-size: clamp(20px, 3.4vh, 38px);
		background: linear-gradient(145deg, hsl(var(--hue) 70% 86%), hsl(calc(var(--hue) + 40) 60% 76%)); }
	@keyframes fly { from { translate: calc(100cqw + 20px) 0; } to { translate: -120% 0; } }
	@keyframes bob { from { rotate: var(--tilt); transform: translateY(-4%); } to { rotate: calc(var(--tilt) * -0.6); transform: translateY(4%); } }
	@media (hover: hover) { .card:hover { filter: var(--hover-filter); animation-play-state: paused; } }
	@media (prefers-reduced-motion: reduce) {
		.card { animation: none; translate: calc(var(--start) * 90cqw) 0; rotate: var(--tilt); }
	}
	.ph { flex: 0 0 auto; height: 100%; max-height: 420px; aspect-ratio: 4 / 3; padding: 0; border: none; border-radius: 10px; overflow: hidden; background: var(--line); cursor: zoom-in; transition: filter 0.15s, transform 0.2s; }
	.ph :global(img) { display: block; width: 100%; height: 100%; object-fit: cover; }
	@media (hover: hover) { .ph:hover { filter: var(--hover-filter); } }
	.lines { flex: 0 0 auto; position: relative; }
	.hint { position: absolute; left: 50%; top: 42px; z-index: 4; transform: translateX(-50%); padding: 6px 14px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 13px; font-weight: 600; white-space: nowrap; pointer-events: none; animation: hintin 0.4s 0.8s both; }
	@keyframes hintin { from { opacity: 0; transform: translate(-50%, 6px); } }
	@media (prefers-reduced-motion: reduce) { .hint { animation: none; } }
	.big { margin: 0; font-size: clamp(84px, 20vw, 168px); font-weight: 800; letter-spacing: -0.055em; line-height: 0.85; }
	.big.now { color: var(--accent); }
	.count { color: var(--muted); font-size: 15px; margin: 10px 0 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.stsum { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: -8px 0 18px; font-size: 14px; }
	.sst { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--c); }
	.sst::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	@media (max-width: 640px) {
			/* On a phone no photos on top: the year small, the Jaarlijn takes the rest of the screen. */
		.upper { flex: 0 0 auto; padding: 6px 14px 4px; }
		.yr { align-self: flex-start; display: flex; align-items: baseline; gap: 12px; max-width: 100%; }
		.info { min-width: 0; }
		/* The year itself stands in the row of years above: not twice. */
		.yr .big { display: none; }
		.yr .count { margin: 0; font-size: 14px; }
		.yr .stsum { margin: 4px 0 0; }
		.lines { flex: 1 0 auto; }
	}
	@media (min-width: 1200px) {
		.big { font-size: clamp(100px, min(11vw, 15vh), 260px); }
		.info { padding-bottom: 1vh; }
		.count { margin: 0 0 8px; font-size: 18px; }
		.yr .count { margin: 12px 0 0; }
		.stsum { margin: 0 0 8px; }
	}
	/* Large screens zoom in; the Jaarlijn already spans the screen, so it keeps its own size. */
	@media (min-width: 2300px) and (min-height: 1250px) { .yr { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .yr { zoom: 1.5; } }
</style>
