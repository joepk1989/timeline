import { describe, expect, it } from 'vitest';
import { exifDate, fileNameDate } from './exif';
import { printHtml, printLineHtml, presentationHtml, slug } from './export';
import { createZip, crc32, readZip } from './zip';
import { demoTimeline } from './demo';
import { buildSlides } from './slides';
import { virtualMoments } from './occurrences';

/** A tiny JPEG header with an EXIF block holding DateTimeOriginal (big-endian TIFF). */
function jpegWithDate(date: string): ArrayBuffer {
	const tiff: number[] = [];
	const u16 = (n: number) => tiff.push(n >> 8, n & 255);
	const u32 = (n: number) => { u16(n >>> 16); u16(n & 0xffff); };
	tiff.push(0x4d, 0x4d); u16(42); u32(8);
	// IFD0 at 8: one entry, ExifIFD pointer -> 26
	u16(1); u16(0x8769); u16(4); u32(1); u32(26); u32(0);
	// Exif IFD at 26: DateTimeOriginal, 20 bytes at 44
	u16(1); u16(0x9003); u16(2); u32(20); u32(44); u32(0);
	for (const c of date + '\0') tiff.push(c.charCodeAt(0));
	const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
	const len = app1.length + 2;
	return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda]).buffer;
}

describe('files', () => {
	it('reads the date a photo was taken', () => {
		expect(exifDate(jpegWithDate('2024:07:15 10:11:12'))).toBe('2024-07-15');
		expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
	});
	it('reads the date from a file name when the photo has none', () => {
		expect(fileNameDate('PXL_20250812_134501234.jpg')).toBe('2025-08-12');
		expect(fileNameDate('PXL_20250812_134501234.MP.jpg')).toBe('2025-08-12');
		expect(fileNameDate('IMG_20240229_101010.jpg')).toBe('2024-02-29');
		expect(fileNameDate('IMG-20250903-WA0007.jpg')).toBe('2025-09-03');
		expect(fileNameDate('20250812_134501.jpg')).toBe('2025-08-12');
		expect(fileNameDate('Screenshot_2025-08-12-13-45-10.png')).toBe('2025-08-12');
		expect(fileNameDate('Foto 2025-08-12 13.45.10.jpg')).toBe('2025-08-12');
		expect(fileNameDate('C:\\Downloads\\PXL_20250812_1.jpg')).toBe('2025-08-12');
		expect(fileNameDate('IMG_1234.jpg')).toBeNull();
		expect(fileNameDate('IMG_20230229_1.jpg')).toBeNull(); // no 29 February in 2023
		expect(fileNameDate('vakantie.jpg')).toBeNull();
		expect(fileNameDate('12345678901234.jpg')).toBeNull();
	});
	it('writes and reads a zip', async () => {
		expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
		const enc = new TextEncoder();
		const zip = createZip([{ name: 'backup.json', data: enc.encode('{"a":1}') }, { name: 'photos/x.jpg', data: new Uint8Array([1, 2, 3]) }]);
		const back = await readZip(zip);
		expect(back.map((e) => e.name)).toEqual(['backup.json', 'photos/x.jpg']);
		expect(new TextDecoder().decode(back[0].data)).toBe('{"a":1}');
		expect([...back[1].data]).toEqual([1, 2, 3]);
	});
	it('makes a print page and a standalone presentation with escaped text', () => {
		const now = { y: 2026, m: 8, d: 26 };
		let n = 0;
		const { timeline, moments } = demoTimeline(now, () => `d${n++}`);
		moments[0].title = '<script>x</script>';
		const all = [...moments, ...virtualMoments(timeline)];
		const html = printHtml(timeline, all, timeline.scope, now, 'Test');
		expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
		expect(html).toContain('<h2>2026');
		const photo = moments.find((m) => m.date.startsWith('2026'))!;
		photo.photos = ['p1'];
		const line = printLineHtml(timeline, all, timeline.scope, 'Test', { p1: 'data:image/png;base64,AA' });
		expect(line).toContain('size:A4 landscape');
		expect(line).toContain('&lt;script&gt;x&lt;/script&gt;');
		expect(line).not.toContain('<script>x</script>');
		expect(line).toContain('<h2>2026</h2>');
		expect(line).toContain('src="data:image/png;base64,AA"');
		expect(line.match(/class="mo"/g)!.length % 12).toBe(0);
		const slides = buildSlides(all, timeline.scope, 2026, now, { what: 'all', years: true, photos: false });
		const show = presentationHtml(timeline, slides, timeline.scope, now, 5000);
		expect(show).not.toContain('<script>x</script>');
		expect(slug('Demo: het leven van Sanne')).toBe('demo-het-leven-van-sanne');
	});
});
