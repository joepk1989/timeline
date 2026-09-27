<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { dayNumber, daysInMonth, formatDate, labelFull, MONTHS, parseDate } from '$lib/domain/dates';
	import { ageLabel, yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { newId } from '$lib/data/backend';
	import { preparePhoto } from '$lib/data/photos';
	import type { Moment, Status } from '$lib/domain/types';
	import Btn from './Btn.svelte';
	import Chip from './Chip.svelte';
	import Dialog from './Dialog.svelte';
	import Photo from './Photo.svelte';
	import Seg from './Seg.svelte';

	const EMOJIS = ['⭐', '🎯', '❤️', '🎉', '🎂', '👣', '🦷', '🎒', '🎓', '🏠', '✈️', '🌱', '🏆', '🎨', '⚽', '💍', '🔨', '💶', '🕯️', '📌'];
	const req = ui.editor!;
	const prev = req.id ? app.moments.find((m) => m.id === req.id) ?? null : null;
	const readonly = !app.canEdit;
	const cats = app.tl.categories;
	const s = prev ? parseDate(prev.date) : { y: req.y, m: req.m, d: req.d };
	const e = prev?.end ? parseDate(prev.end) : null;

	let title = $state(prev?.title ?? '');
	let note = $state(prev?.note ?? '');
	let emoji = $state(prev?.emoji ?? (app.kind.hasStatus ? '🎯' : '⭐'));
	let status = $state<Status | null>(prev ? prev.status : app.kind.hasStatus ? 'gepland' : null);
	let cat = $state(prev ? (cats.some((c) => c.id === prev.categoryId) ? prev.categoryId : cats[cats.length - 1].id) : app.filter.categoryId && cats.some((c) => c.id === app.filter.categoryId) ? app.filter.categoryId : cats[0].id);
	let lvl = $state<'y' | 'm' | 'd'>(s.d != null ? 'd' : s.m != null ? 'm' : 'y');
	let year = $state<number | null>(s.y);
	let month = $state(s.m ?? (s.y === app.now.y ? app.now.m : 0));
	let day = $state<number | null>(s.d);
	let period = $state(!!prev?.end);
	let endY = $state<number | null>(e?.y ?? null), endM = $state(e?.m ?? 0), endD = $state<number | null>(e?.d ?? null);
	let repeat = $state(!!prev?.repeat);
	let photos = $state<string[]>(prev?.photos.slice() ?? []);
	let fresh: string[] = [], removed: string[] = [];
	let busy = $state(0);
	let saved = false;
	let dateTouched = !!prev;
	let nameEl: HTMLInputElement | undefined = $state();
	let fileEl: HTMLInputElement | undefined = $state();

	const showStatus = app.kind.hasStatus || !!prev?.status;
	const validYear = $derived(year != null && year >= 1000 && year <= 3000);
	const age = $derived.by(() => {
		if (!validYear) return '';
		if (lvl === 'y') return yearLine(app.tl, year!) ?? '';
		const d = lvl === 'd' && day != null && day >= 1 && day <= 31 ? Math.min(day, daysInMonth(year!, month)) : null;
		return ageLabel(app.tl, year!, month, d) ?? '';
	});

	$effect(() => { if (!prev && !readonly) nameEl?.focus(); });
	function setLevel(l: 'y' | 'm' | 'd') {
		lvl = l;
		dateTouched = true;
		if (l === 'd' && day == null) day = 1;
		// A period runs from day to day; picking a whole year or month ends it.
		if (l !== 'd') period = false;
	}
	/**
	 * Turning a year or a month into a period makes it run from its first to its last day,
	 * which you can then change. A day becomes a period of two days.
	 */
	function togglePeriod() {
		if (!period) return;
		const y = year ?? app.now.y;
		if (lvl === 'y') {
			month = 0; day = 1; lvl = 'd';
			endY = y; endM = 11; endD = 31;
		} else if (lvl === 'm') {
			day = 1; lvl = 'd';
			endY = y; endM = month; endD = daysInMonth(y, month);
		} else if (endD == null) {
			endD = Math.min((day ?? 1) + 1, daysInMonth(y, month)); endM = month; endY = y;
		}
		dateTouched = true;
	}

	async function addPhotos(ev: Event) {
		const input = ev.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		busy += files.length;
		for (const f of files) {
			try {
				const { blob, taken } = await preparePhoto(f);
				const path = await app.backend.uploadPhoto(app.tl.id, blob);
				if (saved || closed) { app.backend.deletePhotos([path]); continue; }
				photos.push(path); fresh.push(path);
				if (taken && !dateTouched && photos.length === 1) {
					const t = parseDate(taken);
					year = t.y; month = t.m!; day = t.d; lvl = 'd'; dateTouched = true;
					app.toast('Datum overgenomen uit de foto');
				}
			} catch {
				app.toast('Deze foto kon niet worden toegevoegd');
			}
			busy--;
		}
	}
	function removePhoto(p: string) {
		photos = photos.filter((x) => x !== p);
		if (fresh.includes(p)) { fresh = fresh.filter((x) => x !== p); app.backend.deletePhotos([p]); }
		else removed.push(p);
	}

	let closed = false;
	function close() {
		closed = true;
		if (!saved && fresh.length) app.backend.deletePhotos(fresh);
		ui.editor = null;
	}

	async function save() {
		const t = title.trim();
		if (!t) { nameEl?.focus(); app.toast('Geef het moment een naam'); return; }
		if (!validYear) { app.toast('Vul een geldig jaar in'); return; }
		const y = year!, m = lvl === 'y' ? null : month;
		let d: number | null = null;
		if (lvl === 'd') {
			d = day;
			if (d == null || !(d >= 1 && d <= daysInMonth(y, m!))) { app.toast(`${MONTHS[m!]} ${y} heeft ${daysInMonth(y, m!)} dagen`); return; }
		}
		let end: string | null = null;
		if (lvl === 'd' && period) {
			if (endY == null || !(endY >= 1000 && endY <= 3000) || endD == null || !(endD >= 1 && endD <= daysInMonth(endY, endM))) { app.toast('Vul een geldige einddatum in'); return; }
			if (dayNumber(endY, endM, endD) <= dayNumber(y, m!, d!)) { app.toast('De einddatum moet na de begindatum liggen'); return; }
			end = formatDate(endY, endM, endD);
		}
		const mo: Moment = {
			id: prev?.id ?? newId(), timelineId: prev?.timelineId ?? app.tl.id, title: t, note: note.trim(), emoji, categoryId: cat,
			date: formatDate(y, m, d), end, repeat: lvl !== 'y' && !end && repeat, status: status ?? null, photos: photos.slice()
		};
		saved = true;
		const gone = removed.slice();
		ui.editor = null;
		if (await app.saveMoment(mo)) {
			if (gone.length) app.backend.deletePhotos(gone);
			app.toast('Moment opgeslagen');
		}
	}
	function del() {
		if (!prev) return;
		saved = true;
		if (fresh.length) app.backend.deletePhotos(fresh);
		ui.editor = null;
		app.deleteMoment(prev.id);
	}
	function openPhoto(i: number) {
		const o = { moment: { ...(prev ?? ({} as Moment)), title: title || 'Foto', virtual: true, photos }, y: year ?? app.now.y, m: lvl === 'y' ? null : month, d: lvl === 'd' ? day : null };
		ui.gallery = { list: photos.map((path) => ({ path, o })), i, canEdit: false };
	}
</script>

<Dialog open={!!ui.editor} onclose={close} label={readonly ? 'Moment' : prev ? 'Moment bewerken' : 'Nieuw moment'}>
	<div class="dlg">
		{#if readonly && prev}
			<h3>{prev.emoji} {prev.title}</h3>
			<div class="lab">{labelFull(s.y, s.m, s.d)}{#if age}<span class="ageline">{age}</span>{/if}</div>
			<div class="picks">
				{#if prev.status}{@const st = STATUSES.find((x) => x.id === prev.status)!}<Chip on color={st.color} onclick={() => {}}>{st.name}</Chip>{/if}
				<Chip color={app.catOf(prev.categoryId).color} onclick={() => {}}>{app.catOf(prev.categoryId).name}</Chip>
			</div>
			{#if prev.note}<p class="note">{prev.note}</p>{/if}
		{:else}
			<h3>{prev ? 'Moment bewerken' : 'Nieuw moment'}</h3>
			<div class="emojis" role="group" aria-label="Symbool">
				{#each EMOJIS as em (em)}<button type="button" class:on={em === emoji} aria-pressed={em === emoji} aria-label="Symbool {em}" onclick={() => (emoji = em)}>{em}</button>{/each}
				{#if !EMOJIS.includes(emoji)}<button type="button" class="on" aria-pressed="true">{emoji}</button>{/if}
			</div>
			<label>{app.kind.hasStatus ? 'Welk doel of welke mijlpaal?' : 'Wat maakt dit bijzonder?'}
				<input type="text" maxlength="80" placeholder="Bijv. Eerste stapjes" bind:value={title} bind:this={nameEl} onkeydown={(e) => e.key === 'Enter' && save()} />
			</label>
			{#if showStatus}
				<div class="lab">Status<div class="picks" role="group" aria-label="Status">
					{#each STATUSES as st (st.id)}<Chip on={status === st.id} color={st.color} onclick={() => (status = st.id as Status)}>{st.name}</Chip>{/each}
				</div></div>
			{/if}
			<div class="lab">Categorie<div class="picks" role="group" aria-label="Categorie">
				{#each cats as c (c.id)}<Chip on={cat === c.id} color={c.color} onclick={() => (cat = c.id)}>{c.name}</Chip>{/each}
			</div></div>
			<div class="lab">Wanneer
				<Seg label="Soort" value={lvl} onchange={setLevel} options={[['y', 'Jaar'], ['m', 'Maand'], ['d', 'Dag']]} />
				<div class="row">
					{#if lvl === 'd'}<label class="field">Dag<input type="number" class="w-day" min="1" max="31" inputmode="numeric" bind:value={day} oninput={() => (dateTouched = true)} /></label>{/if}
					{#if lvl !== 'y'}<label class="field">Maand<select bind:value={month} onchange={() => (dateTouched = true)}>{#each MONTHS as name, i (i)}<option value={i}>{name}</option>{/each}</select></label>{/if}
					<label class="field">Jaar<input type="number" class="w-year" min="1000" max="3000" inputmode="numeric" bind:value={year} oninput={() => (dateTouched = true)} /></label>
				</div>
				{#if age}<span class="ageline">{age}</span>{/if}
			</div>
			<label class="check"><input type="checkbox" bind:checked={period} onchange={togglePeriod} />Periode: duurt langer dan één dag</label>
			{#if lvl === 'd' && period}
				<div class="lab">Tot en met
					<div class="row">
						<label class="field">Dag<input type="number" class="w-day" min="1" max="31" inputmode="numeric" bind:value={endD} /></label>
						<label class="field">Maand<select bind:value={endM}>{#each MONTHS as name, i (i)}<option value={i}>{name}</option>{/each}</select></label>
						<label class="field">Jaar<input type="number" class="w-year" min="1000" max="3000" inputmode="numeric" bind:value={endY} /></label>
					</div>
				</div>
			{/if}
			{#if lvl !== 'y' && !(lvl === 'd' && period)}
				<label class="check"><input type="checkbox" bind:checked={repeat} />Komt elk jaar terug</label>
			{/if}
			<label>Notitie<textarea maxlength="1000" placeholder={app.kind.hasStatus ? 'Wat is ervoor nodig, of wat moet beter?' : 'Wat je wilt onthouden'} bind:value={note}></textarea></label>
		{/if}

		{#if !readonly || photos.length}
			<div class="lab">Foto's
				<div class="photos">
					{#each photos as p, i (p)}
						<div class="ph">
							<button type="button" class="open" aria-label="Foto {i + 1} groot bekijken" onclick={() => openPhoto(i)}><Photo path={p} alt="Foto {i + 1}" /></button>
							{#if !readonly}<button type="button" class="x" aria-label="Foto verwijderen" onclick={() => removePhoto(p)}>✕</button>{/if}
						</div>
					{/each}
					{#if !readonly}
						<button type="button" class="addph" disabled={busy > 0} onclick={() => fileEl?.click()}>
							{#if busy}<span>Bezig…</span>{:else}<b>+</b><span>Foto</span>{/if}
						</button>
					{/if}
				</div>
				{#if !readonly && !prev && !photos.length}<span class="tip">De datum van de eerste foto wordt overgenomen als je die nog niet hebt ingevuld.</span>{/if}
			</div>
			<input type="file" accept="image/*" multiple hidden bind:this={fileEl} onchange={addPhotos} />
		{/if}

		<div class="actions">
			{#if readonly}
				<Btn variant="ghost" onclick={close}>Sluiten</Btn>
			{:else}
				{#if prev}<Btn variant="danger" onclick={del}>Verwijderen</Btn>{/if}
				<Btn variant="ghost" onclick={close}>Annuleren</Btn>
				<Btn onclick={save} disabled={busy > 0}>Opslaan</Btn>
			{/if}
		</div>
	</div>
</Dialog>

<style>
	.emojis { display: flex; flex-wrap: wrap; gap: 6px; }
	.emojis button { width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--line); background: transparent; font-size: 19px; cursor: pointer; }
	.emojis button.on { border: 2px solid var(--ink); background: var(--bg); }
	.photos { display: flex; flex-wrap: wrap; gap: 10px; }
	.ph { position: relative; width: 84px; height: 84px; }
	.open { width: 100%; height: 100%; padding: 0; border: none; background: var(--faint); border-radius: 8px; overflow: hidden; cursor: zoom-in; }
	.open :global(img) { width: 100%; height: 100%; object-fit: cover; display: block; }
	.x { position: absolute; top: -7px; right: -7px; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--surface); background: var(--ink); color: var(--surface); font-size: 13px; line-height: 1; padding: 0; cursor: pointer; }
	.addph { width: 84px; height: 84px; border: 1px dashed var(--muted); border-radius: 8px; background: transparent; font: inherit; font-size: 13px; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; }
	.addph b { font-size: 22px; font-weight: 400; line-height: 1; }
	.note { margin: 0; white-space: pre-wrap; }

	/* Hover */
	.emojis button, .x, .addph, .open { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.emojis button:hover:not(.on) { background: var(--hover); }
		.open:hover { filter: var(--hover-filter); }
		.x:hover { background: var(--danger); }
		.addph:hover { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); }
	}
</style>
