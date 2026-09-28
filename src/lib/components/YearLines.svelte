<script lang="ts">
	// The year as 365 thin lines side by side, one per day, on one row. Moments colour their days in a
	// lane of their own; the name stands upright right beside them. Too narrow for a whole year? It scrolls.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS_SHORT, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, placeLabels, yearLines } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();

	const LANE = 10; // px per lane
	const LABEL = 20; // px per upright name
	const TOP = 22; // month names
	const GAP = 22; // room for the joining lines

	let width = $state(0);
	let scroller = $state<HTMLDivElement>();
	const lines = $derived(yearLines(occs, y));
	const day = $derived(Math.max(3, width / (lines.days || 365))); // px per day
	const full = $derived(lines.days * day);
	const ruler = $derived(Math.max(36, lines.lanes * LANE + 8));
	const labelsY = $derived(TOP + ruler + GAP);
	const mid = (it: { from: number; to: number }) => (it.from + (it.to - it.from + 1) / 2) * day;
	const lefts = $derived(placeLabels(lines.items.map((it) => mid(it) - LABEL / 2), LABEL, full));
	const months = $derived(MONTHS_SHORT.map((name, m) => ({ name, m, left: dayOfYear(y, m, 1) * day })));
	const today = $derived(app.now.y === y ? (dayOfYear(y, app.now.m, app.now.d) + 0.5) * day : null);
	let hot = $state<string | null>(null);

	// On a narrow screen, start at today.
	$effect(() => {
		if (scroller && today != null && full > width) scroller.scrollLeft = today - width / 2;
	});

	const color = (o: Occurrence) => (o.moment.virtual ? 'var(--accent)' : app.catOf(o.moment.categoryId).color);
	function open(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}
</script>

{#if lines.items.length}
	<div class="scroll" bind:clientWidth={width} bind:this={scroller}>
		<div class="wrap" style:width="{full}px" style:--day="{day}px" style:--top="{TOP}px" style:--ruler="{ruler}px" style:--labels="{labelsY}px" role="group" aria-label="Het jaar {y} in lijnen, één per dag">
			{#each months as mo (mo.m)}
				<div class="month" style:left="{mo.left}px" style:--s="var(--{season(mo.m)})"><span>{mo.name}</span></div>
			{/each}
			<div class="ruler" aria-hidden="true"></div>
			{#if today != null}<div class="today" style:left="{today}px" aria-hidden="true"></div>{/if}

			<svg class="links" width={full} height={labelsY} aria-hidden="true">
				{#each lines.items as it, i (it.o.moment.id + i)}
					{@const x1 = mid(it)}
					{@const y1 = TOP + 4 + it.lane * LANE + LANE - 3}
					{@const x2 = lefts[i] + LABEL / 2}
					<path d="M{x1} {y1} V{TOP + ruler + 6} L{x2} {labelsY - 6} V{labelsY - 2}" class:hot={hot === it.o.moment.id} style:--c={color(it.o)} />
				{/each}
			</svg>

			{#each lines.items as it, i (it.o.moment.id + i)}
				<div
					class="seg"
					class:hot={hot === it.o.moment.id}
					style:left="{it.from * day}px"
					style:width="{Math.max(2, (it.to - it.from + 1) * day - 1)}px"
					style:top="{TOP + 4 + it.lane * LANE}px"
					style:--c={color(it.o)}
					aria-hidden="true"
				></div>
				<button
					class="label"
					class:hot={hot === it.o.moment.id}
					style:left="{lefts[i]}px"
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
	</div>
{:else}
	<div class="empty">Nog niets met een datum in {y}.</div>
{/if}

<style>
	.scroll { overflow-x: auto; overflow-y: hidden; margin: 4px 0 24px; scrollbar-width: thin; }
	.wrap { position: relative; height: calc(var(--labels) + 300px); }
	/* 365 lines: one per day, drawn as a repeating background. */
	.ruler { position: absolute; top: var(--top); left: 0; right: 0; height: var(--ruler);
		background: repeating-linear-gradient(to right, var(--line) 0 calc(var(--day) - 1px), transparent calc(var(--day) - 1px) var(--day)); border-radius: 2px; }
	.month { position: absolute; top: 0; height: calc(var(--top) + var(--ruler) + 6px); width: 0; border-left: 1px solid color-mix(in srgb, var(--s) 70%, transparent); pointer-events: none; }
	.month span { position: absolute; left: 4px; top: 2px; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
	.today { position: absolute; top: calc(var(--top) - 4px); height: calc(var(--ruler) + 8px); width: 0; border-left: 2px solid var(--accent); margin-left: -1px; z-index: 3; pointer-events: none; }
	.seg { position: absolute; height: 7px; border-radius: 3px; background: var(--c); z-index: 2; transition: box-shadow 0.15s; }
	.seg.hot { box-shadow: 0 0 0 2px var(--ink); }
	.links { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; z-index: 1; }
	.links path { fill: none; stroke: color-mix(in srgb, var(--c) 60%, var(--line)); stroke-width: 1; transition: stroke 0.15s; }
	.links path.hot { stroke: var(--ink); stroke-width: 1.5; }
	/* The name stands upright, reading top to bottom, right beside its line. */
	.label { position: absolute; top: var(--labels); width: 20px; max-height: 300px; writing-mode: vertical-rl; display: flex; align-items: center; gap: 5px; padding: 4px 0 8px;
		border: none; border-radius: 6px; background: transparent; font: inherit; color: var(--ink); cursor: pointer; white-space: nowrap; overflow: hidden; z-index: 2; transition: background-color 0.15s; }
	.label .e { font-size: 13px; }
	.label .t { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; min-height: 0; }
	.label .d { font-size: 11px; color: var(--muted); flex: 0 0 auto; }
	.label::before { content: ''; height: 4px; align-self: stretch; margin: 0 5px; border-radius: 2px; background: var(--c); flex: 0 0 auto; }
	@media (hover: hover) {
		.label:hover { background: var(--hover); }
	}
	.label.hot { background: var(--hover); }
	.empty { color: var(--muted); padding: 6px 0; }
</style>
