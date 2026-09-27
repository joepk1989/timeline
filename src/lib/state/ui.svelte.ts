import type { Occurrence } from '$lib/domain/types';
import type { Slide, ShowOptions } from '$lib/domain/slides';

export interface GalleryItem {
	path: string;
	o: Occurrence;
}

/** Which sheets and dialogs are open, and with what. */
class UiState {
	menu = $state<{ y: number; m: number | null } | null>(null);
	editor = $state<{ id: string | null; y: number; m: number | null; d: number | null } | null>(null);
	day = $state<{ y: number; m: number; d: number } | null>(null);
	picker = $state(false);
	tlEdit = $state<{ id: string | null; first: boolean } | null>(null);
	gallery = $state<{ list: GalleryItem[]; i: number; canEdit: boolean } | null>(null);
	showSetup = $state(false);
	show = $state<{ slides: Slide[]; ms: number; loop: boolean; opt: ShowOptions } | null>(null);
	account = $state(false);
}

export const ui = new UiState();
