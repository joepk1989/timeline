<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { daysInMonth, dayNumber, labelFull, MONTHS, season, SEASON_NAMES, WEEKDAYS_SHORT } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { covers, yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel, monthOccurrences } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Content from './Content.svelte';
	import Photo from './Photo.svelte';
	import Seg from './Seg.svelte';

	let { y, m }: { y: number; m: number } = $props();
	const occs = $derived(monthOccurrences(yearOccurrences(app.visible, y), y, m));
	const real = $derived(occs.filter((o) => !o.moment.virtual));
	const s = $derived(season(m));
	const age = $derived(ageLabel(app.tl, y, m, null));
	const lead = $derived((new Date(y, m, 1).getDay() + 6) % 7);
	const days = $derived(
		Array.from({ length: daysInMonth(y, m) }, (_, i) => {
			const d = i + 1, wd = new Date(y, m, d).getDay();
			const here = occs.filter((o) => covers(o, y, m, d));
			const n = dayNumber(y, m, d);
			const bars = here.filter((o) => o.end).slice(0, 3).map((o) => ({
				color: app.catOf(o.moment.categoryId).color,
				start: n === dayNumber(o.y, o.m!, o.d!),
				end: n === dayNumber(o.end!.y, o.end!.m, o.end!.d)
			}));
			return { d, wd, here, bars, we: wd === 0 || wd === 6, today: y === app.now.y && m === app.now.m && d === app.now.d, label: labelFull(y, m, d) + (here.length ? ', ' + here.map((o) => o.moment.title).join(', ') : '') };
		})
	);
	const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches;
	let open = $state<number | null>(null);
	let acc: HTMLDivElement | undefined = $state();
	const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	function tapDay(d: number, el: HTMLElement) {
		if (canHover || open === d) {
			ui.day = { y, m, d };
			return;
		}
		open = d;
		if (acc) acc.scrollTo({ left: Math.max(0, el.offsetLeft - acc.clientWidth / 2 + 110), behavior: reduce() ? 'auto' : 'smooth' });
	}
	const photoOf = (here: Occurrence[]) => here.find((o) => o.moment.photos.length)?.moment.photos[0];
</script>

{#snippet bars(list: { color: string; start: boolean; end: boolean }[])}
	<div class="bars">{#each list as b, i (i)}<div class="pb" class:s={b.start} class:e={b.end} style:--c={b.color}></div>{/each}</div>
{/snippet}

<div class="page-in" class:split={app.monthView === 'cal'} class:mrow={app.monthView === 'row'}>
	<div class="pl">
		<h2 class="big">{MONTHS[m]}</h2>
		<div class="count">
			{y} · {SEASON_NAMES[s]}{#if age && age !== app.kind.before}{' · '}<span class="ageline">{age}</span>{/if}{real.length ? ' · ' + momentsLabel(real.length) : ''}
		</div>
		<div class="toggle">
			<Seg label="Weergave van de maand" value={app.monthView} onchange={(v) => app.setMonthView(v)} options={[['cal', 'Kalender'], ['row', 'Op een rij']]} />
		</div>
		{#if app.monthView === 'row'}
			<div class="acc" bind:this={acc}>
				{#each days as day (day.d)}
					<button
						class="aday"
						class:we={day.we}
						class:mon={day.wd === 1 && day.d > 1}
						class:has={day.here.length > 0}
						class:today={day.today}
						class:open={open === day.d}
						style:--s="var(--{s})"
						aria-label={day.label}
						onfocus={() => open !== day.d && (open = null)}
						onclick={(e) => tapDay(day.d, e.currentTarget)}
					>
						<div class="ah"><span class="wd">{WEEKDAYS_SHORT[day.wd]}</span><span class="n">{day.d}</span></div>
						<div class="aes">{#each day.here.slice(0, 4) as o (o.moment.id)}<span>{o.moment.emoji}</span>{/each}</div>
						<div class="det">
							<div class="dt">{labelFull(y, m, day.d)}</div>
							{#if ageLabel(app.tl, y, m, day.d)}<div class="ageline small">{ageLabel(app.tl, y, m, day.d)}</div>{/if}
							{#if photoOf(day.here)}<Photo path={photoOf(day.here)!} class="dph" />{/if}
							{#each day.here.slice(0, 4) as o (o.moment.id)}<div class="dm"><span>{o.moment.emoji}</span><span>{o.moment.title}</span></div>{/each}
							{#if day.here.length > 4}<div class="more">+{day.here.length - 4} meer</div>{/if}
							{#if !day.here.length}<div class="more">Nog niets.{app.canEdit ? ' Tik om iets toe te voegen.' : ''}</div>{/if}
						</div>
						{#if day.bars.length}{@render bars(day.bars)}{:else}<div class="sbar"></div>{/if}
					</button>
				{/each}
			</div>
			<p class="tip">{canHover ? 'Beweeg over een dag om hem te openen, klik voor alle details' : 'Tik op een dag om hem te openen, tik nog eens voor alle details'}</p>
		{:else}
			<div class="cal">
				{#each ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'] as w (w)}<div class="wh">{w}</div>{/each}
				{#each { length: lead }, i (i)}<div></div>{/each}
				{#each days as day (day.d)}
					<button class="cell" class:we={day.we} class:has={day.here.length > 0} class:today={day.today} style:--s="var(--{s})" aria-label={day.label} onclick={() => (ui.day = { y, m, d: day.d })}>
						<span class="n">{day.d}</span>
						{#if day.here.some((o) => !o.end)}<span class="es">{day.here.filter((o) => !o.end).slice(0, 3).map((o) => o.moment.emoji).join('')}</span>{/if}
						{#if day.bars.length}{@render bars(day.bars)}{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<div class="pr">
		<Content {occs} emptyTitle="Nog niets in {MONTHS[m]}" emptySub="Tik op een dag, of maak de hele maand bijzonder." onadd={() => (ui.editor = { id: null, y, m, d: null })} />
	</div>
</div>

<style>
	.page-in { max-width: 860px; margin: 0 auto; padding: 18px 24px 120px; }
	.big { margin: 0; font-size: clamp(52px, 13vw, 112px); font-weight: 800; letter-spacing: -0.045em; line-height: 0.85; text-transform: capitalize; }
	.count { color: var(--muted); font-size: 15px; margin: 10px 0 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.toggle { display: flex; margin: 0 0 16px; }
	.mrow .toggle { margin-bottom: 12px; }
	.tip { font-size: 12px; color: var(--muted); margin: 0 0 20px; }

	.cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; margin: 4px 0 24px; }
	.wh { font-size: 12px; color: var(--muted); text-align: center; }
	.cell { --s: var(--winter); min-height: 58px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); padding: 5px 5px 4px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; overflow: hidden; font: inherit; color: inherit; cursor: pointer; }
	.cell .n { font-size: 15px; font-weight: 800; line-height: 1; }
	.cell .es { font-size: 14px; line-height: 1.1; white-space: nowrap; overflow: hidden; max-width: 100%; }
	.cell.we { background: var(--weekend); }
	.cell.has { border-color: var(--s); }
	.cell.today { outline: 2px solid var(--accent); outline-offset: -2px; }
	.bars { margin-top: auto; align-self: stretch; display: flex; flex-direction: column; gap: 2px; margin-left: -6px; margin-right: -6px; }
	.pb { height: 5px; background: var(--c); }
	.pb.s { margin-left: 6px; border-radius: 3px 0 0 3px; }
	.pb.e { margin-right: 6px; border-radius: 0 3px 3px 0; }

	.acc { display: flex; gap: 3px; height: clamp(230px, 36vh, 460px); margin: 0 0 10px; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; scrollbar-color: var(--line) transparent; padding-bottom: 2px; }
	.aday { --s: var(--winter); flex: 1 1 0; min-width: 30px; position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 6px; text-align: left; padding: 8px 0 0; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); overflow: hidden; font: inherit; color: inherit; cursor: pointer;
		transition: flex-grow 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), min-width 0.35s cubic-bezier(0.2, 0.7, 0.2, 1), background 0.2s; }
	.aday.we { background: var(--weekend); }
	.aday.mon { margin-left: 5px; }
	.aday.today { outline: 2px solid var(--accent); outline-offset: -2px; }
	.aday.has { border-color: var(--s); }
	.ah { display: flex; flex-direction: column; align-items: center; line-height: 1; gap: 3px; padding: 0 2px; }
	.ah .wd { font-size: 11px; color: var(--muted); }
	.ah .n { font-size: 17px; font-weight: 800; }
	.aes { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 15px; line-height: 1.15; }
	.det { position: absolute; left: 0; top: 52px; width: 240px; padding: 0 12px; opacity: 0; transition: opacity 0.15s; pointer-events: none; display: flex; flex-direction: column; gap: 6px; }
	.dt { font-size: 13px; font-weight: 700; }
	.dt::first-letter { text-transform: uppercase; }
	.small { font-size: 12px; }
	.det :global(.dph) { display: block; width: 100%; height: clamp(60px, 11vh, 150px); object-fit: cover; border-radius: 6px; background: var(--line); }
	.dm { display: flex; gap: 6px; font-size: 14px; font-weight: 600; line-height: 1.25; }
	.more { font-size: 12px; color: var(--muted); }
	.aday .bars { margin-left: -1px; margin-right: -1px; }
	.sbar { margin-top: auto; height: 5px; background: var(--s); opacity: 0.35; }
	.aday.has .sbar { opacity: 1; }
	.aday:hover, .aday:focus-visible, .aday.open { flex-grow: 9; min-width: min(240px, 70vw); }
	.aday:hover .det, .aday:focus-visible .det, .aday.open .det { opacity: 1; transition: opacity 0.25s 0.15s; }
	.aday:hover .aes, .aday:focus-visible .aes, .aday.open .aes { visibility: hidden; }
	.aday:hover .ah, .aday:focus-visible .ah, .aday.open .ah { align-items: flex-start; padding-left: 12px; }
	@media (prefers-reduced-motion: reduce) { .aday { transition: none; } }

	@media (max-width: 640px) {
		.page-in { padding: 14px 14px 110px; }
		.cal { gap: 3px; }
		.cell { min-height: 52px; padding: 4px 4px 3px; }
		.cell .n { font-size: 13px; }
		.cell .es { font-size: 12px; }
	}
	@media (min-width: 1200px) {
		.page-in { max-width: none; padding: 3vh 3vw 120px; }
		.split { display: grid; grid-template-columns: minmax(480px, 46%) minmax(0, 1fr); gap: 0 4vw; align-items: start; }
		.split .pl { position: sticky; top: 0; padding-top: 1vh; container-type: inline-size; }
		.split .pr { padding-top: 2vh; }
		.big { font-size: clamp(72px, 6vw, 170px); }
		.split .big { font-size: min(19cqi, 180px); }
		.count { margin-top: 16px; }
		.mrow .pr { max-width: 1100px; }
		.acc { height: clamp(260px, 40vh, 560px); }
		.ah .n { font-size: 19px; }
		.cell { min-height: clamp(64px, 7vh, 110px); }
		.cell .n, .cell .es { font-size: 17px; }
	}
	@media (min-width: 2300px) and (min-height: 1250px) { .page-in { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .page-in { zoom: 1.5; } }
</style>
