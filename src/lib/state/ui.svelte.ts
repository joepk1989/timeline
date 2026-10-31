import type { Occurrence } from '$lib/domain/types';

export interface GalleryItem {
	path: string;
	o: Occurrence;
}

/** Which sheets and dialogs are open, and with what. */
class UiState {
	menu = $state<{ y: number; m: number | null } | null>(null);
	editor = $state<{ id: string | null; y: number; m: number | null; d: number | null; time?: string } | null>(null);
	day = $state<{ y: number; m: number; d: number } | null>(null);
	picker = $state(false);
	tlEdit = $state<{ id: string | null; first: boolean } | null>(null);
	gallery = $state<{ list: GalleryItem[]; i: number; canEdit: boolean } | null>(null);
	/** Presenting: the timeline screen itself, full screen, playing through the moments. */
	present = $state(false);
	/** Month tab last shown for a year, so the year page and the presentation open on the same month. */
	monthTab = $state<{ y: number; m: number } | null>(null);
	account = $state(false);
	/** The Jaarlijn zoomed out: all the years of the timeline, without months. */
	allYears = $state(false);
	/** The year pointed at, in the row of years or among the columns of all years. */
	yearHover = $state<number | null>(null);
	/** Whether a month was ever zoomed into: until then the year page says that it can be. */
	zoomHintSeen = $state(true);
	/** How far the Jaarlijn on show is zoomed in: the whole year, a month over the full width, or a day. */
	lineZoom = $state<'year' | 'month' | 'day'>('year');
	/** The theme, and how to switch it (set by the page), so the menu can offer it too. */
	theme = $state<'light' | 'dark'>('light');
	toggleTheme: (() => void) | null = null;
}

export const ui = new UiState();
