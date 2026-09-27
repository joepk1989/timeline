<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { STATUSES } from '$lib/domain/kinds';
	import { buildSlides, type ShowWhat } from '$lib/domain/slides';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';
	import Seg from './Seg.svelte';

	const KEY = 'tijdlijn.show';
	let saved: Record<string, unknown> = {};
	try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* ignore */ }
	let what = $state<ShowWhat>(['all', 'year', 'future'].includes(saved.what as string) ? (saved.what as ShowWhat) : 'all');
	let ms = $state([5000, 8000, 12000].includes(saved.ms as number) ? (saved.ms as number) : 8000);
	let years = $state(saved.years !== false);
	let photos = $state(!!saved.photos);
	let loop = $state(!!saved.loop);

	const slides = $derived(buildSlides(app.visible, app.scope, app.year, app.now, { what, years, photos }));
	const filters = $derived([
		...(app.filter.categoryId ? [app.catOf(app.filter.categoryId).name] : []),
		...(app.filter.status ? [STATUSES.find((s) => s.id === app.filter.status)!.name] : [])
	]);
	function start() {
		try { localStorage.setItem(KEY, JSON.stringify({ what, ms, years, photos, loop })); } catch { /* ignore */ }
		ui.showSetup = false;
		ui.show = { slides, ms, loop, opt: { what, years, photos } };
	}
</script>

<Dialog open={ui.showSetup} onclose={() => (ui.showSetup = false)} label="Presenteren">
	<div class="dlg">
		<h3>Presenteren: {app.tl.name}</h3>
		<div class="lab">Wat laat je zien?
			<Seg label="Wat laat je zien" value={what} onchange={(v) => (what = v)} options={[['all', 'Hele periode'], ['year', `Dit jaar (${app.year})`], ['future', 'Vanaf vandaag']]} />
		</div>
		<div class="lab">Tijd per dia
			<Seg label="Tijd per dia" value={ms} onchange={(v) => (ms = v)} options={[[5000, '5 sec'], [8000, '8 sec'], [12000, '12 sec']]} />
		</div>
		<label class="check"><input type="checkbox" bind:checked={years} />Jaaroverzicht voor elk nieuw jaar</label>
		<label class="check"><input type="checkbox" bind:checked={photos} />Elke foto als eigen dia</label>
		<label class="check"><input type="checkbox" bind:checked={loop} />Blijven herhalen</label>
		<p class="tip">
			{#if slides.length}
				{slides.length} dia's{filters.length ? ` · alleen ${filters.join(' en ').toLowerCase()}, zoals je filter nu staat` : ''}. Op een groot scherm: open de tijdlijn in de browser en kies Volledig scherm.
			{:else}Er zijn geen momenten om te laten zien met deze keuze.{/if}
		</p>
		<div class="actions">
			<Btn variant="ghost" onclick={() => (ui.showSetup = false)}>Annuleren</Btn>
			<Btn onclick={start} disabled={!slides.length}>Start</Btn>
		</div>
	</div>
</Dialog>
