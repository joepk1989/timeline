<script lang="ts">
	// The twelve months of a year side by side. Tap a month to fold it open and see its days;
	// tap a day for what happened, or open the whole month.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, MONTHS, MONTHS_SHORT, season, SEASON_NAMES } from '$lib/domain/dates';
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
	const grid = $derived(open == null ? null : monthGrid(occs, y, open, app.now));
	const age = $derived(open == null ? null : ageLabel(app.tl, y, open, null));

	function toggle(m: number) {
		open = open === m ? null : m;
	}
</script>

{#snippet days(m: number, grid: MonthGridT)}
	<div class="body" style:--s="var(--{season(m)})">
		<button class="title" aria-expanded="true" aria-label="{MONTHS[m]} {y}. Dichtvouwen" onclick={() => (open = null)}>
			<b>{MONTHS[m]}</b><small>{SEASON_NAMES[season(m)]}{age && age !== app.kind.before ? ` · ${age}` : ''}{months[m].count ? ` · ${momentsLabel(months[m].count)}` : ''}</small>
		</button>
					<div class="cal">
						{#each ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as w (w)}<span class="wh" aria-hidden="true">{w}</span>{/each}
						{#each { length: grid.lead }, i (i)}<span></span>{/each}
						{#each grid.days as day (day.d)}
							<button
								class="day"
								class:we={day.weekend}
								class:has={day.here.length > 0}
								class:period={day.inPeriod}
								class:today={day.today}
								aria-label="{labelFull(y, m, day.d)}{day.here.length ? ', ' + day.here.map((o) => o.moment.title).join(', ') : ''}"
								onclick={() => (ui.day = { y, m: m, d: day.d })}
							>
								<span class="n">{day.d}</span>
								{#if day.here.some((o) => !o.end)}<span class="e" aria-hidden="true">{day.here.find((o) => !o.end)!.moment.emoji}</span>{/if}
							</button>
						{/each}
					</div>
					<button class="zoom" onclick={() => app.enterMonth(y, m)}>Hele maand bekijken</button>
				</div>
{/snippet}

<div class="wrap">
<div class="row">
	{#each months as mo (mo.m)}
		<div class="col" class:open={open === mo.m} class:has={mo.count > 0} class:cur={y === app.now.y && mo.m === app.now.m} style:--s="var(--{mo.s})">
			<button
				class="head"
				aria-expanded={open === mo.m}
				aria-label="{MONTHS[mo.m]} {y}{mo.count ? ', ' + momentsLabel(mo.count) : ''}. {open === mo.m ? 'Dichtvouwen' : 'Dagen tonen'}"
				onclick={() => toggle(mo.m)}
			>
				<span class="short">{MONTHS_SHORT[mo.m]}</span>
				<span class="c">{mo.count || ''}</span>
				<span class="es" aria-hidden="true">{#each mo.emojis as e (e)}<span>{e}</span>{/each}</span>
			</button>
			{#if open === mo.m && grid}<div class="inline">{@render days(mo.m, grid)}</div>{/if}
			<span class="bar" aria-hidden="true"></span>
		</div>
	{/each}
</div>
{#if open != null && grid}<div class="below">{@render days(open, grid)}</div>{/if}
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
	/* Wide enough: the month folds open in the row itself, the other months stay visible. */
	@container (min-width: 460px) {
		.col.open { flex: 0 0 min(calc(100% - 11 * 25px - 4px), 520px); min-width: 0; background: var(--surface); outline: none; box-shadow: inset 0 0 0 1px var(--line); }
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

	.body { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px; animation: fade 0.25s 0.1s both; }
	@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
	.cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
	.wh { font-size: 10px; color: var(--muted); text-align: center; }
	.day { aspect-ratio: 1; min-height: 30px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); padding: 2px 0 0; display: flex; flex-direction: column; align-items: center; gap: 0; font: inherit; color: var(--ink); cursor: pointer; overflow: hidden; }
	.day.we { background: var(--weekend); }
	.day.period { background: color-mix(in srgb, var(--s) 22%, var(--surface)); }
	.day.has { border-color: var(--s); }
	.day.today { outline: 2px solid var(--accent); outline-offset: -2px; }
	.n { font-size: 12px; font-weight: 700; line-height: 1.1; }
	.e { font-size: 12px; line-height: 1.1; }
	.zoom { align-self: flex-start; border: none; background: transparent; padding: 2px 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer; }

	/* Full width: the closed months get room for their full name, the days a fixed height. */
	@container (min-width: 900px) {
		.short { font-size: 14px; font-weight: 600; }
		.c { font-size: 15px; }
		.es { flex-direction: row; flex-wrap: wrap; justify-content: center; font-size: 16px; gap: 2px; }
		.day { aspect-ratio: auto; height: 46px; }
		.n { font-size: 14px; }
		.e { font-size: 15px; }
	}
	@media (min-width: 1200px) {
		.row { min-height: clamp(72px, 8vh, 110px); }
	}
	@media (prefers-reduced-motion: reduce) { .col { transition: none; } .body { animation: none; } }
</style>
