<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { KINDS } from '$lib/domain/kinds';
	import { momentsLabel } from '$lib/domain/view';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';

	const list = $derived((app.timelines.length ? app.timelines : app.temp ? [app.temp] : []).toSorted((a, b) => a.name.localeCompare(b.name)));
	const roleLabel = { owner: '', editor: ' · gedeeld, je mag bewerken', viewer: ' · gedeeld, alleen bekijken' };
	const close = () => (ui.picker = false);
</script>

<Dialog open={ui.picker} onclose={close} label="Je tijdlijnen">
	<div class="dlg">
		<h3>Je tijdlijnen</h3>
		<div class="list">
			{#each list as t (t.id)}
				{@const n = app.moments.filter((m) => m.timelineId === t.id).length}
				{@const role = app.roles[t.id] ?? 'owner'}
				<div class="row" class:on={t.id === app.tl.id}>
					<button class="pick" onclick={() => { app.switchTo(t.id); close(); }}>
						<span class="e">{KINDS[t.kind].emoji}</span>
						<span class="tx"><b>{t.name}</b><small>{KINDS[t.kind].label}{t.anchor ? ' · sinds ' + t.anchor.slice(0, 4) : ''} · {momentsLabel(n)}{roleLabel[role]}</small></span>
					</button>
					{#if role === 'owner'}
						<button class="set" onclick={() => (ui.tlEdit = { id: t.id, first: false })}>Instellingen</button>
					{:else}
						<button class="set" onclick={() => app.leaveTimeline(t.id)}>Verlaten</button>
					{/if}
				</div>
			{/each}
		</div>
		<div class="actions">
			<Btn variant="ghost" onclick={close}>Sluiten</Btn>
			<Btn variant="ghost" onclick={() => { close(); app.loadDemo(); }}>Demo laden</Btn>
			<Btn onclick={() => (ui.tlEdit = { id: null, first: false })}>Nieuwe tijdlijn</Btn>
		</div>
	</div>
</Dialog>

<style>
	.list { display: flex; flex-direction: column; gap: 8px; }
	.row { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); }
	.row.on { border: 2px solid var(--ink); }
	.pick { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; border: none; background: transparent; text-align: left; padding: 0; font: inherit; color: inherit; cursor: pointer; }
	.e { font-size: 28px; line-height: 1; }
	.tx { min-width: 0; }
	.tx b { display: block; font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.tx small { color: var(--muted); font-size: 13px; }
	.set { border: 1px solid var(--line); background: var(--surface); border-radius: 8px; padding: 7px 10px; font: inherit; font-size: 13px; font-weight: 600; color: var(--ink); cursor: pointer; }

	/* Hover */
	.row, .set { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.row:hover:not(.on) { border-color: var(--muted); }
		.set:hover { background: color-mix(in srgb, var(--ink) 6%, var(--surface)); border-color: var(--muted); }
	}
</style>
