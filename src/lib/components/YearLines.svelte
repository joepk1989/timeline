<script lang="ts">
	// The Jaarlijn: the year from edge to edge, the months as columns, each moment a block lying on its
	// days with its icon and name, and its dates below. Blocks that would touch go on a row of their own.
	// Point at a month and it opens up to a third of the width, with its days numbered; click or tap it
	// and it takes the full width, the other months left as thin strips to jump to.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, monthSpans, packRows, yearLines, yearX } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();

	const HEAD = 52; // month names and, for an open month, its day numbers
	const ROW = 50; // px per row of blocks
	const BLOCK = 42; // px a block is high
	const GAP = 6; // px between blocks on a row

	let vw = $state(0);
	let vh = $state(0);
	let wrapEl = $state<HTMLDivElement>();
	let scroller = $state<HTMLDivElement>();
	let hover = $state<number | null>(null);
	let pinned = $state<number | null>(null);
	let fill = $state(0); // the height left on the screen, so the year fills it
	const open = $derived(pinned ?? hover);
	const lines = $derived(yearLines(occs, y));
	// On a phone the year scrolls sideways: a month is at least 110px wide.
	const full = $derived(pinned != null ? vw : Math.max(vw, 12 * 110));
	const strip = $derived(vw > 640 ? 16 : 8);
	const share = $derived(pinned != null ? 1 - (11 * strip) / full : Math.max(0.35 * full, Math.min(31 * 16, vw * 0.9)) / full);
	const spans = $derived(monthSpans(y, full, open, share));
	const x = (doy: number) => yearX(spans, doy);

	// How wide a block's text is, so a festival of a few days still shows its whole name.
	let ctx: CanvasRenderingContext2D | null = null;
	function textWidth(text: string, font: string): number {
		if (typeof document === 'undefined') return text.length * 8;
		ctx ??= document.createElement('canvas').getContext('2d');
		if (!ctx) return text.length * 8;
		ctx.font = `${font} ${getComputedStyle(document.body).fontFamily}`;
		return ctx.measureText(text).width;
	}
	const blocks = $derived.by(() => {
		const all = lines.items.map((it) => {
			const shown = pinned == null || (it.to >= spans[pinned].start && it.from < spans[pinned].start + spans[pinned].days);
			const from = x(it.from);
			const days = Math.max(4, x(it.to + 1) - from - 2);
			const text = Math.max(textWidth(`${it.o.moment.emoji} ${it.o.moment.title}`, '600 14px'), textWidth(whenLabel(it.o), '12px') + 14) + 36;
			const w = Math.min(Math.max(days, text), 280, full);
			const left = Math.max(0, Math.min(from, full - w));
			return { it, shown, from, days, left, w };
		});
		const shown = all.filter((b) => b.shown);
		const { rows, count } = packRows(shown.map((b) => ({ left: b.left, right: b.left + b.w })), GAP);
		const row = new Map(shown.map((b, i) => [b, rows[i]]));
		return { list: all.map((b) => ({ ...b, row: row.get(b) ?? 0 })), rows: count };
	});
	const height = $derived(Math.max(fill, HEAD + 12 + Math.max(3, blocks.rows) * ROW + 12));
	const todayDoy = $derived(app.now.y === y ? dayOfYear(y, app.now.m, app.now.d) : null);

	// Fill the screen below the line's top edge.
	$effect(() => {
		void [vh, vw];
		const section = wrapEl?.closest('section');
		if (!wrapEl || !section) return;
		const top = wrapEl.getBoundingClientRect().top - section.getBoundingClientRect().top + section.scrollTop;
		fill = Math.round(Math.max(260, section.clientHeight - top - 16));
	});

	// On a narrow screen, start at today.
	$effect(() => {
		if (scroller && todayDoy != null && pinned == null && full > vw) scroller.scrollLeft = yearX(monthSpans(y, full), todayDoy + 0.5) - vw / 2;
	});

	// Pointing opens a month after a short pause, so sweeping across the months stays calm.
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

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} onkeydown={(e) => pinned != null && e.key === 'Escape' && pin(null)} />

<div class="scroll" bind:this={scroller}>
	<div
		bind:this={wrapEl}
		class="wrap"
		style:width="{full}px"
		style:height="{height}px"
		style:--head="{HEAD}px"
		role="group"
		aria-label="Het jaar {y}, maand voor maand"
		onpointerleave={(e) => point(null, e)}
	>
		{#each spans as sp (sp.m)}
			<div class="col" class:open={open === sp.m} style:left="{sp.left}px" style:width="{sp.width}px" style:--s="var(--{season(sp.m)})" style:--day="{sp.width / sp.days}px" aria-hidden="true"></div>
			<button
				class="month"
				class:open={open === sp.m}
				class:thin={sp.width < 44}
				style:left="{sp.left}px"
				style:width="{sp.width}px"
				style:--s="var(--{season(sp.m)})"
				aria-expanded={pinned === sp.m}
				aria-label={pinned === sp.m ? `${MONTHS[sp.m]}, terug naar het hele jaar` : `${MONTHS[sp.m]} over de hele breedte`}
				onpointerenter={(e) => point(sp.m, e)}
				onclick={() => pin(pinned === sp.m ? null : sp.m)}
			>
				<span class="name">{MONTHS[sp.m]}</span>
				{#if open === sp.m}
					<span class="nums" aria-hidden="true">
						{#each { length: sp.days } as _, d (d)}<span class:we={[0, 6].includes(new Date(y, sp.m, d + 1).getDay())}>{sp.width / sp.days >= 15 || d % 2 === 0 ? d + 1 : ''}</span>{/each}
					</span>
				{/if}
			</button>
		{/each}
		{#if todayDoy != null}<div class="today" style:left="{x(todayDoy + 0.5)}px" aria-hidden="true"></div>{/if}

		{#each blocks.list as b, i (b.it.o.moment.id + i)}
			{#if b.shown}
				<button
					class="block"
					style:left="{b.left}px"
					style:width="{b.w}px"
					style:top="{HEAD + 12 + b.row * ROW}px"
					style:height="{BLOCK}px"
					style:--c={color(b.it.o)}
					onclick={() => openMoment(b.it.o)}
				>
					<span class="days" style:left="{b.from - b.left}px" style:width="{b.days}px" aria-hidden="true"></span>
					<span class="l1"><span class="e">{b.it.o.moment.emoji}</span> <span class="t">{b.it.o.moment.title}</span></span>
					<span class="l2"><span class="sq" aria-hidden="true"></span>{whenLabel(b.it.o)}</span>
				</button>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* Breaks out of the page column to the full width of the screen. */
	.scroll { overflow-x: auto; overflow-y: hidden; margin: 4px calc(50% - 50vw) 16px; scrollbar-width: thin; }
	.wrap { position: relative; --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	/* A month is a column: a line on its left, a header with its name on a season-coloured edge. */
	.col { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line); transition: left var(--ease), width var(--ease); pointer-events: none; }
	.col.open { background: repeating-linear-gradient(to right, color-mix(in srgb, var(--s) 10%, transparent) 0 calc(var(--day) - 1px), color-mix(in srgb, var(--line) 70%, transparent) calc(var(--day) - 1px) var(--day)); }
	.month { position: absolute; top: 0; height: var(--head); padding: 0; border: none; border-top: 3px solid var(--s); border-radius: 0; background: color-mix(in srgb, var(--line) 45%, transparent);
		font: inherit; color: var(--ink); cursor: pointer; overflow: hidden; transition: left var(--ease), width var(--ease), background-color 0.15s; }
	.month .name { position: absolute; left: 0; right: 0; top: 7px; text-align: center; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; }
	.month.thin .name { display: none; }
	.month.open { background: color-mix(in srgb, var(--s) 28%, transparent); }
	.nums { position: absolute; left: 0; right: 0; top: 29px; display: flex; animation: fade 0.3s both; }
	.nums span { flex: 1 1 0; min-width: 0; text-align: center; font-size: 11px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
	.nums span.we { color: var(--ink); }
	@keyframes fade { from { opacity: 0; } }
	.today { position: absolute; top: var(--head); bottom: 0; width: 0; border-left: 2px solid var(--accent); margin-left: -1px; z-index: 1; pointer-events: none; transition: left var(--ease); }
	/* A moment: a block lying on its days, the days themselves marked along its top. */
	.block { position: absolute; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 12px 0 12px; border: none; border-radius: 21px;
		background: color-mix(in srgb, var(--c) 16%, var(--surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 30%, transparent) inset; font: inherit; color: var(--ink); text-align: left; cursor: pointer;
		overflow: hidden; transition: left var(--ease), width var(--ease), top var(--ease), filter 0.15s; }
	.block .days { position: absolute; top: 0; height: 4px; border-radius: 0 0 3px 3px; background: var(--c); transition: left var(--ease), width var(--ease); }
	.block .l1, .block .l2 { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.block .l1 { font-size: 14px; line-height: 18px; }
	.block .t { font-weight: 700; }
	.block .l2 { font-size: 12px; line-height: 15px; color: var(--muted); }
	.block .sq { display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: var(--c); margin-right: 6px; vertical-align: 0; }
	@media (hover: hover) {
		.month:hover { background: var(--hover); }
		.month.open:hover { background: color-mix(in srgb, var(--s) 28%, transparent); }
		.block:hover { filter: var(--hover-filter); z-index: 3; }
	}
	.block:focus-visible { z-index: 3; }
	@media (prefers-reduced-motion: reduce) {
		.wrap { --ease: 0s linear; }
		.nums { animation: none; }
	}
</style>
