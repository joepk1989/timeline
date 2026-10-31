<script lang="ts">
	// One tap to tick a job off, or back: the round check in front of a moment, only on timelines with a status.
	import { app } from '$lib/state/app.svelte';
	import Icon from './Icon.svelte';
	import type { Moment } from '$lib/domain/types';

	let { m, size = 24 }: { m: Moment; size?: number } = $props();
	const done = $derived(m.status === 'behaald');
</script>

<button
	class="chk"
	class:done
	style:--size="{size}px"
	aria-pressed={done}
	aria-label={done ? `${m.title}: weer openzetten` : `${m.title}: klaar`}
	title={done ? 'Weer openzetten' : 'Zet op klaar'}
	onclick={(e) => { e.stopPropagation(); app.toggleDone(m); }}
>{#if done}<Icon name="check" />{/if}</button>

<style>
	.chk { width: var(--size); height: var(--size); flex: 0 0 auto; display: grid; place-items: center; padding: 0; border-radius: 50%; border: 2px solid color-mix(in srgb, var(--ink) 35%, transparent);
		background: var(--surface); color: #fff; cursor: pointer; transition: background-color 0.15s, border-color 0.15s, transform 0.15s; }
	.chk :global(svg) { width: 70%; height: 70%; stroke-width: 3; }
	.chk.done { background: #3e8e4f; border-color: #3e8e4f; }
	@media (hover: hover) { .chk:hover { border-color: #3e8e4f; } .chk.done:hover { filter: var(--hover-filter); } }
	.chk:active { transform: scale(0.92); }
	@media (prefers-reduced-motion: reduce) { .chk { transition: none; } }
</style>
