<script lang="ts">
	// One dropdown for the demos. Choosing one loads it right away.
	import { app } from '$lib/state/app.svelte';

	let { onpick, label = 'Demo laden' }: { onpick?: () => void; label?: string } = $props();
	type Demo = 'leven' | 'festivals' | 'tijdschalen' | 'week';
	const DEMOS: [Demo, string][] = [
		['leven', 'Een heel leven'],
		['week', 'Een volle week: werk en gezin'],
		['festivals', 'Festivals in Nederland'],
		['tijdschalen', 'Tijdschalen: van eonen tot weken']
	];
	function change(e: Event) {
		const el = e.currentTarget as HTMLSelectElement;
		const v = el.value as Demo;
		el.value = '';
		if (!v) return;
		onpick?.();
		app.loadDemo(v);
	}
</script>

<label class="wrap">
	<span class="sr">{label}</span>
	<select class="pick" onchange={change} aria-label={label}>
		<option value="" selected>{label}…</option>
		{#each DEMOS as [v, name] (v)}<option value={v}>{name}</option>{/each}
	</select>
</label>

<style>
	.wrap { display: inline-flex; position: relative; max-width: 100%; min-width: 0; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	/* .wrap .pick beats the form styles of the dialog it sits in. */
	.wrap .pick {
		appearance: none; max-width: 100%; width: auto; min-width: 0; font: inherit; font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer;
		padding: 10px 34px 10px 16px; border-radius: 8px; border: 1px solid var(--line);
		background: var(--surface) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235e6a76' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center / 16px;
		transition: background-color 0.15s, border-color 0.15s;
	}
	@media (hover: hover) { .wrap .pick:hover { background-color: color-mix(in srgb, var(--ink) 6%, var(--surface)); border-color: var(--muted); } }
</style>
