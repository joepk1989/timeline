<script lang="ts">
	// The year as 365 thin lines side by side, one per day, on one row. Moments colour their days in a
	// lane of their own; the name stands upright right beside them. Point at a month and it opens up to a
	// third of the line, with its days numbered; click or tap it and it takes the full width, the other
	// months left as thin strips to jump to. Too narrow for a whole year? It scrolls.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS, MONTHS_SHORT, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, monthSpans, placeLabels, yearLines, yearX } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();

	const LANE = 20; // px per lane
	const SEG = 14; // px a moment is high
	const LABEL = 28; // px per upright name
	const TOP = 50; // month names and, for an open month, its day numbers
	const GAP = 28; // room for the joining lines

	// The line breaks out of the page column to the full width of the screen.
	let vw = $state(0);
	let scroller = $state<HTMLDivElement>();
	let hover = $state<number | null>(null);
	let pinned = $state<number | null>(null);
	const open = $derived(pinned ?? hover);
	const width = $derived(vw);
	const lines = $derived(yearLines(occs, y));
	const full = $derived(pinned != null ? width : Math.max(width, (lines.days || 365) * 2));
	// A pinned month takes the width but for a thin strip per other month. A month pointed at gets a
	// third of the line, more on a narrow screen, but always fits on the screen.
	const strip = $derived(vw > 640 ? 16 : 8);
	const share = $derived(pinned != null ? 1 - (11 * strip) / full : Math.max(0.35 * full, Math.min(31 * 16, width * 0.9)) / full);
	const spans = $derived(monthSpans(y, full, open, share));
	const x = (doy: number) => yearX(spans, doy);
	const ruler = $derived(Math.max(80, lines.lanes * LANE + 16));
	const labelsY = $derived(TOP + ruler + GAP);
	const mid = (it: { from: number; to: number }) => (x(it.from) + x(it.to + 1)) / 2;
	// With a month pinned, only what touches that month keeps its name.
	const named = $derived(
		lines.items.map((it) => pinned == null || (it.to >= spans[pinned].start && it.from < spans[pinned].start + spans[pinned].days))
	);
	const lefts = $derived.by(() => {
		const idx = lines.items.flatMap((_, i) => (named[i] ? [i] : []));
		const placed = placeLabels(idx.map((i) => mid(lines.items[i]) - LABEL / 2), LABEL, full);
		const out: number[] = [];
		idx.forEach((i, k) => (out[i] = placed[k]));
		return out;
	});
	const todayDoy = $derived(app.now.y === y ? dayOfYear(y, app.now.m, app.now.d) : null);
	let hot = $state<string | null>(null);

	// On a narrow screen, start at today.
	$effect(() => {
		if (scroller && todayDoy != null && pinned == null && full > width) scroller.scrollLeft = yearX(monthSpans(y, full), todayDoy + 0.5) - vw / 2;
	});

	// Pointing opens a month after a short pause, so sweeping across the line stays calm.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function point(m: number | null, e: PointerEvent) {
		if (e.pointerType !== 'mouse' || pinned != null) return;
		clearTimeout(timer);
		timer = setTimeout(() => (hover = m), m == null ? 250 : 90);
	}
	function pin(m: number | null) {
		clearTimeout(timer);
		hover = null;
		pinned = m;
		scroller?.scrollTo({ left: 0 });
	}

	const color = (o: Occurrence) => (o.moment.virtual ? 'var(--accent)' : app.catOf(o.moment.categoryId).color);
	function openMoment(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}
</script>

<svelte:window bind:innerWidth={vw} onkeydown={(e) => pinned != null && e.key === 'Escape' && pin(null)} />

<div class="scroll" bind:this={scroller}>
		<div
			class="wrap"
			style:width="{full}px"
			style:--top="{TOP}px"
			style:--ruler="{ruler}px"
			style:--labels="{labelsY}px"
			role="group"
			aria-label="Het jaar {y} in lijnen, één per dag"
			onpointerleave={(e) => point(null, e)}
		>
			{#each spans as sp (sp.m)}
				<button
					class="month"
					class:open={open === sp.m}
					class:thin={sp.width < 30}
					style:left="{sp.left}px"
					style:width="{sp.width}px"
					style:--s="var(--{season(sp.m)})"
					style:--day="{sp.width / sp.days}px"
					aria-expanded={pinned === sp.m}
					aria-label={pinned === sp.m ? `${MONTHS[sp.m]}, terug naar het hele jaar` : `${MONTHS[sp.m]} over de hele breedte`}
					onpointerenter={(e) => point(sp.m, e)}
					onclick={() => pin(pinned === sp.m ? null : sp.m)}
				>
					<span class="name">{MONTHS_SHORT[sp.m]}</span>
					{#if open === sp.m}
						<span class="nums" aria-hidden="true">
							{#each { length: sp.days } as _, d (d)}<span class:we={[0, 6].includes(new Date(y, sp.m, d + 1).getDay())}>{sp.width / sp.days >= 15 || d % 2 === 0 ? d + 1 : ''}</span>{/each}
						</span>
					{/if}
					<span class="ruler" aria-hidden="true"></span>
				</button>
			{/each}
			{#if todayDoy != null}<div class="today" style:left="{x(todayDoy + 0.5)}px" aria-hidden="true"></div>{/if}

			<svg class="links" width={full} height={labelsY} aria-hidden="true">
				{#each lines.items as it, i (it.o.moment.id + i)}
					{#if named[i]}
					{@const x1 = mid(it)}
					{@const y1 = TOP + 8 + it.lane * LANE + SEG}
					{@const x2 = lefts[i] + LABEL / 2}
					<path style:d="path('M{x1} {y1} V{TOP + ruler + 6} L{x2} {labelsY - 6} V{labelsY - 2}')" class:hot={hot === it.o.moment.id} style:--c={color(it.o)} />
					{/if}
				{/each}
			</svg>

			{#each lines.items as it, i (it.o.moment.id + i)}
				<div
					class="seg"
					class:hot={hot === it.o.moment.id}
					style:left="{x(it.from)}px"
					style:width="{Math.max(2, x(it.to + 1) - x(it.from) - 1)}px"
					style:top="{TOP + 8 + it.lane * LANE}px"
					style:--c={color(it.o)}
					aria-hidden="true"
				></div>
				{#if named[i]}
				<button
					class="label"
					class:hot={hot === it.o.moment.id}
					style:left="{lefts[i]}px"
					style:--c={color(it.o)}
					onpointerenter={() => (hot = it.o.moment.id)}
					onpointerleave={() => (hot = null)}
					onfocus={() => (hot = it.o.moment.id)}
					onblur={() => (hot = null)}
					onclick={() => openMoment(it.o)}
				>
					<span class="e">{it.o.moment.emoji}</span><span class="t">{it.o.moment.title}</span><span class="d">{whenLabel(it.o)}</span>
				</button>
				{/if}
			{/each}
		</div>
	</div>

<style>
	.scroll { overflow-x: auto; overflow-y: hidden; margin: 4px calc(50% - 50vw) 24px; scrollbar-width: thin; --names: 380px; }
	@media (max-width: 640px) { .scroll { --names: 320px; } }
	.wrap { position: relative; height: calc(var(--labels) + var(--names)); --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	/* A month: its name on top, then its days as thin lines (a repeating background). */
	.month { position: absolute; top: 0; height: calc(var(--top) + var(--ruler) + 6px); padding: 0; border: none; border-left: 1px solid color-mix(in srgb, var(--s) 70%, transparent);
		border-radius: 0; background: transparent; font: inherit; color: var(--muted); cursor: pointer; text-align: left; transition: left var(--ease), width var(--ease), background-color 0.15s; }
	.month .name { position: absolute; left: 6px; top: 4px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
	.month.thin .name { display: none; }
	.month.open { background: color-mix(in srgb, var(--s) 22%, transparent); color: var(--ink); }
	.month .ruler { position: absolute; top: var(--top); left: 0; right: 0; height: var(--ruler);
		background: repeating-linear-gradient(to right, var(--line) 0 calc(var(--day) - 1px), transparent calc(var(--day) - 1px) var(--day)); }
	.month.open .ruler { background: repeating-linear-gradient(to right, color-mix(in srgb, var(--s) 45%, var(--line)) 0 calc(var(--day) - 2px), transparent calc(var(--day) - 2px) var(--day)); }
	.nums { position: absolute; left: 0; right: 0; top: 27px; display: flex; animation: fade 0.3s both; }
	.nums span { flex: 1 1 0; min-width: 0; text-align: center; font-size: 12px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
	.nums span.we { color: var(--ink); }
	@keyframes fade { from { opacity: 0; } }
	@media (hover: hover) {
		.month:hover { background: var(--hover); }
		.month.open:hover { background: color-mix(in srgb, var(--s) 22%, transparent); }
		.label:hover { background: var(--hover); }
	}
	.today { position: absolute; top: calc(var(--top) - 4px); height: calc(var(--ruler) + 8px); width: 0; border-left: 2px solid var(--accent); margin-left: -1px; z-index: 3; pointer-events: none; transition: left var(--ease); }
	.seg { position: absolute; height: 14px; border-radius: 5px; background: var(--c); z-index: 2; pointer-events: none; transition: left var(--ease), width var(--ease), box-shadow 0.15s; }
	.seg.hot { box-shadow: 0 0 0 2px var(--ink); }
	.links { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; z-index: 1; }
	.links path { fill: none; stroke: color-mix(in srgb, var(--c) 60%, var(--line)); stroke-width: 1; transition: d var(--ease), stroke 0.15s; }
	.links path.hot { stroke: var(--ink); stroke-width: 1.5; }
	/* The name stands upright, reading top to bottom, right beside its line. */
	.label { position: absolute; top: var(--labels); width: 28px; max-height: var(--names); writing-mode: vertical-rl; display: flex; align-items: center; gap: 7px; padding: 6px 0 10px;
		border: none; border-radius: 6px; background: transparent; font: inherit; color: var(--ink); cursor: pointer; white-space: nowrap; overflow: hidden; z-index: 2; transition: left var(--ease), background-color 0.15s; }
	.label .e { font-size: 17px; }
	.label .t { font-size: 17px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; min-height: 0; }
	.label .d { font-size: 14px; color: var(--muted); flex: 0 0 auto; }
	.label::before { content: ''; height: 5px; align-self: stretch; margin: 0 7px; border-radius: 2px; background: var(--c); flex: 0 0 auto; }
	.label.hot { background: var(--hover); }
	@media (prefers-reduced-motion: reduce) {
		.wrap { --ease: 0s linear; }
		.nums { animation: none; }
	}
</style>
