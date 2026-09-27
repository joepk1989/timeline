<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { daysInMonth, formatDate, MONTHS, parseDate } from '$lib/domain/dates';
	import { KIND_ORDER, KINDS } from '$lib/domain/kinds';
	import { defaultScope } from '$lib/domain/view';
	import { newId } from '$lib/data/backend';
	import type { Category, TimelineKind } from '$lib/domain/types';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';
	import ShareBox from './ShareBox.svelte';

	const PALETTE = ['#C8507A', '#7A5BC4', '#1F8A8A', '#D0663A', '#2F6FD1', '#3E8E4F', '#B8860B', '#8E3B46', '#4A5FC1', '#6B7785'];
	const req = ui.tlEdit!;
	const existing = req.id ? app.timelines.find((t) => t.id === req.id) ?? null : null;
	const a = existing?.anchor ? parseDate(existing.anchor) : null;

	let kind = $state<TimelineKind | null>(existing?.kind ?? null);
	let name = $state(existing?.name ?? '');
	let day = $state<number | null>(a?.d ?? null), month = $state(a?.m ?? 0), year = $state<number | null>(a?.y ?? null);
	let cats = $state<Category[]>(existing?.categories.map((c) => ({ ...c })) ?? []);
	let armed = $state(false);
	let nameEl: HTMLInputElement | undefined = $state();

	const k = $derived(kind ? KINDS[kind] : null);
	const title = $derived(existing ? `Instellingen: ${existing.name}` : kind ? `Nieuwe tijdlijn: ${KINDS[kind].label.toLowerCase()}` : req.first ? 'Waarvoor maak je een tijdlijn?' : 'Nieuwe tijdlijn');
	const canDelete = !!existing;

	function choose(kk: TimelineKind) {
		kind = kk;
		cats = KINDS[kk].categories.map((c) => ({ ...c }));
		name = KINDS[kk].defaultName ?? '';
		day = null; month = 0; year = null;
		setTimeout(() => nameEl?.focus());
	}
	function addCat() {
		cats.push({ id: 'c' + newId().slice(0, 8), name: '', color: PALETTE[cats.length % PALETTE.length] });
		setTimeout(() => [...document.querySelectorAll<HTMLInputElement>('.catrow input')].at(-1)?.focus());
	}
	const close = () => (ui.tlEdit = null);

	async function save() {
		const n = name.trim();
		if (!n) { nameEl?.focus(); app.toast('Geef de tijdlijn een naam'); return; }
		let anchor: string | null = null;
		if (day != null || year != null) {
			if (year == null || !(year >= 1000 && year <= 3000) || day == null || !(day >= 1 && day <= daysInMonth(year, month))) {
				app.toast('Vul een volledige, geldige datum in, of laat hem leeg');
				return;
			}
			anchor = formatDate(year, month, day);
		}
		const cs = cats.map((c) => ({ ...c, name: c.name.trim() })).filter((c) => c.name);
		if (!cs.length) { app.toast('Houd minstens één categorie'); return; }
		close();
		if (existing) {
			const t = { ...existing, name: n, anchor, categories: cs };
			if (anchor && +anchor.slice(0, 4) < t.scope.from) t.scope = { from: +anchor.slice(0, 4), to: t.scope.to };
			if (await app.saveTimeline(t)) app.toast('Tijdlijn opgeslagen');
		} else {
			ui.picker = false;
			const t = { id: newId(), name: n, kind: kind!, anchor, categories: cs, scope: defaultScope(anchor, app.now) };
			if (await app.saveTimeline(t)) { app.switchTo(t.id); app.toast('Tijdlijn gemaakt'); }
		}
	}
	async function del() {
		if (!armed) { armed = true; return; }
		close();
		ui.picker = false;
		await app.deleteTimeline(existing!.id);
	}
</script>

<Dialog open={!!ui.tlEdit} onclose={close} label={title}>
	<div class="dlg">
		<h3>{title}</h3>
		{#if !kind}
			<div class="types">
				{#each KIND_ORDER as kk (kk)}
					<button type="button" class="type" onclick={() => choose(kk)}><span class="e">{KINDS[kk].emoji}</span><b>{KINDS[kk].label}</b><small>{KINDS[kk].hint}</small></button>
				{/each}
			</div>
			<Btn variant="link" onclick={() => { close(); app.loadDemo(); }}>Of bekijk eerst een demo met een heel leven erin</Btn>
		{:else}
			{#if !existing}<Btn variant="link" onclick={() => (kind = null)}>Ander soort kiezen</Btn>{/if}
			<label>Naam<input type="text" maxlength="40" placeholder={k!.namePlaceholder} bind:value={name} bind:this={nameEl} /></label>
			<div class="lab">{k!.anchorLabel}
				<div class="row">
					<label class="field">Dag<input type="number" class="w-day" min="1" max="31" inputmode="numeric" bind:value={day} /></label>
					<label class="field">Maand<select bind:value={month}>{#each MONTHS as mn, i (i)}<option value={i}>{mn}</option>{/each}</select></label>
					<label class="field">Jaar<input type="number" class="w-year" min="1000" max="3000" inputmode="numeric" bind:value={year} /></label>
				</div>
				<span class="tip">{k!.mode === 'age' ? 'Hiermee zie je bij elk moment de leeftijd, en komen verjaardagen er vanzelf in.' : 'Hiermee zie je bij elk moment hoe lang het al loopt, en komen jubilea er vanzelf in.'}</span>
			</div>
			<div class="lab">Categorieën
				<div class="catrows">
					{#each cats as c, i (c.id)}
						<div class="catrow">
							<button type="button" class="sw" style:background={c.color} aria-label="Andere kleur voor {c.name}" onclick={() => (c.color = PALETTE[(PALETTE.indexOf(c.color) + 1) % PALETTE.length])}></button>
							<input type="text" maxlength="30" aria-label="Naam van de categorie" bind:value={c.name} />
							<button type="button" class="x" aria-label="Categorie {c.name} verwijderen" disabled={cats.length < 2} onclick={() => cats.splice(i, 1)}>✕</button>
						</div>
					{/each}
				</div>
				<Btn variant="add" disabled={cats.length >= 12} onclick={addCat}>＋ Categorie toevoegen</Btn>
			</div>
			{#if existing && app.user}<ShareBox timelineId={existing.id} />{/if}
		{/if}
		<div class="actions">
			{#if canDelete}<Btn variant="danger" onclick={del}>{armed ? 'Tik nog eens: alles wissen' : 'Tijdlijn verwijderen'}</Btn>{/if}
			<Btn variant="ghost" onclick={close}>{req.first && !kind ? 'Later' : 'Annuleren'}</Btn>
			{#if kind}<Btn onclick={save}>{existing ? 'Opslaan' : 'Tijdlijn maken'}</Btn>{/if}
		</div>
	</div>
</Dialog>

<style>
	.types { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
	.type { border: 1px solid var(--line); background: var(--bg); border-radius: 12px; padding: 14px 12px; text-align: left; display: flex; flex-direction: column; gap: 6px; font: inherit; color: inherit; cursor: pointer; }
	.type:hover { border-color: var(--ink); }
	.type .e { font-size: 28px; line-height: 1; }
	.type b { font-size: 15px; }
	.type small { font-size: 12px; color: var(--muted); line-height: 1.3; }
	.catrows { display: flex; flex-direction: column; gap: 6px; }
	.catrow { display: flex; gap: 8px; align-items: center; }
	.catrow input { flex: 1; min-width: 0; }
	.sw { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--line); flex: 0 0 auto; padding: 0; cursor: pointer; }
	.x { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--ink); flex: 0 0 auto; cursor: pointer; }
	.x:disabled { opacity: 0.4; cursor: default; }

	/* Hover */
	.type, .sw, .x { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.type:hover { background: var(--hover); }
		.sw:hover { box-shadow: 0 0 0 2px var(--muted); }
		.x:hover:not(:disabled) { background: var(--hover); border-color: var(--muted); }
	}
</style>
