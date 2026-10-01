import { daysInMonth, labelFull, MONTHS, MONTHS_SHORT, season } from './dates';
import { KINDS, STATUSES } from './kinds';
import { whenLabel, yearOccurrences, isOverdue } from './occurrences';
import { yearLine } from './age';
import type { Slide } from './slides';
import type { Day, Moment, Timeline } from './types';
import { momentsLabel, packRows, relParts, spreadAlong, yearLines, type Scope } from './view';

export const esc = (s: unknown) =>
	String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** File name without odd characters: "demo-het-leven-van-sanne". */
export const slug = (s: string) =>
	s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'tijdlijn';

/** A photo path mapped to something an <img> can show offline (a data URL). Missing photos are skipped. */
export type PhotoMap = Record<string, string>;

/**
 * A printable HTML page with every year that has moments, optionally with photos.
 * `title` is the timeline name plus the period and filter.
 */
export function printHtml(tl: Timeline, visible: Moment[], scope: Scope, now: Day, title: string, photos: PhotoMap = {}): string {
	const catName = (id: string) => tl.categories.find((c) => c.id === id)?.name ?? 'Overig';
	let body = '';
	for (let y = scope.from; y <= scope.to; y++) {
		const occs = yearOccurrences(visible, y);
		if (!occs.some((o) => !o.moment.virtual)) continue;
		const yl = yearLine(tl, y);
		body += `<section><h2>${y}${yl ? ` <small>${esc(yl)}</small>` : ''}</h2><table>`;
		for (const o of occs) {
			const mo = o.moment;
			const extra = [
				...(mo.status ? [STATUSES.find((s) => s.id === mo.status)!.name] : []),
				...(isOverdue(o, now) ? ['over tijd'] : []),
				...(mo.virtual ? [] : [catName(mo.categoryId)]),
				...relParts(o, tl, now).filter((r) => r.kind === 'age').map((r) => r.text)
			].join(' · ');
			const imgs = mo.photos.map((p) => photos[p]).filter(Boolean);
			body += `<tr><td class="w">${esc(whenLabel(o))}</td><td class="e">${esc(mo.emoji)}</td><td><b>${esc(mo.title)}</b>`
				+ (extra ? `<div class="m">${esc(extra)}</div>` : '')
				+ (mo.note ? `<div class="n">${esc(mo.note)}</div>` : '')
				+ (imgs.length ? `<div class="p">${imgs.map((src) => `<img src="${esc(src)}" alt="">`).join('')}</div>` : '')
				+ '</td></tr>';
		}
		body += '</table></section>';
	}
	return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1D2733;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.45}
h1{font-size:34px;margin:0 0 24px}h2{font-size:44px;margin:28px 0 8px;letter-spacing:-.03em;border-bottom:2px solid #1D2733}h2 small{font-size:18px;letter-spacing:0;color:#2B4A7E}
section{break-inside:avoid-page}table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:7px 6px;border-bottom:1px solid #ddd}tr{break-inside:avoid}
.w{width:130px;color:#5E6A76;font-size:14px}.e{width:28px;font-size:18px}.m{font-size:12px;color:#5E6A76}.n{font-size:14px;margin-top:3px;white-space:pre-wrap}
.p{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.p img{height:140px;max-width:100%;border-radius:4px;object-fit:cover}
.hint{color:#5E6A76;font-size:14px}@media print{body{margin:0}h2{break-after:avoid}.hint{display:none}}
</style></head><body><p class="hint">Tip: kies Afdrukken in je browser en dan "Opslaan als PDF".</p><h1>${esc(title)}</h1>${body || '<p>Geen momenten in deze periode.</p>'}</body></html>`;
}

const SEASON_COLORS = { winter: '#6e9cc4', lente: '#7db35a', zomer: '#edb032', herfst: '#9c5b2e' };

/**
 * A printable page per year, landscape and drawn like the Jaarlijn in the app: the year on top, its photos
 * as small polaroids floating above the line near their dates (a thin stem down to the day), then the months
 * as columns under a bar and each moment as a block lying on its days.
 */
export function printLineHtml(tl: Timeline, visible: Moment[], scope: Scope, title: string, photos: PhotoMap = {}): string {
	const PAGE_MM = 277; // A4 landscape minus the margins
	const pct = (mm: number) => (mm / PAGE_MM) * 100;
	let body = '';
	for (let y = scope.from; y <= scope.to; y++) {
		const occs = yearOccurrences(visible, y);
		const real = occs.filter((o) => !o.moment.virtual);
		if (!real.length) continue;
		const { days, items } = yearLines(occs, y);
		const atDay = (o: (typeof occs)[number]) => (o.m == null ? 0.5 : ((items.find((it) => it.o === o)?.from ?? 0) + 0.5) / days);
		const pics = real.flatMap((o) => o.moment.photos.filter((p) => photos[p]).map((p) => ({ src: photos[p], o }))).slice(0, 14);
		const charMm = pics.length ? 1.55 : 2.1; // text is larger on a page without photos
		// Each block is at least as wide as its text, so names do not run into each other.
		const boxes = items.map((it) => {
			const chars = Math.max(it.o.moment.title.length + 3, whenLabel(it.o).length + 2);
			const width = Math.max(((it.to - it.from + 1) / days) * 100, Math.min(32, pct(chars * charMm + 8)));
			// Near the end of the year the block grows to the left, so it stays on the page.
			const left = Math.min((it.from / days) * 100, 100 - width);
			return { left, right: left + width };
		});
		const { rows, count } = packRows(boxes, 0.5);
		const yl = yearLine(tl, y);
		let months = '', cols = '', start = 0;
		for (let m = 0; m < 12; m++) {
			const w = (daysInMonth(y, m) / days) * 100;
			months += `<div class="mo" style="left:${start}%;width:${w}%;--c:${SEASON_COLORS[season(m)]}"><b>${String(m + 1).padStart(2, '0')}</b> ${MONTHS[m]}</div>`;
			cols += `<div class="col" style="left:${start}%;width:${w}%"></div>`;
			start += w;
		}
		const blocks = items.map((it, i) => {
			const b = boxes[i], mo = it.o.moment;
			return `<div class="b${mo.virtual ? ' v' : ''}" style="grid-row:${rows[i] + 1};margin-left:${b.left}%;width:${b.right - b.left}%">`
				+ `<span class="t">${esc(mo.emoji)} ${esc(mo.title)}</span><span class="d"><i></i>${esc(whenLabel(it.o))}</span></div>`;
		}).join('');
		// Photos float above the line, spread so they do not overlap, each as near its date as it can be.
		let float = '';
		if (pics.length) {
			const EDGE = 5, inner = PAGE_MM - 2 * EDGE; // keep the tilted frames off the edge of the page
			const fw = Math.min(30, inner / pics.length - 2.5); // frame width in mm
			const at = pics.map((p) => atDay(p.o) * 100);
			const lefts = spreadAlong(at.map((a) => ((a / 100) * PAGE_MM - EDGE) / inner * 100), (fw / inner) * 100, (2.5 / inner) * 100)
				.map((l) => pct(EDGE + (l / 100) * inner));
			const tilt = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.1];
			float = `<div class="float" style="--fw:${fw}mm">`
				+ pics.map((p, i) => `<figure style="left:${lefts[i]}%;width:${pct(fw)}%;rotate:${tilt[i % tilt.length]}deg"><img src="${esc(p.src)}" alt=""><figcaption>${p.o.m == null ? esc(String(y)) : `${p.o.d ?? ''} ${MONTHS_SHORT[p.o.m]}`}</figcaption></figure>`).join('')
				+ `</div><svg class="stems" viewBox="0 0 100 10" preserveAspectRatio="none">`
				+ pics.map((_, i) => `<line x1="${lefts[i] + pct(fw) / 2}" y1="0" x2="${at[i]}" y2="10" />`).join('')
				+ `</svg>`;
		}
		body += `<section class="pg${pics.length ? '' : ' nopics'}"><header><h2>${y}</h2><div class="meta">${yl ? `<em>${esc(yl)}</em> · ` : ''}${momentsLabel(real.length)}</div></header>`
			+ float
			+ `<div class="line"><div class="bar">${months}</div><div class="body">${cols}<div class="days"></div><div class="rows" style="--n:${count}">${blocks}</div></div></div></section>`;
	}
	return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
@page{size:A4 landscape;margin:10mm}
*{box-sizing:border-box}html,body{margin:0}body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1D2733;background:#c9cdc6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hint{max-width:277mm;margin:16px auto 0;color:#3d4650;font-size:14px}
.pg{width:277mm;height:190mm;margin:16px auto;background:#eef0eb;display:flex;flex-direction:column;overflow:hidden;break-after:page}
.pg:last-child{break-after:auto}
header{padding:5mm 6mm 0;display:flex;align-items:baseline;gap:5mm}h2{margin:0;font-size:24mm;line-height:.85;letter-spacing:-.05em;font-weight:800}
.meta{color:#5E6A76;font-size:11pt}.meta em{font-style:normal;color:#2B4A7E;font-weight:700}
.float{position:relative;flex:0 0 auto;height:calc(var(--fw) * 1.32 + 6mm);margin-top:2mm}
figure{position:absolute;bottom:0;margin:0;padding:1.4mm 1.4mm 0;background:#fff;border-radius:.8mm;box-shadow:0 .6mm 2.4mm rgba(20,30,40,.22)}
figure img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover}
figcaption{height:5mm;line-height:5mm;text-align:center;font-size:7pt;color:#5E6A76;white-space:nowrap;overflow:hidden}
.stems{display:block;flex:0 0 auto;width:100%;height:7mm}.stems line{stroke:#1D2733;stroke-width:.6;stroke-dasharray:1.5 1.5;vector-effect:non-scaling-stroke;opacity:.45}
.line{flex:1;min-height:0;display:flex;flex-direction:column}
.bar{position:relative;flex:0 0 8mm}.mo{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:1mm;font-size:8.5pt;font-weight:700;white-space:nowrap;overflow:hidden;
background:color-mix(in srgb,var(--c) 55%,#eef0eb);border-right:.3mm solid #eef0eb}
.body{position:relative;flex:1;min-height:0}.col{position:absolute;top:0;bottom:0;border-right:.25mm solid #d4d9d2}
.days{height:5mm;border-bottom:.25mm solid #d4d9d2}
.rows{position:relative;display:grid;grid-template-columns:100%;grid-template-rows:repeat(var(--n),8.5mm);row-gap:1.6mm;padding-top:2.5mm}
.b{grid-column:1;min-width:0;background:#fff;box-shadow:inset 0 0 0 .25mm #d4d9d2;border-radius:99mm;padding:0 3mm;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.b.v .t{color:#5E6A76}
.t{font-size:8pt;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d{font-size:6.5pt;color:#5E6A76;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.d i{display:inline-block;width:1.4mm;height:1.4mm;border-radius:.3mm;background:#5E6A76;margin-right:1mm}
.nopics header{padding-bottom:6mm}.nopics h2{font-size:30mm}.nopics .bar{flex-basis:10mm}.nopics .mo{font-size:9pt}.nopics .days{height:7mm}
.nopics .rows{grid-template-rows:repeat(var(--n),11.5mm);row-gap:2mm;padding-top:3mm}.nopics .t{font-size:10.5pt}.nopics .d{font-size:8.5pt}.nopics .b{padding:0 4mm}
@media print{body{background:none}.hint{display:none}.pg{margin:0}}
</style></head><body><p class="hint">Tip: kies Afdrukken in je browser. De pagina's staan al liggend; kies "Opslaan als PDF" voor een PDF.</p>${body || '<p class="hint">Geen momenten in deze periode.</p>'}</body></html>`;
}

/** Data for one slide in the standalone presentation file. */
interface FlatSlide {
	k: 't' | 'y' | 'm';
	em?: string;
	ttl?: string;
	when?: string[];
	note?: string;
	img?: string;
	s?: string;
}

/**
 * A single HTML file with the presentation, photos included, to share or play offline.
 * Arrow keys, space and swipe work; it advances on its own.
 */
export function presentationHtml(tl: Timeline, slides: Slide[], scope: Scope, now: Day, ms: number, photos: PhotoMap = {}): string {
	const kind = KINDS[tl.kind];
	const catOf = (id: string) => tl.categories.find((c) => c.id === id);
	const flat: FlatSlide[] = slides.map((s): FlatSlide => {
		if (s.kind === 'title') {
			const when = [scope.from === scope.to ? String(scope.from) : `${scope.from} – ${scope.to}`];
			if (tl.anchor) {
				const [y, m, d] = tl.anchor.split('-').map(Number);
				when.push(`${kind.anchorLabel.replace(' (optioneel)', '')}: ${d} ${MONTHS[m - 1]} ${y}`);
			}
			return { k: 't', em: kind.emoji, ttl: tl.name, when };
		}
		if (s.kind === 'year') {
			const n = s.occs.filter((o) => !o.moment.virtual).length;
			return { k: 'y', ttl: String(s.y), when: [yearLine(tl, s.y) ?? '', n ? `${n} ${n === 1 ? 'moment' : 'momenten'}` : ''].filter(Boolean) };
		}
		const o = s.o, mo = o.moment;
		const when = [o.m == null ? String(o.y) : o.end ? whenLabel(o) + (o.y === o.end.y ? ` ${o.y}` : '') : labelFull(o.y, o.m, o.d)];
		for (const r of relParts(o, tl, now)) when.push(r.text);
		if (mo.status) when.push(STATUSES.find((x) => x.id === mo.status)!.name);
		if (!mo.virtual) when.push(catOf(mo.categoryId)?.name ?? 'Overig');
		if (s.photoCount > 1 && s.photo && s.photoIndex >= 0) when.push(`foto ${s.photoIndex + 1} van ${s.photoCount}`);
		return {
			k: 'm', em: mo.emoji, ttl: mo.title, when, note: s.photoIndex > 0 ? '' : mo.note,
			img: s.photo ? photos[s.photo] : undefined, s: o.m == null ? 'accent' : season(o.m)
		};
	});
	const data = JSON.stringify(flat).replace(/</g, '\\u003c');
	return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(tl.name)}</title><style>
html,body{margin:0;height:100%;background:#0E1217;color:#F2F4F6;font-family:"Helvetica Neue",Arial,sans-serif;overflow:hidden}
:root{--winter:#7FAAD0;--lente:#8CC468;--zomer:#F0B942;--herfst:#C27A45;--accent:#9BBBF2}
.s{position:absolute;inset:0;opacity:0;transition:opacity .8s}.s.in{opacity:1}
.bg{position:absolute;inset:-6%;background-size:cover;background-position:center;filter:blur(40px) brightness(.32)}
.ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:5vh 5vw 34vh}
.ph img{max-width:100%;max-height:100%;object-fit:contain;border-radius:1.2vh;box-shadow:0 3vh 8vh rgba(0,0,0,.55)}
.edge{position:absolute;left:0;top:0;bottom:0;width:1.1vw;min-width:6px;background:var(--c)}
.tx{position:absolute;left:7vw;right:7vw;bottom:13vh}.noph .tx{top:50%;bottom:auto;transform:translateY(-50%)}
.em{font-size:clamp(56px,16vh,200px);line-height:1;margin-bottom:3vh}.hasph .em{display:none}
.w{font-size:clamp(15px,2.6vh,34px);color:rgba(255,255,255,.78);display:flex;flex-wrap:wrap;gap:.4em 1.1em}
.t{font-size:clamp(30px,7.5vh,110px);font-weight:800;letter-spacing:-.035em;line-height:1.02;margin:.18em 0 .2em;max-width:22ch}
.hasph .t{font-size:clamp(26px,5.6vh,80px)}.y .t{font-size:clamp(90px,34vh,420px);letter-spacing:-.06em}
.n{font-size:clamp(15px,2.9vh,36px);color:rgba(255,255,255,.82);max-width:52ch;line-height:1.35;white-space:pre-wrap}
@media (min-aspect-ratio:3/2){.hasph .ph{left:auto;width:62vw;padding:5vh 3.5vw 5vh 0}.hasph .tx{left:5vw;right:auto;width:30vw;top:50%;bottom:auto;transform:translateY(-50%)}.hasph .em{display:block;font-size:clamp(44px,min(11vh,5vw),150px)}}
.ui{position:fixed;left:0;right:0;bottom:0;display:flex;gap:10px;align-items:center;padding:18px 24px;background:linear-gradient(transparent,rgba(0,0,0,.7))}
.ui button{height:44px;min-width:44px;border-radius:99px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-weight:600;padding:0 16px;cursor:pointer}
.ui span{margin-left:auto;color:rgba(255,255,255,.75)}
@media (prefers-reduced-motion:reduce){.s{transition:none}}
</style></head><body><div id="st" aria-live="polite"></div><div class="ui"><button id="p" aria-label="Vorige">‹</button><button id="pl">Pauze</button><button id="n" aria-label="Volgende">›</button><span id="c"></span><button id="fs">Volledig scherm</button></div>
<script>
const S=${data},MS=${Math.max(2000, ms | 0)};let i=0,play=true,t=null;
const st=document.getElementById('st'),el=(g,c,x)=>{const e=document.createElement(g);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
function draw(){const s=S[i],d=el('div','s '+(s.k==='y'?'y noph':s.img?'hasph':'noph'));d.style.setProperty('--c','var(--'+(s.s||'accent')+')');
if(s.img){const b=el('div','bg');b.style.backgroundImage='url("'+s.img+'")';d.append(b);const p=el('div','ph'),im=el('img');im.src=s.img;im.alt=s.ttl||'';p.append(im);d.append(p)}
if(s.k==='m')d.append(el('div','edge'));const tx=el('div','tx');if(s.em)tx.append(el('div','em',s.em));
if(s.k==='t'||s.k==='y')tx.append(el('div','t',s.ttl));const w=el('div','w');(s.when||[]).forEach(x=>w.append(el('span',null,x)));tx.append(w);
if(s.k==='m')tx.append(el('div','t',s.ttl));if(s.note)tx.append(el('div','n',s.note));d.append(tx);
const old=[...st.children];st.append(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('in')));old.forEach(o=>{o.classList.remove('in');setTimeout(()=>o.remove(),900)});
document.getElementById('c').textContent=(i+1)+' / '+S.length;sched()}
function sched(){clearTimeout(t);if(play)t=setTimeout(()=>go(1),MS);document.getElementById('pl').textContent=play?'Pauze':'Afspelen'}
function go(d){i=(i+d+S.length)%S.length;draw()}
document.getElementById('p').onclick=()=>go(-1);document.getElementById('n').onclick=()=>go(1);
document.getElementById('pl').onclick=()=>{play=!play;sched()};
document.getElementById('fs').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='PageDown')go(1);else if(e.key==='ArrowLeft'||e.key==='PageUp')go(-1);else if(e.key===' '){e.preventDefault();play=!play;sched()}});
let sx=null;st.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});st.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)go(dx<0?1:-1)},{passive:true});
draw();
</script></body></html>`;
}
