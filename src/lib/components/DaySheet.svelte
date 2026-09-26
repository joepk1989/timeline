<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { covers, yearOccurrences } from '$lib/domain/occurrences';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';
	import MomentRow from './MomentRow.svelte';

	const { y, m, d } = ui.day!;
	const age = ageLabel(app.tl, y, m, d);
	const here = $derived(yearOccurrences(app.visible, y).filter((o) => covers(o, y, m, d)));
	const title = labelFull(y, m, d) + (age ? ' · ' + age : '');
</script>

<Dialog open={!!ui.day} onclose={() => (ui.day = null)} label={title}>
	<div class="dlg">
		<h3>{title}</h3>
		<div class="items">
			{#each here as o (o.moment.id)}<MomentRow {o} />{:else}<div class="muted">Nog niets op deze dag.</div>{/each}
		</div>
		<div class="actions">
			<Btn variant="ghost" onclick={() => (ui.day = null)}>Sluiten</Btn>
			{#if app.canEdit}<Btn onclick={() => (ui.editor = { id: null, y, m, d })}>Moment toevoegen</Btn>{/if}
		</div>
	</div>
</Dialog>

<style>
	.items { display: flex; flex-direction: column; gap: 2px; }
</style>
