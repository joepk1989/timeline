<script lang="ts">
	// One day, zoomed in from the Jaarlijn: the arc of the sun from midnight to midnight with the hours below it.
	// Moments with a time lie on their hours as blocks; a click on an hour opens it up to its minutes, as a
	// month opens to its days. Moments without a time take the whole day and are listed below. A moment that
	// runs on from the day before or into the next is cut off square at that side. On today the sun stands
	// at the time it is, and the hours gone by are shaded.
	import { onDestroy } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { dayNumber, formatTime, MONTHS, MONTHS_SHORT, WEEKDAYS } from '$lib/domain/dates';
	import { dayPlan, packRows, partSpans, partX, spanOf, sunHeight } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';

	let { y, m, d, occs, onopen }: { y: number; m: number; d: number; occs: Occurrence[]; onopen: (o: Occurrence) => void } = $props();

	const AXIS = 30; // the hours
	let w = $state(0);
	const phone = $derived(w > 0 && w <= 640);
	const SKY = $derived(phone ? 64 : 96); // the arc of the sun, lower on a phone
	/** The hour opened up to its minutes, if any. */
	let openH = $state<number | null>(null);
	const hours = $derived(w ? partSpans(w, 24, openH, openH == null ? 1 / 24 : phone ? 0.72 : 0.45) : []);
	/** Where hour `h` (fractional) of the day is, in px. */
	const x = (h: number) => (hours.length ? partX(hours, Math.max(0, Math.min(24, h))) : (h / 24) * w);
	/** The time at `px`, rounded to `step` minutes. */
	function timeAt(px: number, step: number): number {
		const k = Math.max(0, hours.findIndex((p) => px < p.left + p.width));
		const p = hours[k] ?? { left: 0, width: w / 24 };
		const min = (k + Math.max(0, Math.min(1, (px - p.left) / p.width))) * 60;
		return Math.min(23 * 60 + 59, Math.round(min / step) * step);
	}
	const arcY = (h: number) => SKY - 14 - sunHeight(h) * (SKY - 40);
	const curve = $derived(w ? Array.from({ length: 24 * 12 + 1 }, (_, i) => `${x(i / 12).toFixed(1)},${arcY(i / 12).toFixed(1)}`).join(' L') : '');
	const plan = $derived(dayPlan(occs, y, m, d));
	const weekday = $derived(WEEKDAYS[new Date(y, m, d).getDay()]);

	// Hour labels as room allows, and the minutes inside the hour opened up.
	// Narrow hours show every third (or sixth) one, running over their neighbours.
	const hourLabel = (h: number, room: number) =>
		room >= 44 ? `${String(h).padStart(2, '0')}:00` : room >= 18 || (room >= 5 && h % 3 === 0) || h % 6 === 0 ? String(h) : '';
	const minuteStep = $derived(openH == null ? 0 : hours[openH].width / 12 >= 34 ? 5 : hours[openH].width / 4 >= 34 ? 15 : 30);

	// Blocks for the moments with a time: at least as wide as their text, on rows of their own when they would touch.
	let measure: CanvasRenderingContext2D | null = null;
	const widths = new Map<string, number>();
	function textWidth(text: string, font: string): number {
		const key = font + text;
		let v = widths.get(key);
		if (v == null) {
			measure ??= document.createElement('canvas').getContext('2d');
			if (measure) measure.font = `${font} system-ui, sans-serif`;
			v = measure ? measure.measureText(text).width : text.length * 8;
			widths.set(key, v);
		}
		return v;
	}
	const ROW = 50;
	const blocks = $derived.by(() => {
		const boxes = plan.timed.map((t) => {
			const a = x(t.from / 60), b = x(t.to / 60);
			const text = Math.max(textWidth(`${t.o.moment.emoji} ${t.o.moment.title}`, '700 14px'), textWidth(t.label, '12px') + 14) + 26;
			const width = Math.min(Math.max(b - a, text), Math.max(w - 8, 40));
			const left = Math.max(0, Math.min(a, w - width));
			return { left, right: left + width, t, start: a, end: b };
		});
		const { rows, count } = packRows(boxes, 4);
		return { list: boxes.map((bx, i) => ({ ...bx, row: rows[i] })), count };
	});
	const laneH = $derived(plan.timed.length ? blocks.count * ROW + 16 : 0);

	// The clock, for today only.
	let clock = $state(new Date());
	const tick = setInterval(() => (clock = new Date()), 30_000);
	onDestroy(() => clearInterval(tick));
	const isToday = $derived(app.now.y === y && app.now.m === m && app.now.d === d);
	const nowH = $derived(clock.getHours() + clock.getMinutes() / 60);
	const nowLabel = $derived(`${clock.getHours()}:${String(clock.getMinutes()).padStart(2, '0')}`);
	const sunH = $derived(isToday ? nowH : 12);

	/** Does a moment run on from the day before, or into the next? */
	const short = (t: { m: number; d: number }) => `${t.d} ${MONTHS_SHORT[t.m]}`;
	const n = dayNumber;
	function edges(o: Occurrence) {
		const { from, to } = spanOf(o);
		const here = n(y, m, d);
		return { before: n(from.y, from.m, from.d) < here, after: n(to.y, to.m, to.d) > here, from: short(from), to: short(to) };
	}

	/** Adding at a time: a double click on an empty spot of the hours. */
	function addAt(e: MouseEvent) {
		if (!app.canEdit || (e.target as HTMLElement).closest('button')) return;
		const lane = e.currentTarget as HTMLElement;
		const px = e.clientX - lane.getBoundingClientRect().left;
		ui.editor = { id: null, y, m, d, time: formatTime(timeAt(px, openH != null ? 5 : 15)) };
	}
	// Esc folds an hour back first, before the day itself.
	function onkey(e: KeyboardEvent) {
		if (e.key !== 'Escape' || openH == null || document.querySelector('dialog[open]')) return;
		openH = null;
		e.stopImmediatePropagation();
	}
</script>

<svelte:window onkeydowncapture={onkey} />

<div class="day" style:--sky="{SKY}px" style:--axis="{AXIS}px" bind:clientWidth={w} role="region" aria-label="{weekday} {d} {MONTHS[m]} {y}">
	<div class="sky" aria-hidden="true">
		<svg width={w} height={SKY}>
			<path class="above" d="M0,0 L{curve} L{w},0 Z" />
			<path class="line" d="M{curve}" />
		</svg>
		<span class="moon" style:left="{x(0.9)}px" style:top="{arcY(0.9)}px"><Icon name="moon" /></span>
		<span class="moon" style:left="{x(23.1)}px" style:top="{arcY(23.1)}px"><Icon name="moon" /></span>
		<span class="sun" style:left="{x(sunH)}px" style:top="{arcY(sunH)}px"></span>
	</div>
	<!-- The hours: a click on one opens it up to its minutes, a click on the open one folds it back. -->
	<div class="axis" role="group" aria-label="Uren">
		{#each hours as p, h (h)}
			<button
				class="hc"
				class:open={openH === h}
				style:left="{p.left}px"
				style:width="{p.width}px"
				aria-expanded={openH === h}
				aria-label={openH === h ? `${h}:00 tot ${h + 1}:00, terug naar de hele dag` : `${h}:00 tot ${h + 1}:00 openklappen`}
				onclick={() => (openH = openH === h ? null : h)}
			>{#if openH === h}<b>{String(h).padStart(2, '0')}:00</b>{:else}{hourLabel(h, p.width)}{/if}</button>
		{/each}
		{#if openH != null && minuteStep}
			{#each { length: 60 / minuteStep - 1 } as _, i (i)}
				{@const at = x(openH + ((i + 1) * minuteStep) / 60)}
				<!-- Not over the hour's own label at its start. -->
				{#if at - hours[openH].left >= 58}<span class="ml" style:left="{at}px">:{String((i + 1) * minuteStep).padStart(2, '0')}</span>{/if}
			{/each}
		{/if}
		{#if isToday}<span class="now" style:left="{x(nowH)}px">{nowLabel}</span>{/if}
	</div>

	<div class="body">
		{#each { length: 23 } as _, i (i)}
			<div class="hr" class:major={(i + 1) % 3 === 0} style:left="{x(i + 1)}px"></div>
		{/each}
		{#if openH != null && minuteStep}
			{#each { length: 60 / minuteStep - 1 } as _, i (i)}<div class="hr min" style:left="{x(openH + ((i + 1) * minuteStep) / 60)}px"></div>{/each}
		{/if}
		{#if isToday}
			<div class="gone" style:width="{x(nowH)}px"></div>
			<div class="nowline" style:left="{x(nowH)}px"></div>
		{/if}

		<div class="list">
			<!-- The moments with a time, on their hours. A double click on an empty spot adds one at that time. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="lane" style:height="{Math.max(laneH, plan.timed.length ? 0 : 44)}px" ondblclick={addAt}>
				{#each blocks.list as bx, i (bx.t.o.moment.id + i)}
					{@const mo = bx.t.o.moment}
					<button
						class="blk"
						class:before={bx.t.before}
						class:after={bx.t.after}
						style:left="{bx.left}px"
						style:width="{bx.right - bx.left}px"
						style:top="{8 + bx.row * ROW}px"
						style:animation-delay="{80 + i * 40}ms"
						title="{mo.title} · {bx.t.label}"
						onclick={() => onopen(bx.t.o)}
					>
						<span class="span" style:left="{bx.start - bx.left}px" style:width="{Math.max(2, bx.end - bx.start)}px" aria-hidden="true"></span>
						<span class="l1">{mo.emoji} <b>{mo.title}</b></span>
						<span class="l2">{bx.t.label}</span>
					</button>
				{:else}
					{#if !plan.allDay.length}<p class="empty">Niets op {weekday} {d} {MONTHS[m]}.</p>{/if}
				{/each}
			</div>

			{#if plan.allDay.length}
				<h4 class="sh">Hele dag</h4>
				<div class="cards">
					{#each plan.allDay as o, i (o.moment.id + i)}
						{@const mo = o.moment}
						{@const e = edges(o)}
						<button class="bar" class:before={e.before} class:after={e.after} onclick={() => onopen(o)} style:animation-delay="{120 + i * 60}ms">
							{#if e.before}<span class="cont l" aria-hidden="true"><Icon name="back" />{e.from}</span>{/if}
							<span class="em" aria-hidden="true">{mo.emoji}</span>
							<span class="txt">
								<span class="ttl">{mo.title}</span>
								<span class="meta">{#if !mo.virtual}{app.catOf(mo.categoryId).name}{/if}{#if mo.note}{!mo.virtual ? ' · ' : ''}{mo.note}{/if}</span>
							</span>
							{#if mo.photos[0]}<span class="ph"><Photo path={mo.photos[0]} alt="" /></span>{/if}
							{#if e.after}<span class="cont r" aria-hidden="true">{e.to}<Icon name="next" /></span>{/if}
						</button>
					{/each}
				</div>
			{/if}
			{#if app.canEdit}
				<!-- Adding to this day: the date is filled in already. -->
				<button class="add" onclick={() => (ui.editor = { id: null, y, m, d })}><Icon name="plus" />Moment op {d} {MONTHS[m]}</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.day { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--bg); animation: fade 0.3s 0.12s ease both; }
	@keyframes fade { from { opacity: 0; } }

	/* The sky: a soft band above the arc of the sun, a thin line for the arc itself. */
	.sky { position: relative; flex: 0 0 var(--sky); }
	.sky svg { position: absolute; inset: 0; display: block; overflow: visible; }
	.sky .above { fill: color-mix(in srgb, var(--ink) 6%, transparent); }
	.sky .line { fill: none; stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 1.5; }
	.sun, .moon { position: absolute; transform: translate(-50%, -50%); }
	.sun { width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.45), 0 2px 10px rgba(10, 20, 30, 0.18); }
	.moon { color: #fff; filter: drop-shadow(0 1px 3px rgba(10, 20, 30, 0.25)); }
	.moon :global(svg) { fill: #fff; width: 20px; height: 20px; }

	/* The hours as columns you can open, the minutes in the open one, and the time now on today. */
	.axis { position: relative; flex: 0 0 var(--axis); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
	.hc { position: absolute; top: 0; bottom: 0; padding: 0; border: none; border-left: 1px solid color-mix(in srgb, var(--line) 70%, transparent); background: transparent; font: inherit; font-size: 11px; font-weight: 600;
		color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: visible; cursor: zoom-in; transition: left 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), width 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), background-color 0.15s; }
	.hc:first-child { border-left: none; }
	.hc.open { text-align: left; padding-left: 8px; color: var(--ink); cursor: zoom-out; background: color-mix(in srgb, var(--ink) 5%, transparent); }
	@media (hover: hover) { .hc:hover { background: var(--hover); color: var(--ink); } }
	.ml { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: 600; color: var(--muted); pointer-events: none; font-variant-numeric: tabular-nums; }
	.now { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 1; padding: 2px 8px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }

	/* The day: faint lines for the hours, and the moments as bars across all of it. */
	.body { position: relative; flex: 1 1 0; min-height: 0; }
	.hr { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid color-mix(in srgb, var(--ink) 4%, transparent); }
	.hr.major { border-left-color: color-mix(in srgb, var(--ink) 9%, transparent); }
	.hr.min { border-left-style: dashed; }
	.hr { transition: left 0.28s cubic-bezier(0.2, 0.7, 0.2, 1); }
	.gone { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--ink) 4%, transparent); }
	.nowline { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid var(--ink); margin-left: -1px; }
	.list { position: relative; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 0 0 90px; }
	/* The moments with a time: blocks on their hours, like those on the Jaarlijn. */
	.lane { position: relative; flex: 0 0 auto; }
	.blk { position: absolute; height: 42px; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 12px 0; border: none; border-radius: 21px; background: var(--surface);
		box-shadow: 0 0 0 1px var(--line) inset; font: inherit; color: var(--ink); text-align: left; cursor: pointer; overflow: hidden; animation: rise 0.35s ease both;
		transition: left 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), width 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), top 0.28s, filter 0.15s; }
	.blk.before { border-top-left-radius: 0; border-bottom-left-radius: 0; }
	.blk.after { border-top-right-radius: 0; border-bottom-right-radius: 0; }
	/* Its time marked along its top, as the days are on the Jaarlijn. */
	.blk .span { position: absolute; top: 0; height: 4px; border-radius: 0 0 3px 3px; background: color-mix(in srgb, var(--ink) 35%, transparent); transition: left 0.28s, width 0.28s; }
	.blk .l1, .blk .l2 { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.blk .l1 { font-size: 14px; line-height: 18px; }
	.blk .l2 { font-size: 12px; line-height: 15px; color: var(--muted); font-variant-numeric: tabular-nums; }
	@media (hover: hover) { .blk:hover { filter: var(--hover-filter); z-index: 1; } }
	.sh { margin: 6px 16px 0; font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
	.cards { display: flex; flex-direction: column; gap: 10px; padding: 0 16px; }
	.bar { position: relative; flex: 0 0 auto; display: flex; align-items: center; gap: 14px; min-height: 68px; padding: 10px 16px; border: none; border-radius: 14px; background: var(--surface); color: var(--ink);
		box-shadow: 0 1px 0 var(--line), 0 6px 18px rgba(10, 20, 30, 0.06); font: inherit; text-align: left; cursor: pointer; animation: rise 0.35s ease both; transition: filter 0.15s; }
	@keyframes rise { from { opacity: 0; transform: translateY(8px); } }
	/* A moment that runs on from the day before or into the next is cut off square at that side. */
	.bar.before { border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: -16px; padding-left: 12px; }
	.bar.after { border-top-right-radius: 0; border-bottom-right-radius: 0; margin-right: -16px; padding-right: 12px; }
	.cont { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 600; color: var(--muted); white-space: nowrap; }
	.cont :global(svg) { width: 14px; height: 14px; }
	.em { flex: 0 0 auto; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: var(--faint); font-size: 22px; }
	.txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.ttl { font-size: 17px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.meta { font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ph { flex: 0 0 auto; width: 72px; height: 50px; border-radius: 8px; overflow: hidden; }
	.ph :global(img) { display: block; width: 100%; height: 100%; object-fit: cover; }
	.empty { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--muted); pointer-events: none; }
	.add { flex: 0 0 auto; align-self: center; display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; padding: 10px 18px; border: 1px dashed color-mix(in srgb, var(--ink) 30%, transparent); border-radius: 999px;
		background: transparent; font: inherit; font-weight: 700; font-size: 14px; color: var(--ink); cursor: pointer; transition: background-color 0.15s, border-color 0.15s; }
	.add :global(svg) { width: 16px; height: 16px; }
	@media (hover: hover) { .add:hover { background: var(--hover); border-color: var(--muted); } }
	@media (hover: hover) { .bar:hover { filter: var(--hover-filter); } }
	@media (max-width: 640px) {
		.hc { font-size: 10px; }
		.ttl { font-size: 15px; }
		.em { width: 34px; height: 34px; font-size: 18px; }
		.ph { width: 52px; height: 40px; }
		.cont { font-size: 0; }
		/* On a phone the cards go almost edge to edge. */
		.list { gap: 8px; }
		.cards { gap: 8px; padding: 0 8px; }
		.sh { margin: 4px 8px 0; }
		.bar { gap: 10px; min-height: 60px; padding: 8px 12px; border-radius: 12px; }
		.bar.before { margin-left: -8px; padding-left: 12px; }
		.bar.after { margin-right: -8px; padding-right: 12px; }
	}
	@media (prefers-reduced-motion: reduce) { .day, .bar, .blk { animation: none; } .hc, .hr, .blk, .blk .span { transition: none; } }
</style>
