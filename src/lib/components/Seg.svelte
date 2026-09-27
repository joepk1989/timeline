<script lang="ts" generics="T extends string | number">
	let { options, value, onchange, label }: { options: [T, string][]; value: T; onchange: (v: T) => void; label: string } = $props();
</script>

<div role="group" aria-label={label}>
	{#each options as [v, l] (v)}
		<button type="button" class:on={v === value} aria-pressed={v === value} onclick={() => v !== value && onchange(v)}>{l}</button>
	{/each}
</div>

<style>
	div { display: inline-flex; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; align-self: flex-start; background: var(--surface); }
	button { padding: 7px 14px; border: none; background: transparent; font: inherit; font-weight: 600; font-size: 14px; color: var(--ink); cursor: pointer; }
	.on { background: var(--ink); color: var(--surface); }

	/* Hover */
	button { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) { button:hover:not(.on) { background: var(--hover); } }
</style>
