<script lang="ts">
	// Starting point: renders the demo timeline with the ported domain logic.
	// The full interface is rebuilt step by step from prototype/tijdlijn.html (see CLAUDE.md).
	import { ageLabel, demoTimeline, KINDS, season, today, virtualMoments, whenLabel, yearLine, yearOccurrences } from '$lib';

	const now = today();
	let n = 0;
	const { timeline, moments } = demoTimeline(now, () => `demo-${n++}`);
	const all = [...moments, ...virtualMoments(timeline)];
	const catOf = (id: string) => timeline.categories.find((c) => c.id === id);

	let year = $state(now.y);
	const occs = $derived(yearOccurrences(all, year));
</script>

<main>
	<header>
		<span class="emoji">{KINDS[timeline.kind].emoji}</span>
		<div>
			<h1>{timeline.name}</h1>
			<p>{timeline.scope.from} – {timeline.scope.to}</p>
		</div>
	</header>

	<nav aria-label="Jaar kiezen">
		<button onclick={() => year--} disabled={year <= timeline.scope.from} aria-label="Vorig jaar">‹</button>
		<h2 class:now={year === now.y}>{year}</h2>
		<button onclick={() => year++} disabled={year >= timeline.scope.to} aria-label="Volgend jaar">›</button>
	</nav>
	{#if yearLine(timeline, year)}<p class="line">{yearLine(timeline, year)}</p>{/if}

	<ol>
		{#each occs as o (o.moment.id)}
			{@const cat = catOf(o.moment.categoryId)}
			<li style:--s={o.m == null ? 'var(--accent)' : `var(--${season(o.m)})`}>
				<span class="when">{whenLabel(o)}</span>
				<span class="em">{o.moment.emoji}</span>
				<div>
					<strong>{o.moment.title}</strong>
					<small>
						{#if cat}<span class="cat" style:--c={cat.color}>{cat.name}</span>{/if}
						{#if o.moment.repeat && o.age}↻ {o.age} jaar{:else if !o.moment.virtual}{ageLabel(timeline, o.y, o.m, o.d) ?? ''}{/if}
						{#if o.moment.status}· {o.moment.status}{/if}
					</small>
					{#if o.moment.note}<p>{o.moment.note}</p>{/if}
				</div>
			</li>
		{/each}
	</ol>
</main>

<style>
	main { max-width: 860px; margin: 0 auto; padding: 24px 20px 80px; }
	header { display: flex; gap: 12px; align-items: center; }
	header .emoji { font-size: 32px; }
	h1 { font-size: 20px; margin: 0; }
	header p { margin: 0; color: var(--muted); font-size: 14px; }
	nav { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
	nav button { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); font-size: 22px; cursor: pointer; }
	nav button:disabled { opacity: 0.3; cursor: default; }
	h2 { margin: 0; font-size: clamp(72px, 16vw, 150px); font-weight: 800; letter-spacing: -0.05em; line-height: 0.9; }
	h2.now { color: var(--accent); }
	.line { color: var(--accent); font-weight: 600; margin: 8px 0 20px; }
	ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
	li { display: grid; grid-template-columns: 110px 28px 1fr; gap: 12px; padding: 10px 0; }
	.when { border-left: 4px solid var(--s); padding-left: 12px; color: var(--muted); font-size: 14px; }
	.em { font-size: 22px; text-align: center; }
	strong { font-size: 18px; display: block; }
	small { color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap; }
	.cat { color: var(--ink); font-weight: 600; }
	.cat::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--c); margin-right: 5px; }
	li p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
</style>
