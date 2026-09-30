<script lang="ts">
	// The Jaarlijn: the year from edge to edge, the months as columns, each moment a block lying on its
	// days with its icon and name, and its dates below. Blocks that would touch go on a row of their own.
	// Point at a month and it opens up to a third of the width, with its days numbered; click or tap it
	// and it takes the full width, the other months left as thin strips to jump to. When presenting it is
	// compact: one line per block, the moment on show lit up and its month opened.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS, MONTHS_SHORT, WEEKDAYS, season } from '$lib/domain/dates';
	import { whenLabel, yearOccurrences } from '$lib/domain/occurrences';
	import { yearPos, yearsSpans, dayLabel, yearAge, dayOfYear, monthSpans, packRows, partSpans, partX, yearLines, yearX } from '$lib/domain/view';
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

	// Years, months and days each get a row of the same height: the months' names, then the days below.
	let vh = $state(0);
	// When presenting, everything in the line grows with the screen, to be read from across the room.
	const K = $derived(compact ? Math.max(1.4, Math.min(2.6, vh / 520)) : 1);
	const ROWH = $derived(compact ? Math.round(24 * K) : 34);
	const HEAD = $derived(2 * ROWH);
	// The years of the timeline, for the line of all years (their row itself is YearsRow, fixed above the pages).
	const years = $derived(
		Array.from({ length: app.scope.to - app.scope.from + 1 }, (_, i) => {
			const yy = app.scope.from + i;
			return { y: yy, age: yearAge(app.tl, yy), count: yearOccurrences(app.visible, yy).filter((o) => !o.moment.virtual).length };
		})
	);
	const GAP = 6; // px between blocks on a row

	let win = $state(0);
	// The line spans its container, which the page makes as wide as the screen (less any scroll bar).
	let screen = $state(0);
	const vw = $derived(screen);
	// The year on show gets room for its age and moments, as an open month does; the others share the rest.
	// Zoomed out to all the years, they share the width alike.
	const yearParts = $derived(
		ui.allYears
			? partSpans(screen, years.length)
			: partSpans(screen, years.length, years.findIndex((yy) => yy.y === y), years.length > 1 ? Math.min(0.5, Math.max(1 / years.length, 240 / (screen || 1))) : 1)
	);
	/** Where a moment of any year sits on the line of all years. */
	const xAll = (t: number) => partX(yearParts, t - app.scope.from);
	const allBlocks = $derived.by(() => {
		if (!ui.allYears || compact) return { list: [], rows: 0 };
		const spans = yearsSpans(years.map((yy) => yearOccurrences(app.visible, yy.y)));
		const list = spans.map((s) => {
			const from = xAll(s.from);
			const days = Math.max(4, xAll(s.to) - from - 2);
			const text = textWidth(`${s.o.moment.emoji} ${s.o.moment.title}`, '600 13px') + 28;
			const w = Math.min(Math.max(days, Math.min(text, 220)), screen);
			const left = Math.max(0, Math.min(from, screen - w));
			return { o: s.o, from, days, left, w };
		});
		const { rows, count } = packRows(list.map((b) => ({ left: b.left, right: b.left + b.w })), GAP);
		return { list: list.map((b, i) => ({ ...b, row: rows[i] })), rows: count };
	});
	function pickYear(yy: number) {
		if (yy === y && !ui.allYears) ui.allYears = true;
		else {
			ui.allYears = false;
			app.goTo(yy - app.scope.from);
		}
	}
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
	/** Lays the blocks out on rows, their names in `font` px (when presenting) so a block is as wide as its name. */
	function layout(font: number) {
		const all = lines.items.map((it) => {
			const shown = day == null && (pinned == null || (it.to >= spans[pinned].start && it.from < spans[pinned].start + spans[pinned].days));
			const from = x(it.from);
			const days = Math.max(4, x(it.to + 1) - from - 2);
			const name = textWidth(`${it.o.moment.emoji} ${it.o.moment.title}`, compact ? `700 ${font}px` : '600 14px');
			const text = (compact ? name : Math.max(name, textWidth(whenLabel(it.o), '12px') + 14)) + (compact ? 20 * K + 12 : 36);
			// As wide as its days, and at least as wide as its name (up to a limit): a whole year spans the year.
			const w = Math.min(Math.max(days, Math.min(text, compact ? font * 18 : 280)), full);
			const left = Math.max(0, Math.min(from, full - w));
			return { it, shown, from, days, left, w };
		});
		const shown = all.filter((b) => b.shown);
		const { rows, count } = packRows(shown.map((b) => ({ left: b.left, right: b.left + b.w })), GAP);
		const row = new Map(shown.map((b, i) => [b, rows[i]]));
		return { list: all.map((b) => ({ ...b, row: row.get(b) ?? 0 })), rows: count };
	}
	// With a fixed height the rows squeeze together to fit, and the names shrink with them (laid out once
	// more at that size, so the blocks are as wide as the names they now carry).
	const rowFor = (rows: number) => Math.min(compact ? 34 * K : 50, fixed ? (fixed - HEAD - 16) / Math.max(1, rows) : Infinity);
	const FONT = $derived.by(() => {
		if (!compact) return 14;
		// Settle on a size: smaller names make narrower blocks, so fewer rows, so room for a larger size again.
		let f = 13 * K, best = 10;
		for (let i = 0; i < 4; i++) {
			const fits = Math.max(10, Math.min(13 * K, (rowFor(layout(f).rows) - 4) * 0.5));
			if (fits >= f - 0.5) { best = Math.max(best, f); break; }
			best = Math.max(best, fits);
			f = (f + fits) / 2;
		}
		return best;
	});
	const blocks = $derived(layout(FONT));
	const ROW = $derived(rowFor(blocks.rows)); // px per row of blocks
	const BLOCK = $derived(Math.max(14, Math.min(compact ? 29 * K : 42, ROW - 4))); // px a block is high
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
	// Only a change of what is pointed at restarts the pause, so moving within a column stays calm.
	let wantM: number | null | undefined;
	let wantD: number | null | undefined;
	function point(m: number | null, e: PointerEvent) {
		if (e.pointerType !== 'mouse' || pinned != null || m === wantM) return;
		wantM = m;
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (hover !== m) {
				dayHover = null;
				wantD = undefined;
			}
			hover = m;
		}, m == null ? 250 : 90);
	}
	function pin(m: number | null) {
		clearTimeout(timer);
		clearTimeout(dayTimer);
		hover = null;
		dayHover = null;
		wantM = wantD = undefined;
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
		if (e.pointerType !== 'mouse' || day != null || d === wantD) return;
		wantD = d;
		clearTimeout(dayTimer);
		dayTimer = setTimeout(() => (dayHover = d), d == null ? 250 : 90);
	}
	const dayParts = $derived.by(() => {
		if (dm == null) return null;
		const sp = spans[dm];
		if (wide && day != null) return partSpans(sp.width, sp.days, day - 1, 1 - ((sp.days - 1) * dstrip) / sp.width);
		// Only in a month over the full width does the day pointed at widen; in a month pointed at it just lights up.
		const open = day ?? (pinned != null ? dayHover : null);
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
	/** The whole column counts, also below the bar and over the blocks: find the month and day under the mouse. */
	function onmove(e: PointerEvent) {
		if (e.pointerType !== 'mouse' || !wrapEl) return;
		const px = e.clientX - wrapEl.getBoundingClientRect().left;
		if (pinned == null) {
			const sp = spans.find((s) => px >= s.left && px < s.left + s.width);
			point(sp ? sp.m : null, e);
		}
		if (dm != null && day == null && dayParts) {
			const rel = px - spans[dm].left;
			const i = dayParts.findIndex((p) => rel >= p.left && rel < p.left + p.width);
			pointDay(i >= 0 ? i + 1 : null, e);
		}
	}
	function back() {
		if (day != null) day = null;
		else pin(null);
	}

	function openMoment(o: Occurrence) {
		if (!o.moment.virtual) ui.editor = { id: o.moment.id, y: o.y, m: o.m, d: o.d };
		else if (o.m != null && o.d != null) ui.day = { y, m: o.m, d: o.d };
	}

	/* ---------- the scroll wheel ---------- */
	// Ctrl + wheel (or a pinch on a touchpad) zooms in and out around the mouse: all years, a year, a month,
	// a day. Shift + wheel (or a sideways swipe inside a month or day) goes to the one before or after.
	let root = $state<HTMLDivElement>();
	let acc = 0;
	let rest = 0;
	function under(e: WheelEvent): number {
		return wrapEl ? e.clientX - wrapEl.getBoundingClientRect().left : 0;
	}
	function zoom(dir: 1 | -1, e: WheelEvent) {
		const px = under(e);
		if (ui.allYears) {
			if (dir > 0) {
				const i = yearParts.findIndex((p) => px >= p.left && px < p.left + p.width);
				if (i >= 0) pickYear(years[i].y);
			}
		} else if (pinned == null) {
			if (dir < 0) ui.allYears = true;
			else {
				const sp = spans.find((s) => px >= s.left && px < s.left + s.width);
				if (sp) pin(sp.m);
			}
		} else if (day == null) {
			if (dir < 0) pin(null);
			else if (dayParts) {
				const rel = px - spans[pinned].left;
				const i = dayParts.findIndex((p) => rel >= p.left && rel < p.left + p.width);
				if (i >= 0) openDay(i + 1);
			}
		} else if (dir < 0) day = null;
	}
	function step(dir: 1 | -1) {
		if (ui.allYears) return;
		if (day != null) stepDay(dir);
		else if (pinned != null) {
			const m = pinned + dir;
			if (m >= 0 && m <= 11) pin(m);
		} else app.goTo(app.idx + dir);
	}
	function onwheel(e: WheelEvent) {
		const sideways = e.shiftKey || (Math.abs(e.deltaX) > Math.abs(e.deltaY) && (pinned != null || ui.allYears));
		if (!e.ctrlKey && !sideways) return;
		e.preventDefault();
		const now = performance.now();
		if (now < rest) return;
		acc += e.ctrlKey ? e.deltaY : e.deltaX || e.deltaY;
		if (Math.abs(acc) < (e.ctrlKey ? 30 : 50)) return;
		const dir = acc > 0 ? 1 : -1;
		acc = 0;
		rest = now + 380; // one step per gesture, however many events a touchpad sends
		if (e.ctrlKey) zoom(dir > 0 ? -1 : 1, e);
		else step(dir);
	}
	$effect(() => {
		if (!root || compact) return;
		// Not passive: Ctrl + wheel would otherwise zoom the whole page.
		root.addEventListener('wheel', onwheel, { passive: false });
		return () => root?.removeEventListener('wheel', onwheel);
	});
</script>

<svelte:window bind:innerWidth={win} bind:innerHeight={vh} onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (ui.allYears) ui.allYears = false;
		else if (pinned != null) back();
	}} />

<div class="root" bind:this={root}>
{#if ui.allYears && !compact}
	<!-- Zoomed out: the years as columns, the moments of all of them on the line. A click on a year goes into it. -->
	<div
		bind:this={wrapEl}
		bind:clientWidth={screen}
		class="all"
		style:height="{Math.max(fill, 16 + Math.max(3, allBlocks.rows) * 32)}px"
		role="group"
		aria-label="Alle jaren"
		onpointerleave={() => (ui.yearHover = null)}
	>
		{#each years as yy, i (yy.y)}
			<button
				class="ycol"
				class:pointed={ui.yearHover === yy.y}
				style:left="{yearParts[i]?.left ?? 0}px"
				style:width="{yearParts[i]?.width ?? 0}px"
				aria-label="Naar {yy.y}"
				onpointerenter={() => (ui.yearHover = yy.y)}
				onclick={() => pickYear(yy.y)}
			></button>
		{/each}
		{#if app.now.y >= app.scope.from && app.now.y <= app.scope.to}
			<div class="today" style:left="{xAll(yearPos(app.now))}px" style:top="0" aria-hidden="true"></div>
		{/if}
		{#each allBlocks.list as b, i (b.o.moment.id + i)}
			<button
				class="block one"
				style:left="{b.left}px"
				style:width="{b.w}px"
				style:top="{10 + b.row * 32}px"
				style:height="27px"
				title="{b.o.moment.title} · {whenLabel(b.o)}{b.o.end && b.o.end.y !== b.o.y ? '' : ` ${b.o.y}`}"
				onpointerenter={() => (ui.yearHover = b.o.y)}
				onclick={() => openMoment(b.o)}
			>
				<span class="days" style:left="{b.from - b.left}px" style:width="{b.days}px" aria-hidden="true"></span>
				<span class="l1"><span class="e">{b.o.moment.emoji}</span> <span class="t">{b.o.moment.title}</span></span>
			</button>
		{/each}
	</div>
{:else}
<div bind:clientWidth={screen} class="scroll" bind:this={scroller}>
	<div
		bind:this={wrapEl}
		class="wrap"
		style:width="{full}px"
		style:height="{height}px"
		class:compact
		class:focusing={!!focus}
		style:--head="{HEAD}px"
		style:--numrow="{ROWH}px"
		style:--k={K}
		style:--fs="{FONT}px"
		role="group"
		aria-label="Het jaar {y}, maand voor maand"
		onpointermove={onmove}
		onpointerleave={(e) => { point(null, e); pointDay(null, e); }}
	>
		{#each spans as sp (sp.m)}
			<div class="col" class:open={open === sp.m} class:days={dm === sp.m} class:pointed={hover === sp.m && pinned == null && !compact} style:left="{sp.left}px" style:width="{sp.width}px" style:--s="var(--{season(sp.m)})" style:--day="{sp.width / sp.days}px" aria-hidden="true"></div>
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
				<span class="name"><b>{String(sp.m + 1).padStart(2, '0')}</b> {compact && sp.width < 150 * K ? MONTHS_SHORT[sp.m] : MONTHS[sp.m]}</span>
				{#if open === sp.m && dm !== sp.m}
					<span class="nums" aria-hidden="true">
						{#each { length: sp.days } as _, d (d)}<span class:we={[0, 6].includes(new Date(y, sp.m, d + 1).getDay())}>{sp.width / sp.days >= 15 * K || d % 2 === 0 ? d + 1 : ''}</span>{/each}
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
						<button class="dn" aria-expanded="true" aria-label="{WEEKDAYS[new Date(y, sp.m, i + 1).getDay()]} {i + 1} {MONTHS[sp.m]}, terug naar heel {MONTHS[sp.m]}" onclick={() => (day = null)}><b>{i + 1}</b> {WEEKDAYS[new Date(y, sp.m, i + 1).getDay()]}</button>
						<button class="stp" aria-label="Volgende dag" onclick={() => stepDay(1)}><Icon name="next" /></button>
					</div>
					<div class="dayv" style:left="{box.left}px" style:width="{box.width}px">
						{#key day}<DayLine {y} m={sp.m} d={day} {occs} onopen={(o) => (onpick ? onpick(o) : openMoment(o))} />{/key}
					</div>
				{:else}
					<button
						class="dayc"
						class:we={[0, 6].includes(new Date(y, sp.m, i + 1).getDay())}
						class:thin={box.width < 12}
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
					><span>{dayLabel(y, sp.m, i + 1, box.width)}</span></button>
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
{/if}
</div>

<style>
	/* All the years: a column each, the moments of all of them on top. */
	.all { position: relative; overflow: hidden; --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); animation: fade 0.3s both; }
	.ycol { position: absolute; top: 0; bottom: 0; padding: 0; border: none; border-left: 1px solid var(--line); border-radius: 0; background: transparent; cursor: zoom-in; transition: background-color 0.15s; }
	.ycol.pointed { background: var(--hover); }
	.block.one { padding: 2px 10px 0; border-radius: 14px; }
	.block.one .l1 { font-size: 13px; }
	/* A real box, not display: contents: the browser only sends the wheel to elements with a box. */
	.root { display: block; }
	.scroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
	.wrap { position: relative; --ease: 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	/* A month is a column: a line on its left, on top a bar in the colour of its season, the only colour here. */
	.col { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line); transition: left var(--ease), width var(--ease); pointer-events: none; }
	/* The month pointed at is lit up over its whole column, not only its bar. */
	.col.pointed { background-color: var(--hover); }
	.col.open:not(.days) { background: repeating-linear-gradient(to right, transparent 0 calc(var(--day) - 1px), color-mix(in srgb, var(--line) 70%, transparent) calc(var(--day) - 1px) var(--day)); }
	/* The colour is only on the band with the month's name; the days below it have none. */
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
	.dayc { position: absolute; top: calc(var(--head) - var(--numrow)); bottom: 0; z-index: 1; padding: 0; border: none; border-radius: 0; background: transparent; font: inherit; color: color-mix(in srgb, var(--ink) 65%, transparent); cursor: zoom-in; transition: left var(--ease), width var(--ease), background-color 0.15s; }
	.dayc.thin span { display: none; }
	.dayc { border-left: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
	.dayc.thin { border-left-color: color-mix(in srgb, var(--line) 35%, transparent); }
	.dayc.pointed { background: var(--hover); }
	.dayc.pointed span { color: var(--ink); }
	.dayc.thin.busy::after { content: ''; position: absolute; top: calc(var(--numrow) / 2 - 2px); left: 50%; width: 4px; height: 4px; margin-left: -2px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 70%, transparent); }
	/* The day zoomed into, as wide as the month less a thin strip for each other day. */
	/* Above the day zoomed into, its date stays in the bar, with the name of the day before it. */
	.daylbl { position: absolute; z-index: 4; top: calc(var(--head) - var(--numrow)); height: var(--numrow); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; color: var(--ink); white-space: nowrap; overflow: hidden; transition: left var(--ease), width var(--ease); }
	/* The day zoomed into, like a month over the full width: click it again to fold it back. */
	.daylbl .dn { min-width: 0; overflow: hidden; text-overflow: ellipsis; padding: 2px 10px; border: none; border-radius: 999px; background: transparent; font: inherit; color: inherit; cursor: zoom-out; transition: background-color 0.15s; }
	@media (hover: hover) { .daylbl .dn:hover { background: var(--hover); } }
	.stp { flex: 0 0 auto; width: 24px; height: 24px; display: grid; place-items: center; padding: 0; border: none; border-radius: 50%; background: color-mix(in srgb, var(--bg) 55%, transparent); color: var(--ink); cursor: pointer; transition: background-color 0.15s; }
	.stp :global(svg) { width: 14px; height: 14px; }
	@media (hover: hover) { .stp:hover { background: var(--bg); } }
	.daylbl b { font-weight: 800; font-variant-numeric: tabular-nums; }
	.dayv { position: absolute; top: var(--head); bottom: 0; z-index: 3; overflow: hidden; transition: left var(--ease), width var(--ease); }
	.dayc span { position: absolute; top: 0; left: 0; right: 0; height: var(--numrow); line-height: var(--numrow); text-align: center; white-space: nowrap; overflow: hidden; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
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
	.compact .block { padding: 2px calc(10px * var(--k)) 0; border-radius: calc(14px * var(--k)); }
	.compact .block { justify-content: center; padding-top: 0; }
	.compact .block .l1 { font-size: var(--fs); line-height: 1.15; }
	.compact .block .days { height: calc(4px * var(--k)); }
	.compact .month .name { font-size: calc(13px * var(--k)); top: calc((var(--head) - var(--numrow)) / 2 - 0.65em); }
	.compact .nums span { font-size: calc(11px * var(--k)); }
	.compact .nums { bottom: calc(var(--numrow) / 2 - 0.6em * var(--k)); }
	.focusing .block { opacity: 0.45; transition: left var(--ease), width var(--ease), top var(--ease), filter 0.15s, opacity 0.4s, box-shadow 0.4s; }
	.focusing .block.on { opacity: 1; z-index: 3; box-shadow: 0 0 0 2px var(--ink), 0 6px 18px rgba(10, 20, 30, 0.18); }
	@media (prefers-reduced-motion: reduce) {
		.wrap { --ease: 0s linear; }
		.nums { animation: none; }
	}
</style>
