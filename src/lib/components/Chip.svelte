<script lang="ts">
	import type { Snippet } from 'svelte';
	let { on = false, color = null, onclick, children, label }: { on?: boolean; color?: string | null; onclick: () => void; children: Snippet; label?: string } = $props();
</script>

<button type="button" class:on class:dot={!!color} style:--c={color} aria-pressed={on} aria-label={label} {onclick}>{@render children()}</button>

<style>
	button { flex: 0 0 auto; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font: inherit; font-size: 13px; font-weight: 600; color: var(--ink); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
	.dot::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
	.on { background: var(--ink); color: var(--surface); border-color: var(--ink); }

	/* Hover */
	button { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		button:hover:not(.on) { background: color-mix(in srgb, var(--ink) 6%, var(--surface)); border-color: var(--muted); }
		.on:hover { background: color-mix(in srgb, var(--ink) 85%, var(--surface)); }
	}
</style>
