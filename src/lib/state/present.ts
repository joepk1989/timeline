import { tick } from 'svelte';
import { app } from './app.svelte';
import { ui } from './ui.svelte';

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Waits until the window has stopped changing size (entering or leaving full screen takes a few frames). */
async function settle() {
	let w = innerWidth, h = innerHeight, still = 0;
	for (let i = 0; i < 60 && still < 3; i++) {
		await frame();
		if (innerWidth === w && innerHeight === h) still++;
		else { still = 0; w = innerWidth; h = innerHeight; }
	}
}

/**
 * Presenting is the same screen in full screen. The year and the months carry the same
 * view-transition names on the year page and on the presentation, so the browser morphs them into place.
 * A view transition is skipped when the window changes size halfway, so full screen is entered
 * before the morph (and left before morphing back).
 */
async function morph(update: () => void): Promise<void> {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!document.startViewTransition || reduce) {
		update();
		return;
	}
	// No requestAnimationFrame in here: the browser holds rendering until this callback is done,
	// so waiting for a frame would stall the transition until it times out and gets skipped.
	const t = document.startViewTransition(async () => {
		update();
		await tick();
		await tick(); // the pager scrolls to the year in a tick of its own
	});
	await t.finished.catch(() => {});
}

export async function startPresenting() {
	if (document.fullscreenEnabled && !document.fullscreenElement) {
		await document.documentElement.requestFullscreen().catch(() => {});
		await settle();
	}
	await morph(() => (ui.present = true));
}

/** Back to the timeline, on the year that was on screen. */
let stopping = false;
export async function stopPresenting(year: number) {
	// Leaving full screen fires fullscreenchange, which asks to stop again.
	if (stopping || !ui.present) return;
	stopping = true;
	if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
	await settle();
	await morph(() => {
		ui.present = false;
		app.mode = 'year';
		app.goTo(Math.max(0, Math.min(app.pageCount - 1, year - app.scope.from)), false);
	});
	stopping = false;
}
