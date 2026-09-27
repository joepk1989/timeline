<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { startPresenting } from '$lib/state/present';
	import { MONTHS, MONTHS_SHORT, season } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { yearOccurrences } from '$lib/domain/occurrences';
	import { momentsLabel, monthOccurrences } from '$lib/domain/view';
	import type { Status } from '$lib/domain/types';
	import Btn from './Btn.svelte';
	import Chip from './Chip.svelte';
	import Icon from './Icon.svelte';

	let { theme, ontheme }: { theme: 'light' | 'dark'; ontheme: () => void } = $props();

	let fullscreen = $state(false);
	const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen();
		else document.documentElement.requestFullscreen().catch(() => app.toast('Volledig scherm is hier niet beschikbaar'));
	}

	const sub = $derived.by(() => {
		if (app.mode === 'year') return `${app.scope.from} – ${app.scope.to}${app.count ? ' · ' + momentsLabel(app.count) : ''}`;
		const a = ageLabel(app.tl, app.year, app.month, null);
		return `${MONTHS[app.month]} ${app.year}${a && a !== app.kind.before ? ' · ' + a : ''}`;
	});

	/** Ticks under the bar: one per year, or one per month when zoomed in. */
	const ticks = $derived.by(() => {
		const real = app.visible.filter((m) => !m.virtual);
		if (app.mode === 'year') {
			const out = [];
			for (let y = app.scope.from; y <= app.scope.to; y++) {
				const c = yearOccurrences(real, y).length;
				out.push({ i: y - app.scope.from, c, label: `${y}${c ? ': ' + momentsLabel(c) : ''}`, s: null as string | null });
			}
			return out;
		}
		const occs = yearOccurrences(real, app.year);
		return MONTHS.map((name, m) => {
			const c = monthOccurrences(occs, app.year, m).length;
			return { i: (app.year - app.scope.from) * 12 + m, c, label: `${name}${c ? ': ' + momentsLabel(c) : ''}`, s: `var(--${season(m)})` };
		});
	});
</script>

<svelte:document onfullscreenchange={() => (fullscreen = !!document.fullscreenElement)} />

<header>
	<div class="in">
		{#if app.mode === 'month'}
			<Btn variant="pill" onclick={() => app.exitMonth()} aria-label="Terug naar {app.year}"><Icon name="back" /><span>{app.year}</span></Btn>
		{/if}
		<button class="tl" onclick={() => (ui.picker = true)} aria-haspopup="dialog" aria-label="Kies een tijdlijn, nu: {app.tl.name}">
			<span class="em">{app.kind.emoji}</span>
			<span class="txt"><b>{app.tl.name}</b><small>{sub}</small></span>
			<Icon name="down" />
		</button>
		<Btn variant="pill" onclick={ontheme} aria-label={theme === 'dark' ? 'Licht thema' : 'Donker thema'}>
			<Icon name={theme === 'dark' ? 'sun' : 'moon'} /><span class="lbl">{theme === 'dark' ? 'Licht' : 'Donker'}</span>
		</Btn>
		{#if canFullscreen}
			<span class="fs"><Btn variant="pill" onclick={toggleFullscreen} aria-label="Volledig scherm"><Icon name="full" /><span class="lbl">{fullscreen ? 'Sluiten' : 'Volledig scherm'}</span></Btn></span>
		{/if}
		<Btn variant="pill" onclick={startPresenting} aria-label="Presenteren"><Icon name="play" /><span class="lbl">Presenteren</span></Btn>
		<Btn variant="pill" onclick={() => (ui.menu = { y: app.year, m: app.mode === 'month' ? app.month : null })} aria-haspopup="dialog" aria-label="Menu"><Icon name="menu" /><span class="lbl">Menu</span></Btn>
	</div>
	<div class="filters" role="group" aria-label="Filter op categorie">
		<Chip on={!app.filter.categoryId} onclick={() => app.setCategory(null)}>Alles</Chip>
		{#each app.tl.categories as c (c.id)}
			<Chip on={app.filter.categoryId === c.id} color={c.color} onclick={() => app.setCategory(c.id)}>{c.name}</Chip>
		{/each}
		{#if app.kind.hasStatus}
			<span class="sep"></span>
			{#each STATUSES as st (st.id)}
				<Chip on={app.filter.status === st.id} color={st.color} onclick={() => app.setStatus(st.id as Status)}>{st.name}</Chip>
			{/each}
		{/if}
	</div>
	<div class="minimap">
		{#each ticks as t (t.i)}
			<button
				class="tick"
				class:m={!!t.s}
				class:has={t.c > 0}
				class:cur={t.i === app.idx}
				style:--s={t.s ?? 'var(--muted)'}
				title={t.label}
				aria-label={t.label}
				onclick={() => app.goTo(t.i)}
			></button>
		{/each}
	</div>
	<div class="labels">
		{#if app.mode === 'year'}<span>{app.scope.from}</span><span>{app.scope.to}</span>
		{:else}<span>{MONTHS_SHORT[0]} {app.year}</span><span>{MONTHS_SHORT[11]} {app.year}</span>{/if}
	</div>
</header>

<style>
	header { flex: 0 0 auto; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); }
	.in { max-width: 1000px; margin: 0 auto; padding: 12px 20px 8px; display: flex; align-items: center; gap: 10px; }
	.tl { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; border: none; background: transparent; text-align: left; padding: 4px 6px 4px 0; border-radius: 10px; font: inherit; color: inherit; cursor: pointer; }
	.tl .em { font-size: 26px; line-height: 1; flex: 0 0 auto; }
	.txt { min-width: 0; display: flex; flex-direction: column; }
	.txt b { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.txt small { font-size: 13px; font-weight: 600; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.txt small::first-letter { text-transform: uppercase; }
	.tl :global(svg) { color: var(--muted); }
	.filters { max-width: 1000px; margin: 0 auto; padding: 0 20px 6px; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
	.filters::-webkit-scrollbar { display: none; }
	.sep { flex: 0 0 1px; background: var(--line); margin: 4px 2px; }
	.minimap { max-width: 1000px; margin: 0 auto; padding: 4px 20px 0; display: flex; gap: 2px; align-items: flex-end; height: 36px; width: 100%; }
	.tick { flex: 1 1 0; min-width: 2px; height: 8px; border-radius: 2px; background: var(--line); border: none; padding: 0; cursor: pointer; }
	.tick.has { height: 18px; background: var(--muted); }
	.tick.m { background: color-mix(in srgb, var(--s) 35%, transparent); }
	.tick.m.has { background: var(--s); }
	.tick.cur { height: 28px; background: var(--accent); }
	.tick.m.cur { background: var(--s); outline: 2px solid var(--ink); outline-offset: 1px; }
	.labels { max-width: 1000px; width: 100%; margin: 0 auto; padding: 4px 20px 8px; display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
	.fs { display: contents; }
	@media (max-width: 640px) {
		.fs { display: none; }
		.in, .minimap, .labels, .filters { padding-left: 14px; padding-right: 14px; }
	}
	@media (min-width: 1200px) {
		.in, .filters, .minimap, .labels { max-width: none; padding-left: 3vw; padding-right: 3vw; }
	}
	@media (min-width: 2300px) and (min-height: 1250px) { header { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { header { zoom: 1.5; } }
</style>
