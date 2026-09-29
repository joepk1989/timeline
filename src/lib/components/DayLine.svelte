<script lang="ts">
	// One day, zoomed in from the Jaarlijn: the arc of the sun from midnight to midnight with the hours
	// below it, and the day's moments as bars across the whole day (they have a date, not a time). A bar
	// that runs on from the day before or into the next shows it at its edge. On today the sun stands at
	// the time it is, and the hours gone by are shaded.
	import { onDestroy } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { MONTHS, WEEKDAYS } from '$lib/domain/dates';
	import { dayMoments, spanOf, sunHeight } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';

	let { y, m, d, occs, onopen }: { y: number; m: number; d: number; occs: Occurrence[]; onopen: (o: Occurrence) => void } = $props();

	const SKY = 96; // the arc of the sun
	const AXIS = 26; // the hours
	let w = $state(0);
	const x = (h: number) => (h / 24) * w;
	const arcY = (h: number) => SKY - 14 - sunHeight(h) * (SKY - 40);
	const curve = $derived(w ? Array.from({ length: 49 }, (_, i) => `${x(i / 2).toFixed(1)},${arcY(i / 2).toFixed(1)}`).join(' L') : '');
	const list = $derived(dayMoments(occs, y, m, d));
	const weekday = $derived(WEEKDAYS[new Date(y, m, d).getDay()]);

	// The clock, for today only.
	let clock = $state(new Date());
	const tick = setInterval(() => (clock = new Date()), 30_000);
	onDestroy(() => clearInterval(tick));
	const isToday = $derived(app.now.y === y && app.now.m === m && app.now.d === d);
	const nowH = $derived(clock.getHours() + clock.getMinutes() / 60);
	const nowLabel = $derived(`${clock.getHours()}:${String(clock.getMinutes()).padStart(2, '0')}`);
	const sunH = $derived(isToday ? nowH : 12);

	/** Does a moment run on from the day before, or into the next? */
	const n = (Y: number, M: number, D: number) => Y * 10000 + M * 100 + D;
	const short = (t: { m: number; d: number }) => `${t.d} ${MONTHS[t.m].slice(0, 3)}`;
	function edges(o: Occurrence) {
		const { from, to } = spanOf(o);
		const here = n(y, m, d);
		return { before: n(from.y, from.m, from.d) < here, after: n(to.y, to.m, to.d) > here, from: short(from), to: short(to) };
	}
</script>

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
	<div class="axis" aria-hidden="true">
		{#each [3, 6, 9, 12, 15, 18, 21] as h (h)}
			<span class="hl" style:left="{x(h)}px">{String(h).padStart(2, '0')}:00</span>
		{/each}
		{#if isToday}<span class="now" style:left="{x(nowH)}px">{nowLabel}</span>{/if}
	</div>

	<div class="body">
		{#each { length: 23 } as _, i (i)}
			<div class="hr" class:major={(i + 1) % 3 === 0} style:left="{x(i + 1)}px"></div>
		{/each}
		{#if isToday}
			<div class="gone" style:width="{x(nowH)}px"></div>
			<div class="nowline" style:left="{x(nowH)}px"></div>
		{/if}

		<div class="list">
			{#each list as o, i (o.moment.id + i)}
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
			{:else}
				<p class="empty">Niets op {weekday} {d} {MONTHS[m]}.</p>
			{/each}
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

	/* The hours, every three, and the time now on today. */
	.axis { position: relative; flex: 0 0 var(--axis); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
	.hl { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 11px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
	.now { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 1; padding: 2px 8px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }

	/* The day: faint lines for the hours, and the moments as bars across all of it. */
	.body { position: relative; flex: 1 1 0; min-height: 0; }
	.hr { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid color-mix(in srgb, var(--ink) 4%, transparent); }
	.hr.major { border-left-color: color-mix(in srgb, var(--ink) 9%, transparent); }
	.gone { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--ink) 4%, transparent); }
	.nowline { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid var(--ink); margin-left: -1px; }
	.list { position: relative; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 16px 16px 90px; }
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
	.empty { margin: 28px auto; color: var(--muted); }
	@media (hover: hover) { .bar:hover { filter: var(--hover-filter); } }
	@media (max-width: 640px) {
		.hl { font-size: 10px; }
		.hl:nth-child(odd) { display: none; }
		.ttl { font-size: 15px; }
		.em { width: 34px; height: 34px; font-size: 18px; }
		.ph { width: 52px; height: 40px; }
		.cont { font-size: 0; }
	}
	@media (prefers-reduced-motion: reduce) { .day, .bar { animation: none; } }
</style>
