<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS, MONTHS_SHORT, season } from '$lib/domain/dates';
	import { yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { isOverdue, yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel, monthOccurrences } from '$lib/domain/view';
	import Content from './Content.svelte';

	let { y }: { y: number } = $props();
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

<div class="page-in split">
	<div class="pl">
		<h2 class="big" class:now={y === app.now.y}>{y}</h2>
		<div class="count">
			{#if line}<span class="ageline">{line}{real.length ? ' · ' : ''}</span>{/if}{real.length ? momentsLabel(real.length) : line ? '' : 'Nog niets bijzonders'}
		</div>
		{#if stats.length}
			<div class="stsum">{#each stats as s (s.name)}<span class="sst" style:--c={s.color}>{s.n} {s.name}</span>{/each}</div>
		{/if}
		<div class="seasons">
			{#each MONTHS_SHORT as short, m (m)}
				{@const c = monthOccurrences(real, y, m).length}
				<button
					class:has={c > 0}
					class:cur={y === app.now.y && m === app.now.m}
					style:--s="var(--{season(m)})"
					aria-label="Zoom in op {MONTHS[m]} {y}{c ? ', ' + momentsLabel(c) : ''}"
					onclick={() => app.enterMonth(y, m)}
				><span>{short}</span><span class="c">{c || ''}</span></button>
			{/each}
		</div>
		<p class="tip">Tik op een maand om in te zoomen</p>
	</div>
	<div class="pr">
		<Content {occs} emptyTitle="Nog niets vastgelegd in {y}" emptySub="Maak het jaar, een maand of een dag bijzonder." onadd={() => (ui.menu = { y, m: null })} />
	</div>
</div>

<style>
	.page-in { max-width: 860px; margin: 0 auto; padding: 18px 24px 120px; }
	.big { margin: 0; font-size: clamp(84px, 20vw, 168px); font-weight: 800; letter-spacing: -0.055em; line-height: 0.85; }
	.big.now { color: var(--accent); }
	.count { color: var(--muted); font-size: 15px; margin: 10px 0 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.stsum { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: -8px 0 18px; font-size: 14px; }
	.sst { display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--c); }
	.sst::before { content: ''; width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	.seasons { display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; margin-bottom: 6px; }
	.seasons button { --s: var(--winter); height: 44px; border: none; border-radius: 6px; padding: 4px 0 0; background: color-mix(in srgb, var(--s) 30%, transparent); display: flex; flex-direction: column; align-items: center; justify-content: space-between; font: inherit; font-size: 11px; color: var(--ink); overflow: hidden; cursor: pointer; }
	.seasons button::after { content: ''; align-self: stretch; height: 4px; background: var(--s); }
	.seasons .c { font-size: 11px; font-weight: 800; line-height: 1; min-height: 11px; }
	.seasons button.has { background: var(--s); color: #fff; }
	.seasons button.cur { outline: 2px solid var(--ink); outline-offset: 1px; }
	.tip { font-size: 12px; color: var(--muted); margin: 0 0 20px; }
	@media (max-width: 640px) {
		.page-in { padding: 14px 14px 110px; }
		.seasons button { font-size: 9px; }
	}
	@media (min-width: 1200px) {
		.page-in { max-width: none; padding: 3vh 3vw 120px; }
		.split { display: grid; grid-template-columns: minmax(360px, 32%) minmax(0, 1fr); gap: 0 4vw; align-items: start; }
		.pl { position: sticky; top: 0; padding-top: 1vh; container-type: inline-size; }
		.pr { padding-top: 2vh; }
		.big { font-size: min(40cqi, 300px); }
		.count { margin-top: 16px; }
		.seasons button { height: clamp(52px, 6vh, 80px); font-size: 13px; }
		.tip { margin-bottom: 0; }
	}
	@media (min-width: 2300px) and (min-height: 1250px) { .page-in { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .page-in { zoom: 1.5; } }
</style>
