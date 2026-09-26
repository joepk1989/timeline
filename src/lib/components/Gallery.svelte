<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import { labelFull } from '$lib/domain/dates';
	import { ageLabel } from '$lib/domain/age';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';
	import Icon from './Icon.svelte';
	import Photo from './Photo.svelte';

	const g = $derived(ui.gallery!);
	const cur = $derived(g.list[g.i]);
	const sub = $derived.by(() => {
		const o = cur.o, a = ageLabel(app.tl, o.y, o.m, o.d);
		return labelFull(o.y, o.m, o.d) + (a ? ' · ' + a : '');
	});
	function step(d: number) {
		const n = g.i + d;
		if (n >= 0 && n < g.list.length) ui.gallery = { ...g, i: n };
	}
	let x0: number | null = null;
	const close = () => (ui.gallery = null);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); }} />

<Dialog open={!!ui.gallery} onclose={close} label="Foto's" kind="bare">
	<div class="gal">
		<div class="top">
			<span class="cnt">{g.i + 1} / {g.list.length}</span>
			<span class="btns">
				{#if g.canEdit && !cur.o.moment.virtual}<Btn variant="pill" onclick={() => { close(); ui.editor = { id: cur.o.moment.id, y: cur.o.y, m: cur.o.m, d: cur.o.d }; }}>Bewerken</Btn>{/if}
				<Btn variant="pill" onclick={close}>Sluiten</Btn>
			</span>
		</div>
		<div
			class="img"
			role="presentation"
			ontouchstart={(e) => (x0 = e.touches[0].clientX)}
			ontouchend={(e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }}
		>
			{#key cur.path}<Photo path={cur.path} alt={cur.o.moment.title} lazy={false} />{/key}
		</div>
		<div class="cap"><b>{cur.o.moment.title}</b><small>{sub}</small></div>
		<button class="nav p" disabled={g.i <= 0} aria-label="Vorige foto" onclick={() => step(-1)}><Icon name="back" /></button>
		<button class="nav n" disabled={g.i >= g.list.length - 1} aria-label="Volgende foto" onclick={() => step(1)}><Icon name="next" /></button>
	</div>
</Dialog>

<style>
	.gal { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: calc(env(safe-area-inset-top, 0px) + 60px) 12px calc(env(safe-area-inset-bottom, 0px) + 16px); color: #fff; }
	.img { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; }
	.img :global(img) { max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain; touch-action: pan-y; user-select: none; }
	.cap { text-align: center; max-width: 560px; }
	.cap b { display: block; font-size: 17px; }
	.cap small { color: rgba(255, 255, 255, 0.72); font-size: 13px; }
	.top { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--ink); }
	.cnt { color: rgba(255, 255, 255, 0.72); font-size: 14px; }
	.btns { display: flex; gap: 8px; }
	.nav { position: fixed; top: 50%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.14); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; }
	.p { left: 12px; }
	.n { right: 12px; }
	.nav:disabled { opacity: 0; pointer-events: none; }
	@media (hover: none), (max-width: 640px) { .nav { display: none; } }
</style>
