<script lang="ts">
	// The twelve months as tabs, with the days of the chosen month on one row below.
	// Single moments show on their day, periods as one bar under the days.
	import { tick } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, MONTHS, MONTHS_SHORT, season, SEASON_NAMES, WEEKDAYS_SHORT } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { momentsLabel, monthBars, monthGrid, monthOccurrences } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let {
		y,
		occs,
		focus = null,
		onday,
		onmonth
	}: {
		y: number;
		occs: Occurrence[];
		/** Presenting: the month (and day) of the moment on screen. Its tab is chosen and the day marked. */
		focus?: { m: number; d: number | null } | null;
		/** Replace what choosing a day or a month does (the presentation jumps there). */
		onday?: (m: number, d: number) => void;
		onmonth?: (m: number) => void;
	} = $props();

	/** Tab chosen by a click; starts on this month in the current year, else on January. */
	let picked = $state(0);
	$effect.pre(() => {
		picked = y === app.now.y ? app.now.m : 0;
	});
	/** Tab under the mouse; it shows while you point at it. */
	let hover = $state<number | null>(null);
	const m = $derived(hover ?? focus?.m ?? picked);

	const tabs = $derived(
		MONTHS.map((name, i) => ({ i, name, s: season(i), count: monthOccurrences(occs, y, i).filter((o) => !o.moment.virtual).length }))
	);
	const grid = $derived(monthGrid(occs, y, m, app.now));
	const bars = $derived(monthBars(occs, y, m));
	const lanes = $derived(bars.reduce((n, b) => Math.max(n, b.lane + 1), 0));
	const age = $derived(ageLabel(app.tl, y, m, null));

	/** Day under the mouse or keyboard, described in the line under the days. */
	let dayHover = $state<number | null>(null);
	const shownDay = $derived(dayHover ?? (focus?.m === m ? focus.d : null));
	const detail = $derived(shownDay == null ? null : grid.days[shownDay - 1]);

	function choose(i: number) {
		hover = null;
		if (onmonth) onmonth(i);
		else picked = i;
	}
	function onkeydown(e: KeyboardEvent) {
		const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!d) return;
		e.preventDefault();
		e.stopPropagation();
		const n = (m + d + 12) % 12;
		choose(n);
		(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus();
	}
	function openDay(d: number) {
		if (onday) onday(m, d);
		else ui.day = { y, m, d };
	}
	const singles = (here: Occurrence[]) => here.filter((o) => !o.end);

	// When the row of days scrolls (a phone), keep the marked day or today in view.
	let scroller: HTMLDivElement | undefined = $state();
	$effect(() => {
		void m;
		void focus;
		tick().then(() => {
			if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
			const el = scroller.querySelector<HTMLElement>('.day.sel') ?? scroller.querySelector<HTMLElement>('.day.today');
			const left = el ? el.offsetLeft - scroller.clientWidth / 2 + el.offsetWidth / 2 : 0;
			scroller.scrollTo({ left: Math.max(0, left) });
		});
	});
</script>

<div class="wrap" role="group" aria-label="Maanden en dagen van {y}" style:--s="var(--{season(m)})" onpointerleave={(e) => e.pointerType === 'mouse' && (hover = null)}>
	<div class="tabs" role="tablist" aria-label="Maanden van {y}" tabindex="-1" {onkeydown}>
		{#each tabs as t (t.i)}
			<button
				role="tab"
				class="tab"
				class:on={t.i === m}
				class:has={t.count > 0}
				class:cur={y === app.now.y && t.i === app.now.m}
				style:--t="var(--{t.s})"
				aria-selected={t.i === m}
				aria-controls="days-{y}"
				aria-label="{t.name} {y}{t.count ? ', ' + momentsLabel(t.count) : ''}"
				tabindex={t.i === m ? 0 : -1}
				onpointerenter={(e) => e.pointerType === 'mouse' && (hover = t.i)}
				onclick={() => choose(t.i)}
			>
				<span class="nm">{MONTHS_SHORT[t.i]}</span>
				<span class="c">{t.count || ''}</span>
			</button>
		{/each}
	</div>

	<div class="panel" role="tabpanel" id="days-{y}" aria-label="{MONTHS[m]} {y}">
		<div class="head">
			<b>{MONTHS[m]}</b>
			<span>{SEASON_NAMES[season(m)]}{age && age !== app.kind.before ? ` · ${age}` : ''}{tabs[m].count ? ` · ${momentsLabel(tabs[m].count)}` : ''}</span>
			{#if !onday}<button class="zoom" onclick={() => app.enterMonth(y, m)}>Hele maand bekijken</button>{/if}
		</div>

		<div class="scroll" bind:this={scroller}>
			<div class="days" role="group" aria-label="Dagen van {MONTHS[m]}" style:--n={grid.days.length} onpointerleave={() => (dayHover = null)}>
				{#each grid.days as day (day.d)}
					{@const one = singles(day.here)}
					<button
						class="day"
						class:we={day.weekend}
						class:mon={day.wd === 1 && day.d > 1}
						class:today={day.today}
						class:sel={focus?.m === m && focus.d === day.d}
						class:has={one.length > 0}
						style:grid-column={day.d}
						aria-current={focus?.m === m && focus.d === day.d ? 'date' : undefined}
						aria-label="{labelFull(y, m, day.d)}{day.here.length ? ', ' + day.here.map((o) => o.moment.title).join(', ') : ''}"
						onpointerenter={() => (dayHover = day.d)}
						onfocus={() => (dayHover = day.d)}
						onblur={() => (dayHover = null)}
						onclick={() => openDay(day.d)}
					>
						<span class="wd">{WEEKDAYS_SHORT[day.wd][0]}</span>
						<span class="n">{day.d}</span>
						<span class="e" aria-hidden="true">{one[0]?.moment.emoji ?? ''}</span>
						{#if one.length > 1}<span class="plus" aria-hidden="true">+{one.length - 1}</span>{/if}
					</button>
				{/each}
				{#each bars as b (b.o.moment.id)}
					<button
						class="bar"
						class:before={b.before}
						class:after={b.after}
						style:grid-column="{b.from} / {b.to + 1}"
						style:grid-row={4 + b.lane}
						style:--c={app.catOf(b.o.moment.categoryId).color}
						aria-label="{b.o.moment.title}, {labelFull(y, m, b.from)} tot en met {labelFull(y, m, b.to)}"
						onclick={() => openDay(b.from)}
					><span>{b.o.moment.emoji} {b.o.moment.title}</span></button>
				{/each}
				{#if !lanes}<span class="nolane" aria-hidden="true"></span>{/if}
			</div>
		</div>

		<p class="detail" aria-live="polite">
			{#if detail}
				<span class="dd">{labelFull(y, m, detail.d)}</span>
				{#each detail.here as o (o.moment.id)}<span class="it">{o.moment.emoji} {o.moment.title}</span>{:else}<span class="muted">Nog niets op deze dag</span>{/each}
			{:else}
				<span class="muted">{app.canEdit && !onday ? 'Tik op een dag om hem te bekijken of iets toe te voegen' : 'Tik op een dag om hem te bekijken'}</span>
			{/if}
		</p>
	</div>
</div>

<style>
	.wrap { margin-bottom: 6px; }

	/* Tabs: twelve equal months in their season colour; the chosen one joins the panel below. */
	.tabs { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; position: relative; z-index: 1; }
	.tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 7px 0 6px; border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0;
		background: color-mix(in srgb, var(--t) 22%, var(--bg)); box-shadow: inset 0 -4px 0 var(--t); font: inherit; color: var(--ink); cursor: pointer; min-width: 0; }
	.tab.has { background: color-mix(in srgb, var(--t) 45%, var(--bg)); }
	.tab.cur .nm { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
	.tab.on { background: var(--surface); border-color: var(--line); box-shadow: inset 0 4px 0 var(--t); margin-bottom: -1px; padding-bottom: 7px; }
	.nm { font-size: 12px; font-weight: 600; }
	.c { font-size: 12px; font-weight: 800; line-height: 1; min-height: 12px; }

	.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 0 0 12px 12px; padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 10px; }
	.head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; }
	.head b { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; text-transform: capitalize; }
	.head span { font-size: 13px; color: var(--muted); }
	.zoom { margin-left: auto; border: none; background: transparent; padding: 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer; }

	/* The days on one row; on a narrow screen the row scrolls sideways. */
	.scroll { position: relative; overflow-x: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; margin: 0 -4px; padding: 0 4px 2px; }
	.days { display: grid; grid-template-columns: repeat(var(--n), minmax(22px, 1fr)); grid-auto-rows: auto; row-gap: 3px; min-width: calc(var(--n) * 22px); }
	.day { grid-row: 1 / 4; display: grid; grid-template-rows: subgrid; justify-items: center; align-items: center; gap: 2px; padding: 4px 0 6px; border: none; border-radius: 6px; background: transparent; font: inherit; color: var(--ink); cursor: pointer; }
	.day.we { background: color-mix(in srgb, var(--s) 10%, transparent); }
	.day.mon { box-shadow: inset 1px 0 0 var(--line); border-radius: 0 6px 6px 0; }
	.day:hover, .day:focus-visible { background: color-mix(in srgb, var(--s) 22%, transparent); }
	.wd { font-size: 10px; color: var(--muted); text-transform: uppercase; }
	.n { font-size: 13px; font-weight: 700; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; font-variant-numeric: tabular-nums; }
	.day.has .n { background: color-mix(in srgb, var(--s) 30%, transparent); }
	.day.today .n { box-shadow: inset 0 0 0 2px var(--accent); }
	.day.sel .n { background: var(--ink); color: var(--surface); }
	.e { font-size: 16px; line-height: 1; min-height: 18px; }
	.plus { position: absolute; font-size: 9px; color: var(--muted); }
	.day { position: relative; }
	.plus { bottom: 0; }

	.bar { height: 20px; margin: 0 1px; border: none; border-radius: 10px; background: color-mix(in srgb, var(--c) 85%, var(--surface)); color: #fff; font: inherit; font-size: 12px; font-weight: 600; text-align: left; padding: 0 8px; overflow: hidden; cursor: pointer; min-width: 0; }
	.bar span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.bar.before { border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: 0; }
	.bar.after { border-top-right-radius: 0; border-bottom-right-radius: 0; margin-right: 0; }
	.nolane { grid-row: 4; grid-column: 1 / -1; height: 0; }

	.detail { margin: 0; min-height: 20px; display: flex; flex-wrap: wrap; gap: 2px 14px; font-size: 14px; align-items: baseline; }
	.dd { font-weight: 700; }
	.dd::first-letter { text-transform: uppercase; }
	.it { font-weight: 600; }
	.muted { color: var(--muted); font-size: 13px; }

	@media (max-width: 640px) {
		.nm { font-size: 10px; }
		.tab { padding: 6px 0 5px; }
	}
	@media (min-width: 1200px) {
		.nm { font-size: 14px; }
		.c { font-size: 14px; }
		.tab { padding: 9px 0 8px; }
		.n { font-size: 14px; width: 28px; height: 28px; }
		.e { font-size: 18px; }
	}

	/* Hover */
	.tab, .bar, .zoom, .day { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.tab:hover:not(.on) { filter: var(--hover-filter); }
		.bar:hover { filter: var(--hover-filter); }
		.zoom:hover { text-decoration: underline; text-underline-offset: 3px; }
	}
</style>
