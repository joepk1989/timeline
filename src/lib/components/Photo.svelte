<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	// Shows a stored photo. Paths are resolved to URLs (object URLs or signed URLs) when needed.
	let { path, alt = '', class: cls = '', lazy = true }: { path: string; alt?: string; class?: string; lazy?: boolean } = $props();
	let src = $state('');
	$effect(() => {
		let live = true;
		app.backend.photoUrl(path).then((u) => live && (src = u)).catch(() => {});
		return () => (live = false);
	});
</script>

{#if src}<img {src} {alt} class={cls} loading={lazy ? 'lazy' : 'eager'} />{:else}<span class={cls} aria-hidden="true"></span>{/if}
