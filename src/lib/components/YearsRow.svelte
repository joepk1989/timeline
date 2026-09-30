<script lang="ts">
	// The years of the timeline in one row, fixed above the pages: it stays put while you swipe or scroll,
	// only the year on show moves. All years are alike and short ('26, or every fifth when there are many);
	// only the year on show and the one pointed at show their full number. Click a year to go there; click
	// the year on show to see all years.
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel, partSpans, yearAge, yearLabel } from '$lib/domain/view';

	let width = $state(0);
	const y = $derived(app.year);
	const years = $derived(
		Array.from({ length: app.scope.to - app.scope.from + 1 }, (_, i) => {
			const yy = app.scope.from + i;
			return { y: yy, age: yearAge(app.tl, yy), count: yearOccurrences(app.visible, yy).filter((o) => !o.moment.virtual).length };
		})
	);
	// All alike, as the columns of all years below, so the two line up.
	const parts = $derived(partSpans(width, years.length));
	let pointed = $state<number | null>(null);
	function pick(yy: number) {
		if (yy === y && !ui.allYears) ui.allYears = true;
		else {
			ui.allYears = false;
			app.goTo(yy - app.scope.from);
		}
	}
</script>

<div class="years" role="group" aria-label="Jaren" bind:clientWidth={width} onpointerleave={() => (ui.yearHover = null)}>
	{#each years as yy, i (yy.y)}
		<button
			class="yr"
			style:width="{parts[i]?.width ?? 0}px"
			class:here={yy.y === y && !ui.allYears}
			class:all={ui.allYears}
			class:pointed={ui.allYears && ui.yearHover === yy.y}
			class:now={yy.y === app.now.y}
			class:full={(yy.y === y && !ui.allYears) || pointed === yy.y}
			aria-current={yy.y === y && !ui.allYears ? 'true' : undefined}
			aria-expanded={yy.y === y ? ui.allYears : undefined}
			aria-label="{yy.y}{yy.age ? `, ${yy.age}` : ''}{yy.count ? `, ${momentsLabel(yy.count)}` : ''}"
			title="{yy.y}{yy.age ? ` · ${yy.age}` : ''}{yy.count ? ` · ${momentsLabel(yy.count)}` : ''}"
			onpointerenter={(e) => {
				if (e.pointerType === 'mouse') pointed = yy.y;
				if (ui.allYears) ui.yearHover = yy.y;
			}}
			onpointerleave={() => pointed === yy.y && (pointed = null)}
			onclick={() => pick(yy.y)}
		><span class="lbl">{(yy.y === y && !ui.allYears) || pointed === yy.y ? yy.y : yearLabel(yy.y, null, 0, parts[i]?.width ?? 0)}</span></button>
	{/each}
</div>

<style>
	.years { flex: 0 0 auto; display: flex; height: 34px; background: var(--bg); border-bottom: 1px solid var(--line); overflow: hidden; }
	.yr { position: relative; flex: 0 0 auto; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 0 2px; border: none; border-right: 1px solid color-mix(in srgb, var(--line) 60%, transparent);
		background: transparent; font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); white-space: nowrap; overflow: hidden; cursor: pointer; font-variant-numeric: tabular-nums;
		transition: width 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), background-color 0.15s, color 0.15s; }
	.yr.now { color: var(--ink); }
	.yr.here { background: var(--ink); color: var(--bg); font-weight: 800; cursor: zoom-out; }
	.yr.here .lbl { background: var(--ink); }
	.yr.all { cursor: zoom-in; }
	.yr.pointed { background: var(--hover); color: var(--ink); }
	/* The full year may be wider than its column: it stands over its neighbours. */
	.yr.full { overflow: visible; z-index: 1; }
	.yr.full .lbl { padding: 3px 8px; border-radius: 6px; background: inherit; }
	.yr.full:not(.here) .lbl { background: var(--surface); box-shadow: 0 0 0 1px var(--line); color: var(--ink); }
	@media (hover: hover) { .yr:not(.here):hover { background: var(--hover); color: var(--ink); } }
	@media (prefers-reduced-motion: reduce) { .yr { transition: none; } }
</style>
