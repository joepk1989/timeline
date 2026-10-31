<script lang="ts">
	import '../app.css';
	import { asset } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<title>Timelessline</title>
	<meta name="description" content="Je leven, je kind, je huis of je plannen op één lijn: jaren, maanden, dagen en uren, met foto's." />
	<link rel="icon" href={asset('/icon.svg')} type="image/svg+xml" />
	<link rel="icon" href={asset('/favicon-32.png')} sizes="32x32" type="image/png" />
	<link rel="apple-touch-icon" href={asset('/apple-touch-icon.png')} />
	<link rel="manifest" href={asset('/manifest.webmanifest')} />
	<meta name="theme-color" content="#eef0eb" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#141920" media="(prefers-color-scheme: dark)" />
	<meta name="apple-mobile-web-app-title" content="Timelessline" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap" />
</svelte:head>

{@render children()}
