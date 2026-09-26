<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'solid' | 'ghost' | 'danger' | 'pill' | 'pill-solid' | 'link' | 'add';
	let { variant = 'solid', children, ...rest }: { variant?: Variant; children: Snippet } & HTMLButtonAttributes = $props();
</script>

<button type="button" class={variant} {...rest}>{@render children()}</button>

<style>
	button { font: inherit; color: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
	button:disabled { opacity: 0.5; cursor: default; }
	.solid, .ghost, .danger { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--ink); background: var(--ink); color: var(--surface); font-weight: 600; font-size: 15px; }
	.ghost { background: transparent; color: var(--ink); border-color: var(--line); }
	.danger { background: transparent; color: var(--danger); border-color: transparent; margin-right: auto; padding-left: 4px; }
	.pill, .pill-solid { height: 42px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); font-weight: 600; font-size: 15px; flex: 0 0 auto; }
	.pill-solid { background: var(--ink); color: var(--surface); border-color: var(--ink); }
	.link { border: none; background: transparent; color: var(--accent); font-weight: 600; padding: 0; align-self: flex-start; font-size: 14px; }
	.add { width: 100%; padding: 10px 12px; border-radius: 9px; border: 1px dashed var(--muted); background: transparent; text-align: left; font-weight: 600; color: var(--accent); }
	.add:disabled { color: var(--muted); border-color: var(--line); font-weight: 400; opacity: 1; }
	@media (max-width: 640px) {
		.pill { padding: 0 12px; }
		.pill :global(.lbl) { display: none; }
	}
</style>
