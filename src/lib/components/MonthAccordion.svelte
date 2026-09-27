<script lang="ts">
	// The twelve months of a year side by side. Hover a month (or tap it) and it folds open to
	// most of the width, with its days inline. Tap a day for what happened, or open the whole month.
	import { tick } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, MONTHS, MONTHS_SHORT, season, SEASON_NAMES, WEEKDAYS_SHORT } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { momentsLabel, monthGrid, monthOccurrences } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	type MonthGridT = ReturnType<typeof monthGrid>;

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();
	let open = $state<number | null>(null);
	$effect.pre(() => {
		// Start with this month open in the current year.
		open = y === app.now.y ? app.now.m : null;
	});

	const months = $derived(
		MONTHS.map((name, m) => {
			const here = monthOccurrences(occs, y, m);
			const real = here.filter((o) => !o.moment.virtual);
			return { m, name, s: season(m), count: real.length, emojis: [...new Set(here.map((o) => o.moment.emoji))].slice(0, 3) };
		})
	);
	/** Month under the mouse or keyboard focus; it wins over the one opened by a tap. */
	let hover = $state<number | null>(null);
	const active = $derived(hover ?? open);
	const grid = $derived(active == null ? null : monthGrid(occs, y, active, app.now));
	const age = $derived(active == null ? null : ageLabel(app.tl, y, active, null));

	async function toggle(m: number, head: HTMLElement) {
		open = active === m ? null : m;
		hover = null;
		// When the month opens inline its header button is hidden: move focus to the month title.
		await tick();
		if (open === m && !head.checkVisibility()) head.parentElement?.querySelector<HTMLElement>('.title')?.focus();
	}
</script>

{#snippet days(m: number, grid: MonthGridT)}
	<div class="body" style:--s="var(--{season(m)})">
		<button class="title" aria-expanded="true" aria-label="{MONTHS[m]} {y}. Dichtvouwen" onclick={() => { open = null; hover = null; }}>
			<b>{MONTHS[m]}</b><small>{SEASON_NAMES[season(m)]}{age && age !== app.kind.before ? ` · ${age}` : ''}{months[m].count ? ` · ${momentsLabel(months[m].count)}` : ''}</small>
		</button>
		<div class="days">
			{#each grid.days as day (day.d)}
				<button
					class="day"
					class:we={day.weekend}
					class:mon={day.wd === 1 && day.d > 1}
					class:has={day.here.length > 0}
					class:period={day.inPeriod}
					class:today={day.today}
					aria-label="{labelFull(y, m, day.d)}{day.here.length ? ', ' + day.here.map((o) => o.moment.title).join(', ') : ''}"
					onclick={() => (ui.day = { y, m, d: day.d })}
				>
					<span class="wd">{WEEKDAYS_SHORT[day.wd]}</span>
					<span class="n">{day.d}</span>
					<span class="es" aria-hidden="true">{#each day.here.slice(0, 3) as o (o.moment.id)}<span>{o.moment.emoji}</span>{/each}</span>
					<span class="det" aria-hidden="true">
						{#each day.here.slice(0, 3) as o (o.moment.id)}<span class="t">{o.moment.emoji} {o.moment.title}</span>{/each}
						{#if day.here.length > 3}<span class="more">+{day.here.length - 3} meer</span>{/if}
						{#if !day.here.length}<span class="more">Nog niets</span>{/if}
					</span>
					<span class="sbar" aria-hidden="true"></span>
				</button>
			{/each}
		</div>
					<button class="zoom" onclick={() => app.enterMonth(y, m)}>Hele maand bekijken</button>
				</div>
{/snippet}

<div class="wrap">
<div class="row" role="group" aria-label="Maanden van {y}" onpointerleave={(e) => e.pointerType === 'mouse' && (hover = null)}>
	{#each months as mo (mo.m)}
		<div
			class="col"
			class:open={active === mo.m}
			role="presentation"
			onpointerenter={(e) => e.pointerType === 'mouse' && (hover = mo.m)}
			class:has={mo.count > 0} class:cur={y === app.now.y && mo.m === app.now.m} style:--s="var(--{mo.s})">
			<button
				class="head"
				aria-expanded={active === mo.m}
				aria-label="{MONTHS[mo.m]} {y}{mo.count ? ', ' + momentsLabel(mo.count) : ''}. {active === mo.m ? 'Dichtvouwen' : 'Dagen tonen'}"
				onclick={(e) => toggle(mo.m, e.currentTarget)}
			>
				<span class="short">{MONTHS_SHORT[mo.m]}</span>
				<span class="c">{mo.count || ''}</span>
				<span class="es" aria-hidden="true">{#each mo.emojis as e (e)}<span>{e}</span>{/each}</span>
			</button>
			{#if active === mo.m && grid}<div class="inline">{@render days(mo.m, grid)}</div>{/if}
			<span class="bar" aria-hidden="true"></span>
		</div>
	{/each}
</div>
{#if active != null && grid}<div class="below">{@render days(active, grid)}</div>{/if}
</div>

<style>
	.wrap { container-type: inline-size; margin-bottom: 6px; }
	.row { display: flex; gap: 3px; align-items: stretch; overflow-x: auto; scrollbar-width: none; min-height: 64px; padding: 2px; }
	.row::-webkit-scrollbar { display: none; }
	.col { --s: var(--winter); flex: 1 1 0; min-width: 22px; position: relative; display: flex; flex-direction: column; border-radius: 7px; overflow: hidden;
		background: color-mix(in srgb, var(--s) 26%, var(--surface));
		transition: flex-grow 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), min-width 0.35s cubic-bezier(0.2, 0.7, 0.2, 1); }
	.col.has:not(.open) { background: var(--s); }
	.col.cur:not(.open) { outline: 2px solid var(--ink); outline-offset: 1px; }
	.col.open { background: var(--s); outline: 2px solid var(--ink); outline-offset: 1px; }
	.col.open .head { color: #fff; }
	.inline { display: none; }
	.below { margin-top: 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
	/* Wide enough: the month folds open in the row itself to about 80% (44 / (44 + 11)), the other months stay visible. */
	@container (min-width: 460px) {
		.col.open { flex-grow: 44; min-width: 0; background: var(--surface); outline: none; box-shadow: inset 0 0 0 1px var(--line); }
		.col.open .head { display: none; }
		.inline { display: block; padding-top: 4px; }
		.below { display: none; }
	}
	.bar { height: 5px; background: var(--s); flex: 0 0 auto; }

	.head { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 0 4px; border: none; background: transparent; font: inherit; color: var(--ink); cursor: pointer; min-width: 0; }
	.col.has:not(.open) .head { color: #fff; }
	.short { font-size: 11px; }
	.c { font-size: 12px; font-weight: 800; line-height: 1; min-height: 12px; }
	.es { display: flex; flex-direction: column; align-items: center; font-size: 13px; line-height: 1.2; }
	.title { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 2px 0; border: none; background: transparent; font: inherit; color: var(--ink); text-align: left; cursor: pointer; }
	.title b { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; text-transform: capitalize; line-height: 1.1; }
	.title small { font-size: 12px; color: var(--muted); }

	.body { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; animation: fade 0.25s 0.2s both; }
	@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
	/* The days of the open month on one row. Point at a day (or focus it) and it widens to show its moments. */
	.days { display: flex; gap: 2px; height: 150px; overflow-x: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; padding-bottom: 2px; }
	.day { flex: 1 1 0; min-width: 26px; position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 0 0; border: 1px solid var(--line); border-radius: 7px; background: var(--bg); font: inherit; color: var(--ink); cursor: pointer; overflow: hidden; text-align: left;
		transition: flex-grow 0.3s cubic-bezier(0.2, 0.7, 0.2, 1), min-width 0.3s cubic-bezier(0.2, 0.7, 0.2, 1); }
	.day.we { background: var(--weekend); }
	.day.mon { margin-left: 4px; }
	.day.period { background: color-mix(in srgb, var(--s) 22%, var(--surface)); }
	.day.has { border-color: var(--s); }
	.day.today { outline: 2px solid var(--accent); outline-offset: -2px; }
	.wd { font-size: 10px; color: var(--muted); line-height: 1; }
	.n { font-size: 14px; font-weight: 800; line-height: 1; }
	.day .es { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 13px; line-height: 1.15; }
	.det { position: absolute; left: 0; top: 40px; width: 170px; padding: 0 8px; display: flex; flex-direction: column; gap: 4px; opacity: 0; pointer-events: none; transition: opacity 0.15s; }
	.t { font-size: 12px; font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.more { font-size: 11px; color: var(--muted); }
	.sbar { margin-top: auto; align-self: stretch; height: 4px; background: var(--s); opacity: 0.35; }
	.day.has .sbar { opacity: 1; }
	@media (hover: hover) {
		.day:hover, .day:focus-visible { flex-grow: 7; min-width: 150px; }
		.day:hover .det, .day:focus-visible .det { opacity: 1; transition: opacity 0.2s 0.12s; }
		.day:hover .es, .day:focus-visible .es { visibility: hidden; }
		.day:hover, .day:focus-visible { align-items: flex-start; padding-left: 8px; }
	}
	.zoom { align-self: flex-start; border: none; background: transparent; padding: 2px 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer; }

	/* Full width: the closed months get room for their full name, the days a fixed height. */
	@container (min-width: 900px) {
		.short { font-size: 14px; font-weight: 600; }
		.c { font-size: 15px; }
		.es { flex-direction: row; flex-wrap: wrap; justify-content: center; font-size: 16px; gap: 2px; }
		.days { height: 190px; }
		.n { font-size: 16px; }
		.day .es { font-size: 15px; }
	}
	@media (min-width: 1200px) {
		.row { min-height: clamp(72px, 8vh, 110px); }
	}
	@media (prefers-reduced-motion: reduce) { .col, .day { transition: none; } .body { animation: none; } }
</style>
