<script lang="ts">
	import type { Snippet } from 'svelte';
	// A modal <dialog>. `side` slides in from the right (menu), `card` is centred, `bare` has no chrome (gallery).
	let { open, onclose, label, kind = 'card', children }: { open: boolean; onclose: () => void; label: string; kind?: 'card' | 'side' | 'bare'; children: Snippet } = $props();
	let el: HTMLDialogElement;
	$effect(() => {
		if (open && !el.open) el.showModal();
		else if (!open && el.open) el.close();
	});
</script>

<dialog
	bind:this={el}
	class={kind}
	aria-label={label}
	onclose={() => open && onclose()}
	onclick={(e) => e.target === el && kind !== 'card' && onclose()}
>
	{#if open}{@render children()}{/if}
</dialog>

<style>
	dialog { color: var(--ink); }
	dialog::backdrop { background: rgba(15, 22, 30, 0.45); }
	.side { margin: 0 0 0 auto; height: 100%; max-height: 100%; width: min(560px, 100vw); max-width: 100vw; border: none; padding: 0; background: var(--bg); box-shadow: -10px 0 40px rgba(10, 20, 30, 0.25); }
	.side[open] { animation: slide 0.22s ease-out; }
	@keyframes slide { from { transform: translateX(40px); opacity: 0.4; } to { transform: none; opacity: 1; } }
	.card { border: none; border-radius: 16px; padding: 0; width: min(480px, calc(100vw - 24px)); max-height: calc(100% - 24px); background: var(--surface); box-shadow: 0 20px 60px rgba(10, 20, 30, 0.3); }
	.bare { border: none; padding: 0; background: transparent; width: 100vw; height: 100%; max-width: 100vw; max-height: 100%; margin: 0; }
	.bare::backdrop { background: rgba(0, 0, 0, 0.92); }
	@media (prefers-reduced-motion: reduce) { .side[open] { animation: none; } }
	@media (min-width: 2300px) and (min-height: 1250px) { .card, .side { zoom: 1.25; } }
	@media (min-width: 3200px) and (min-height: 1400px) { .card, .side { zoom: 1.5; } }

	/* Form layout shared by every card dialog. Scoped under .card so it cannot leak. */
	.card :global(.dlg) { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
	.card :global(.dlg h3) { margin: 0; font-size: 22px; font-weight: 800; line-height: 1.2; }
	.card :global(.dlg h3::first-letter) { text-transform: uppercase; }
	.card :global(.dlg > label), .card :global(.lab) { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: var(--muted); }
	.card :global(input[type='text']), .card :global(input[type='email']), .card :global(input[type='number']), .card :global(textarea), .card :global(select) {
		padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); font: inherit; font-size: 16px; color: var(--ink);
	}
	.card :global(textarea) { min-height: 80px; resize: vertical; }
	.card :global(.row) { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; }
	.card :global(.field) { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
	.card :global(.w-day) { width: 72px; }
	.card :global(.w-year) { width: 96px; }
	.card :global(.check), .card :global(.dlg > label.check) { display: flex; flex-direction: row; align-items: center; gap: 10px; font-size: 15px; color: var(--ink); }
	.card :global(.check input) { width: 20px; height: 20px; accent-color: var(--accent); }
	.card :global(.picks) { display: flex; flex-wrap: wrap; gap: 6px; }
	.card :global(.actions) { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; position: sticky; bottom: -20px; background: var(--surface); padding: 10px 0 4px; margin-bottom: -4px; }
	.card :global(.tip) { font-size: 12px; color: var(--muted); margin: 0; }
	.card :global(.ageline) { color: var(--accent); font-weight: 600; }
	.card :global(.muted) { color: var(--muted); }
</style>
