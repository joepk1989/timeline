<script lang="ts">
	// The year as 365 thin lines side by side, one per day, on one row. Moments colour their days in a
	// lane of their own; the name stands upright right beside them. Point at a month (or tap it) and it
	// opens up to a third of the line, with its days numbered. Too narrow for a whole year? It scrolls.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS_SHORT, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, monthSpans, placeLabels, yearLines, yearX } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();

	const LANE = 10; // px per lane
	const LABEL = 20; // px per upright name
	const TOP = 38; // month names and, for an open month, its day numbers
	const GAP = 22; // room for the joining lines

	// The line breaks out of the page column to the full width of the screen, keeping the page's edge.
	let vw = $state(0);
	let scroller = $state<HTMLDivElement>();
	let open = $state<number | null>(null);
	const pad = $derived(vw >= 1200 ? vw * 0.03 : vw > 640 ? 24 : 14);
	const width = $derived(vw - 2 * pad);
	const lines = $derived(yearLines(occs, y));
	const full = $derived(Math.max(width, (lines.days || 365) * 2));
	// An open month gets a third of the line, more on a narrow screen, but always fits on the screen.
	const share = $derived(Math.max(0.35 * full, Math.min(31 * 16, width * 0.9)) / full);
	const spans = $derived(monthSpans(y, full, open, share));
	const x = (doy: number) => yearX(spans, doy);
	const ruler = $derived(Math.max(36, lines.lanes * LANE + 8));
	const labelsY = $derived(TOP + ruler + GAP);
	const mid = (it: { from: number; to: number }) => (x(it.from) + x(it.to + 1)) / 2;
	const lefts = $derived(placeLabels(lines.items.map((it) => mid(it) - LABEL / 2), LABEL, full));
	const todayDoy = $derived(app.now.y === y ? dayOfYear(y, app.now.m, app.now.d) : null);
	let hot = $state<string | null>(null);

	// On a narrow screen, start at today.
	$effect(() => {
		if (scroller && todayDoy != null && full > width) scroller.scrollLeft = yearX(monthSpans(y, full), todayDoy + 0.5) + pad - vw / 2;
	});

	// Pointing opens a month after a short pause, so sweeping across the line stays calm.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function point(m: number | null, e: PointerEvent) {
		if (e.pointerType !== 'mouse') return;
		clearTimeout(timer);
		timer = setTimeout(() => (open = m), m == null ? 250 : 90);
	}
	function toggle(m: number) {
		clearTimeout(timer);
		open = open === m ? null : m;
		if (open != null && scroller && full > width) {
			const s = monthSpans(y, full, open, share)[open];
			scroller.scrollTo({ left: s.left + s.width / 2 + pad - vw / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
		}
	}

	const color = (o: Occurrence) => (o.moment.virtual ? 'var(--accent)' : app.catOf(o.moment.categoryId).color);
	function openMoment(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}
</script>

<svelte:window bind:innerWidth={vw} />

{#if lines.items.length}
	<div class="scroll" bind:this={scroller} style:--pad="{pad}px">
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
					style:left="{sp.left}px"
					style:width="{sp.width}px"
					style:--s="var(--{season(sp.m)})"
					style:--day="{sp.width / sp.days}px"
					aria-expanded={open === sp.m}
					aria-label="{MONTHS_SHORT[sp.m]}, {open === sp.m ? 'dichtklappen' : 'openklappen'}"
					onpointerenter={(e) => point(sp.m, e)}
					onclick={() => toggle(sp.m)}
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
					{@const x1 = mid(it)}
					{@const y1 = TOP + 4 + it.lane * LANE + LANE - 3}
					{@const x2 = lefts[i] + LABEL / 2}
					<path style:d="path('M{x1} {y1} V{TOP + ruler + 6} L{x2} {labelsY - 6} V{labelsY - 2}')" class:hot={hot === it.o.moment.id} style:--c={color(it.o)} />
				{/each}
			</svg>

			{#each lines.items as it, i (it.o.moment.id + i)}
				<div
					class="seg"
					class:hot={hot === it.o.moment.id}
					style:left="{x(it.from)}px"
					style:width="{Math.max(2, x(it.to + 1) - x(it.from) - 1)}px"
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
					onclick={() => openMoment(it.o)}
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
	.scroll { overflow-x: auto; overflow-y: hidden; margin: 4px calc(50% - 50vw) 24px; scrollbar-width: thin; }
	.wrap { position: relative; margin: 0 var(--pad); height: calc(var(--labels) + 300px); --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	/* A month: its name on top, then its days as thin lines (a repeating background). */
	.month { position: absolute; top: 0; height: calc(var(--top) + var(--ruler) + 6px); padding: 0; border: none; border-left: 1px solid color-mix(in srgb, var(--s) 70%, transparent);
		border-radius: 0; background: transparent; font: inherit; color: var(--muted); cursor: pointer; text-align: left; transition: left var(--ease), width var(--ease), background-color 0.15s; }
	.month .name { position: absolute; left: 4px; top: 2px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
	.month.open { background: color-mix(in srgb, var(--s) 22%, transparent); color: var(--ink); }
	.month .ruler { position: absolute; top: var(--top); left: 0; right: 0; height: var(--ruler);
		background: repeating-linear-gradient(to right, var(--line) 0 calc(var(--day) - 1px), transparent calc(var(--day) - 1px) var(--day)); }
	.month.open .ruler { background: repeating-linear-gradient(to right, color-mix(in srgb, var(--s) 45%, var(--line)) 0 calc(var(--day) - 2px), transparent calc(var(--day) - 2px) var(--day)); }
	.nums { position: absolute; left: 0; right: 0; top: 20px; display: flex; animation: fade 0.3s both; }
	.nums span { flex: 1 1 0; min-width: 0; text-align: center; font-size: 10px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
	.nums span.we { color: var(--ink); }
	@keyframes fade { from { opacity: 0; } }
	@media (hover: hover) {
		.month:hover { background: var(--hover); }
		.month.open:hover { background: color-mix(in srgb, var(--s) 22%, transparent); }
		.label:hover { background: var(--hover); }
	}
	.today { position: absolute; top: calc(var(--top) - 4px); height: calc(var(--ruler) + 8px); width: 0; border-left: 2px solid var(--accent); margin-left: -1px; z-index: 3; pointer-events: none; transition: left var(--ease); }
	.seg { position: absolute; height: 7px; border-radius: 3px; background: var(--c); z-index: 2; pointer-events: none; transition: left var(--ease), width var(--ease), box-shadow 0.15s; }
	.seg.hot { box-shadow: 0 0 0 2px var(--ink); }
	.links { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; z-index: 1; }
	.links path { fill: none; stroke: color-mix(in srgb, var(--c) 60%, var(--line)); stroke-width: 1; transition: d var(--ease), stroke 0.15s; }
	.links path.hot { stroke: var(--ink); stroke-width: 1.5; }
	/* The name stands upright, reading top to bottom, right beside its line. */
	.label { position: absolute; top: var(--labels); width: 20px; max-height: 300px; writing-mode: vertical-rl; display: flex; align-items: center; gap: 5px; padding: 4px 0 8px;
		border: none; border-radius: 6px; background: transparent; font: inherit; color: var(--ink); cursor: pointer; white-space: nowrap; overflow: hidden; z-index: 2; transition: left var(--ease), background-color 0.15s; }
	.label .e { font-size: 13px; }
	.label .t { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; min-height: 0; }
	.label .d { font-size: 11px; color: var(--muted); flex: 0 0 auto; }
	.label::before { content: ''; height: 4px; align-self: stretch; margin: 0 5px; border-radius: 2px; background: var(--c); flex: 0 0 auto; }
	.label.hot { background: var(--hover); }
	.empty { color: var(--muted); padding: 6px 0; }
	@media (prefers-reduced-motion: reduce) {
		.wrap { --ease: 0s linear; }
		.nums { animation: none; }
	}
</style>
