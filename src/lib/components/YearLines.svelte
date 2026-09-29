<script lang="ts">
	// The Jaarlijn: the year from edge to edge, the months as columns, each moment a block lying on its
	// days with its icon and name, and its dates below. Blocks that would touch go on a row of their own.
	// Point at a month and it opens up to a third of the width, with its days numbered; click or tap it
	// and it takes the full width, the other months left as thin strips to jump to. When presenting it is
	// compact: one line per block, the moment on show lit up and its month opened.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS, WEEKDAYS, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayOfYear, monthSpans, packRows, partSpans, partX, yearLines, yearX } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import DayLine from './DayLine.svelte';
	import Icon from './Icon.svelte';

	let {
		y,
		occs,
		compact = false,
		focus = null,
		openMonth = null,
		onpick,
		height: fixed = null,
		half = false
	}: {
		y: number;
		occs: Occurrence[];
		/** One line per block, for along the bottom of the presentation. */
		compact?: boolean;
		/** The moment on show: lit up, the others fade. */
		focus?: string | null;
		/** A month kept open, as if pointed at. */
		openMonth?: number | null;
		/** What a click on a block does, instead of opening the moment. */
		onpick?: (o: Occurrence) => void;
		/** A fixed height in px: the rows squeeze together to fit it. */
		height?: number | null;
		/** Take the lower half of the screen, instead of all the height below the line's top. */
		half?: boolean;
	} = $props();

	const HEAD = $derived(compact ? 44 : 64); // month numbers and names and, for an open month, its day numbers
	const GAP = 6; // px between blocks on a row

	let win = $state(0);
	// The line spans its container, which the page makes as wide as the screen (less any scroll bar).
	let screen = $state(0);
	const vw = $derived(screen);
	let vh = $state(0);
	let wrapEl = $state<HTMLDivElement>();
	let scroller = $state<HTMLDivElement>();
	let hover = $state<number | null>(null);
	let pinned = $state<number | null>(null);
	// In a month over the full width, a click on a day zooms in once more, onto that day.
	let day = $state<number | null>(null);
	// The day zoomed into starts as the narrow column it was and grows, the other months folding away.
	let grown = $state(false);
	const wide = $derived(day != null && grown);
	function openDay(d: number) {
		day = d;
		grown = false;
		requestAnimationFrame(() => requestAnimationFrame(() => (grown = true)));
	}
	let fill = $state(0); // the height left on the screen, so the year fills it
	const open = $derived(pinned ?? openMonth ?? hover);
	/** The month whose days are columns you can point at and click: the one over the full width, or the one pointed at. */
	const dm = $derived(pinned ?? (compact ? null : hover));
	const lines = $derived(yearLines(occs, y));
	// On a phone the year scrolls sideways: a month is at least 110px wide.
	const full = $derived(pinned != null ? vw : Math.max(vw, 12 * 110));
	const strip = $derived(vw > 640 ? 16 : 8);
	// A month over the full width, also with a day zoomed into, keeps the other months as thin strips.
	const share = $derived(pinned != null ? 1 - (11 * strip) / full : Math.max(0.35 * full, Math.min(31 * 16, vw * 0.9)) / full);
	const spans = $derived(monthSpans(y, full, open, share));
	// In a month over the full width the days can be wide or narrow (one pointed at, or zoomed into), so
	// time there is placed by the days themselves.
	const x = (doy: number) => {
		if (dm == null || !dayParts) return yearX(spans, doy);
		const sp = spans[dm];
		if (doy < sp.start || doy > sp.start + sp.days) return yearX(spans, doy);
		return sp.left + partX(dayParts, doy - sp.start);
	};

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
			const shown = day == null && (pinned == null || (it.to >= spans[pinned].start && it.from < spans[pinned].start + spans[pinned].days));
			const from = x(it.from);
			const days = Math.max(4, x(it.to + 1) - from - 2);
			const name = textWidth(`${it.o.moment.emoji} ${it.o.moment.title}`, compact ? '600 12px' : '600 14px');
			const text = (compact ? name : Math.max(name, textWidth(whenLabel(it.o), '12px') + 14)) + (compact ? 28 : 36);
			// As wide as its days, and at least as wide as its name (up to a limit): a whole year spans the year.
			const w = Math.min(Math.max(days, Math.min(text, compact ? 220 : 280)), full);
			const left = Math.max(0, Math.min(from, full - w));
			return { it, shown, from, days, left, w };
		});
		const shown = all.filter((b) => b.shown);
		const { rows, count } = packRows(shown.map((b) => ({ left: b.left, right: b.left + b.w })), GAP);
		const row = new Map(shown.map((b, i) => [b, rows[i]]));
		return { list: all.map((b) => ({ ...b, row: row.get(b) ?? 0 })), rows: count };
	});
	// With a fixed height the rows squeeze together to fit.
	const rowsFit = $derived(fixed ? (fixed - HEAD - 16) / Math.max(1, blocks.rows) : Infinity);
	const ROW = $derived(Math.min(compact ? 32 : 50, rowsFit)); // px per row of blocks
	const BLOCK = $derived(Math.max(14, Math.min(compact ? 27 : 42, ROW - 4))); // px a block is high
	const height = $derived(fixed ?? Math.max(fill, HEAD + 10 + Math.max(compact ? 1 : 3, blocks.rows) * ROW + 10));
	const todayDoy = $derived(app.now.y === y ? dayOfYear(y, app.now.m, app.now.d) : null);

	// Fill the screen below the line's top edge, or its lower half.
	$effect(() => {
		void [vh, win];
		const section = wrapEl?.closest('section');
		if (!wrapEl || !section) return;
		const top = wrapEl.getBoundingClientRect().top - section.getBoundingClientRect().top + section.scrollTop;
		fill = Math.round(Math.max(260, half ? section.clientHeight / 2 : section.clientHeight - top));
	});

	// On a narrow screen, start at today.
	$effect(() => {
		if (scroller && todayDoy != null && pinned == null && full > vw) scroller.scrollLeft = yearX(monthSpans(y, full), todayDoy + 0.5) - vw / 2;
	});

	// Keep the moment on show in view when the year scrolls sideways.
	$effect(() => {
		const b = focus && full > vw ? blocks.list.find((b) => b.it.o.moment.id === focus) : null;
		if (b && scroller) scroller.scrollTo({ left: b.left + b.w / 2 - vw / 2, behavior: 'smooth' });
	});

	// Pointing opens a month after a short pause, so sweeping across the months stays calm.
	let timer: ReturnType<typeof setTimeout> | undefined;
	function point(m: number | null, e: PointerEvent) {
		if (e.pointerType !== 'mouse' || pinned != null) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (hover !== m) dayHover = null;
			hover = m;
		}, m == null ? 250 : 90);
	}
	function pin(m: number | null) {
		clearTimeout(timer);
		clearTimeout(dayTimer);
		hover = null;
		dayHover = null;
		pinned = m;
		day = null;
		scroller?.scrollTo({ left: 0 });
	}
	function stepDay(delta: number) {
		if (pinned == null || day == null) return;
		const t = new Date(y, pinned, day + delta);
		if (t.getFullYear() !== y) return;
		pinned = t.getMonth();
		day = t.getDate();
	}
	/** Where a day of the month over the full width sits: all alike, or the one zoomed into wide and the rest thin. */
	// Together the thin days take at most 15% of the width, so the day itself stays wide, also on a phone.
	const dstrip = $derived(Math.min(8, (vw * 0.15) / 30));
	// A day pointed at opens up a little, as a month does in the year; a day zoomed into takes the width.
	let dayHover = $state<number | null>(null);
	let dayTimer: ReturnType<typeof setTimeout> | undefined;
	function pointDay(d: number | null, e: PointerEvent) {
		if (e.pointerType !== 'mouse' || day != null) return;
		clearTimeout(dayTimer);
		dayTimer = setTimeout(() => (dayHover = d), d == null ? 250 : 90);
	}
	const dayParts = $derived.by(() => {
		if (dm == null) return null;
		const sp = spans[dm];
		if (wide && day != null) return partSpans(sp.width, sp.days, day - 1, 1 - ((sp.days - 1) * dstrip) / sp.width);
		const open = day ?? dayHover;
		if (open == null) return partSpans(sp.width, sp.days);
		return partSpans(sp.width, sp.days, open - 1, Math.min(0.3, Math.max(4 / sp.days, 110 / sp.width)));
	});
	function dayBox(i: number): { left: number; width: number } {
		const sp = spans[dm!];
		const p = dayParts![i];
		return { left: sp.left + p.left, width: p.width };
	}
	/** Days of the month that has its days as columns, with something of their own on them (not a month or year long): a dot. */
	function busy(i: number): boolean {
		if (dm == null) return false;
		const doy = spans[dm].start + i;
		return lines.items.some((it) => it.from <= doy && it.to >= doy && it.to - it.from < 27);
	}
	function back() {
		if (day != null) day = null;
		else pin(null);
	}

	function openMoment(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}
</script>

<svelte:window bind:innerWidth={win} bind:innerHeight={vh} onkeydown={(e) => pinned != null && e.key === 'Escape' && back()} />

<div bind:clientWidth={screen} class="scroll" bind:this={scroller}>
	<div
		bind:this={wrapEl}
		class="wrap"
		style:width="{full}px"
		style:height="{height}px"
		class:compact
		class:focusing={!!focus}
		style:--head="{HEAD}px"
		role="group"
		aria-label="Het jaar {y}, maand voor maand"
		onpointerleave={(e) => { point(null, e); pointDay(null, e); }}
	>
		{#each spans as sp (sp.m)}
			<div class="col" class:open={open === sp.m} class:days={dm === sp.m} style:left="{sp.left}px" style:width="{sp.width}px" style:--s="var(--{season(sp.m)})" style:--day="{sp.width / sp.days}px" aria-hidden="true"></div>
			<button
				class="month"
				class:open={open === sp.m}
				class:thin={sp.width < 44}
				style:left="{sp.left}px"
				style:width="{sp.width}px"
				style:--s="var(--{season(sp.m)})"
				aria-expanded={pinned === sp.m}
				aria-label={pinned === sp.m ? (day != null ? `Terug naar heel ${MONTHS[sp.m]}` : `${MONTHS[sp.m]}, terug naar het hele jaar`) : `${MONTHS[sp.m]} over de hele breedte`}
				onpointerenter={(e) => point(sp.m, e)}
				onclick={() => (pinned === sp.m && day != null ? (day = null) : pin(pinned === sp.m ? null : sp.m))}
			>
				<span class="name"><b>{String(sp.m + 1).padStart(2, '0')}</b> {MONTHS[sp.m]}</span>
				{#if open === sp.m && dm !== sp.m}
					<span class="nums" aria-hidden="true">
						{#each { length: sp.days } as _, d (d)}<span class:we={[0, 6].includes(new Date(y, sp.m, d + 1).getDay())}>{sp.width / sp.days >= 15 || d % 2 === 0 ? d + 1 : ''}</span>{/each}
					</span>
				{/if}
			</button>
		{/each}
		{#if dm != null && !compact}
			{@const sp = spans[dm]}
			{#each { length: sp.days } as _, i (i)}
				{@const box = dayBox(i)}
				{#if day === i + 1}
					<div class="daylbl" style:left="{box.left}px" style:width="{box.width}px">
						<button class="stp" aria-label="Vorige dag" onclick={() => stepDay(-1)}><Icon name="back" /></button>
						<button class="dn" aria-expanded="true" aria-label="{WEEKDAYS[new Date(y, sp.m, i + 1).getDay()]} {i + 1} {MONTHS[sp.m]}, terug naar heel {MONTHS[sp.m]}" onclick={() => (day = null)}>{WEEKDAYS[new Date(y, sp.m, i + 1).getDay()]} <b>{i + 1}</b></button>
						<button class="stp" aria-label="Volgende dag" onclick={() => stepDay(1)}><Icon name="next" /></button>
					</div>
					<div class="dayv" style:left="{box.left}px" style:width="{box.width}px">
						{#key day}<DayLine {y} m={sp.m} d={day} {occs} onopen={(o) => (onpick ? onpick(o) : openMoment(o))} />{/key}
					</div>
				{:else}
					<button
						class="dayc"
						class:we={[0, 6].includes(new Date(y, sp.m, i + 1).getDay())}
						class:thin={box.width < 18}
						class:busy={busy(i)}
						class:pointed={dayHover === i + 1 && day == null}
						style:left="{box.left}px"
						style:width="{box.width}px"
						aria-label="{i + 1} {MONTHS[sp.m]} bekijken"
						onpointerenter={(e) => pointDay(i + 1, e)}
						onclick={() => {
							// From a month pointed at in the year, a click on a day goes straight to that day.
							if (pinned !== sp.m) pin(sp.m);
							openDay(i + 1);
						}}
					><span>{box.width >= 60 ? `${WEEKDAYS[new Date(y, sp.m, i + 1).getDay()]} ${i + 1}` : i + 1}</span></button>
				{/if}
			{/each}
		{/if}
		{#if todayDoy != null && day == null}<div class="today" style:left="{x(todayDoy + 0.5)}px" aria-hidden="true"></div>{/if}

		{#each blocks.list as b, i (b.it.o.moment.id + i)}
			{#if b.shown}
				<button
					class="block"
					class:on={focus === b.it.o.moment.id}
					aria-current={focus === b.it.o.moment.id ? 'true' : undefined}
					style:left="{b.left}px"
					style:width="{b.w}px"
					style:top="{HEAD + 10 + b.row * ROW}px"
					style:height="{BLOCK}px"
					onclick={() => (onpick ? onpick(b.it.o) : openMoment(b.it.o))}
				>
					<span class="days" style:left="{b.from - b.left}px" style:width="{b.days}px" aria-hidden="true"></span>
					<span class="l1"><span class="e">{b.it.o.moment.emoji}</span> <span class="t">{b.it.o.moment.title}</span></span>
					{#if !compact}<span class="l2"><span class="sq" aria-hidden="true"></span>{whenLabel(b.it.o)}</span>{/if}
				</button>
			{/if}
		{/each}
	</div>
</div>

<style>
	.scroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
	.wrap { position: relative; --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	/* A month is a column: a line on its left, on top a bar in the colour of its season, the only colour here. */
	.col { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line); transition: left var(--ease), width var(--ease); pointer-events: none; }
	.col.open:not(.days) { background: repeating-linear-gradient(to right, transparent 0 calc(var(--day) - 1px), color-mix(in srgb, var(--line) 70%, transparent) calc(var(--day) - 1px) var(--day)); }
	/* The colour is only on the band with the month's name; the days below it have none. */
	.wrap { --numrow: 28px; }
	.wrap.compact { --numrow: 19px; }
	.month { --bar: color-mix(in srgb, var(--s) 55%, var(--bg)); position: absolute; top: 0; height: var(--head); padding: 0; border: none; border-radius: 0;
		background: linear-gradient(to bottom, var(--bar) 0 calc(100% - var(--numrow)), transparent calc(100% - var(--numrow)));
		box-shadow: inset -1px 0 0 color-mix(in srgb, var(--bg) 60%, transparent), inset 0 -1px 0 var(--line);
		font: inherit; color: var(--ink); cursor: zoom-in; overflow: hidden; transition: left var(--ease), width var(--ease); }
	.month[aria-expanded='true'] { cursor: zoom-out; }
	.month .name { position: absolute; left: 0; right: 0; top: calc((var(--head) - var(--numrow)) / 2 - 10px); text-align: center; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; }
	.month.thin .name { display: none; }
	.month .name b { font-weight: 800; font-variant-numeric: tabular-nums; margin-right: 2px; }
	.month.open { --bar: color-mix(in srgb, var(--s) 80%, var(--bg)); }
	.nums { position: absolute; left: 0; right: 0; bottom: calc(var(--numrow) / 2 - 8px); display: flex; animation: fade 0.3s both; }
	.nums span { flex: 1 1 0; min-width: 0; text-align: center; font-size: 11px; font-weight: 600; color: color-mix(in srgb, var(--ink) 65%, transparent); font-variant-numeric: tabular-nums; }
	.nums span.we { color: var(--ink); }
	@keyframes fade { from { opacity: 0; } }
	/* In a month over the full width, each day is a column you can zoom into. */
	.dayc { position: absolute; top: calc(var(--head) - 28px); bottom: 0; z-index: 1; padding: 0; border: none; border-radius: 0; background: transparent; font: inherit; color: color-mix(in srgb, var(--ink) 65%, transparent); cursor: zoom-in; transition: left var(--ease), width var(--ease), background-color 0.15s; }
	.dayc.thin span { display: none; }
	.dayc { border-left: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
	.dayc.thin { border-left-color: color-mix(in srgb, var(--line) 35%, transparent); }
	.dayc.pointed { background: var(--hover); }
	.dayc.pointed span { color: var(--ink); }
	.dayc.thin.busy::after { content: ''; position: absolute; top: 13px; left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 70%, transparent); }
	/* The day zoomed into, as wide as the month less a thin strip for each other day. */
	/* Above the day zoomed into, its date stays in the bar, with the name of the day before it. */
	.daylbl { position: absolute; z-index: 4; top: calc(var(--head) - 30px); height: 30px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; transition: left var(--ease), width var(--ease); }
	/* The day zoomed into, like a month over the full width: click it again to fold it back. */
	.daylbl .dn { min-width: 0; overflow: hidden; text-overflow: ellipsis; padding: 2px 10px; border: none; border-radius: 999px; background: transparent; font: inherit; color: inherit; cursor: zoom-out; transition: background-color 0.15s; }
	@media (hover: hover) { .daylbl .dn:hover { background: var(--hover); } }
	.stp { flex: 0 0 auto; width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: none; border-radius: 50%; background: color-mix(in srgb, var(--bg) 55%, transparent); color: var(--ink); cursor: pointer; transition: background-color 0.15s; }
	.stp :global(svg) { width: 14px; height: 14px; }
	@media (hover: hover) { .stp:hover { background: var(--bg); } }
	.daylbl b { font-weight: 800; font-variant-numeric: tabular-nums; }
	.dayv { position: absolute; top: var(--head); bottom: 0; z-index: 3; overflow: hidden; transition: left var(--ease), width var(--ease); }
	.dayc span { position: absolute; top: 4px; left: 0; right: 0; text-align: center; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
	.dayc.we span { color: var(--ink); }
	@media (hover: hover) { .dayc:hover { background: var(--hover); } .dayc:hover span { color: var(--ink); } }
	.today { position: absolute; top: var(--head); bottom: 0; width: 0; border-left: 2px solid var(--ink); margin-left: -1px; z-index: 1; pointer-events: none; transition: left var(--ease); }
	/* A moment: a block lying on its days, the days themselves marked along its top. */
	.block { position: absolute; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 12px 0 12px; border: none; border-radius: 21px;
		background: var(--surface); box-shadow: 0 0 0 1px var(--line) inset; font: inherit; color: var(--ink); text-align: left; cursor: pointer;
		overflow: hidden; transition: left var(--ease), width var(--ease), top var(--ease), filter 0.15s; }
	.block .days { position: absolute; top: 0; height: 4px; border-radius: 0 0 3px 3px; background: color-mix(in srgb, var(--ink) 35%, transparent); transition: left var(--ease), width var(--ease); }
	.block .l1, .block .l2 { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.block .l1 { font-size: 14px; line-height: 18px; }
	.block .t { font-weight: 700; }
	.block .l2 { font-size: 12px; line-height: 15px; color: var(--muted); }
	.block .sq { display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: var(--muted); margin-right: 6px; vertical-align: 0; }
	@media (hover: hover) {
		.month:hover { --bar: color-mix(in srgb, var(--s) 70%, var(--bg)); }
		.month.open:hover { --bar: color-mix(in srgb, var(--s) 80%, var(--bg)); }
		.block:hover { filter: var(--hover-filter); z-index: 3; }
	}
	.block:focus-visible { z-index: 3; }
	/* Presenting: smaller, one line, the moment on show lit up and the rest faded. */
	.compact .block { padding: 2px 10px 0; border-radius: 14px; }
	.compact .block .l1 { font-size: 12px; line-height: 15px; }
	.compact .month .name { font-size: 12px; }
	.focusing .block { opacity: 0.45; transition: left var(--ease), width var(--ease), top var(--ease), filter 0.15s, opacity 0.4s, box-shadow 0.4s; }
	.focusing .block.on { opacity: 1; z-index: 3; box-shadow: 0 0 0 2px var(--ink), 0 6px 18px rgba(10, 20, 30, 0.18); }
	@media (prefers-reduced-motion: reduce) {
		.wrap { --ease: 0s linear; }
		.nums { animation: none; }
	}
</style>
