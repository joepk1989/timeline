<script lang="ts">
	// A short message at the bottom. It is a popover so it shows above open dialogs too.
	import { app } from '$lib/state/app.svelte';
	let el: HTMLDivElement;
	$effect(() => {
		const msg = app.toastMsg;
		try {
			if (el.matches(':popover-open')) el.hidePopover();
			if (msg) el.showPopover();
		} catch {
			/* popover not supported: the fixed position still works */
		}
	});
</script>

<div class="toast" class:show={!!app.toastMsg} role="status" aria-live="polite" popover="manual" bind:this={el}>
	{#if app.toastMsg}
		<span>{app.toastMsg.text}</span>
		{#if app.toastMsg.action}
			{@const a = app.toastMsg.action}
			<button onclick={() => { app.hideToast(); a.fn(); }}>{a.label}</button>
		{/if}
	{/if}
</div>

<style>
	.toast { position: fixed; inset: auto; left: 50%; bottom: calc(90px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); margin: 0; border: none; z-index: 100; max-width: 92vw;
		background: var(--ink); color: var(--surface); padding: 10px 12px 10px 16px; border-radius: 10px; font-size: 14px; display: none; align-items: center; gap: 14px; box-shadow: 0 8px 24px rgba(10, 20, 30, 0.25); }
	.toast.show { display: flex; }
	button { border: none; background: transparent; color: var(--surface); font: inherit; font-weight: 800; text-decoration: underline; text-underline-offset: 3px; padding: 4px; cursor: pointer; }

	/* Hover */
	@media (hover: hover) { button:hover { opacity: 0.8; } }
</style>
