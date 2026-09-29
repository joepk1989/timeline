<script lang="ts">
	// Tijdschalen: all of time, from the birth of the earth to this week, one block per scale. Click a
	// stretch on any scale and the window zooms into it; the bar on top shows where you are.
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { app } from '$lib/state/app.svelte';
	import {
		AGO_TICKS, SCALE_GROUPS, agoPos, allTime, landmarks, pathOf, scaleRow, whenName, yearOf, zoomBetween, zoomInAt, zoomOut,
		type Segment
	} from '$lib/domain/scales';

	const now = $derived(yearOf(app.now.y, app.now.m, app.now.d + 1));
	const win = new Tween<[number, number]>(allTime(yearOf(app.now.y, app.now.m, app.now.d + 1)), {
		duration: () => (prefersReducedMotion.current ? 0 : 800),
		easing: cubicInOut,
		interpolate: (a, b) => (p) => zoomBetween(a, b, p)
	});
	let target = $state<[number, number]>(win.target);
	function go(w: [number, number]) {
		target = w;
		win.set(w);
	}

	let W = $state(0); // width of a track
	const a = $derived(win.current[0]);
	const b = $derived(win.current[1]);
	const x = (t: number) => ((t - a) / (b - a)) * W;
	const max = $derived(Math.max(4, Math.floor(W / 12)));
	const path = $derived(pathOf(target[0], target[1], now));
	const onPath = (s: Segment) => path.some((p) => p.seg.from === s.from && p.seg.to === s.to);
	const marks = $derived(landmarks(now));
	// In the track, a landmark shows its name only when the next one leaves room for it.
	const shownMarks = $derived.by(() => {
		const on = marks.map((m) => ({ ...m, px: x(m.t) })).filter((m) => m.px >= 0 && m.px <= W);
		return on.map((m, i) => ({ ...m, named: i === on.length - 1 ? W - m.px > 120 : on[i + 1].px - m.px > 150 }));
	});

	function segs(id: Parameters<typeof scaleRow>[0]) {
		return scaleRow(id, a, b, now, max);
	}
	/** A stretch as it shows in the track: cut off at the edges. */
	function box(s: Segment) {
		const l = Math.max(0, x(s.from)), r = Math.min(W, x(s.to));
		return { left: l, width: Math.max(0, r - l) };
	}
	const same = (s: Segment) => Math.abs(s.from - target[0]) < (target[1] - target[0]) * 1e-6 && Math.abs(s.to - target[1]) < (target[1] - target[0]) * 1e-6;
	function zoomFine(e: MouseEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		go(zoomInAt(target, target[0] + ((e.clientX - r.left) / r.width) * (target[1] - target[0])));
	}
	function up() {
		const parent = [...path].reverse().find((p) => p.seg.to - p.seg.from > (target[1] - target[0]) * 1.001);
		go(parent ? [parent.seg.from, parent.seg.to] : zoomOut(target, now));
	}
	function toMark(t: number) {
		const ago = Math.max(now - t, 1 / 12);
		const w = Math.max(ago * 0.4, 1 / 12);
		const [lo, hi] = allTime(now);
		const s = Math.max(lo, Math.min(t - w / 2, hi - w));
		go([s, Math.min(hi, s + w)]);
	}
	const whole = $derived(target[1] - target[0] >= (allTime(now)[1] - allTime(now)[0]) * 0.999);

	// Where the window sits on the bar of "how far back", oldest on the left.
	const lo = $derived(agoPos(now - a) * 100);
	const hi = $derived(agoPos(now - b) * 100);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && !whole && up()} />

<div class="scales">
	<header class="where">
		<div class="bar" aria-hidden="true">
			{#each AGO_TICKS as [ago, name] (name)}
				<span class="tick" style:left="{agoPos(ago) * 100}%"><span>{name}</span></span>
			{/each}
			<span class="win" style:left="{lo}%" style:width="{Math.max(0.6, hi - lo)}%"></span>
		</div>
		<div class="marks">
			{#each marks as m (m.label)}
				<button class="mark" style:left="{agoPos(now - m.t) * 100}%" title={m.label} aria-label="Zoom naar: {m.label}" onclick={() => toMark(m.t)}>{m.emoji}</button>
			{/each}
		</div>
		<div class="line">
			<nav class="crumbs" aria-label="Waar je bent">
				<button class="crumb" onclick={() => go(allTime(now))} aria-current={whole ? 'true' : undefined}>Alle tijd</button>
				{#each path as p (p.scale.id)}
					<span class="sep" aria-hidden="true">›</span>
					<button class="crumb" title={p.scale.name} onclick={() => go([p.seg.from, p.seg.to])}>{p.seg.label}{p.seg.note && p.scale.id !== 'eon' && p.scale.id !== 'era' && p.scale.id !== 'period' ? ` ${p.seg.note}` : ''}</button>
				{/each}
			</nav>
			<div class="span">{whenName(target[0], now, target[1] - target[0])} <span class="to">tot</span> {Math.abs(target[1] - now) < 1 / 365 ? 'vandaag' : whenName(target[1], now, target[1] - target[0])}</div>
			<button class="out" onclick={up} disabled={whole}>Uitzoomen</button>
		</div>
	</header>

	<div class="rows">
		<div class="row lm">
			<div class="lab"><b>Mijlpalen</b><small>klik om erheen te gaan</small></div>
			<div class="track" bind:clientWidth={W}>
				{#each shownMarks as m (m.label)}
					<button class="lmk" class:end={W - m.px < 40} style:left="{m.px}px" onclick={() => toMark(m.t)} title={m.label} aria-label="Zoom naar: {m.label}"><span class="e">{m.emoji}</span>{#if m.named}<span class="t">{m.label}</span>{/if}</button>
				{/each}
			</div>
		</div>

		{#each SCALE_GROUPS as g (g.name)}
			<section class="group" aria-label={g.name}>
				<h3>{g.name} <small>{g.hint}</small></h3>
				{#each g.scales as sc (sc.id)}
					{@const row = segs(sc.id)}
					<div class="row">
						<div class="lab"><b>{sc.name}</b><small>{sc.hint}</small></div>
						<div class="track">
							{#if row.kind === 'segments'}
								{#each row.list as s (s.from)}
									{@const bx = box(s)}
									{#if bx.width > 0}
										<button
											class="seg"
											class:path={onPath(s)}
											class:here={same(s)}
											class:narrow={bx.width < 34}
											style:left="{bx.left}px"
											style:width="{bx.width}px"
											title="{s.label}{s.note ? ` · ${s.note}` : ''}"
											aria-label="Zoom in op {s.label}{s.note ? ` ${s.note}` : ''}"
											onclick={() => !same(s) && go([s.from, s.to])}
										><span class="sl">{s.label}</span>{#if s.note && bx.width > 150}<span class="sn">{s.note}</span>{/if}</button>
									{/if}
								{/each}
							{:else if row.kind === 'fine'}
								<button class="fine" onclick={zoomFine} aria-label="Te fijn om te tonen, klik om in te zoomen">
									≈ {row.count.toLocaleString('nl-NL')} {sc.many} · klik om in te zoomen
								</button>
							{:else}
								<span class="none">{row.reason}</span>
							{/if}
						</div>
					</div>
				{/each}
			</section>
		{/each}
	</div>
</div>

<style>
	.scales { --label: 170px; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 0 40px; }

	/* Where you are: how far back, on a logarithmic bar, and the path down to the window. */
	.where { position: sticky; top: 0; z-index: 3; background: var(--bg); padding: 16px 3vw 12px; border-bottom: 1px solid var(--line); }
	.bar { position: relative; height: 10px; margin: 28px 0 22px; border-radius: 5px; background: var(--line); }
	.tick { position: absolute; top: 0; height: 10px; border-left: 1px solid color-mix(in srgb, var(--ink) 25%, transparent); }
	.tick span { position: absolute; top: 14px; left: 0; transform: translateX(-50%); font-size: 11px; color: var(--muted); white-space: nowrap; }
	.tick:first-child span { transform: none; }
	.tick:last-child span { transform: translateX(-100%); }
	.win { position: absolute; top: -4px; height: 18px; border-radius: 6px; background: var(--ink); opacity: 0.85; min-width: 6px; }
	.marks { position: absolute; left: 3vw; right: 3vw; top: 16px; height: 24px; pointer-events: none; }
	.mark { position: absolute; transform: translateX(-50%); padding: 0; border: none; background: none; font-size: 15px; line-height: 1; cursor: pointer; pointer-events: auto; transition: transform 0.15s; }
	.line { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
	.crumbs { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 2px 4px; }
	.crumb { padding: 4px 8px; border: none; border-radius: 6px; background: transparent; font: inherit; font-size: 14px; font-weight: 700; color: var(--ink); cursor: pointer; transition: background-color 0.15s; }
	.crumb:last-child { background: var(--ink); color: var(--bg); }
	.crumb[aria-current='true'] { background: var(--ink); color: var(--bg); }
	.sep { color: var(--muted); }
	.span { font-size: 14px; color: var(--muted); white-space: nowrap; }
	.span .to { opacity: 0.7; }
	.out { height: 36px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; transition: background-color 0.15s; }
	.out:disabled { opacity: 0.4; cursor: default; }

	/* One block per scale: its name on the left, its stretches of time in the track. */
	.rows { padding: 8px 0 0; }
	.group h3 { margin: 18px 3vw 6px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
	.group h3 small { font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--muted); margin-left: 6px; }
	.row { display: grid; grid-template-columns: var(--label) minmax(0, 1fr); align-items: stretch; min-height: 44px; border-top: 1px solid var(--line); }
	.lab { display: flex; flex-direction: column; justify-content: center; padding: 4px 12px 4px 3vw; line-height: 1.15; }
	.lab b { font-size: 14px; }
	.lab small { font-size: 11px; color: var(--muted); }
	.track { position: relative; overflow: hidden; }
	.seg { position: absolute; top: 5px; bottom: 5px; display: flex; flex-direction: column; justify-content: center; padding: 0 10px; border: none; border-left: 1px solid var(--bg); border-radius: 0;
		background: color-mix(in srgb, var(--ink) 7%, var(--surface)); color: var(--ink); font: inherit; text-align: left; cursor: zoom-in; overflow: hidden; transition: background-color 0.15s; }
	.seg .sl { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.seg .sn { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.seg.narrow { padding: 0 2px; }
	.seg.narrow .sl { font-size: 10px; text-align: center; }
	.seg.path { background: color-mix(in srgb, var(--ink) 16%, var(--surface)); }
	.seg.path .sl { font-weight: 800; }
	.seg.here { background: var(--ink); color: var(--bg); cursor: default; }
	.seg.here .sn { color: color-mix(in srgb, var(--bg) 70%, transparent); }
	.fine { position: absolute; inset: 5px 0; width: 100%; border: none; background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--ink) 7%, transparent) 6px 7px); color: var(--muted); font: inherit; font-size: 12px; text-align: left; padding: 0 12px; cursor: zoom-in; }
	.none { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 12px; font-size: 12px; color: var(--muted); }
	.row.lm { border-top: none; }
	.lmk { position: absolute; top: 6px; bottom: 6px; transform: translateX(-12px); display: flex; align-items: center; gap: 6px; padding: 0 10px 0 4px; border: none; border-left: 2px solid var(--ink); border-radius: 0 6px 6px 0; background: var(--surface); font: inherit; font-size: 12px; font-weight: 600; color: var(--ink); cursor: pointer; white-space: nowrap; }
	.lmk .e { font-size: 15px; }
	/* At the right edge (today) the flag points the other way. */
	.lmk.end { transform: translateX(calc(-100% + 2px)); border-left: none; border-right: 2px solid var(--ink); border-radius: 6px 0 0 6px; padding: 0 4px 0 10px; }

	@media (hover: hover) {
		.crumb:not(:last-child):not([aria-current='true']):hover, .out:not(:disabled):hover { background: var(--hover); }
		.seg:not(.here):hover { background: color-mix(in srgb, var(--ink) 22%, var(--surface)); }
		.fine:hover { color: var(--ink); }
		.mark:hover { transform: translateX(-50%) scale(1.3); }
		.lmk:hover { filter: var(--hover-filter); z-index: 1; }
	}
	@media (max-width: 640px) {
		.scales { --label: 96px; }
		.lab small { display: none; }
		.where { padding: 12px 14px 10px; }
		.marks { left: 14px; right: 14px; top: 12px; }
		.tick span { font-size: 9px; }
		.tick:nth-child(even) span { display: none; }
		.lab { padding-left: 14px; }
		.group h3 { margin-left: 14px; }
	}
</style>
