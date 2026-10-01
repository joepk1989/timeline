<script lang="ts">
	// Presenting: the year screen itself, full screen and without the bar. The year stays at the top,
	// the moment on show fills the middle, and the year sits along the bottom as the year page shows it (the
	// Jaarlijn with the moment lit up and its month open, or the month tabs with the moment's day marked).
	import { onDestroy, onMount } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { stopPresenting } from '$lib/state/present';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, MONTHS, season } from '$lib/domain/dates';
	import { yearLine } from '$lib/domain/age';
	import { STATUSES } from '$lib/domain/kinds';
	import { covers, whenLabel, yearOccurrences } from '$lib/domain/occurrences';
	import { momentSlides, type ShowWhat } from '$lib/domain/slides';
	import { momentsLabel, relParts } from '$lib/domain/view';
	import type { Occurrence } from '$lib/domain/types';
	import Icon from './Icon.svelte';
	import MonthTabs from './MonthTabs.svelte';
	import Photo from './Photo.svelte';
	import YearLines from './YearLines.svelte';

	const KEY = 'tijdlijn.show';
	let saved: Record<string, unknown> = {};
	try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* ignore */ }
	const WHATS: [ShowWhat, string][] = [['all', 'Hele periode'], ['year', 'Dit jaar'], ['future', 'Vanaf vandaag']];
	const SPEEDS = [5000, 8000, 12000];

	const firstWhat: ShowWhat = WHATS.some(([w]) => w === saved.what) ? (saved.what as ShowWhat) : 'all';
	let what = $state(firstWhat);
	let ms = $state(SPEEDS.includes(saved.ms as number) ? (saved.ms as number) : 8000);
	let loop = $state(!!saved.loop);
	let playing = $state(true);
	let idle = $state(false);
	let vh = $state(800);
	let mh = $state(0);
	const startYear = app.year;

	const first = momentSlides(app.visible, app.scope, startYear, app.now, { what: firstWhat, photos: true });
	let built = $state(first);
	let i = $state(first.start);
	const slides = $derived(built.slides);
	const s = $derived(slides[i]);
	const y = $derived(s?.y ?? startYear);
	const occs = $derived(yearOccurrences(app.visible, y));
	const real = $derived(occs.filter((o) => !o.moment.virtual).length);
	const line = $derived(yearLine(app.tl, y));
	/** While the screen morphs in, the months keep showing the month the year page showed. */
	let settled = $state(false);
	const focus = $derived(settled && s && s.o.m != null && s.o.y === y ? { m: s.o.m, d: s.o.d } : null);

	function save() {
		try { localStorage.setItem(KEY, JSON.stringify({ ...saved, what, ms, loop })); } catch { /* ignore */ }
	}
	function rebuild(w: ShowWhat) {
		what = w;
		save();
		built = momentSlides(app.visible, app.scope, y, app.now, { what, photos: true });
		i = built.start;
		restart();
	}

	/* ---------- playing ---------- */
	let timer: ReturnType<typeof setTimeout> | undefined;
	let prog: HTMLDivElement | undefined = $state();
	function restart() {
		clearTimeout(timer);
		if (prog) {
			prog.style.transition = 'none';
			prog.style.width = '0';
			void prog.offsetWidth;
			if (playing) { prog.style.transition = `width ${ms}ms linear`; prog.style.width = '100%'; }
		}
		if (playing && slides.length) timer = setTimeout(() => step(1, true), ms);
	}
	function step(d: number, auto = false) {
		if (!slides.length) return;
		let n = i + d;
		if (n >= slides.length) {
			if (!loop) { playing = false; restart(); if (auto) app.toast('Einde van de voorstelling'); return; }
			n = 0;
		}
		if (n < 0) n = loop ? slides.length - 1 : 0;
		i = n;
		restart();
	}
	/** Until the first step, the first moment fades in after the screen has morphed into place. */
	let moved = $state(false);
	$effect(() => { if (i !== first.start) moved = true; });
	function goTo(n: number) {
		if (n < 0) return;
		i = n;
		restart();
	}
	function toggle() {
		if (!playing && i >= slides.length - 1 && !loop) i = 0;
		playing = !playing;
		restart();
	}
	function jumpMonth(m: number) {
		const n = slides.findIndex((x) => x.y === y && x.o.m === m);
		if (n >= 0) goTo(n);
		else app.toast(`Geen momenten in ${MONTHS[m]}`);
	}
	function jumpMoment(o: Occurrence) {
		const n = slides.findIndex((x) => x.y === y && x.o.moment.id === o.moment.id);
		if (n >= 0) goTo(n);
	}
	function jumpDay(m: number, d: number) {
		const n = slides.findIndex((x) => x.y === y && covers(x.o, y, m, d));
		if (n >= 0) goTo(n);
	}

	/* ---------- controls fade out when nobody moves ---------- */
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	function poke() {
		idle = false;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => playing && (idle = true), 2600);
	}

	function stop() {
		// The year page opens on the month that was on show, so the months do not change while morphing back.
		if (focus) ui.monthTab = { y, m: focus.m };
		stopPresenting(y);
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.preventDefault(); stop(); }
		else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); poke(); }
		else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); poke(); }
		else if (e.key === ' ' || e.key === 'k') {
			if (e.key === ' ' && (e.target as HTMLElement).closest?.('button')) return;
			e.preventDefault(); toggle(); poke();
		}
	}
	// Leaving full screen (Esc in most browsers) also ends the presentation.
	let wasFull = false;
	function onfullscreenchange() {
		if (document.fullscreenElement) wasFull = true;
		else if (wasFull) stop();
	}
	let lock: WakeLockSentinel | null = null;
	async function wake() {
		try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* not allowed */ }
	}
	let sx: number | null = null;

	onMount(() => {
		setTimeout(() => (settled = true), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600);
		wasFull = !!document.fullscreenElement;
		wake();
		restart();
		poke();
	});
	onDestroy(() => {
		clearTimeout(timer);
		clearTimeout(idleTimer);
		lock?.release().catch(() => {});
	});
</script>

<svelte:window {onkeydown} bind:innerHeight={vh} />
<svelte:document {onfullscreenchange} onvisibilitychange={() => document.visibilityState === 'visible' && lock && wake()} />

<div class="stage" class:idle class:onphoto={!!s?.photo} role="region" aria-label="Presentatie van {app.tl.name}" onpointermove={poke}>
	<div class="prog" bind:this={prog}></div>

	<!-- A moment with a photo: the photo fills everything above the months, whole and sharp, over a blurred copy of itself. -->
	{#if s?.photo}
		{#key i}
			<div class="backdrop" style:bottom="{mh}px" aria-hidden="true">
				<Photo path={s.photo} class="blur" lazy={false} />
				<Photo path={s.photo} class="sharp" lazy={false} />
				<div class="scrim"></div>
			</div>
		{/key}
	{/if}

	<header class="top">
		<h2 class="big" class:now={y === app.now.y} style:view-transition-name="pres-year">{y}</h2>
		<div class="info" style:view-transition-name="pres-info">
			{#if line}<span class="ageline">{line}{real ? ' · ' : ''}</span>{/if}{real ? momentsLabel(real) : ''}
		</div>
		<div class="ui">
			<button class="cbtn" aria-label="Vorige" onclick={() => { step(-1); poke(); }}><Icon name="back" /></button>
			<button class="cbtn" aria-label={playing ? 'Pauze' : 'Afspelen'} onclick={() => { toggle(); poke(); }}><Icon name={playing ? 'pause' : 'play'} /></button>
			<button class="cbtn" aria-label="Volgende" onclick={() => { step(1); poke(); }}><Icon name="next" /></button>
			<span class="cnt">{slides.length ? i + 1 : 0} / {slides.length}</span>
			<button class="cbtn txt" onclick={() => rebuild(WHATS[(WHATS.findIndex(([w]) => w === what) + 1) % WHATS.length][0])}>{WHATS.find(([w]) => w === what)![1]}</button>
			<button class="cbtn txt" aria-label="Tijd per moment" onclick={() => { ms = SPEEDS[(SPEEDS.indexOf(ms) + 1) % SPEEDS.length]; save(); restart(); }}>{ms / 1000} sec</button>
			<button class="cbtn txt" aria-pressed={loop} onclick={() => { loop = !loop; save(); }}>{loop ? 'Herhalen aan' : 'Herhalen uit'}</button>
			<button class="cbtn txt solid" onclick={stop}>Stoppen</button>
		</div>
	</header>

	<main
		class="show"
		aria-live="polite"
		ontouchstart={(e) => (sx = e.touches[0].clientX)}
		ontouchend={(e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); poke(); }}
	>
		{#if s}
			{@const o = s.o}
			{@const mo = o.moment}
			{@const st = mo.status ? STATUSES.find((x) => x.id === mo.status) : null}
			{#key i}
				<article class="moment" class:first={i === built.start && !moved} class:hasph={!!s.photo} style:--s={o.m == null ? 'var(--accent)' : `var(--${season(o.m)})`}>
					<div class="text">
						<div class="em" aria-hidden="true">{mo.emoji}</div>
						<div class="when">
							<span class="date">{o.m == null ? `Heel ${o.y}` : o.end ? whenLabel(o) + (o.y === o.end.y ? ` ${o.y}` : '') : labelFull(o.y, o.m, o.d)}</span>
							{#each relParts(o, app.tl, app.now) as r, ri (ri)}<span class="rel {r.kind}">{r.text}</span>{/each}
							{#if s.photoCount > 1}<span class="rel">foto {s.photoIndex + 1} van {s.photoCount}</span>{/if}
						</div>
						<h3 class="ttl" style:--fit={Math.min(1, 13 / Math.max(...mo.title.split(/\s+/).map((w) => w.length)))}>{mo.title}</h3>
						{#if mo.note}<p class="note">{mo.note}</p>{/if}
						<div class="tags">
							{#if st}<span class="pill" style:--c={st.color}>{st.name}</span>{/if}
							{#if !mo.virtual}<span class="cat" style:--c={app.catOf(mo.categoryId).color}>{app.catOf(mo.categoryId).name}</span>{/if}
						</div>
					</div>
					{#if s.photo}<span class="sr">Foto: {mo.title}</span>{/if}
				</article>
			{/key}
		{:else}
			<div class="empty">
				<p>Er zijn nog geen momenten om te laten zien{what !== 'all' ? ' met deze keuze' : ''}.</p>
			</div>
		{/if}
	</main>

	<div class="months" bind:clientHeight={mh} class:edge={app.yearView === 'lijn'} style:view-transition-name="pres-months">
		{#if app.yearView === 'lijn'}
			<YearLines {y} {occs} compact height={Math.round(Math.max(200, vh * 0.38))} focus={settled && s?.y === y ? s.o.moment.id : null} openMonth={focus?.m ?? null} onpick={jumpMoment} />
		{:else}
			<MonthTabs {y} {occs} {focus} onmonth={jumpMonth} onday={jumpDay} />
		{/if}
	</div>
</div>

<style>
	.stage { position: fixed; inset: 0; z-index: 40; background: var(--bg); color: var(--ink); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 2vh;
		padding: calc(env(safe-area-inset-top, 0px) + 3vh) max(3vw, 16px) env(safe-area-inset-bottom, 0px); overflow: hidden; }
	.stage.idle { cursor: none; }
	.prog { position: absolute; left: 0; top: 0; height: 4px; width: 0; background: var(--accent); }

	/* Same type as the year page, so the year does not jump when presenting starts. */
	.top { display: flex; align-items: flex-end; gap: 1vh 3vw; flex-wrap: wrap; }
	.big { margin: 0; font-size: clamp(84px, 20vw, 168px); font-weight: 800; letter-spacing: -0.055em; line-height: 0.85; }
	.big.now { color: var(--accent); }
	.info { padding-bottom: 1vh; color: var(--muted); font-size: 18px; }
	.ageline { color: var(--accent); font-weight: 600; }
	.ui { margin-left: auto; align-self: flex-start; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; transition: opacity 0.35s; }
	.idle .ui { opacity: 0; pointer-events: none; }
	.cbtn { height: 42px; min-width: 42px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
	.cbtn.solid { background: var(--ink); color: var(--surface); border-color: var(--ink); }
	.cnt { color: var(--muted); font-size: 14px; padding: 0 6px; font-variant-numeric: tabular-nums; }

	.show { position: relative; min-height: 0; display: flex; align-items: center; overflow: hidden; }
	.moment { width: 100%; max-height: 100%; display: grid; grid-template-columns: minmax(0, 1fr); gap: 3vw; align-items: center; animation: fadein 0.6s ease both; }
	/* With a photo the text keeps to the left, over the dark side of the photo. */
	.moment.hasph .text { max-width: min(46vw, 900px); }
	.moment.hasph .note { -webkit-line-clamp: 3; line-clamp: 3; }
	.moment.first { animation-delay: 0.35s; }
	@keyframes fadein { from { opacity: 0; transform: translateY(1.5vh); } to { opacity: 1; transform: none; } }
	.text { border-left: 6px solid var(--s); padding-left: clamp(16px, 2.5vw, 48px); min-width: 0; }
	.em { font-size: clamp(44px, 9vh, 130px); line-height: 1; margin-bottom: 1.5vh; }
	.when { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3em 1em; font-size: clamp(15px, 2.4vh, 30px); color: var(--muted); }
	.date::first-letter { text-transform: uppercase; }
	.rel.age { color: var(--ink); font-weight: 700; }
	.rel.soon { color: var(--accent); font-weight: 700; }
	.rel.late { color: var(--danger); font-weight: 700; }
	.ttl { margin: 0.2em 0 0.25em; font-size: calc(clamp(32px, min(8vh, 6vw), 120px) * var(--fit, 1)); font-weight: 800; letter-spacing: -0.035em; line-height: 1.02; overflow-wrap: break-word; hyphens: auto; text-wrap: balance; }
	.note { margin: 0; font-size: clamp(16px, 2.8vh, 34px); color: var(--muted); max-width: 55ch; line-height: 1.4; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 5; line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
	.tags { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 2vh; font-size: clamp(14px, 2vh, 24px); align-items: center; }
	.pill { padding: 0.2em 0.75em; border-radius: 99px; background: var(--c); color: #fff; font-weight: 700; }
	.cat { display: inline-flex; align-items: center; gap: 0.4em; font-weight: 600; }
	.cat::before { content: ''; width: 0.6em; height: 0.6em; border-radius: 50%; background: var(--c); }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

	/* The photo, from the top of the screen down to the months. */
	.backdrop { position: absolute; inset: 0 0 auto 0; top: 0; z-index: 0; overflow: hidden; background: #111; display: flex; justify-content: flex-end; animation: photoin 0.8s ease both; }
	.backdrop :global(.blur) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(40px) brightness(0.55) saturate(1.2); transform: scale(1.15); }
	.backdrop :global(.sharp) { position: relative; display: block; height: 100%; max-width: 100%; object-fit: contain; }
	.scrim { position: absolute; inset: 0; background:
		linear-gradient(90deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.45) 38%, rgba(0, 0, 0, 0) 62%),
		linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 22%); }
	@keyframes photoin { from { opacity: 0; } to { opacity: 1; } }
	.top, .show { position: relative; z-index: 1; }
	/* Text in white over the photo. */
	.onphoto .big, .onphoto .ttl, .onphoto .rel.age, .onphoto .cat { color: #fff; }
	.onphoto .big.now { color: #fff; }
	.onphoto .info, .onphoto .when, .onphoto .note { color: rgba(255, 255, 255, 0.85); }
	.onphoto .ageline { color: #fff; }
	.onphoto .ttl, .onphoto .big { text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35); }
	.empty { color: var(--muted); font-size: 20px; }

	.months { min-width: 0; }
	/* The Jaarlijn spans the screen from edge to edge: undo the stage's side padding. */
	.months.edge { margin: 0 calc(-1 * max(3vw, 16px)); }

	@media (min-width: 1200px) {
		.big { font-size: clamp(120px, 11vw, 260px); }
	}
	/* Tall and narrow (a phone upright): photo above the text, controls wrap under the year. */
	@media (max-aspect-ratio: 1/1) {
		/* Upright: the photo fills the width, the text sits at the bottom over a dark fade. */
		.backdrop { justify-content: center; }
		.scrim { background: linear-gradient(0deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.4) 40%, rgba(0, 0, 0, 0) 65%), linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0) 22%); }
		.onphoto .show { align-items: flex-end; }
		.moment.hasph .text { max-width: none; }
		.moment.hasph .note { -webkit-line-clamp: 2; line-clamp: 2; }
		.moment.hasph .em { display: none; }
		.ui { margin-left: 0; width: 100%; justify-content: flex-start; }
		.info { font-size: 15px; }
		.em { font-size: 44px; margin-bottom: 8px; }
		.when { font-size: 14px; }
		.ttl { font-size: calc(clamp(26px, 8vw, 44px) * var(--fit, 1)); }
		.note { font-size: 16px; -webkit-line-clamp: 3; line-clamp: 3; }
		.tags { font-size: 14px; margin-top: 10px; }
		.cbtn { height: 38px; min-width: 38px; }
	}
	@media (prefers-reduced-motion: reduce) { .moment, .backdrop { animation: none; } }

	/* Hover */
	.cbtn { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) {
		.cbtn:hover { background: color-mix(in srgb, var(--ink) 6%, var(--surface)); border-color: var(--muted); }
		.cbtn.solid:hover { background: color-mix(in srgb, var(--ink) 85%, var(--surface)); border-color: color-mix(in srgb, var(--ink) 85%, var(--surface)); }
	}
</style>
