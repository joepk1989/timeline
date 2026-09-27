import { tick } from 'svelte';
import { app } from './app.svelte';
import { ui } from './ui.svelte';

/**
 * Presenting is the same screen in full screen. The year and the months carry the same
 * view-transition names on the year page and on the presentation, so the browser morphs them into place.
 */
function morph(update: () => void): Promise<void> {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (!document.startViewTransition || reduce) {
		update();
		return Promise.resolve();
	}
	const t = document.startViewTransition(async () => {
		update();
		await tick();
		await new Promise((r) => requestAnimationFrame(r));
	});
	return t.finished.catch(() => {});
}

export async function startPresenting() {
	if (document.fullscreenEnabled && !document.fullscreenElement) {
		await document.documentElement.requestFullscreen().catch(() => {});
	}
	await morph(() => (ui.present = true));
}

/** Back to the timeline, on the year that was on screen. */
export async function stopPresenting(year: number) {
	await morph(() => {
		ui.present = false;
		app.mode = 'year';
		app.goTo(Math.max(0, Math.min(app.pageCount - 1, year - app.scope.from)), false);
	});
	if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
