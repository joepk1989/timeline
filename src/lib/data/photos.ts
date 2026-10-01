import { exifDate, fileNameDate } from '$lib/domain/exif';

/** Makes a photo at most 1600px on its longest side, as JPEG. Also returns the date it was taken, if known:
 * from EXIF, else from the file name (PXL_20250812_…). */
export async function preparePhoto(file: File): Promise<{ blob: Blob; taken: string | null }> {
	let taken: string | null = null;
	try {
		taken = exifDate(await file.slice(0, 256 * 1024).arrayBuffer());
	} catch {
		/* no EXIF */
	}
	taken ??= fileNameDate(file.name);
	try {
		const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
		const c = document.createElement('canvas');
		c.width = Math.max(1, Math.round(bmp.width * k));
		c.height = Math.max(1, Math.round(bmp.height * k));
		c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
		bmp.close();
		const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85));
		return { blob: blob ?? file, taken };
	} catch {
		return { blob: file, taken };
	}
}

export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((res, rej) => {
		const r = new FileReader();
		r.onload = () => res(r.result as string);
		r.onerror = () => rej(r.error);
		r.readAsDataURL(blob);
	});
}

/** Inside a published Claude artifact the page may not download itself; the viewer's `downloads` capability saves for it. */
type Saver = { save(r: { filename: string; data: Blob }): Promise<unknown> };
async function claudeSaver(): Promise<Saver | null> {
	const c = (globalThis as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
	if (typeof c?.use !== 'function') return null;
	try {
		return (await c.use('downloads')) as Saver | null;
	} catch {
		return null;
	}
}

/**
 * Offers a file to save. `saved`: handed to the browser; `declined`: the viewer said no;
 * `unavailable`: saving files is not possible here.
 */
export async function download(filename: string, data: Blob | string, type = 'text/html'): Promise<'saved' | 'declined' | 'unavailable'> {
	const blob = typeof data === 'string' ? new Blob([data], { type: type + ';charset=utf-8' }) : data;
	const saver = await claudeSaver();
	if (saver) {
		try {
			await saver.save({ filename, data: blob });
			return 'saved';
		} catch (e) {
			return (e as { code?: string }).code === 'declined' ? 'declined' : 'unavailable';
		}
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
	return 'saved';
}
