<script lang="ts">
	// The year at a glance: the big year, age, counts, and every moment on a line through the seasons.
	import { app } from '$lib/state/app.svelte';
	import { MONTHS, MONTHS_SHORT, season } from '$lib/domain/dates';
	import { yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { isOverdue } from '$lib/domain/occurrences';
	import { yearLayout, yearPosition } from '$lib/domain/slides';
	import { momentsLabel } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';

	let { y, occs }: { y: number; occs: Occurrence[] } = $props();
	const tl = app.tl, kind = app.kind;
	const real = $derived(occs.filter((o) => !o.moment.virtual));
	const ay = tl.anchor ? +tl.anchor.slice(0, 4) : null;
	const n = $derived(ay != null && y >= ay ? y - ay : null);
	const cats = $derived([...new Map(real.map((o) => [o.moment.categoryId, app.catOf(o.moment.categoryId)])).values()].slice(0, 5));
	const stats = $derived(STATUSES.map((st) => ({ n: real.filter((o) => o.moment.status === st.id).length, name: st.name.toLowerCase(), color: st.color })).filter((s) => s.n));
	const late = $derived(real.filter((o) => isOverdue(o, app.now)).length);
	const whole = $derived(occs.filter((o) => o.m == null));
	const layout = $derived(yearLayout(occs, y));
</script>

<div class="yhead">
	<div class="yy">{y}</div>
	<div class="side">
		{#if n != null}
			{#if kind.mode === 'age'}
				{#if n > 0}<div class="yal">{tl.kind === 'mij' ? 'Leeftijd dit jaar' : `${tl.name} wordt`}</div>{/if}
				<div class="ya">{n === 0 ? 'Geboortejaar' : `${n} jaar`}</div>
			{:else}<div class="ya">{yearLine(tl, y)}</div>{/if}
		{/if}
		<div class="yc">
			{real.length ? momentsLabel(real.length) : ''}
			{#each cats as c (c.id)}<span class="ycat" style:--c={c.color}>{c.name}</span>{/each}
		</div>
		{#if stats.length || late}
			<div class="ystat">
				{#each stats as s (s.name)}<span class="pill" style:--c={s.color}>{s.n} {s.name}</span>{/each}
				{#if late}<span class="pill" style:--c="#C0392B">{late} over tijd</span>{/if}
			</div>
		{/if}
	</div>
</div>
{#if whole.length}
	<div class="ywhole"><span class="yal">Het hele jaar</span>{#each whole as o (o.moment.id)}<span class="ychip">{o.moment.emoji} {o.moment.title}</span>{/each}</div>
{/if}
<div class="strip">
	<div class="axis">{#each MONTHS as _, m (m)}<i style:--s="var(--{season(m)})"></i>{/each}</div>
	<div class="labels">{#each MONTHS_SHORT as mn (mn)}<span>{mn[0]}<i>{mn.slice(1)}</i></span>{/each}</div>
	{#if y === app.now.y}<div class="today" style:--x="{yearPosition(y, app.now.y, app.now.m, app.now.d)}%"><span>vandaag</span></div>{/if}
	{#each layout.bars as b (b.o.moment.id)}
		<div class="bar" style:--c={app.catOf(b.o.moment.categoryId).color} style:left="{b.left}%" style:width="{b.width}%" style:--i={b.row} title={b.o.moment.title}>{b.o.moment.emoji} {b.o.moment.title}</div>
	{/each}
	{#each layout.markers as mk (mk.o.moment.id)}
		<div class="mk" style:--x="{mk.x}%" style:--lane={mk.lane}>
			<span class="e">{mk.o.moment.emoji}</span>
			<span class="t">{mk.o.moment.title}<span class="dd">{mk.o.d != null ? `${mk.o.d} ${MONTHS_SHORT[mk.o.m!]}` : MONTHS[mk.o.m!]}{mk.o.moment.repeat && mk.o.age ? ` · ${mk.o.age} jaar` : ''}</span></span>
		</div>
	{/each}
</div>

<style>
	.yhead { display: flex; align-items: flex-end; gap: 2vh 4vw; flex-wrap: wrap; }
	.yy { font-size: clamp(90px, min(26vh, 17vw), 420px); font-weight: 800; letter-spacing: -0.06em; line-height: 0.78; }
	.side { display: flex; flex-direction: column; gap: 1.2vh; padding-bottom: 0.6vh; }
	.ya { font-size: clamp(26px, min(7vh, 4vw), 96px); font-weight: 800; letter-spacing: -0.02em; line-height: 1; color: #9bbbf2; }
	.yal { font-size: clamp(12px, 1.9vh, 24px); text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.55); font-weight: 600; }
	.yc { font-size: clamp(15px, 2.6vh, 34px); color: rgba(255, 255, 255, 0.82); display: flex; flex-wrap: wrap; align-items: center; gap: 0.4em 1em; }
	.ycat { display: inline-flex; align-items: center; gap: 0.4em; font-size: 0.8em; color: rgba(255, 255, 255, 0.7); }
	.ycat::before { content: ''; width: 0.6em; height: 0.6em; border-radius: 50%; background: var(--c); }
	.ystat { display: flex; flex-wrap: wrap; gap: 0.8vh 0.8vw; font-size: clamp(13px, 2.1vh, 26px); }
	.pill { display: inline-flex; align-items: center; padding: 0.2em 0.75em; border-radius: 99px; background: var(--c); color: #fff; font-weight: 700; font-size: 0.9em; }
	.ywhole { display: flex; flex-wrap: wrap; align-items: center; gap: 1vh 1vw; }
	.ychip { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 999px; padding: 0.35em 0.9em; font-size: clamp(14px, 2.3vh, 30px); }
	.strip { position: relative; flex: 1; min-height: 24vh; --axis: 11vh; --lh: 8.6vh; }
	.axis { position: absolute; left: 0; right: 0; bottom: var(--axis); height: 1vh; min-height: 5px; display: flex; gap: 0.35vw; }
	.axis i { flex: 1; border-radius: 1vh; background: var(--s); }
	.labels { position: absolute; left: 0; right: 0; bottom: calc(var(--axis) - 3.6vh); display: flex; }
	.labels i { font-style: normal; }
	.labels span { flex: 1; text-align: center; font-size: clamp(11px, 1.8vh, 22px); color: rgba(255, 255, 255, 0.55); text-transform: uppercase; letter-spacing: 0.06em; }
	.today { position: absolute; left: var(--x); top: 0; bottom: calc(var(--axis) - 1vh); border-left: 2px dashed rgba(155, 187, 242, 0.7); }
	.today span { position: absolute; top: 0; left: 0.5vw; font-size: clamp(11px, 1.7vh, 20px); color: #9bbbf2; font-weight: 700; white-space: nowrap; }
	.bar { position: absolute; bottom: calc(var(--axis) - 7.2vh - var(--i) * 3.2vh); height: 2.7vh; min-height: 16px; line-height: 2.7vh; border-radius: 1.4vh; background: var(--c); color: #fff; font-size: clamp(10px, 1.6vh, 20px); font-weight: 600; padding: 0 0.7vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.mk { position: absolute; left: var(--x); bottom: calc(var(--axis) + 2.6vh + var(--lane) * var(--lh)); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 0.3vh; max-width: 12.5vw; text-align: center; }
	.mk::after { content: ''; position: absolute; left: 50%; top: 100%; width: 2px; height: calc(2.6vh + var(--lane) * var(--lh)); background: rgba(255, 255, 255, 0.22); }
	.mk .e { font-size: clamp(20px, 3.9vh, 54px); line-height: 1; }
	.mk .t { font-size: clamp(11px, 1.9vh, 24px); line-height: 1.15; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 12.5vw; }
	.mk .dd { display: block; font-size: clamp(10px, 1.5vh, 18px); font-weight: 400; color: rgba(255, 255, 255, 0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	:global(.slide.in) .mk { animation: pop 0.6s both; }
	:global(.slide.in) .mk:nth-of-type(2n) { animation-delay: 0.08s; }
	:global(.slide.in) .mk:nth-of-type(3n) { animation-delay: 0.16s; }
	:global(.slide.in) .bar { animation: fadein 0.6s both; }
	@keyframes pop { from { opacity: 0; transform: translate(-50%, 1.5vh); } to { opacity: 1; transform: translate(-50%, 0); } }
	@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
	@media (max-aspect-ratio: 1/1) {
		.strip { --lh: 6.5vh; }
		.mk .t, .mk .dd, .labels i { display: none; }
		.bar { font-size: 0; padding: 0; }
	}
	@media (prefers-reduced-motion: reduce) { :global(.slide.in) .mk, :global(.slide.in) .bar { animation: none; } }
</style>
