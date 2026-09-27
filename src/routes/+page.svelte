<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import DaySheet from '$lib/components/DaySheet.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import SignIn from '$lib/components/SignIn.svelte';
	import Presenter from '$lib/components/Presenter.svelte';
	import TimelineEditor from '$lib/components/TimelineEditor.svelte';
	import TimelinePicker from '$lib/components/TimelinePicker.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	/* Theme: follows the system until you pick one. */
	let chosen = $state<string | null>(null);
	let systemDark = $state(false);
	const theme = $derived<'light' | 'dark'>(chosen === 'dark' || chosen === 'light' ? chosen : systemDark ? 'dark' : 'light');
	$effect(() => {
		if (chosen) document.documentElement.dataset.theme = chosen;
	});
	function toggleTheme() {
		chosen = theme === 'dark' ? 'light' : 'dark';
		try { localStorage.setItem('tijdlijn.theme', chosen); } catch { /* ignore */ }
	}

	onMount(async () => {
		try { chosen = localStorage.getItem('tijdlijn.theme'); } catch { /* ignore */ }
		const dark = matchMedia('(prefers-color-scheme: dark)');
		systemDark = dark.matches;
		dark.addEventListener('change', () => (systemDark = dark.matches));
		const wanted = new URLSearchParams(location.search || location.hash.split('?')[1] || '').get('t');
		await app.start();
		if (wanted) {
			app.switchTo(wanted);
			history.replaceState(null, '', resolve('/'));
		}
		if (!app.timelines.length) ui.tlEdit = { id: null, first: true };
	});

	function add() {
		ui.menu = { y: app.year, m: app.mode === 'month' ? app.month : null };
	}
</script>

<div class="app">
	<TopBar {theme} ontheme={toggleTheme} />
	{#if app.ready}
		<Pager />
		{#if app.canEdit}
			<button class="fab" onclick={add}><Icon name="plus" />Toevoegen</button>
		{:else}
			<div class="ro">Alleen bekijken</div>
		{/if}
	{:else}
		<div class="loading">Laden…</div>
	{/if}
</div>

{#if ui.picker}<TimelinePicker />{/if}
{#if ui.menu}<Menu />{/if}
{#if ui.day}<DaySheet />{/if}
{#if ui.tlEdit}<TimelineEditor />{/if}
{#if ui.editor}<Editor />{/if}
{#if ui.gallery}<Gallery />{/if}
{#if ui.account}<SignIn />{/if}
{#if ui.present}<Presenter />{/if}
<Toast />

<style>
	.app { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; padding-top: env(safe-area-inset-top, 0px); }
	.loading { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--muted); }
	.fab { position: fixed; right: max(20px, env(safe-area-inset-right, 0px)); bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 6; height: 56px; padding: 0 22px; border-radius: 999px; border: none; background: var(--ink); color: var(--surface); font: inherit; font-weight: 600; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 8px 24px rgba(10, 20, 30, 0.25); cursor: pointer; }
	.ro { position: fixed; right: 20px; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 6; padding: 8px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); color: var(--muted); font-size: 14px; font-weight: 600; }
	@media (min-width: 2300px) and (min-height: 1250px) { .fab { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .fab { zoom: 1.5; } }

	/* Hover */
	.fab { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) { .fab:hover { background: color-mix(in srgb, var(--ink) 85%, var(--surface)); box-shadow: 0 10px 28px rgba(10, 20, 30, 0.3); } }

	/* Morphing into and out of presenting (see state/present.ts). */
	:global(::view-transition-group(*)) { animation-duration: 0.55s; animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1); }
	:global(::view-transition-old(root)) { animation-duration: 0.3s; }
	:global(::view-transition-new(root)) { animation-duration: 0.45s; animation-delay: 0.1s; }
	/* Keep the months and the line next to the year at their own size while they move, instead of stretching. */
	:global(::view-transition-old(pres-months)), :global(::view-transition-new(pres-months)),
	:global(::view-transition-old(pres-info)), :global(::view-transition-new(pres-info)) { height: 100%; width: auto; object-fit: none; object-position: left top; }
</style>
