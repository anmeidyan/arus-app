/**
 * ARUS — js/charts.js
 * Grafik SVG ringan tanpa library (cepat dimuat, bisa offline).
 */
import { compact, escapeHtml, rupiah } from './utils.js';

export const PALETTE = ['#5B6CFF', '#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#0EA5E9', '#22C55E', '#F97316', '#A78BFA', '#94A3B8'];

/** Donut. segments: [{label, value, color}] */
export function donutChart(segments, { size = 184, thickness = 20, centerTop = '', centerMain = '' } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments.length > 1 ? 3 : 0;
  let offset = 0;
  const arcs = segments.map((s, i) => {
    const len = Math.max((s.value / total) * c - gap, 0.5);
    const el = `<circle class="donut-seg" style="--i:${i}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
      stroke="${s.color}" stroke-width="${thickness}" stroke-linecap="butt"
      stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}">
      <title>${escapeHtml(s.label)}: ${rupiah(s.value)}</title></circle>`;
    offset += (s.value / total) * c;
    return el;
  }).join('');
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="Grafik donat pengeluaran per kategori">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${thickness}"/>
    <g transform="rotate(-90 ${size / 2} ${size / 2})">${arcs}</g>
    <text x="50%" y="46%" text-anchor="middle" class="donut-top">${escapeHtml(centerTop)}</text>
    <text x="50%" y="58%" text-anchor="middle" class="donut-main">${escapeHtml(centerMain)}</text>
  </svg>`;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function axis(W, H, padL, padT, plotH, max) {
  return [0, 0.5, 1].map((f) => {
    const y = padT + plotH - f * plotH;
    return `<line x1="${padL}" x2="${W}" y1="${y}" y2="${y}" class="grid"/>
      <text x="${padL - 6}" y="${y + 3.5}" text-anchor="end" class="axis">${f === 0 ? '0' : compact(max * f)}</text>`;
  }).join('');
}

/**
 * Batang. series: [{key, color, label}] ; data: [{label, title, values:{key:number}, highlight}]
 */
export function barChart(data, series, { height = 180 } = {}) {
  const W = 340, H = height, padL = 38, padB = 22, padT = 10;
  const plotW = W - padL, plotH = H - padT - padB;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] || 0))));
  const slot = plotW / Math.max(data.length, 1);
  const groupW = Math.min(slot * 0.72, series.length > 1 ? 34 : 22);
  const barW = groupW / series.length;
  const labelEvery = Math.ceil(data.length / 8);

  const bars = data.map((d, i) => {
    const x0 = padL + i * slot + (slot - groupW) / 2;
    const rects = series.map((s, j) => {
      const v = d.values[s.key] || 0;
      const h = v > 0 ? Math.max((v / max) * plotH, 2) : 0;
      const x = x0 + j * barW + (series.length > 1 ? 1 : 0);
      const w = Math.max(barW - (series.length > 1 ? 2 : 0), 2);
      return `<rect class="bar ${d.highlight ? 'is-hl' : ''}" style="--d:${i * 18}ms;fill:${s.color}" x="${x}" y="${padT + plotH - h}" width="${w}" height="${h}"
        rx="${Math.min(w / 2, 5)}"><title>${escapeHtml(d.title || d.label)} · ${s.label}: ${rupiah(v)}</title></rect>`;
    }).join('');
    const lbl = i % labelEvery === 0 || i === data.length - 1
      ? `<text x="${padL + i * slot + slot / 2}" y="${H - 6}" text-anchor="middle" class="axis ${d.highlight ? 'is-hl' : ''}">${escapeHtml(d.label)}</text>` : '';
    return rects + lbl;
  }).join('');

  return `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang">
    ${axis(W, H, padL, padT, plotH, max)}${bars}</svg>`;
}
