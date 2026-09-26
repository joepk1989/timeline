import type { Moment, Timeline } from '$lib/domain/types';

/** What you may do with a timeline. */
export type Role = 'owner' | 'editor' | 'viewer';

export interface Loaded {
	timelines: Timeline[];
	moments: Moment[];
	roles: Record<string, Role>;
}

/** Where timelines, moments and photos are kept: this device, or Supabase. */
export interface Backend {
	kind: 'local' | 'cloud';
	load(): Promise<Loaded>;
	saveTimeline(t: Timeline): Promise<void>;
	deleteTimeline(id: string): Promise<void>;
	saveMoments(list: Moment[]): Promise<void>;
	deleteMoment(id: string): Promise<void>;
	/** Stores a photo and returns its path. */
	uploadPhoto(timelineId: string, blob: Blob): Promise<string>;
	/** A URL an <img> can show. */
	photoUrl(path: string): Promise<string>;
	photoBlob(path: string): Promise<Blob | null>;
	deletePhotos(paths: string[]): Promise<void>;
	/** Calls back when someone else changed something. Returns an unsubscribe function. */
	subscribe(onChange: () => void): () => void;
}

export const newId = () => crypto.randomUUID();
