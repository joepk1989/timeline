<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
		import { yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { isOverdue, yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel } from '$lib/domain/view';
	import Content from './Content.svelte';
	import MonthTabs from './MonthTabs.svelte';
	import Seg from './Seg.svelte';
	import YearLines from './YearLines.svelte';

	let { y }: { y: number } = $props();
	// Only the page on screen takes part in the morph into presenting (names must be unique).
	const morphs = $derived(y === app.year && app.mode === 'year' && !ui.present);
	const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
	const occs = $derived(yearOccurrences(app.visible, y));
	const real = $derived(occs.filter((o) => !o.moment.virtual));
	const line = $derived(yearLine(app.tl, y));
	const stats = $derived(
		app.kind.hasStatus && real.length
			? [
					...STATUSES.map((st) => ({ n: real.filter((o) => o.moment.status === st.id).length, name: st.name.toLowerCase(), color: st.color })),
					{ n: real.filter((o) => isOverdue(o, app.now)).length, name: 'over tijd', color: 'var(--danger)' }
				].filter((s) => s.n)
			: []
	);
</script>

<div class="page-in top">
	<h2 class="big" class:now={y === app.now.y} style:view-transition-name={morphs ? 'pres-year' : null}>{y}</h2>
	<div class="info" style:view-transition-name={morphs ? 'pres-info' : null}>
		<div class="count">
			{#if line}<span class="ageline">{line}{real.length ? ' · ' : ''}</span>{/if}{real.length ? momentsLabel(real.length) : line ? '' : 'Nog niets bijzonders'}
		</div>
		{#if stats.length}
			<div class="stsum">{#each stats as s (s.name)}<span class="sst" style:--c={s.color}>{s.n} {s.name}</span>{/each}</div>
		{/if}
	</div>
	<div class="acc">
		<div class="yv"><Seg label="Het jaar als" value={app.yearView} onchange={(v) => app.setYearView(v)} options={[['lijn', 'Jaarlijn'], ['maanden', 'Maanden']]} /></div>
		{#if app.yearView === 'maanden'}
			<div style:view-transition-name={morphs ? 'pres-months' : null}><MonthTabs {y} {occs} /></div>
			<p class="tip">{canHover ? 'Beweeg over de maanden om ze te bekijken, klik om er een te kiezen' : 'Tik op een maand om de dagen te zien'}</p>
		{/if}
	</div>
</div>
<!-- The Jaarlijn sits outside the page column, so it spans the page from edge to edge. -->
{#if app.yearView === 'lijn'}
	<div class="lines" style:view-transition-name={morphs ? 'pres-months' : null}><YearLines {y} {occs} /></div>
{/if}
<div class="page-in bottom">
	<div class="list">
		<Content {occs} emptyTitle="Nog niets vastgelegd in {y}" emptySub="Maak het jaar, een maand of een dag bijzonder." onadd={() => (ui.menu = { y, m: null })} />
	</div>
</div>

<style>
	.page-in { max-width: 860px; margin: 0 auto; padding: 18px 24px 120px; }
	.page-in.top { padding-bottom: 0; }
	.page-in.bottom { padding-top: 0; }
	.lines { margin: 4px 0 16px; }
	.big { margin: 0; font-size: clamp(84px, 20vw, 168px); font-weight: 800; letter-spacing: -0.055em; line-height: 0.85; }
	.big.now { color: var(--accent); }
	.count { color: var(--muted); font-size: 15px; margin: 10px 0 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.stsum { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: -8px 0 18px; font-size: 14px; }
	.sst { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--c); }
	.sst::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	.yv { display: flex; margin: 0 0 12px; }
	.tip { font-size: 12px; color: var(--muted); margin: 0 0 20px; }
	@media (max-width: 640px) {
		.page-in { padding: 14px 14px 110px; }
		.page-in.top { padding-bottom: 0; }
		.page-in.bottom { padding-top: 0; }
	}
	@media (min-width: 1200px) {
		.page-in { max-width: none; padding: 3vh 3vw 120px; }
		.page-in.top { padding-bottom: 0; }
		.page-in.bottom { padding-top: 1vh; }
		/* Year and its line side by side, then the months across the full width; the moments below. */
		.page-in.top { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'year info' 'acc acc'; gap: 0 3vw; align-items: end; }
		.big { grid-area: year; font-size: clamp(100px, min(11vw, 15vh), 260px); }
		.info { grid-area: info; padding-bottom: 1vh; }
		.count { margin: 0 0 8px; font-size: 18px; }
		.stsum { margin: 0 0 8px; }
		.acc { grid-area: acc; margin-top: 3vh; }
		.list { max-width: 1100px; }
	}
	/* Large screens zoom in; the Jaarlijn already spans the screen, so it keeps its own size. */
	@media (min-width: 2300px) and (min-height: 1250px) { .page-in > * { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .page-in > * { zoom: 1.5; } }
</style>
