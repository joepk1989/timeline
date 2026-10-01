<script lang="ts">
	import { tick } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { daysInMonth, formatDate, labelFull, MONTHS, season, SEASON_NAMES, WEEKDAYS_SHORT } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import { covers, yearOccurrences } from '$lib/domain/occurrences';
	import { monthOccurrences } from '$lib/domain/view';
	import { printHtml, presentationHtml, slug } from '$lib/domain/export';
	import { buildSlides } from '$lib/domain/slides';
	import { blobToDataUrl, download } from '$lib/data/photos';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';
	import Seg from './Seg.svelte';

	const start = ui.menu!;
	let sel = $state({ y: start.y, m: start.m ?? (start.y === app.now.y ? app.now.m : 0), d: null as number | null });
	let from = $state(app.scope.from), to = $state(app.scope.to);
	let busy = $state('');
	let file: HTMLInputElement;
	let yearsEl: HTMLDivElement, monthsEl: HTMLDivElement, daysEl: HTMLDivElement;

	const all = $derived(app.own);
	const occs = $derived(yearOccurrences(all, sel.y));
	const years = $derived(Array.from({ length: app.years }, (_, i) => app.scope.from + i));
	const presets = $derived.by(() => {
		const list: [string, () => { from: number; to: number }][] = [];
		const Y = app.now.y;
		if (app.tl.anchor) {
			const a = +app.tl.anchor.slice(0, 4);
			list.push([app.kind.mode === 'age' ? 'Vanaf geboorte' : 'Vanaf de start', () => ({ from: a, to: Math.max(a, Y) + 1 })]);
		}
		list.push(['Laatste 10 jaar', () => ({ from: Y - 9, to: Y })], ['Komende 10 jaar', () => ({ from: Y, to: Y + 9 })], ['Rond nu', () => ({ from: Y - 5, to: Y + 5 })], ['Sinds 1970', () => ({ from: 1970, to: Y + 1 })]);
		return list;
	});
	const levels = $derived([
		{ lvl: 'Jaar', y: sel.y, m: null, d: null, ready: true },
		{ lvl: 'Maand', y: sel.y, m: sel.m, d: null, ready: true },
		{ lvl: 'Dag', y: sel.y, m: sel.m, d: sel.d, ready: sel.d != null }
	]);

	function center(strip: HTMLElement | undefined, smooth = false) {
		const node = strip?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? strip?.querySelector<HTMLElement>('.today');
		if (!strip || !node) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		strip.scrollTo({ left: Math.max(0, node.offsetLeft - strip.clientWidth / 2 + node.offsetWidth / 2), behavior: smooth && !reduce ? 'smooth' : 'auto' });
	}
	$effect(() => {
		tick().then(() => { center(yearsEl); center(monthsEl); center(daysEl); });
	});
	async function pick(what: 'y' | 'm' | 'd', v: number) {
		if (what === 'y') sel = { ...sel, y: v, d: null };
		else if (what === 'm') sel = { ...sel, m: v, d: null };
		else sel = { ...sel, d: sel.d === v ? null : v };
		await tick();
		if (what === 'y') { center(yearsEl, true); center(monthsEl); daysEl.scrollLeft = 0; }
		if (what === 'm') { center(monthsEl, true); daysEl.scrollLeft = 0; }
		if (what === 'd') center(daysEl, true);
	}

	async function applyScope(s: { from: number; to: number }) {
		if (!Number.isFinite(s.from) || !Number.isFinite(s.to)) { app.toast('Vul twee jaartallen in'); return; }
		await app.setScope(s);
		from = app.scope.from; to = app.scope.to;
		if (sel.y < from || sel.y > to) sel = { ...sel, y: app.year, d: null };
	}

	/* ---------- backup, print, presentation file ---------- */

	async function photoMap(paths: string[]) {
		const out: Record<string, string> = {};
		for (const [i, p] of paths.entries()) {
			busy = `Foto's verzamelen… ${i + 1} van ${paths.length}`;
			const b = await app.photoBlob(p);
			if (b) out[p] = await blobToDataUrl(b);
		}
		return out;
	}
	const stamp = () => formatDate(app.now.y, app.now.m, app.now.d);
	async function run(fn: () => Promise<void>) {
		if (busy) return;
		busy = 'Bezig…';
		try { await fn(); } catch { app.toast('Dat lukte niet. Probeer het opnieuw.'); }
		busy = '';
	}
	const backup = () => run(async () => {
		const zip = await app.backupZip((i, n) => (busy = `Foto's inpakken… ${i} van ${n}`));
		download(`tijdlijn-backup-${stamp()}.zip`, new Blob([zip], { type: 'application/zip' }));
		app.toast('Back-up gedownload');
	});
	const print = (withPhotos: boolean) => run(async () => {
		const title = `${app.tl.name} · ${app.scope.from} – ${app.scope.to}${app.filter.categoryId ? ' · ' + app.catOf(app.filter.categoryId).name : ''}`;
		const photos = withPhotos ? await photoMap(app.visible.flatMap((m) => m.photos)) : {};
		download(`${slug(app.tl.name)}-${app.scope.from}-${app.scope.to}.html`, printHtml(app.tl, app.visible, app.scope, app.now, title, photos));
		app.toast('Printversie gedownload. Open hem en kies Afdrukken.');
	});
	const presentation = () => run(async () => {
		const slides = buildSlides(app.visible, app.scope, app.year, app.now, { what: 'all', years: true, photos: false });
		if (!slides.length) { app.toast('Er zijn nog geen momenten om te laten zien'); return; }
		const photos = await photoMap(slides.flatMap((s) => (s.kind === 'moment' && s.photo ? [s.photo] : [])));
		download(`${slug(app.tl.name)}-presentatie.html`, presentationHtml(app.tl, slides, app.scope, app.now, 8000, photos));
		app.toast('Presentatie gedownload. Werkt ook zonder internet.');
	});
	async function restore(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		input.value = '';
		if (f) await run(() => app.restore(f));
	}
	const close = () => (ui.menu = null);
	let photoInput: HTMLInputElement | undefined = $state();
	function addPhotos() {
		const files = [...(photoInput?.files ?? [])];
		if (photoInput) photoInput.value = '';
		if (!files.length) return;
		close();
		app.importPhotos(files);
	}
</script>

<Dialog open={!!ui.menu} onclose={close} label="Menu" kind="side">
	<div class="in">
		<div class="head"><h2>{app.tl.name}</h2><Btn variant="pill" onclick={close}>Klaar</Btn></div>

		<section class="box" aria-labelledby="h-view">
			<div class="sh"><h3 id="h-view">Het jaar als</h3></div>
			<div class="view"><Seg label="Het jaar als" value={app.yearView} onchange={(v) => app.setYearView(v)} options={[['lijn', 'Jaarlijn'], ['maanden', 'Maanden']]} /></div>
		</section>

		<section class="box" aria-labelledby="h-scope">
			<div class="sh"><h3 id="h-scope"><span>1</span>Periode</h3><div class="hint">{app.years} jaar</div></div>
			<div class="scope">
				<label class="field">Van<input type="number" inputmode="numeric" min="1000" max="3000" bind:value={from} onkeydown={(e) => e.key === 'Enter' && applyScope({ from, to })} /></label>
				<label class="field">Tot en met<input type="number" inputmode="numeric" min="1000" max="3000" bind:value={to} onkeydown={(e) => e.key === 'Enter' && applyScope({ from, to })} /></label>
				<Btn onclick={() => applyScope({ from, to })}>Toon periode</Btn>
				<div class="chips">{#each presets as [name, fn] (name)}<button class="chip" onclick={() => applyScope(fn())}>{name}</button>{/each}</div>
			</div>
		</section>

		<section class="box" aria-labelledby="h-years">
			<div class="sh"><h3 id="h-years"><span>2</span>Jaar</h3></div>
			<div class="strip" bind:this={yearsEl} aria-label="Jaren">
				{#each years as y (y)}
					<button class="yr" class:sel={y === sel.y} aria-pressed={y === sel.y} onclick={() => pick('y', y)}>
						<div class="em">{all.some((m) => m.date === String(y)) ? '⭐' : ''}</div><div class="num">{y}</div>
					</button>
				{/each}
			</div>
		</section>

		<section class="box" aria-labelledby="h-months">
			<div class="sh"><h3 id="h-months"><span>3</span>Maand</h3>
				<div class="legend">{#each ['winter', 'lente', 'zomer', 'herfst'] as s (s)}<span><b style:background="var(--{s})"></b>{SEASON_NAMES[s as 'winter']}</span>{/each}</div>
			</div>
			<div class="strip" bind:this={monthsEl} aria-label="Maanden">
				{#each MONTHS as name, m (m)}
					<button class="mo" class:sel={m === sel.m} aria-pressed={m === sel.m} style:--s="var(--{season(m)})" onclick={() => pick('m', m)}>
						<div><div class="name">{name}</div><div class="ssn">{SEASON_NAMES[season(m)]}</div></div>
						<div class="em">{monthOccurrences(occs, sel.y, m).length ? '⭐' : ''}</div>
					</button>
				{/each}
			</div>
		</section>

		<section class="box" aria-labelledby="h-days">
			<div class="sh"><h3 id="h-days"><span>4</span>Dag</h3><div class="hint">{MONTHS[sel.m]} {sel.y}</div></div>
			<div class="strip" bind:this={daysEl} aria-label="Dagen">
				{#each { length: daysInMonth(sel.y, sel.m) }, i (i)}
					{@const d = i + 1}
					{@const wd = new Date(sel.y, sel.m, d).getDay()}
					{@const here = occs.filter((o) => covers(o, sel.y, sel.m, d))}
					<button
						class="dy"
						class:we={wd === 0 || wd === 6}
						class:has={here.length > 0}
						class:today={sel.y === app.now.y && sel.m === app.now.m && d === app.now.d}
						class:sel={d === sel.d}
						style:--s="var(--{season(sel.m)})"
						aria-pressed={d === sel.d}
						aria-label="{labelFull(sel.y, sel.m, d)}{here.length ? `, ${here.length} momenten` : ''}"
						onclick={() => pick('d', d)}
					><div class="wd">{WEEKDAYS_SHORT[wd]}</div><div class="d">{d}</div><div class="em">{here[0]?.moment.emoji ?? ''}</div></button>
				{/each}
			</div>
		</section>

		<section class="box" aria-labelledby="h-add">
			<div class="sh"><h3 id="h-add"><span>5</span>Momenten</h3></div>
			{#if app.canEdit}
				<div class="bk">
					<Btn onclick={() => photoInput?.click()}>Foto's toevoegen</Btn>
					<input type="file" accept="image/*" multiple hidden bind:this={photoInput} onchange={addPhotos} />
				</div>
				<p class="note">Kies een of meer foto's. Elke dag wordt een moment, op de datum uit de foto of de bestandsnaam.</p>
			{/if}
			{#each levels as l (l.lvl)}
				{@const a = l.ready ? ageLabel(app.tl, l.y, l.m, l.d) : null}
				<div class="grp">
					<h4>{l.ready ? `${l.lvl} · ${labelFull(l.y, l.m, l.d)}${a ? ' · ' + a : ''}` : l.lvl}</h4>
					{#if l.ready}
						{#each all.filter((m) => m.date === formatDate(l.y, l.m, l.d)) as mo (mo.id)}
							<button class="mini" onclick={() => (ui.editor = { id: mo.id, y: l.y, m: l.m, d: l.d })}>
								<span class="em">{mo.emoji}</span><span class="t">{mo.title}</span><span class="k">{app.catOf(mo.categoryId).name}</span>
							</button>
						{/each}
						{#if app.canEdit}
							<Btn variant="add" onclick={() => (ui.editor = { id: null, y: l.y, m: l.m, d: l.d })}>
								＋ Toevoegen aan {l.lvl === 'Jaar' ? l.y : l.lvl === 'Maand' ? `${MONTHS[l.m!]} ${l.y}` : `${l.d} ${MONTHS[l.m!]}`}
							</Btn>
						{/if}
					{:else}
						<Btn variant="add" disabled>Kies hierboven een dag</Btn>
					{/if}
				</div>
			{/each}
		</section>

		<section class="box" aria-labelledby="h-bk">
			<div class="sh"><h3 id="h-bk"><span>6</span>Back-up, print en delen</h3></div>
			<div class="bk">
				<Btn variant="ghost" onclick={backup} disabled={!!busy}>Download back-up</Btn>
				<Btn variant="ghost" onclick={() => file.click()} disabled={!!busy}>Zet back-up terug</Btn>
				<Btn variant="ghost" onclick={() => print(false)} disabled={!!busy}>Printversie</Btn>
				<Btn variant="ghost" onclick={() => print(true)} disabled={!!busy}>Printversie met foto's</Btn>
				<Btn variant="ghost" onclick={presentation} disabled={!!busy}>Presentatie als bestand</Btn>
				<input type="file" accept=".json,.zip,application/json,application/zip" hidden bind:this={file} onchange={restore} />
			</div>
			<p class="note" aria-live="polite">{busy || "De back-up is een zip met al je tijdlijnen, momenten en foto's. Terugzetten voegt ze samen met wat er al staat. De printversie en de presentatie zijn losse bestanden die je kunt delen of printen als PDF."}</p>
		</section>

		<section class="box" aria-labelledby="h-acc">
			<div class="sh"><h3 id="h-acc"><span>7</span>Account</h3></div>
			<div class="bk col">
				{#if !app.sb}
					<p class="note flat">Alles wordt op dit apparaat bewaard. Koppel een database (zie README) om in te loggen, te delen en op meer apparaten te werken.</p>
				{:else if app.user}
					<p class="note flat">Ingelogd als <b>{app.user.email}</b>. Je tijdlijnen staan online.</p>
					<div class="bk flat">
						{#if app.hasLocalData}<Btn onclick={() => run(() => app.moveLocalToCloud())} disabled={!!busy}>Zet tijdlijnen van dit apparaat online</Btn>{/if}
						<Btn variant="ghost" onclick={() => app.signOut()}>Uitloggen</Btn>
					</div>
				{:else}
					<p class="note flat">Je tijdlijnen staan nu alleen op dit apparaat. Log in om ze online te bewaren en te delen.</p>
					<div class="bk flat"><Btn onclick={() => (ui.account = true)}>Inloggen</Btn></div>
				{/if}
			</div>
		</section>
	</div>
</Dialog>

<style>
	.in { height: 100%; overflow-y: auto; padding: calc(env(safe-area-inset-top, 0px) + 16px) 0 calc(env(safe-area-inset-bottom, 0px) + 24px); }
	.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 18px 12px; }
	.head h2 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; overflow-wrap: anywhere; }
	.box { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; margin: 0 12px 12px; overflow: hidden; }
	.sh { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 14px 16px 8px; }
	.sh h3 { margin: 0; font-size: 18px; font-weight: 800; display: flex; align-items: baseline; gap: 8px; }
	.view { display: flex; padding: 0 16px 14px; }
	.sh h3 span { font-size: 13px; font-weight: 600; color: var(--muted); }
	.hint { color: var(--muted); font-size: 13px; margin-left: auto; }
	.hint::first-letter { text-transform: uppercase; }
	.legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin-left: auto; }
	.legend b { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; }
	.strip { position: relative; display: flex; gap: 8px; overflow-x: auto; padding: 4px 16px 14px; scroll-snap-type: x proximity; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
	.strip > * { scroll-snap-align: center; flex: 0 0 auto; }
	.scope { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding: 4px 16px 16px; }
	.field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
	.field input { width: 100px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); font: inherit; font-size: 17px; font-weight: 600; color: var(--ink); }
	.chips { display: flex; gap: 6px; flex-wrap: wrap; width: 100%; }
	.chip { padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line); background: transparent; font: inherit; font-size: 13px; color: var(--ink); cursor: pointer; }
	button.yr, button.mo, button.dy, button.mini { font: inherit; color: inherit; cursor: pointer; }
	.yr { width: 92px; height: 84px; border: 1px solid var(--line); border-radius: 10px; background: transparent; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 8px 10px; text-align: left; }
	.yr .num { font-size: 28px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
	.em { font-size: 16px; height: 20px; }
	.yr.sel { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
	.mo { --s: var(--winter); min-width: 96px; height: 84px; border-radius: 10px; border: 2px solid transparent; background: color-mix(in srgb, var(--s) 24%, var(--surface)); display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start; padding: 9px 10px 8px; text-align: left; position: relative; overflow: hidden; }
	.mo::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 5px; background: var(--s); }
	.mo .name { font-size: 16px; font-weight: 800; text-transform: capitalize; }
	.mo .ssn { font-size: 11px; color: var(--muted); }
	.mo.sel { border-color: var(--ink); }
	.dy { --s: var(--winter); width: 52px; height: 80px; border-radius: 9px; border: 1px solid var(--line); background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 7px 3px 0; overflow: hidden; }
	.dy .wd { font-size: 11px; color: var(--muted); }
	.dy .d { font-size: 20px; font-weight: 800; line-height: 1; }
	.dy .em { font-size: 14px; height: 18px; }
	.dy::after { content: ''; align-self: stretch; height: 4px; background: var(--s); opacity: 0.35; margin: 0 -3px; }
	.dy.has::after { opacity: 1; }
	.dy.we { background: var(--weekend); }
	.dy.today { border: 2px dashed var(--ink); }
	.dy.sel { background: var(--ink); color: var(--surface); border-color: var(--ink); }
	.dy.sel .wd { color: inherit; opacity: 0.75; }
	.grp { padding: 2px 16px 12px; }
	.grp h4 { margin: 6px 0 8px; font-size: 13px; color: var(--muted); font-weight: 600; }
	.grp h4::first-letter { text-transform: uppercase; }
	.mini { display: flex; gap: 10px; align-items: center; width: 100%; text-align: left; padding: 9px 12px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg); margin-bottom: 6px; }
	.mini .em { font-size: 18px; width: 24px; text-align: center; height: auto; }
	.mini .t { flex: 1; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.mini .k { font-size: 12px; color: var(--muted); }
	.bk { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 16px 8px; }
	.bk.col { flex-direction: column; padding-bottom: 16px; }
	.flat { padding: 0; margin: 0; }
	.note { font-size: 13px; color: var(--muted); padding: 0 16px 16px; margin: 0; }
	.note.flat { padding: 0; }
	@media (min-width: 2300px) and (min-height: 1250px) { .in { zoom: 1.25; } }

	/* Hover */
	.chip, .yr, .mo, .dy, .mini { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.chip:hover, .mini:hover { background: var(--hover); border-color: var(--muted); }
		.yr:hover:not(.sel), .dy:hover:not(.sel) { background: var(--hover); }
		.mo:hover:not(.sel) { filter: var(--hover-filter); }
	}
</style>
