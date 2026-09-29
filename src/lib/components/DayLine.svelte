<script lang="ts">
	// One day, zoomed in from the Jaarlijn: the hours as columns under the arc of the sun, midnight to
	// midnight, and the day's moments as cards. On today the hours gone by are darker and the time is shown.
	import { onDestroy } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { MONTHS, WEEKDAYS, season } from '$lib/domain/dates';
	import { whenLabel } from '$lib/domain/occurrences';
	import { dayMoments, sunHeight } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';

	let {
		y,
		m,
		d,
		occs,
		onback,
		onstep,
		onopen
	}: {
		y: number;
		m: number;
		d: number;
		occs: Occurrence[];
		onback: () => void;
		/** Go a day back (-1) or forward (1). */
		onstep: (delta: number) => void;
		onopen: (o: Occurrence) => void;
	} = $props();

	const HEAD = 52; // the day's name
	const SKY = 132; // the arc of the sun and the hours
	let w = $state(0);
	const x = (h: number) => (h / 24) * w;
	const arcY = (h: number) => SKY - 18 - sunHeight(h) * (SKY - 64);
	const arc = $derived.by(() => {
		if (!w) return '';
		const pts = Array.from({ length: 49 }, (_, i) => `${x(i / 2).toFixed(1)},${arcY(i / 2).toFixed(1)}`);
		return `M0,0 L${pts.join(' L')} L${w},0 Z`;
	});
	const list = $derived(dayMoments(occs, y, m, d));
	const weekday = $derived(WEEKDAYS[new Date(y, m, d).getDay()]);

	// The clock, for today only.
	let clock = $state(new Date());
	const tick = setInterval(() => (clock = new Date()), 30_000);
	onDestroy(() => clearInterval(tick));
	const isToday = $derived(app.now.y === y && app.now.m === m && app.now.d === d);
	const nowH = $derived(clock.getHours() + clock.getMinutes() / 60);
	const nowLabel = $derived(`${clock.getHours()}:${String(clock.getMinutes()).padStart(2, '0')}`);

	const color = (o: Occurrence) => (o.moment.virtual ? 'var(--accent)' : app.catOf(o.moment.categoryId).color);
</script>

<div class="day" style:--s="var(--{season(m)})" style:--head="{HEAD}px" style:--sky="{SKY}px" bind:clientWidth={w} role="region" aria-label="{weekday} {d} {MONTHS[m]} {y}">
	<header>
		<button class="back" onclick={onback} aria-label="Terug naar {MONTHS[m]}"><Icon name="back" /><span>{MONTHS[m]}</span></button>
		<h3><span class="wd">{weekday}</span> <b>{d} {MONTHS[m]}</b></h3>
		<div class="steps">
			<button onclick={() => onstep(-1)} aria-label="Vorige dag"><Icon name="back" /></button>
			<button onclick={() => onstep(1)} aria-label="Volgende dag"><Icon name="next" /></button>
		</div>
	</header>

	<div class="sky" aria-hidden="true">
		<svg width={w} height={SKY}><path d={arc} /></svg>
		{#each { length: 23 } as _, i (i)}
			{@const h = i + 1}
			<div class="hr" class:major={h % 3 === 0} class:past={isToday && h <= nowH} style:left="{x(h)}px" style:top="{arcY(h)}px"></div>
			{#if h % 3 === 0 && h !== 12}
				<span class="lbl" style:left="{x(h)}px" style:top="{arcY(h) - 22}px"><b>{h}</b>:00</span>
			{/if}
		{/each}
		<span class="moon l"><Icon name="moon" /></span>
		<span class="moon r"><Icon name="moon" /></span>
		<span class="sun" style:left="{x(12)}px" style:top="{arcY(12) - 44}px"></span>
		<span class="lbl" style:left="{x(12)}px" style:top="{arcY(12) - 22}px"><b>12</b>:00</span>
		{#if isToday}
			<span class="now" style:left="{x(nowH)}px" style:top="{arcY(nowH)}px">{nowLabel}</span>
		{/if}
	</div>

	<div class="below">
		{#each { length: 23 } as _, i (i)}
			<div class="col" class:major={(i + 1) % 3 === 0} style:left="{x(i + 1)}px"></div>
		{/each}
		{#if isToday}<div class="gone" style:width="{x(nowH)}px"></div>{/if}

		<div class="cards">
			{#each list as o, i (o.moment.id + i)}
				{@const mo = o.moment}
				<button class="card" style:--c={color(o)} onclick={() => onopen(o)}>
					<span class="pills">
						<span class="pill">{o.d == null ? `Heel ${MONTHS[o.m!]}` : whenLabel(o)}</span>
						{#if !mo.virtual}<span class="pill cat"><span class="dot"></span>{app.catOf(mo.categoryId).name}</span>{/if}
					</span>
					<span class="body">
						<span class="txt">
							<span class="ttl"><span class="e">{mo.emoji}</span> {mo.title}</span>
							{#if mo.note}<span class="note">{mo.note}</span>{/if}
						</span>
						{#if mo.photos[0]}<span class="ph"><Photo path={mo.photos[0]} alt="" /></span>{/if}
					</span>
				</button>
			{:else}
				<p class="empty">Niets op deze dag.</p>
			{/each}
		</div>
	</div>
</div>

<style>
	.day { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; background: color-mix(in srgb, var(--s) 16%, var(--bg)); animation: zoomin 0.35s ease both; }
	@keyframes zoomin { from { opacity: 0; } }
	/* Clear of the arrows at the screen's sides that go to the previous and next year. */
	header { flex: 0 0 var(--head); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 80px; }
	h3 { margin: 0; font-size: 20px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; }
	h3 b { font-weight: 800; }
	.back, .steps button { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; transition: background-color 0.15s; }
	.back { justify-self: start; }
	.steps { justify-self: end; display: flex; gap: 6px; }
	.steps button { width: 36px; padding: 0; justify-content: center; }

	/* The sky: darker above the arc of the sun, the hours standing on the arc. */
	.sky { position: relative; flex: 0 0 var(--sky); }
	.sky svg { position: absolute; inset: 0; display: block; }
	.sky path { fill: color-mix(in srgb, var(--s) 34%, var(--bg)); }
	.sky .hr { position: absolute; bottom: 0; width: 0; border-left: 1px solid color-mix(in srgb, var(--ink) 10%, transparent); }
	.sky .hr.major { border-left-color: color-mix(in srgb, var(--ink) 22%, transparent); }
	.lbl { position: absolute; transform: translateX(-50%); font-size: 12px; color: var(--muted); white-space: nowrap; }
	.lbl b { color: var(--ink); }
	.moon { position: absolute; top: calc(var(--sky) - 62px); color: #fff; }
	.moon :global(svg) { fill: #fff; width: 26px; height: 26px; }
	.moon.l { left: 14px; }
	.moon.r { right: 14px; }
	.sun { position: absolute; width: 28px; height: 28px; margin-left: -14px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 7px rgba(255, 255, 255, 0.35); }
	.now { position: absolute; transform: translate(-50%, -50%); z-index: 2; padding: 6px 10px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }

	/* Below the arc: the hour columns, the hours gone by darker, and the day's moments. */
	.below { position: relative; flex: 1 1 0; min-height: 0; }
	.col { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
	.col.major { border-left-color: color-mix(in srgb, var(--ink) 18%, transparent); }
	.gone { position: absolute; left: 0; top: 0; bottom: 0; background: color-mix(in srgb, var(--s) 14%, transparent); }
	.cards { position: relative; height: 100%; overflow-y: auto; display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: center; gap: 14px; padding: 18px 16px 90px; }
	.card { width: min(560px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 0 0 18px; border: none; border-radius: 18px; background: var(--surface); color: var(--ink); text-align: left; font: inherit; cursor: pointer;
		box-shadow: 0 6px 20px rgba(10, 20, 30, 0.1); overflow: hidden; transition: filter 0.15s, transform 0.2s; }
	.pills { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 16px 0; }
	.pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: color-mix(in srgb, var(--c) 14%, var(--surface)); font-size: 12px; font-weight: 700; }
	.dot { width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
	.body { display: flex; gap: 14px; padding: 0 18px; align-items: flex-start; }
	.txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
	.ttl { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; }
	.note { color: var(--muted); font-size: 15px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
	.ph { flex: 0 0 120px; height: 90px; border-radius: 10px; overflow: hidden; }
	.ph :global(img) { display: block; width: 100%; height: 100%; object-fit: cover; }
	.empty { align-self: center; margin: 24px 0; color: var(--muted); }
	@media (hover: hover) {
		.back:hover, .steps button:hover { background: var(--hover); }
		.card:hover { filter: var(--hover-filter); }
	}
	@media (max-width: 640px) {
		header { grid-template-columns: auto 1fr auto; gap: 8px; padding: 0 8px; }
		h3 { font-size: 15px; text-align: center; overflow: hidden; text-overflow: ellipsis; }
		.back span { display: none; }
		.lbl { font-size: 10px; }
		.ttl { font-size: 18px; }
		.ph { flex-basis: 80px; height: 64px; }
	}
	@media (prefers-reduced-motion: reduce) { .day { animation: none; } }
</style>
