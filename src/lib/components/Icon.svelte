<script lang="ts">
	type Name = 'back' | 'next' | 'down' | 'moon' | 'sun' | 'full' | 'play' | 'pause' | 'menu' | 'plus' | 'user';
	let { name }: { name: Name } = $props();
</script>

{#if name === 'play'}
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
{:else if name === 'pause'}
	<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
{:else}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if name === 'back'}<path d="M15 5l-7 7 7 7" />
		{:else if name === 'next'}<path d="M9 5l7 7-7 7" />
		{:else if name === 'down'}<path d="M6 9l6 6 6-6" />
		{:else if name === 'moon'}<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
		{:else if name === 'sun'}<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
		{:else if name === 'full'}<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
		{:else if name === 'menu'}<path d="M4 7h16M4 12h16M4 17h16" />
		{:else if name === 'plus'}<path d="M12 5v14M5 12h14" />
		{:else if name === 'user'}<circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
		{/if}
	</svg>
{/if}

<style>
	svg { width: 1.15em; height: 1.15em; flex: 0 0 auto; }
</style>
