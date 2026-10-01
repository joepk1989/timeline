/**
 * Reads the date a photo was taken from its EXIF data (JPEG only): DateTimeOriginal, else DateTime.
 * Returns `YYYY-MM-DD`, or null when there is none.
 */
export function exifDate(buf: ArrayBuffer): string | null {
	const v = new DataView(buf);
	if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
	let p = 2;
	while (p + 4 <= v.byteLength) {
		const marker = v.getUint16(p);
		if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
		const size = v.getUint16(p + 2);
		if (marker === 0xffe1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966) return readTiff(v, p + 10, p + 2 + size);
		p += 2 + size;
	}
	return null;
}

function readTiff(v: DataView, t: number, end: number): string | null {
	if (t + 8 > end || end > v.byteLength) return null;
	const le = v.getUint16(t) === 0x4949;
	const u16 = (o: number) => v.getUint16(o, le), u32 = (o: number) => v.getUint32(o, le);
	const entries = (ifd: number) => {
		const out = new Map<number, number>();
		if (ifd + 2 > end) return out;
		const n = u16(ifd);
		for (let i = 0; i < n; i++) {
			const e = ifd + 2 + i * 12;
			if (e + 12 > end) break;
			out.set(u16(e), e);
		}
		return out;
	};
	const ascii = (entry: number) => {
		const count = u32(entry + 4);
		const at = count > 4 ? t + u32(entry + 8) : entry + 8;
		if (at + count > end) return '';
		let s = '';
		for (let i = 0; i < count; i++) s += String.fromCharCode(v.getUint8(at + i));
		return s;
	};
	const toDay = (s: string) => {
		const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(s);
		return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}` : null;
	};
	const ifd0 = entries(t + u32(t + 4));
	const exifPtr = ifd0.get(0x8769);
	if (exifPtr != null) {
		const sub = entries(t + u32(exifPtr + 8));
		const orig = sub.get(0x9003);
		const d = orig != null ? toDay(ascii(orig)) : null;
		if (d) return d;
	}
	const dt = ifd0.get(0x0132);
	return dt != null ? toDay(ascii(dt)) : null;
}

/**
 * Reads the date from a photo's file name, for photos without EXIF: `PXL_20250812_…`, `IMG_20250812_…`,
 * `IMG-20250812-WA0001` (WhatsApp), `20250812_134501` (Samsung), `Screenshot_2025-08-12-…`,
 * `Foto 2025-08-12 13.45.10`. Returns `YYYY-MM-DD`, or null when there is no real date in it.
 */
export function fileNameDate(name: string): string | null {
	const base = name.replace(/^.*[/\\]/, '');
	const re = /(?:^|[^\d])((?:19|20)\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(?!\d{3})/g;
	for (let m = re.exec(base); m; m = re.exec(base)) {
		const [y, mo, d] = [+m[1], +m[2], +m[3]];
		if (mo < 1 || mo > 12 || d < 1) continue;
		if (d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) continue;
		return `${m[1]}-${m[2]}-${m[3]}`;
	}
	return null;
}
