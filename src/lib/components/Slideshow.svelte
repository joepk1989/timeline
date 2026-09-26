<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull, MONTHS, season } from '$lib/domain/dates';
	import { STATUSES } from '$lib/domain/kinds';
	import { whenLabel } from '$lib/domain/occurrences';
	import { relParts } from '$lib/domain/view';
	import type { Slide } from '$lib/domain/slides';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';
	import YearSlide from './YearSlide.svelte';

	const { slides, ms, loop } = ui.show!;
	const tl = app.tl, kind = app.kind, scope = { ...app.scope };
	let i = $state(0);
	let playing = $state(true);
	let idle = $state(false);
	let shown = $state<{ key: number; s: Slide; on: boolean }[]>([]);
	let prog: HTMLDivElement;
	let root: HTMLDivElement;
	let playBtn: HTMLButtonElement;
	let timer: ReturnType<typeof setTimeout> | undefined, idleTimer: ReturnType<typeof setTimeout> | undefined;
	let lock: WakeLockSentinel | null = null;
	let wentFull = false;
	let key = 0;
	const canFull = document.fullscreenEnabled;
	let full = $state(!!document.fullscreenElement);

	function render() {
		const k = ++key;
		shown = [...shown.map((x) => ({ ...x, on: false })), { key: k, s: slides[i], on: false }];
		requestAnimationFrame(() => requestAnimationFrame(() => { const x = shown.find((y) => y.key === k); if (x) x.on = true; }));
		setTimeout(() => (shown = shown.filter((x) => x.key >= k)), 900);
		const nx = slides[i + 1];
		if (nx?.kind === 'moment' && nx.photo) app.backend.photoUrl(nx.photo).then((u) => { if (u) new Image().src = u; });
		restartProg();
		schedule();
	}
	function restartProg() {
		if (!prog) return;
		prog.style.transition = 'none';
		prog.style.width = '0';
		void prog.offsetWidth;
		if (playing) { prog.style.transition = `width ${ms}ms linear`; prog.style.width = '100%'; }
	}
	function schedule() {
		clearTimeout(timer);
		if (playing) timer = setTimeout(() => step(1, true), ms);
	}
	function step(d: number, auto = false) {
		let n = i + d;
		if (n >= slides.length) {
			if (loop) n = 0;
			else {
				playing = false; schedule();
				prog.style.transition = 'none';
				if (auto) app.toast('Einde van de voorstelling');
				poke();
				return;
			}
		}
		if (n < 0) n = loop ? slides.length - 1 : 0;
		if (n === i) return;
		i = n;
		render();
	}
	function toggle() {
		if (!playing && i >= slides.length - 1 && !loop) { playing = true; i = 0; render(); return; }
		playing = !playing;
		if (playing) { restartProg(); schedule(); }
		else { prog.style.width = getComputedStyle(prog).width; prog.style.transition = 'none'; schedule(); }
		poke();
	}
	function poke() {
		idle = false;
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => { if (playing) idle = true; }, 2600);
	}
	function stop() {
		ui.show = null;
	}
	function goFull() {
		document.documentElement.requestFullscreen().then(() => (wentFull = true)).catch(() => app.toast('Volledig scherm is hier niet beschikbaar'));
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { if (!document.fullscreenElement) stop(); return; }
		if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); poke(); }
		else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); poke(); }
		else if (e.key === ' ' || e.key === 'k') {
			if (e.key === ' ' && (e.target as HTMLElement).closest?.('button')) return;
			e.preventDefault(); toggle();
		} else if (e.key === 'f' && canFull) { if (document.fullscreenElement) document.exitFullscreen(); else goFull(); }
	}
	async function wake() {
		try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* not allowed */ }
	}
	let sx: number | null = null;

	onMount(() => {
		if (canFull && !document.fullscreenElement) goFull();
		wake();
		render();
		poke();
		playBtn?.focus();
	});
	onDestroy(() => {
		clearTimeout(timer); clearTimeout(idleTimer);
		lock?.release().catch(() => {});
		if (wentFull && document.fullscreenElement) document.exitFullscreen().catch(() => {});
	});

	const anchorText = tl.anchor ? `${kind.anchorLabel.replace(' (optioneel)', '')}: ${+tl.anchor.slice(8)} ${MONTHS[+tl.anchor.slice(5, 7) - 1]} ${tl.anchor.slice(0, 4)}` : '';
</script>

<svelte:window {onkeydown} />
<svelte:document onvisibilitychange={() => document.visibilityState === 'visible' && lock && wake()} onfullscreenchange={() => (full = !!document.fullscreenElement)} />

<div class="deck" class:idle bind:this={root} role="region" aria-label="Diavoorstelling" onmousemove={poke}>
	<div class="prog" bind:this={prog}></div>
	<div
		class="stage"
		aria-live="polite"
		role="presentation"
		ontouchstart={(e) => (sx = e.touches[0].clientX)}
		ontouchend={(e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); poke(); }}
		onclick={() => { if (idle) poke(); else if (!('ontouchstart' in window)) step(1); poke(); }}
	>
		{#each shown as x (x.key)}
			{@const s = x.s}
			{#if s.kind === 'title'}
				<div class="slide title noph" class:in={x.on}>
					<div class="txt">
						<div class="em">{kind.emoji}</div>
						<div class="ttl">{tl.name}</div>
						<div class="when"><span>{scope.from === scope.to ? scope.from : `${scope.from} – ${scope.to}`}</span>{#if anchorText}<span>{anchorText}</span>{/if}</div>
					</div>
				</div>
			{:else if s.kind === 'year'}
				<div class="slide yslide" class:in={x.on}><YearSlide y={s.y} occs={s.occs} /></div>
			{:else}
				{@const o = s.o}
				{@const mo = o.moment}
				{@const st = mo.status ? STATUSES.find((z) => z.id === mo.status) : null}
				<div class="slide" class:in={x.on} class:hasph={!!s.photo} class:noph={!s.photo} style:--s={o.m == null ? '#9BBBF2' : `var(--${season(o.m)})`} style:--dur="{ms + 1000}ms">
					{#if s.photo}
						<div class="bg"><Photo path={s.photo} lazy={false} /></div>
						<div class="photo"><Photo path={s.photo} alt={mo.title} lazy={false} /></div>
					{/if}
					<div class="edge"></div>
					<div class="txt">
						<div class="em">{mo.emoji}</div>
						<div class="when">
							<span>{o.m == null ? o.y : o.end ? whenLabel(o) + (o.y === o.end.y ? ` ${o.y}` : '') : labelFull(o.y, o.m, o.d)}</span>
							{#each relParts(o, tl, app.now) as r, ri (ri)}<span class={r.kind}>{r.text}</span>{/each}
							{#if st}<span class="pill" style:--c={st.color}>{st.name}</span>{/if}
							{#if !mo.virtual}<span class="catp" style:--c={app.catOf(mo.categoryId).color}>{app.catOf(mo.categoryId).name}</span>{/if}
							{#if s.photoCount > 1 && s.photo}<span>foto {s.photoIndex + 1} van {s.photoCount}</span>{/if}
						</div>
						<div class="ttl">{mo.title}</div>
						{#if mo.note && s.photoIndex === 0}<div class="note">{mo.note}</div>{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>
	<div class="ui">
		<button class="sbtn" aria-label="Vorige dia" onclick={() => { step(-1); poke(); }}><Icon name="back" /></button>
		<button class="sbtn" bind:this={playBtn} aria-label={playing ? 'Pauze' : 'Afspelen'} onclick={toggle}><Icon name={playing ? 'pause' : 'play'} /></button>
		<button class="sbtn" aria-label="Volgende dia" onclick={() => { step(1); poke(); }}><Icon name="next" /></button>
		<span class="tl">{kind.emoji} {tl.name}</span>
		<span class="cnt">{i + 1} / {slides.length}</span>
		{#if canFull && !full}<button class="sbtn" onclick={goFull}>Volledig scherm</button>{/if}
		<button class="sbtn" onclick={stop}>Stoppen</button>
	</div>
</div>

<style>
	.deck { position: fixed; inset: 0; z-index: 40; background: #0e1217; color: #f2f4f6; overflow: hidden; --winter: #7faad0; --lente: #8cc468; --zomer: #f0b942; --herfst: #c27a45; }
	.deck.idle { cursor: none; }
	.stage { position: absolute; inset: 0; }
	.slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.8s ease; }
	.slide.in { opacity: 1; }
	.bg { position: absolute; inset: -6%; overflow: hidden; filter: blur(40px) brightness(0.32); }
	.bg :global(img) { width: 100%; height: 100%; object-fit: cover; }
	.photo { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 5vh 5vw 34vh; }
	.photo :global(img) { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 1.2vh; box-shadow: 0 3vh 8vh rgba(0, 0, 0, 0.55); }
	.slide.in .photo :global(img) { animation: kb var(--dur, 8s) linear forwards; }
	@keyframes kb { from { transform: scale(1); } to { transform: scale(1.05); } }
	.edge { position: absolute; left: 0; top: 0; bottom: 0; width: 1.1vw; min-width: 6px; background: var(--s); }
	.txt { position: absolute; left: 7vw; right: 7vw; bottom: 13vh; }
	.noph .txt { top: 50%; bottom: auto; transform: translateY(-50%); }
	.em { font-size: clamp(56px, 16vh, 200px); line-height: 1; margin-bottom: 3vh; }
	.hasph .em { display: none; }
	.when { font-size: clamp(15px, 2.6vh, 34px); color: rgba(255, 255, 255, 0.78); display: flex; flex-wrap: wrap; gap: 0.4em 1.1em; align-items: center; }
	.when .age { color: #fff; font-weight: 700; }
	.when .soon { color: #9bbbf2; font-weight: 700; }
	.when .late { color: #ff9c92; font-weight: 700; }
	.ttl { font-size: clamp(30px, 7.5vh, 110px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.02; margin: 0.18em 0 0.2em; max-width: 22ch; }
	.hasph .ttl { font-size: clamp(26px, 5.6vh, 80px); }
	.note { font-size: clamp(15px, 2.9vh, 36px); color: rgba(255, 255, 255, 0.82); max-width: 52ch; line-height: 1.35; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
	.hasph .note { -webkit-line-clamp: 2; line-clamp: 2; }
	.pill { display: inline-flex; align-items: center; padding: 0.2em 0.75em; border-radius: 99px; background: var(--c); color: #fff; font-weight: 700; font-size: 0.9em; }
	.catp { display: inline-flex; align-items: center; gap: 0.4em; }
	.catp::before { content: ''; width: 0.6em; height: 0.6em; border-radius: 50%; background: var(--c); }
	.title .em { margin-bottom: 2vh; }
	.title .ttl { font-size: clamp(36px, min(11vh, 12vw), 150px); }
	.yslide { display: flex; flex-direction: column; gap: 3vh; padding: 7vh 6vw 14vh; }
	.prog { position: absolute; left: 0; top: 0; height: 5px; width: 0; background: rgba(255, 255, 255, 0.85); z-index: 2; }
	.ui { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
		padding: 18px max(24px, env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px)) max(24px, env(safe-area-inset-left, 0px));
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7)); transition: opacity 0.35s; }
	.idle .ui { opacity: 0; pointer-events: none; }
	.sbtn { height: 48px; min-width: 48px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.1); color: #fff; font: inherit; font-weight: 600; font-size: 15px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
	.sbtn:hover { background: rgba(255, 255, 255, 0.2); }
	.tl { color: #fff; font-weight: 700; font-size: 15px; }
	.cnt { color: rgba(255, 255, 255, 0.75); font-size: 14px; margin-left: auto; }
	@media (prefers-reduced-motion: reduce) { .slide { transition: none; } .slide.in .photo :global(img) { animation: none; } }
	@media (min-aspect-ratio: 3/2) {
		.hasph .photo { left: auto; width: 62vw; padding: 5vh 3.5vw 5vh 0; }
		.hasph .photo :global(img) { max-height: 90vh; }
		.hasph .txt { left: 5vw; right: auto; width: 30vw; top: 50%; bottom: auto; transform: translateY(-50%); }
		.hasph .em { display: block; font-size: clamp(44px, min(11vh, 5vw), 150px); margin-bottom: 2.5vh; }
		.hasph .ttl { font-size: clamp(28px, min(7vh, 3.4vw), 120px); max-width: none; }
		.hasph .note { -webkit-line-clamp: 6; line-clamp: 6; }
		.when { font-size: clamp(15px, min(2.8vh, 1.4vw), 40px); }
		.noph .txt { left: 9vw; right: 9vw; }
		.noph .em { font-size: clamp(64px, min(20vh, 11vw), 260px); }
		.noph .ttl { font-size: clamp(40px, min(11vh, 6vw), 180px); max-width: 26ch; }
		.noph .note { font-size: clamp(16px, min(3.4vh, 1.8vw), 48px); max-width: 64ch; }
		.title .ttl { font-size: clamp(48px, min(14vh, 8vw), 220px); max-width: none; }
	}
	@media (min-aspect-ratio: 21/9) {
		.hasph .photo { width: 66vw; }
		.hasph .txt { width: 26vw; left: 4vw; }
		.noph .txt { left: 12vw; right: 12vw; }
	}
</style>
