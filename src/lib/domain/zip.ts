/** Minimal zip support for backups: writes uncompressed ("stored") archives, reads stored and deflated ones. */

export interface ZipEntry {
	name: string;
	data: Uint8Array;
}

const TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

export function crc32(data: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < data.length; i++) c = TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

export function createZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
	const enc = new TextEncoder();
	const locals: Uint8Array[] = [], centrals: Uint8Array[] = [];
	let offset = 0;
	for (const e of entries) {
		const name = enc.encode(e.name), crc = crc32(e.data), size = e.data.length;
		const lh = new Uint8Array(30 + name.length), l = new DataView(lh.buffer);
		l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x0800, true);
		l.setUint32(14, crc, true); l.setUint32(18, size, true); l.setUint32(22, size, true); l.setUint16(26, name.length, true);
		lh.set(name, 30);
		const ch = new Uint8Array(46 + name.length), c = new DataView(ch.buffer);
		c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
		c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
		c.setUint32(42, offset, true);
		ch.set(name, 46);
		locals.push(lh, e.data); centrals.push(ch);
		offset += lh.length + size;
	}
	const cdSize = centrals.reduce((n, x) => n + x.length, 0);
	const end = new Uint8Array(22), d = new DataView(end.buffer);
	d.setUint32(0, 0x06054b50, true); d.setUint16(8, entries.length, true); d.setUint16(10, entries.length, true);
	d.setUint32(12, cdSize, true); d.setUint32(16, offset, true);
	const out = new Uint8Array(offset + cdSize + 22);
	let p = 0;
	for (const part of [...locals, ...centrals, end]) { out.set(part, p); p += part.length; }
	return out;
}

async function inflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
	const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZip(buf: Uint8Array<ArrayBuffer>): Promise<ZipEntry[]> {
	const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	let e = buf.length - 22;
	while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
	if (e < 0) throw new Error('Geen zip-bestand');
	const count = v.getUint16(e + 10, true);
	let p = v.getUint32(e + 16, true);
	const dec = new TextDecoder();
	const out: ZipEntry[] = [];
	for (let i = 0; i < count; i++) {
		if (v.getUint32(p, true) !== 0x02014b50) throw new Error('Kapot zip-bestand');
		const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true);
		const nameLen = v.getUint16(p + 28, true), extra = v.getUint16(p + 30, true), comment = v.getUint16(p + 32, true);
		const local = v.getUint32(p + 42, true);
		const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
		const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
		const raw = buf.slice(start, start + size);
		if (!name.endsWith('/')) {
			if (method === 0) out.push({ name, data: raw });
			else if (method === 8) out.push({ name, data: await inflate(raw) });
		}
		p += 46 + nameLen + extra + comment;
	}
	return out;
}
