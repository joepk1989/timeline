<script lang="ts">
	// The year as 365 thin lines, one per day, top to bottom. Moments colour their days in a lane of
	// their own; the name sits beside them, joined by a thin line. Lanes keep overlapping festivals apart.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS_SHORT, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, placeLabels, yearLines } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();

	const ROW = 3; // px per day: a 2px line and a 1px gap
	const LANE = 12; // px per lane
	const LABEL = 22; // px per label
	const GUTTER = 44; // month names

	const lines = $derived(yearLines(occs, y));
	const height = $derived(lines.days * ROW);
	const ruler = $derived(Math.max(56, lines.lanes * LANE + 16));
	const labelsX = $derived(GUTTER + ruler + 36);
	const tops = $derived(placeLabels(lines.items.map((it) => it.from * ROW + ((it.to - it.from + 1) * ROW) / 2 - LABEL / 2), LABEL, height));
	const months = $derived(MONTHS_SHORT.map((name, m) => ({ name, m, top: dayOfYear(y, m, 1) * ROW })));
	const today = $derived(app.now.y === y ? dayOfYear(y, app.now.m, app.now.d) * ROW : null);
	let hot = $state<string | null>(null);

	const color = (o: Occurrence) => (o.moment.virtual ? 'var(--accent)' : app.catOf(o.moment.categoryId).color);
	function open(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}
</script>

{#if lines.items.length}
	<div class="wrap" style:height="{height}px" style:--row="{ROW}px" style:--gutter="{GUTTER}px" style:--ruler="{ruler}px" role="group" aria-label="Het jaar {y} in lijnen, één per dag">
		{#each months as mo (mo.m)}
			<div class="month" style:top="{mo.top}px" style:--s="var(--{season(mo.m)})"><span>{mo.name}</span></div>
		{/each}
		<div class="ruler" aria-hidden="true"></div>
		{#if today != null}<div class="today" style:top="{today}px" aria-hidden="true"><span>vandaag</span></div>{/if}

		<svg class="links" width="100%" height={height} aria-hidden="true">
			{#each lines.items as it, i (it.o.moment.id + i)}
				{@const x1 = GUTTER + it.lane * LANE + LANE - 2}
				{@const y1 = it.from * ROW + ((it.to - it.from + 1) * ROW) / 2}
				{@const y2 = tops[i] + LABEL / 2}
				<path d="M{x1} {y1} H{GUTTER + ruler + 12} L{labelsX - 6} {y2} H{labelsX - 2}" class:hot={hot === it.o.moment.id} style:--c={color(it.o)} />
			{/each}
		</svg>

		{#each lines.items as it, i (it.o.moment.id + i)}
			<div
				class="seg"
				class:hot={hot === it.o.moment.id}
				style:top="{it.from * ROW}px"
				style:height="{(it.to - it.from + 1) * ROW - 1}px"
				style:left="{GUTTER + it.lane * LANE}px"
				style:--c={color(it.o)}
				aria-hidden="true"
			></div>
			<button
				class="label"
				class:hot={hot === it.o.moment.id}
				style:top="{tops[i]}px"
				style:left="{labelsX}px"
				style:--c={color(it.o)}
				onpointerenter={() => (hot = it.o.moment.id)}
				onpointerleave={() => (hot = null)}
				onfocus={() => (hot = it.o.moment.id)}
				onblur={() => (hot = null)}
				onclick={() => open(it.o)}
			>
				<span class="e">{it.o.moment.emoji}</span><span class="t">{it.o.moment.title}</span><span class="d">{whenLabel(it.o)}</span>
			</button>
		{/each}
	</div>
{:else}
	<div class="empty">Nog niets met een datum in {y}.</div>
{/if}

<style>
	.wrap { position: relative; margin: 4px 0 24px; }
	/* 365 lines: one per day, drawn as a repeating background. */
	.ruler { position: absolute; left: var(--gutter); top: 0; bottom: 0; width: var(--ruler);
		background: repeating-linear-gradient(to bottom, var(--line) 0 calc(var(--row) - 1px), transparent calc(var(--row) - 1px) var(--row)); border-radius: 2px; }
	.month { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid color-mix(in srgb, var(--s) 70%, transparent); z-index: 1; pointer-events: none; }
	.month span { position: absolute; left: 0; top: 2px; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
	.today { position: absolute; left: calc(var(--gutter) - 6px); width: calc(var(--ruler) + 12px); height: 0; border-top: 2px solid var(--accent); z-index: 3; pointer-events: none; }
	.today span { position: absolute; right: 100%; top: -9px; margin-right: 4px; font-size: 11px; font-weight: 700; color: var(--accent); background: var(--bg); padding: 0 2px; }
	.seg { position: absolute; width: calc(12px - 3px); border-radius: 3px; background: var(--c); z-index: 2; min-height: 2px; transition: box-shadow 0.15s; }
	.seg.hot { box-shadow: 0 0 0 2px var(--ink); }
	.links { position: absolute; inset: 0; overflow: visible; pointer-events: none; z-index: 1; }
	.links path { fill: none; stroke: color-mix(in srgb, var(--c) 60%, var(--line)); stroke-width: 1; transition: stroke 0.15s; }
	.links path.hot { stroke: var(--ink); stroke-width: 1.5; }
	.label { position: absolute; height: 22px; right: 0; display: flex; align-items: center; gap: 6px; padding: 0 8px 0 4px; border: none; border-radius: 6px; background: transparent;
		font: inherit; color: var(--ink); text-align: left; cursor: pointer; min-width: 0; white-space: nowrap; z-index: 2; transition: background-color 0.15s; }
	.label .e { font-size: 14px; }
	.label .t { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
	.label .d { font-size: 12px; color: var(--muted); flex: 0 0 auto; }
	.label::before { content: ''; width: 4px; align-self: stretch; margin: 4px 0; border-radius: 2px; background: var(--c); }
	.label.hot { background: var(--hover); }
	.empty { color: var(--muted); padding: 6px 0; }
	@media (max-width: 640px) {
		.label .d { display: none; }
	}
</style>
