<script lang="ts">
	// Pages side by side with scroll snapping, so you can swipe through years or months.
	// Only the current page and its neighbours are rendered.
	import { tick, untrack } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { MONTHS } from '$lib/domain/dates';
	import Icon from './Icon.svelte';
	import MonthPage from './MonthPage.svelte';
	import YearPage from './YearPage.svelte';

	let el: HTMLElement;
	const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const pages = $derived(Array.from({ length: app.pageCount }, (_, i) => i));
	const yearOf = (i: number) => (app.mode === 'year' ? app.scope.from + i : app.scope.from + Math.floor(i / 12));

	// Scroll when asked (and after the pages for a new mode or period exist).
	$effect(() => {
		const { smooth } = app.scrollReq;
		const i = untrack(() => app.idx);
		tick().then(() => el?.scrollTo({ left: i * el.clientWidth, behavior: smooth && !reduce() ? 'smooth' : 'auto' }));
	});

	let raf = 0;
	function onscroll() {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
			if (i !== app.idx) app.setIdx(i);
		});
	}
	function onkeydown(e: KeyboardEvent) {
		if (ui.present || document.querySelector('dialog[open]') || (e.target as HTMLElement).closest?.('input,textarea,select')) return;
		if (e.key === 'ArrowLeft') { e.preventDefault(); app.goTo(app.idx - 1); }
		else if (e.key === 'ArrowRight') { e.preventDefault(); app.goTo(app.idx + 1); }
		else if (e.key === 'Escape' && app.mode === 'month') app.exitMonth();
	}
</script>

<svelte:window onresize={() => app.goTo(app.idx, false)} {onkeydown} />

<main bind:this={el} {onscroll} aria-label="Tijdlijn, swipe om te bladeren">
	{#each pages as i (app.mode + i)}
		<section aria-label={app.mode === 'year' ? `Jaar ${yearOf(i)}` : `${MONTHS[i % 12]} ${yearOf(i)}`} inert={i !== app.idx} aria-hidden={i !== app.idx}>
			{#if Math.abs(i - app.idx) <= 1}
				{#if app.mode === 'year'}<YearPage y={yearOf(i)} />{:else}<MonthPage y={yearOf(i)} m={i % 12} />{/if}
			{/if}
		</section>
	{/each}
</main>
<button class="nav prev" disabled={app.idx <= 0} aria-label={app.mode === 'year' ? 'Vorig jaar' : 'Vorige maand'} onclick={() => app.goTo(app.idx - 1)}><Icon name="back" /></button>
<button class="nav next" disabled={app.idx >= app.pageCount - 1} aria-label={app.mode === 'year' ? 'Volgend jaar' : 'Volgende maand'} onclick={() => app.goTo(app.idx + 1)}><Icon name="next" /></button>

<style>
	main { flex: 1 1 auto; min-height: 0; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
	main::-webkit-scrollbar { display: none; }
	section { flex: 0 0 100%; width: 100%; height: 100%; overflow-y: auto; scroll-snap-align: start; scroll-snap-stop: always; }
	.nav { position: fixed; top: 55%; transform: translateY(-50%); z-index: 4; width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(10, 20, 30, 0.12); font-size: 20px; cursor: pointer; }
	.prev { left: max(14px, env(safe-area-inset-left, 0px)); }
	.next { right: max(14px, env(safe-area-inset-right, 0px)); }
	.nav:disabled { opacity: 0; pointer-events: none; }
	@media (hover: none), (max-width: 640px) { .nav { display: none; } }
	@media (min-width: 1200px) { .prev { left: 1vw; } .next { right: 1vw; } }
</style>
