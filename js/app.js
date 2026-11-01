/**
 * ARUS — js/app.js
 * Logika utama aplikasi: tampilan, form transaksi, sinkronisasi, antrean offline.
 */
import { api, ApiError, getConfig, setConfig, clearConfig, isValidScriptUrl } from './api.js';
import * as U from './utils.js';
import { donutChart, barChart, PALETTE } from './charts.js';

/* ============================================================
 * Konstanta & penyimpanan lokal
 * ========================================================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = U.escapeHtml;
const fmt = U.rupiah;

const LS = { cache: 'arus.cache.v1', queue: 'arus.queue.v1', prefs: 'arus.prefs.v1' };
const store = {
  get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* penuh/diblokir */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* abaikan */ } },
};

const COLOR = { income: '#14B8A6', expense: 'var(--expense)', brand: 'var(--brand)' };

const THEMES = [
  { key: 'indigo', name: 'Biru-Ungu', grad: 'linear-gradient(135deg,#4F6BFF,#9D6BFF)' },
  { key: 'laut', name: 'Laut', grad: 'linear-gradient(135deg,#1D4ED8,#0EA5E9)' },
  { key: 'teal', name: 'Teal', grad: 'linear-gradient(135deg,#0F766E,#06B6D4)' },
  { key: 'anggur', name: 'Anggur', grad: 'linear-gradient(135deg,#7E22CE,#C026D3)' },
  { key: 'grafit', name: 'Grafit', grad: 'linear-gradient(135deg,#0F172A,#475569)' },
];
function applyTheme() {
  const t = THEMES.some((x) => x.key === prefs.theme) ? prefs.theme : 'indigo';
  if (t === 'indigo') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}
const TYPE_LABEL = { pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran' };
const EMOJIS = ['🏷️', '🍜', '☕', '🛒', '🚗', '⛽', '🅿️', '💡', '📱', '🏠', '🏥', '💊', '👕', '💄', '🎬', '🎮', '✈️', '🎁', '📚', '💳', '🐷', '🐾', '👶', '🧾', '💼', '💻', '📈', '🎯', '💰', '🔧'];

const I = {
  home: '<svg viewBox="0 0 24 24"><path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 0 1 3.5 19z"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17.5" r="1"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><rect x="5.5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="5" width="3" height="12" rx="1"/><rect x="15.5" y="8.5" width="3" height="8.5" rx="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  filter: '<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19l1-12M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.4v.1"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.7-1A4.5 4.5 0 0 0 7 18.5z"/><path d="m3 3 18 18"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-4.5-4-6.5-4.5-10.5-2.5 1.5-4 4-4 6.5C8.5 9.5 8 8.5 8 7c-1.5 1.5-2.5 4-2.5 7.5A6.5 6.5 0 0 0 12 21z"/></svg>',
  pulse: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  logo: '<svg viewBox="0 0 32 32"><rect x="4.5" y="9" width="23" height="14" rx="3"/><circle cx="16" cy="16" r="3.4"/><path d="M9 16h.01M23 16h.01"/></svg>',
};

const EMPTY_ART = `<svg viewBox="0 0 160 120" aria-hidden="true">
  <defs><linearGradient id="eg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B6CFF"/><stop offset="1" stop-color="#14B8A6"/></linearGradient></defs>
  <ellipse cx="80" cy="104" rx="46" ry="6" fill="#EEF0F8"/>
  <rect x="44" y="18" width="72" height="82" rx="12" fill="#fff" stroke="#E3E6F2" stroke-width="2"/>
  <rect x="56" y="34" width="34" height="6" rx="3" fill="url(#eg)" opacity=".85"/>
  <rect x="56" y="48" width="48" height="5" rx="2.5" fill="#E9ECF6"/><rect x="56" y="60" width="40" height="5" rx="2.5" fill="#E9ECF6"/>
  <rect x="56" y="72" width="44" height="5" rx="2.5" fill="#E9ECF6"/>
  <circle cx="114" cy="28" r="14" fill="url(#eg)"/><path d="M114 22v12M108 28h12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

/* ============================================================
 * State
 * ========================================================== */
const prefs = Object.assign({ lastType: 'pengeluaran', period: 'month', custom: {}, owner: 'all', theme: 'indigo', carry: true }, store.get(LS.prefs, {}));
const cached = store.get(LS.cache, null);

const state = {
  tx: cached?.tx || [],
  categories: cached?.categories || [],
  sheetUrl: cached?.sheetUrl || '',
  lastSync: cached?.lastSync || 0,
  me: cached?.me || '',
  users: cached?.users || [],
  loaded: !!cached,
  queue: store.get(LS.queue, []),
  syncing: false,
  syncError: '',
  view: 'home',
  renderedView: null,
  hist: { q: '', type: 'all', cat: '', from: '', to: '', limit: 40 },
  trend: 'daily',
  catTab: 'pengeluaran',
  installPrompt: null,
};

const savePrefs = () => store.set(LS.prefs, prefs);
const saveQueue = () => store.set(LS.queue, state.queue);
const saveCache = () => store.set(LS.cache, { tx: state.tx, categories: state.categories, sheetUrl: state.sheetUrl, lastSync: state.lastSync, me: state.me, users: state.users });

/* ============================================================
 * Data turunan
 * ========================================================== */
const cmp = (a, b) => (a > b) - (a < b);
const newestFirst = (a, b) => cmp(b.date, a.date) || cmp(b.createdAt || '', a.createdAt || '');

function allTx() {
  const ids = new Set(state.tx.map((t) => t.id));
  const pending = state.queue.filter((q) => !ids.has(q.tx.id)).map((q) => ({ ...q.tx, pending: true }));
  return [...pending, ...state.tx].sort(newestFirst);
}
const findTx = (id) => allTx().find((t) => t.id === id);

/* ---------- Dua pengguna ---------- */
const multiUser = () => !!state.me && state.users.length > 1;
const partnerName = () => state.users.find((u) => u !== state.me) || 'Pasangan';
const isMine = (t) => !state.me || !t.owner || t.owner === state.me;
const ownerMode = () => (multiUser() ? prefs.owner : 'me');
const OWNER_LABEL = () => ({ me: 'Saya', partner: partnerName(), all: 'Berdua' });

/** Transaksi sesuai pilihan Saya / Pasangan / Berdua. */
function viewTx() {
  const mode = ownerMode();
  const list = allTx();
  if (!multiUser() || mode === 'all') return list;
  return list.filter((t) => (mode === 'me' ? isMine(t) : !isMine(t)));
}

function ownerSwitch() {
  if (!multiUser()) return '';
  const m = prefs.owner, L = OWNER_LABEL();
  return `<div class="seg seg-full owner-switch" role="tablist" aria-label="Tampilkan data">
    ${['me', 'partner', 'all'].map((k) => `<button class="${m === k ? 'is-active' : ''}" data-owner="${k}" role="tab" aria-selected="${m === k}">${esc(L[k])}</button>`).join('')}
  </div>`;
}
const inRange = (list, r) => list.filter((t) => t.date >= r.start && t.date <= r.end);
const currentRange = () => U.periodRange(prefs.period, prefs.custom);

function sums(list) {
  let income = 0, expense = 0;
  for (const t of list) t.type === 'pemasukan' ? (income += t.amount) : (expense += t.amount);
  return { income, expense, net: income - expense, count: list.length };
}

function catIcon(type, name) {
  return state.categories.find((c) => c.type === type && c.name === name)?.icon
    || state.categories.find((c) => c.name === name)?.icon || '🏷️';
}

function byCategory(list, type = 'pengeluaran') {
  const map = new Map();
  for (const t of list) {
    if (t.type !== type) continue;
    const m = map.get(t.category) || { name: t.category, icon: catIcon(type, t.category), value: 0, count: 0 };
    m.value += t.amount; m.count++;
    map.set(t.category, m);
  }
  const total = [...map.values()].reduce((s, x) => s + x.value, 0) || 1;
  return [...map.values()].sort((a, b) => b.value - a.value).map((x) => ({ ...x, share: x.value / total }));
}

/** Kategori diurutkan dari yang paling sering dipakai agar input lebih cepat. */
function categoriesFor(type) {
  const counts = {};
  for (const t of allTx()) if (t.type === type && isMine(t)) counts[t.category] = (counts[t.category] || 0) + 1;
  return state.categories
    .map((c, i) => ({ ...c, i }))
    .filter((c) => c.type === type)
    .sort((a, b) => (counts[b.name] || 0) - (counts[a.name] || 0) || a.i - b.i);
}

const pct = (x) => `${Math.round(x * 100)}%`;

function insights(range) {
  const all = viewTx();
  const cur = inRange(all, range);
  const s = sums(cur);
  const cats = byCategory(cur);
  const days = U.elapsedDays(range);
  const c = U.comparisonRanges(range);
  const curExp = sums(inRange(all, c.current)).expense;
  const prevExp = sums(inRange(all, c.previous)).expense;
  const daily = {};
  cur.forEach((t) => { if (t.type === 'pengeluaran') daily[t.date] = (daily[t.date] || 0) + t.amount; });
  const peakDay = Object.entries(daily).sort((a, b) => b[1] - a[1])[0];
  return {
    s, cats, top: cats[0], days,
    avg: s.expense / days,
    curExp, prevExp, cmpLabel: c.label,
    change: prevExp > 0 ? (curExp - prevExp) / prevExp : null,
    biggest: cur.filter((t) => t.type === 'pengeluaran').sort((a, b) => b.amount - a.amount)[0],
    saveRate: s.income > 0 ? s.net / s.income : null,
    peakDay,
  };
}

/* ============================================================
 * Render: kerangka
 * ========================================================== */
const VIEW_TITLE = { home: 'Arus', history: 'Riwayat', stats: 'Statistik', settings: 'Pengaturan' };

function render() {
  renderTopbar();
  $$('.bottom-nav [data-nav]').forEach((b) => {
    const on = b.dataset.nav === state.view;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  const view = $('#view');
  const html = { home: viewHome, history: viewHistory, stats: viewStats, settings: viewSettings }[state.view]();
  view.innerHTML = html;
  if (state.renderedView !== state.view) {
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    state.renderedView = state.view;
  }
  if (state.view === 'history') renderHistList();
}

function renderTopbar() {
  const pendingN = state.queue.length;
  const cls = state.syncing ? 'is-syncing' : pendingN ? 'has-pending' : state.syncError ? 'has-error' : 'is-ok';
  const label = state.syncing ? 'Menyinkronkan…' : pendingN ? `${pendingN} menunggu` : state.syncError ? 'Gagal sinkron' : 'Tersinkron';
  $('#topbar-title').innerHTML = state.view === 'home'
    ? `<span class="brand-mark">${I.logo}</span><span>Arus</span>`
    : `<span>${VIEW_TITLE[state.view]}</span>`;
  const btn = $('#sync-btn');
  btn.className = `sync-btn ${cls}`;
  btn.innerHTML = `${I.sync}<span>${label}</span>`;
  btn.setAttribute('aria-label', `Sinkronkan. Status: ${label}`);
}

function setView(v) {
  if (state.view === v) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  state.view = v;
  render();
  window.scrollTo(0, 0);
}

/* ============================================================
 * Komponen kecil
 * ========================================================== */
function periodChips() {
  const p = prefs.period;
  const items = [['today', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['custom', p === 'custom' ? currentRange().label : 'Custom']];
  return `<div class="chips chips-scroll period" role="tablist" aria-label="Pilih periode">${items.map(([k, l]) =>
    `<button class="chip ${p === k ? 'is-active' : ''}" data-period="${k}" role="tab" aria-selected="${p === k}">${k === 'custom' ? I.calendar : ''}${esc(l)}</button>`).join('')}</div>`;
}

function txItem(t, showDate = false) {
  const inc = t.type === 'pemasukan';
  const sub = [t.note, showDate ? U.dayLabel(t.date) : ''].filter(Boolean).join(' · ') || TYPE_LABEL[t.type];
  return `<button class="tx-item" data-tx="${esc(t.id)}">
    <span class="tx-icon ${t.type}">${esc(catIcon(t.type, t.category))}</span>
    <span class="tx-main"><span class="tx-cat">${esc(t.category || 'Tanpa kategori')}</span><span class="tx-sub">${esc(sub)}</span></span>
    <span class="tx-right"><span class="tx-amt ${t.type}">${inc ? '+' : '-'}${fmt(t.amount)}</span>
    ${t.pending ? '<span class="badge-pending">Menunggu sinkron</span>' : ''}
    ${multiUser() && ownerMode() === 'all' && !isMine(t) ? `<span class="owner-tag">${esc(t.owner)}</span>` : ''}</span>
  </button>`;
}

function emptyState(title, text, cta = true) {
  return `<div class="empty"><div class="empty-art">${EMPTY_ART}</div><h3>${title}</h3><p>${text}</p>
    ${cta ? `<button class="btn btn-primary" data-action="add">${I.plus}Tambah Transaksi</button>` : ''}</div>`;
}

const skeleton = (h, n = 1) => Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px"></div>`).join('');

/* ============================================================
 * Tampilan: Beranda
 * ========================================================== */
function viewHome() {
  if (!state.loaded) {
    return `<section class="hero">${skeleton(14)}${skeleton(26)}</section>${skeleton(40)}${skeleton(188)}
      <div class="insights">${skeleton(112, 3)}</div>${skeleton(64, 4)}`;
  }
  const range = currentRange();
  const ins = insights(range);
  const { s } = ins;
  const recent = viewTx().slice(0, 6);
  const carryOn = prefs.carry !== false;
  const carry = carryOn ? sums(viewTx().filter((t) => t.date && t.date < range.start)).net : 0;
  const balance = carry + s.net;
  const CARRY_FROM = { today: 'dari kemarin', week: 'dari minggu lalu', month: 'dari bulan lalu', custom: 'sebelum periode' };
  const FLOW_LABEL = { today: 'hari ini', week: 'minggu ini', month: 'bulan ini', custom: 'periode ini' };

  return `
  <section class="hero">
    <p class="eyebrow">${U.greeting()}</p>
    <h1 class="h1">${U.formatDate(U.today(), 'long')}</h1>
  </section>
  ${ownerSwitch()}
  ${periodChips()}
  <section class="balance-card" aria-label="Ringkasan ${esc(range.label)}">
    <div class="bc-label">${carryOn ? 'Saldo' : 'Saldo bersih'}${multiUser() ? ` · ${esc(OWNER_LABEL()[ownerMode()])}` : ''} · ${esc(range.label)}</div>
    <div class="bc-amount ${balance < 0 ? 'is-neg' : ''}">${fmt(balance)}</div>
    ${carryOn ? `<div class="bc-carry"><span>Saldo ${CARRY_FROM[range.key]}<b>${fmt(carry)}</b></span><span>Arus ${FLOW_LABEL[range.key]}<b>${fmt(s.net, { sign: true })}</b></span></div>` : ''}
    <div class="bc-split">
      <div class="glass"><span class="bc-ic in">${I.down}</span><div><small>Pemasukan</small><strong>${fmt(s.income)}</strong></div></div>
      <div class="glass"><span class="bc-ic out">${I.up}</span><div><small>Pengeluaran</small><strong>${fmt(s.expense)}</strong></div></div>
    </div>
  </section>
  ${insightCards(ins)}
  <section class="card">
    <div class="card-head"><h2>Transaksi terbaru</h2>${recent.length ? '<button class="link" data-nav="history">Lihat semua</button>' : ''}</div>
    ${recent.length ? `<div class="tx-list">${recent.map((t) => txItem(t, true)).join('')}</div>`
      : ownerMode() === 'partner' ? emptyState(`${esc(partnerName())} belum mencatat transaksi`, 'Transaksi pasanganmu akan muncul di sini.', false)
      : emptyState('Belum ada transaksi', 'Catat pemasukan atau pengeluaran pertamamu. Hanya butuh beberapa detik.')}
  </section>`;
}

function insightCards(ins) {
  const { top, change } = ins;
  const flat = change !== null && Math.abs(change) < 0.01;
  const changeTone = change === null || flat ? '' : change > 0 ? 'bad' : 'good';
  const changeText = change === null ? `Belum ada data ${ins.cmpLabel}`
    : flat ? `Relatif sama dengan ${ins.cmpLabel}`
    : `${change > 0 ? '▲' : '▼'} ${pct(Math.abs(change))} vs ${ins.cmpLabel}`;
  return `<section class="insights" aria-label="Insight">
    <div class="insight"><span class="insight-ic violet">${I.flame}</span><small>Pengeluaran terbesar</small>
      <strong>${top ? `${esc(top.icon)} ${esc(top.name)}` : '—'}</strong>
      <span class="insight-sub">${top ? `${fmt(top.value)} · ${pct(top.share)}` : 'Belum ada pengeluaran'}</span></div>
    <div class="insight"><span class="insight-ic blue">${I.pulse}</span><small>Rata-rata harian</small>
      <strong>${fmt(ins.avg)}</strong><span class="insight-sub">dari ${ins.days} hari berjalan</span></div>
    <div class="insight"><span class="insight-ic teal">${I.spark}</span><small>Dibanding sebelumnya</small>
      <strong>${fmt(ins.curExp)}</strong><span class="insight-sub ${changeTone}">${changeText}</span></div>
  </section>`;
}

/* ============================================================
 * Tampilan: Statistik
 * ========================================================== */
function viewStats() {
  if (!state.loaded) return `${skeleton(40)}${skeleton(300)}${skeleton(240)}`;
  const range = currentRange();
  const ins = insights(range);
  const { s, cats } = ins;

  // Donut: 6 kategori teratas + gabungan sisanya
  const top = cats.slice(0, 6);
  const rest = cats.slice(6);
  const segs = top.map((c, i) => ({ ...c, label: c.name, color: PALETTE[i] }));
  if (rest.length) {
    const v = rest.reduce((a, c) => a + c.value, 0);
    segs.push({ name: `${rest.length} kategori lain`, icon: '•', label: 'Lainnya', value: v, share: v / (s.expense || 1), color: PALETTE[9], other: true });
  }

  const catCard = cats.length ? `
    <div class="donut-wrap">${donutChart(segs, { centerTop: 'Total keluar', centerMain: U.compact(s.expense) })}</div>
    <div class="legend">${segs.map((c) => `
      <button class="legend-row" ${c.other ? 'disabled' : `data-goto-cat="${esc(c.name)}"`}>
        <span class="swatch" style="background:${c.color}"></span>
        <span class="lg-name">${esc(c.icon)} ${esc(c.name)}</span>
        <span class="lg-val">${fmt(c.value)}</span><span class="lg-pct">${pct(c.share)}</span>
        <span class="lg-bar"><i style="width:${Math.max(c.share * 100, 2)}%;background:${c.color}"></i></span>
      </button>`).join('')}</div>`
    : `<p class="muted center pad">Belum ada pengeluaran di periode ini.</p>`;

  const income = s.income, expense = s.expense, maxV = Math.max(income, expense, 1);
  let vsNote;
  if (!income && !expense) vsNote = 'Belum ada transaksi di periode ini.';
  else if (!income) vsNote = 'Belum ada pemasukan tercatat di periode ini.';
  else if (expense <= income) vsNote = `${esc(subject().Sub)} memakai <b>${pct(expense / income)}</b> dari pemasukan. Sisa <b>${fmt(income - expense)}</b>.`;
  else vsNote = `Pengeluaran melebihi pemasukan sebesar <b>${fmt(expense - income)}</b>.`;

  return `
  ${ownerSwitch()}
  ${periodChips()}
  <section class="card">
    <div class="card-head"><h2>Pengeluaran per kategori</h2><span class="muted small">${esc(range.label)}</span></div>
    ${catCard}
  </section>
  <section class="card">
    <div class="card-head"><h2>Tren</h2>
      <div class="seg seg-sm" role="tablist">
        <button class="${state.trend === 'daily' ? 'is-active' : ''}" data-trend="daily">Harian</button>
        <button class="${state.trend === 'monthly' ? 'is-active' : ''}" data-trend="monthly">Bulanan</button>
      </div></div>
    ${trendChart(range)}
  </section>
  <section class="card">
    <div class="card-head"><h2>Pemasukan vs Pengeluaran</h2></div>
    <div class="vs">
      <div class="vs-row"><span>Pemasukan</span><strong class="c-in">${fmt(income)}</strong></div>
      <div class="vs-bar"><i class="in" style="width:${(income / maxV) * 100}%"></i></div>
      <div class="vs-row"><span>Pengeluaran</span><strong class="c-out">${fmt(expense)}</strong></div>
      <div class="vs-bar"><i class="out" style="width:${(expense / maxV) * 100}%"></i></div>
      <p class="vs-note">${vsNote}</p>
    </div>
  </section>
  ${multiUser() && ownerMode() === 'all' ? perPersonCard(range) : ''}
  <section class="card">
    <div class="card-head"><h2>Insight</h2></div>
    <ul class="insight-list">${insightList(ins)}</ul>
  </section>`;
}

function perPersonCard(range) {
  const list = inRange(allTx(), range);
  const people = state.users.map((u) => ({ name: u, ...sums(list.filter((t) => (t.owner || state.users[0]) === u)) }));
  const totalExp = people.reduce((a, p) => a + p.expense, 0) || 1;
  return `<section class="card">
    <div class="card-head"><h2>Per orang</h2><span class="muted small">${esc(range.label)}</span></div>
    <div class="people">${people.map((p, i) => `
      <div class="person">
        <span class="avatar a${i}">${esc(p.name.slice(0, 1).toUpperCase())}</span>
        <div class="person-main"><strong>${esc(p.name)}${p.name === state.me ? ' <small>(kamu)</small>' : ''}</strong>
          <span class="person-sub"><span class="c-in">+${fmt(p.income)}</span> · <span class="c-out">-${fmt(p.expense)}</span></span>
          <span class="lg-bar"><i style="width:${Math.max((p.expense / totalExp) * 100, 2)}%;background:${i ? PALETTE[4] : PALETTE[0]}"></i></span></div>
        <span class="person-pct">${pct(p.expense / totalExp)}<small>pengeluaran</small></span>
      </div>`).join('')}</div>
  </section>`;
}

function trendChart(range) {
  const all = viewTx();
  if (state.trend === 'daily') {
    let end = U.minISO(range.end, U.today());
    let start = range.start > end ? end : range.start;
    if (U.diffDays(start, end) < 6) start = U.addDays(end, -6);
    if (U.diffDays(start, end) > 61) start = U.addDays(end, -61);
    const daily = {};
    all.forEach((t) => { if (t.type === 'pengeluaran' && t.date >= start && t.date <= end) daily[t.date] = (daily[t.date] || 0) + t.amount; });
    const data = [];
    for (let d = start; d <= end; d = U.addDays(d, 1)) {
      const dt = U.fromISO(d);
      data.push({ label: String(dt.getDate()), title: U.formatDate(d, 'long'), values: { exp: daily[d] || 0 }, highlight: d === U.today() });
    }
    const total = Object.values(daily).reduce((a, b) => a + b, 0);
    return `<p class="chart-cap">Pengeluaran per hari · ${U.formatDate(start, 'short')} – ${U.formatDate(end, 'short')}</p>
      ${total ? barChart(data, [{ key: 'exp', color: COLOR.brand, label: 'Pengeluaran' }]) : '<p class="muted center pad">Belum ada pengeluaran di rentang ini.</p>'}`;
  }
  // Bulanan: 6 bulan terakhir
  const endD = U.fromISO(U.minISO(range.end, U.today()));
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(endD.getFullYear(), endD.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, d });
  }
  const agg = Object.fromEntries(months.map((m) => [m.key, { inc: 0, exp: 0 }]));
  all.forEach((t) => { const k = t.date.slice(0, 7); if (agg[k]) agg[k][t.type === 'pemasukan' ? 'inc' : 'exp'] += t.amount; });
  const data = months.map((m) => ({ label: U.MONTHS[m.d.getMonth()], title: `${U.MONTHS_LONG[m.d.getMonth()]} ${m.d.getFullYear()}`, values: agg[m.key] }));
  return `<p class="chart-cap">6 bulan terakhir</p>
    <div class="chart-legend"><span><i style="background:${COLOR.income}"></i>Pemasukan</span><span><i style="background:${COLOR.expense}"></i>Pengeluaran</span></div>
    ${barChart(data, [{ key: 'inc', color: COLOR.income, label: 'Pemasukan' }, { key: 'exp', color: COLOR.expense, label: 'Pengeluaran' }])}`;
}

/** Subjek kalimat sesuai mode: "Kamu" / "Ita" / "Kalian". */
function subject() {
  const m = ownerMode();
  return m === 'all' && multiUser() ? { Sub: 'Kalian', poss: ' kalian' } : m === 'partner' ? { Sub: partnerName(), poss: ` ${partnerName()}` } : { Sub: 'Kamu', poss: 'mu' };
}

function insightList(ins) {
  const S = subject();
  const rows = [];
  if (ins.top) rows.push([I.flame, 'Kategori terbesar', `${esc(ins.top.icon)} ${esc(ins.top.name)} menghabiskan <b>${fmt(ins.top.value)}</b> (${pct(ins.top.share)} dari total pengeluaran).`]);
  rows.push([I.pulse, 'Rata-rata harian', `Rata-rata pengeluaran${S.poss} <b>${fmt(ins.avg)}</b> per hari selama ${ins.days} hari.`]);
  if (ins.change === null) rows.push([I.spark, 'Perbandingan', `Belum ada pengeluaran ${ins.cmpLabel} untuk dibandingkan.`]);
  else if (Math.abs(ins.change) < 0.01) rows.push([I.spark, 'Perbandingan', `Pengeluaran relatif sama dengan ${ins.cmpLabel} di rentang hari yang sama (${fmt(ins.curExp)} vs ${fmt(ins.prevExp)}).`]);
  else {
    const up = ins.change > 0;
    rows.push([I.spark, 'Perbandingan', `Pengeluaran <b class="${up ? 'c-bad' : 'c-good'}">${up ? 'naik' : 'turun'} ${pct(Math.abs(ins.change))}</b> dibanding ${ins.cmpLabel} di rentang hari yang sama (${fmt(ins.curExp)} vs ${fmt(ins.prevExp)}).`]);
  }
  if (ins.biggest) rows.push([I.up, 'Transaksi terbesar', `${esc(ins.biggest.category)} <b>${fmt(ins.biggest.amount)}</b> pada ${U.formatDate(ins.biggest.date, 'short')}${ins.biggest.note ? ` (${esc(ins.biggest.note)})` : ''}.`]);
  if (ins.peakDay) rows.push([I.calendar, 'Hari paling boros', `${U.formatDate(ins.peakDay[0], 'long')} dengan total <b>${fmt(ins.peakDay[1])}</b>.`]);
  if (ins.saveRate !== null) rows.push([I.check, 'Rasio tabungan', ins.saveRate >= 0 ? `${esc(S.Sub)} menyisihkan <b class="c-good">${pct(ins.saveRate)}</b> dari pemasukan.` : `Pengeluaran melebihi pemasukan <b class="c-bad">${pct(-ins.saveRate)}</b>.`]);
  return rows.map(([ic, t, d]) => `<li><span class="il-ic">${ic}</span><div><strong>${t}</strong><p>${d}</p></div></li>`).join('');
}

/* ============================================================
 * Tampilan: Riwayat
 * ========================================================== */
function viewHistory() {
  const h = state.hist;
  const pills = [];
  if (h.cat) pills.push(`<button class="pill" data-clear="cat">${esc(h.cat)} ${I.x}</button>`);
  if (h.from || h.to) pills.push(`<button class="pill" data-clear="date">${h.from ? U.formatDate(h.from, 'short') : '…'} – ${h.to ? U.formatDate(h.to, 'short') : '…'} ${I.x}</button>`);
  const nFilter = (h.cat ? 1 : 0) + (h.from || h.to ? 1 : 0);
  return `
  <div class="hist-top">
    ${ownerSwitch()}
    <label class="search">${I.search}
      <input id="hist-q" type="search" placeholder="Cari catatan, kategori, nominal…" value="${esc(h.q)}" autocomplete="off" enterkeyhint="search" aria-label="Cari transaksi">
    </label>
    <div class="chips">
      ${[['all', 'Semua'], ['pemasukan', 'Pemasukan'], ['pengeluaran', 'Pengeluaran']].map(([k, l]) =>
        `<button class="chip ${h.type === k ? 'is-active' : ''}" data-htype="${k}">${l}</button>`).join('')}
      <button class="chip chip-icon ${nFilter ? 'is-on' : ''}" data-action="hist-filter" aria-label="Filter kategori dan tanggal">${I.filter}${nFilter ? `<b>${nFilter}</b>` : 'Filter'}</button>
    </div>
    ${pills.length ? `<div class="pills">${pills.join('')}</div>` : ''}
  </div>
  <div id="hist-list" aria-live="polite"></div>`;
}

function histFiltered() {
  const h = state.hist;
  const q = h.q.trim().toLowerCase();
  const qDigits = q.replace(/[^\d]/g, '');
  return viewTx().filter((t) => {
    if (h.type !== 'all' && t.type !== h.type) return false;
    if (h.cat && t.category !== h.cat) return false;
    if (h.from && t.date < h.from) return false;
    if (h.to && t.date > h.to) return false;
    if (q) {
      const hay = `${t.category} ${t.note} ${U.formatDate(t.date, 'long')} ${TYPE_LABEL[t.type]}`.toLowerCase();
      const amountHit = qDigits.length >= 2 && String(t.amount).includes(qDigits);
      if (!hay.includes(q) && !amountHit) return false;
    }
    return true;
  });
}

function renderHistList() {
  const box = $('#hist-list');
  if (!box) return;
  if (!state.loaded) { box.innerHTML = skeleton(64, 6); return; }
  const list = histFiltered();
  const h = state.hist;
  const filtered = h.q || h.type !== 'all' || h.cat || h.from || h.to;
  if (!list.length) {
    box.innerHTML = filtered
      ? `<div class="empty small"><div class="empty-art">${EMPTY_ART}</div><h3>Tidak ada yang cocok</h3><p>Coba kata kunci atau filter lain.</p>
         <button class="btn btn-soft" data-action="hist-reset">Hapus semua filter</button></div>`
      : emptyState('Riwayat masih kosong', 'Transaksi yang kamu catat akan muncul di sini.');
    return;
  }
  const s = sums(list);
  const shown = list.slice(0, h.limit);
  const groups = [];
  for (const t of shown) {
    const g = groups[groups.length - 1];
    if (g && g.date === t.date) g.items.push(t); else groups.push({ date: t.date, items: [t] });
  }
  box.innerHTML = `
    <div class="hist-summary"><span>${list.length} transaksi</span><span class="c-in">+${fmt(s.income)}</span><span class="c-out">-${fmt(s.expense)}</span></div>
    ${groups.map((g) => {
      const gs = sums(list.filter((t) => t.date === g.date));
      return `<section class="day-group"><header><span>${esc(g.date ? U.dayLabel(g.date) : 'Tanpa tanggal')}</span>
        <span class="${gs.net >= 0 ? 'c-in' : 'c-out'}">${fmt(gs.net, { sign: true })}</span></header>
        <div class="tx-list">${g.items.map((t) => txItem(t)).join('')}</div></section>`;
    }).join('')}
    ${list.length > h.limit ? `<button class="btn btn-soft btn-block" data-action="hist-more">Tampilkan lebih banyak (${list.length - h.limit} lagi)</button>` : ''}`;
}

/* ============================================================
 * Tampilan: Pengaturan
 * ========================================================== */
function viewSettings() {
  const cfg = getConfig() || {};
  const cats = state.categories.filter((c) => c.type === state.catTab);
  const used = {};
  allTx().forEach((t) => { used[`${t.type}|${t.category}`] = (used[`${t.type}|${t.category}`] || 0) + 1; });
  const shortUrl = cfg.url ? cfg.url.replace(/^https:\/\/script\.google\.com\/macros\/s\/(.{6}).*(.{6})\/exec$/, 'script.google.com/…$1…$2/exec') : '-';

  return `
  <section class="card">
    <div class="card-head"><h2>Tampilan</h2></div>
    <div class="theme-grid" role="radiogroup" aria-label="Warna tema">${THEMES.map((t) => `
      <button class="theme-opt ${(prefs.theme || 'indigo') === t.key ? 'is-active' : ''}" data-theme-pick="${t.key}" role="radio" aria-checked="${(prefs.theme || 'indigo') === t.key}">
        <i style="background:${t.grad}"></i>${t.name}</button>`).join('')}</div>
    <label class="toggle-row"><span><strong>Bawa saldo dari bulan lalu</strong><small>Saldo di Beranda = sisa periode sebelumnya + arus periode ini</small></span>
      <span class="switch"><input type="checkbox" id="carry-toggle" ${prefs.carry !== false ? 'checked' : ''}><span></span></span></label>
  </section>

  <section class="card">
    <div class="card-head"><h2>Kategori</h2><span class="muted small">${cats.length} kategori</span></div>
    <div class="seg seg-full" role="tablist">
      <button class="${state.catTab === 'pengeluaran' ? 'is-active' : ''}" data-cattab="pengeluaran">Pengeluaran</button>
      <button class="${state.catTab === 'pemasukan' ? 'is-active' : ''}" data-cattab="pemasukan">Pemasukan</button>
    </div>
    <form class="cat-add" id="cat-add" novalidate>
      <button type="button" class="emoji-btn" id="emoji-btn" aria-label="Pilih ikon" aria-expanded="false">🏷️</button>
      <input class="input" id="cat-name" maxlength="40" placeholder="Nama kategori baru" autocomplete="off" aria-label="Nama kategori baru">
      <button type="submit" class="btn btn-primary btn-sm">Tambah</button>
    </form>
    <div class="emoji-grid" id="emoji-grid" hidden>${EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
    <ul class="cat-list">${cats.map((c) => {
      const n = used[`${c.type}|${c.name}`] || 0;
      return `<li><span class="cat-ic">${esc(c.icon)}</span><span class="cat-name">${esc(c.name)}<small>${n ? `${n} transaksi` : 'Belum dipakai'}</small></span>
        <button class="icon-btn danger" data-delcat="${esc(c.name)}" aria-label="Hapus kategori ${esc(c.name)}">${I.trash}</button></li>`;
    }).join('') || '<li class="muted">Belum ada kategori.</li>'}</ul>
  </section>

  <section class="card">
    <div class="card-head"><h2>Sinkronisasi</h2></div>
    <dl class="kv">
      <div><dt>Terakhir sinkron</dt><dd>${U.timeAgo(state.lastSync)}</dd></div>
      <div><dt>Menunggu dikirim</dt><dd>${state.queue.length ? `<span class="c-warn">${state.queue.length} transaksi</span>` : 'Tidak ada'}</dd></div>
      <div><dt>Total transaksi</dt><dd>${allTx().length}</dd></div>
    </dl>
    ${state.syncError ? `<p class="note-error">${I.alert}${esc(state.syncError)}</p>` : ''}
    <div class="btn-row">
      <button class="btn btn-soft" data-action="sync">${I.sync}Sinkronkan</button>
      ${state.sheetUrl ? `<a class="btn btn-soft" href="${esc(state.sheetUrl)}" target="_blank" rel="noopener">${I.external}Buka Sheets</a>` : ''}
    </div>
  </section>

  ${state.installPrompt ? `<section class="card install-card"><div><h2>Pasang di layar utama</h2><p class="muted small">Buka Arus seperti aplikasi biasa, langsung dari HP.</p></div>
    <button class="btn btn-primary btn-sm" data-action="install">${I.download}Pasang</button></section>` : ''}

  <section class="card">
    <div class="card-head"><h2>Koneksi</h2></div>
    <dl class="kv">${state.me ? `<div><dt>Masuk sebagai</dt><dd>${esc(state.me)}</dd></div>` : ''}<div><dt>Web App</dt><dd class="mono">${esc(shortUrl)}</dd></div></dl>
    <button class="btn btn-ghost-danger btn-block" data-action="disconnect">Putuskan koneksi dari HP ini</button>
  </section>
  <p class="foot">Arus v1.2 · Data tersimpan di Google Sheets milikmu</p>`;
}

/* ============================================================
 * Bottom sheet, dialog, toast
 * ========================================================== */
let sheetOpen = false;
let ignorePop = false;

function openSheet(html, { className = '' } = {}) {
  const root = $('#sheet-root');
  if (!sheetOpen) {
    root.innerHTML = `<div class="backdrop" data-close></div><div class="sheet ${className}" role="dialog" aria-modal="true"><div class="sheet-grab"></div><div class="sheet-body"></div></div>`;
    history.pushState({ arusSheet: true }, '');
    sheetOpen = true;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => root.classList.add('open'));
  } else {
    $('.sheet', root).className = `sheet ${className}`;
  }
  const body = $('.sheet-body', root);
  body.innerHTML = html;
  body.scrollTop = 0;
  return body;
}

function closeSheet({ fromPop = false } = {}) {
  if (!sheetOpen) return;
  sheetOpen = false;
  const root = $('#sheet-root');
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!sheetOpen) root.innerHTML = ''; }, 260);
  if (!fromPop && history.state?.arusSheet) { ignorePop = true; history.back(); }
}

function confirmDialog({ title, text, confirm = 'Ya', cancel = 'Batal', danger = false }) {
  return new Promise((resolve) => {
    const root = $('#dialog-root');
    root.innerHTML = `<div class="backdrop" data-dlg="0"></div>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">
        <div class="dialog-ic ${danger ? 'danger' : ''}">${danger ? I.trash : I.alert}</div>
        <h3 id="dlg-t">${esc(title)}</h3><p>${text}</p>
        <div class="dialog-actions"><button class="btn btn-soft" data-dlg="0">${esc(cancel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-dlg="1">${esc(confirm)}</button></div>
      </div>`;
    requestAnimationFrame(() => root.classList.add('open'));
    $('[data-dlg="1"]', root).focus();
    const done = (v) => { root.classList.remove('open'); setTimeout(() => (root.innerHTML = ''), 200); root.onclick = null; resolve(v); };
    root.onclick = (e) => { const b = e.target.closest('[data-dlg]'); if (b) done(b.dataset.dlg === '1'); };
  });
}

const toastTimers = {};
function toast(msg, type = 'info', { id = String(Math.random()), duration } = {}) {
  const root = $('#toast-root');
  const icon = { success: I.check, error: I.alert, warn: I.cloud, loading: '<span class="spinner"></span>', info: I.spark }[type];
  let el = root.querySelector(`[data-tid="${CSS.escape(id)}"]`);
  if (!el) {
    el = document.createElement('div');
    el.dataset.tid = id;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
  }
  el.className = `toast ${type} show`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `<span class="toast-ic">${icon}</span><span>${esc(msg)}</span>`;
  clearTimeout(toastTimers[id]);
  const ms = duration ?? (type === 'loading' ? 0 : type === 'error' ? 4500 : 2600);
  if (ms) toastTimers[id] = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, ms);
}

function setBtnLoading(btn, on, text) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span>${text || 'Menyimpan…'}`; }
  else if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
}

/* ============================================================
 * Form tambah / ubah transaksi
 * ========================================================== */
function openTxForm(existing = null) {
  const f = {
    type: existing?.type || prefs.lastType || 'pengeluaran',
    amount: existing?.amount || 0,
    category: existing?.category || '',
    date: existing?.date || U.today(),
    note: existing?.note || '',
  };
  const quick = [5000, 10000, 20000, 50000, 100000];
  const body = openSheet(`
    <div class="sheet-head"><h2>${existing ? 'Ubah Transaksi' : 'Tambah Transaksi'}</h2>
      <button class="icon-btn" data-close aria-label="Tutup">${I.x}</button></div>
    <form class="tx-form" id="tx-form" novalidate>
      <div class="seg seg-type" role="radiogroup" aria-label="Jenis transaksi">
        <span class="seg-pill" aria-hidden="true"></span>
        <button type="button" role="radio" data-type="pengeluaran">Pengeluaran</button>
        <button type="button" role="radio" data-type="pemasukan">Pemasukan</button>
      </div>
      <label class="amount-field" id="amount-field">
        <span class="amount-prefix">Rp</span>
        <input id="f-amount" inputmode="numeric" pattern="[0-9.]*" autocomplete="off" enterkeyhint="done"
          placeholder="0" aria-label="Nominal" value="${U.formatDigits(f.amount)}">
      </label>
      <p class="field-error" id="err-amount" role="alert"></p>
      <div class="quick-amounts">${quick.map((q) => `<button type="button" data-quick="${q}">+${U.compact(q)}</button>`).join('')}</div>
      <div class="field">
        <div class="field-label">Kategori</div>
        <div class="cat-grid" id="f-cats" role="radiogroup" aria-label="Kategori"></div>
        <p class="field-error" id="err-cat" role="alert"></p>
      </div>
      <div class="field">
        <div class="field-label">Tanggal</div>
        <div class="chips">
          <button type="button" class="chip" data-date="0">Hari ini</button>
          <button type="button" class="chip" data-date="-1">Kemarin</button>
          <label class="chip chip-date" id="date-chip">${I.calendar}<span id="f-date-label">Pilih tanggal</span>
            <input type="date" id="f-date" value="${f.date}" aria-label="Pilih tanggal"></label>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="f-note">Catatan <span class="opt">(opsional)</span></label>
        <input id="f-note" class="input" maxlength="300" autocomplete="off" enterkeyhint="done" placeholder="mis. makan siang bareng tim" value="${esc(f.note)}">
      </div>
      <div class="sheet-footer"><button type="submit" class="btn btn-primary btn-block btn-lg" id="f-submit"></button></div>
    </form>`, { className: 'sheet-form' });

  const amountEl = $('#f-amount', body);
  const form = $('#tx-form', body);

  const setType = (t) => {
    f.type = t;
    $('.seg-type', body).dataset.active = t;
    $$('[data-type]', body).forEach((b) => b.setAttribute('aria-checked', b.dataset.type === t));
    if (!existing || existing.type !== t || !f.category) {
      if (!categoriesFor(t).some((c) => c.name === f.category)) f.category = '';
    }
    renderCats();
    $('#f-submit', body).innerHTML = `${I.check}${existing ? 'Simpan Perubahan' : `Simpan ${TYPE_LABEL[t]}`}`;
  };

  const renderCats = () => {
    const list = categoriesFor(f.type);
    if (f.category && !list.some((c) => c.name === f.category)) list.unshift({ name: f.category, icon: catIcon(f.type, f.category) });
    $('#f-cats', body).innerHTML = list.map((c) => `
      <button type="button" role="radio" class="cat-chip ${c.name === f.category ? 'is-active' : ''}" data-cat="${esc(c.name)}" aria-checked="${c.name === f.category}">
        <span class="cc-ic">${esc(c.icon)}</span><span class="cc-name">${esc(c.name)}</span></button>`).join('')
      || '<p class="muted small">Belum ada kategori. Tambahkan di menu Atur.</p>';
  };

  const setDate = (iso) => {
    f.date = iso;
    $('#f-date', body).value = iso;
    const t = U.today(), y = U.addDays(t, -1);
    $$('[data-date]', body).forEach((b) => b.classList.toggle('is-active', U.addDays(t, Number(b.dataset.date)) === iso));
    const custom = iso !== t && iso !== y;
    $('#date-chip', body).classList.toggle('is-active', custom);
    $('#f-date-label', body).textContent = custom ? U.formatDate(iso, 'medium') : 'Pilih tanggal';
  };

  const showErr = (id, msg) => {
    const el = $(`#${id}`, body);
    el.textContent = msg;
    if (msg) { const target = id === 'err-amount' ? $('#amount-field', body) : $('#f-cats', body); target.classList.remove('shake'); void target.offsetWidth; target.classList.add('shake'); }
  };

  const validate = () => {
    f.amount = U.parseDigits(amountEl.value);
    let ok = true;
    if (!f.amount || f.amount <= 0) { showErr('err-amount', 'Nominal wajib diisi dan harus lebih dari 0.'); ok = false; }
    else if (f.amount > 1e13) { showErr('err-amount', 'Nominal terlalu besar.'); ok = false; }
    else showErr('err-amount', '');
    if (!f.category) { showErr('err-cat', 'Pilih salah satu kategori.'); ok = false; } else showErr('err-cat', '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { toast('Tanggal tidak valid.', 'error'); ok = false; }
    if (!ok && (!f.amount || f.amount <= 0)) amountEl.focus();
    return ok;
  };

  amountEl.addEventListener('input', () => {
    const n = U.parseDigits(amountEl.value);
    amountEl.value = U.formatDigits(Math.min(n, 1e13));
    if (n) showErr('err-amount', '');
  });
  body.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-type]');
    if (tb) { setType(tb.dataset.type); return; }
    const cb = e.target.closest('[data-cat]');
    if (cb) {
      f.category = cb.dataset.cat;
      $$('[data-cat]', body).forEach((b) => { const on = b === cb; b.classList.toggle('is-active', on); b.setAttribute('aria-checked', on); });
      showErr('err-cat', '');
      return;
    }
    const qb = e.target.closest('[data-quick]');
    if (qb) {
      const n = Math.min(U.parseDigits(amountEl.value) + Number(qb.dataset.quick), 1e13);
      amountEl.value = U.formatDigits(n);
      showErr('err-amount', '');
      return;
    }
    const db = e.target.closest('[data-date]');
    if (db) setDate(U.addDays(U.today(), Number(db.dataset.date)));
  });
  $('#f-date', body).addEventListener('change', (e) => { if (e.target.value) setDate(e.target.value); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const tx = { type: f.type, amount: f.amount, category: f.category, date: f.date, note: $('#f-note', body).value.trim() };
    prefs.lastType = f.type; savePrefs();
    if (existing) await submitEdit(existing, tx, $('#f-submit', body));
    else submitAdd(tx);
  });

  setType(f.type);
  setDate(f.date);
  if (!existing) amountEl.focus();
}

/* ============================================================
 * Simpan, ubah, hapus
 * ========================================================== */
const nowTs = () => { const d = new Date(); return `${U.toISO(d)} ${d.toTimeString().slice(0, 8)}`; };

function submitAdd(tx) {
  const item = { ...tx, id: U.uid(), createdAt: nowTs(), owner: state.me || undefined };
  state.queue.push({ tx: item });
  saveQueue();
  closeSheet();
  render();
  toast('Menyimpan…', 'loading', { id: 'save' });
  flushQueue()
    .then(() => {
      if (!state.queue.some((q) => q.tx.id === item.id)) toast(`${TYPE_LABEL[tx.type]} ${fmt(tx.amount)} tersimpan`, 'success', { id: 'save' });
    })
    .catch(() => toast('Offline. Disimpan di HP dan akan dikirim otomatis saat online.', 'warn', { id: 'save', duration: 4500 }))
    .finally(render);
}

async function submitEdit(orig, tx, btn) {
  if (orig.pending) {
    const q = state.queue.find((x) => x.tx.id === orig.id);
    if (q) Object.assign(q.tx, tx);
    saveQueue(); closeSheet(); render();
    toast('Perubahan disimpan, menunggu sinkron', 'success');
    flushQueue().catch(() => {}).finally(render);
    return;
  }
  setBtnLoading(btn, true);
  try {
    const saved = await api('updateTransaction', { ...tx, id: orig.id, originalType: orig.type });
    state.tx = state.tx.map((t) => (t.id === orig.id ? { ...saved, createdAt: saved.createdAt || orig.createdAt } : t));
    saveCache(); closeSheet(); render();
    toast('Perubahan tersimpan', 'success');
  } catch (err) {
    setBtnLoading(btn, false);
    toast(err.isNetwork ? 'Tidak ada koneksi. Perubahan belum tersimpan.' : err.message, 'error');
    if (err.code === 'NOT_FOUND') sync({ silent: true });
  }
}

async function deleteTx(t) {
  const ok = await confirmDialog({
    title: 'Hapus transaksi ini?',
    text: `<b>${esc(t.category)} · ${fmt(t.amount)}</b> (${U.formatDate(t.date, 'medium')}).<br>Baris ini juga dihapus dari spreadsheet dan tidak bisa dikembalikan.`,
    confirm: 'Hapus', danger: true,
  });
  if (!ok) return;
  if (t.pending) {
    state.queue = state.queue.filter((q) => q.tx.id !== t.id);
    saveQueue(); closeSheet(); render();
    toast('Transaksi dihapus', 'success');
    return;
  }
  toast('Menghapus…', 'loading', { id: 'del' });
  try {
    await api('deleteTransaction', { id: t.id, type: t.type });
  } catch (err) {
    if (err.code !== 'NOT_FOUND') {
      toast(err.isNetwork ? 'Tidak ada koneksi. Transaksi belum dihapus.' : err.message, 'error', { id: 'del' });
      return;
    }
  }
  state.tx = state.tx.filter((x) => x.id !== t.id);
  saveCache(); closeSheet(); render();
  toast('Transaksi dihapus', 'success', { id: 'del' });
}

function openDetail(id) {
  const t = findTx(id);
  if (!t) return;
  const inc = t.type === 'pemasukan';
  const created = t.createdAt ? `${U.formatDate(t.createdAt.slice(0, 10), 'medium')}, ${t.createdAt.slice(11, 16).replace(':', '.')}` : '—';
  const body = openSheet(`
    <div class="sheet-head"><h2>Detail Transaksi</h2><button class="icon-btn" data-close aria-label="Tutup">${I.x}</button></div>
    <div class="detail">
      <div class="detail-icon ${t.type}">${esc(catIcon(t.type, t.category))}</div>
      <div class="detail-type">${TYPE_LABEL[t.type]} · ${esc(t.category)}</div>
      <div class="detail-amt ${t.type}">${inc ? '+' : '-'}${fmt(t.amount)}</div>
      ${t.pending ? '<span class="badge-pending">Menunggu sinkron</span>' : ''}
      <dl class="kv">
        ${multiUser() ? `<div><dt>Oleh</dt><dd>${esc(t.owner || state.users[0])}${isMine(t) ? ' (kamu)' : ''}</dd></div>` : ''}
        <div><dt>Tanggal</dt><dd>${U.formatDate(t.date, 'long')}</dd></div>
        <div><dt>Catatan</dt><dd>${t.note ? esc(t.note) : '<span class="muted">—</span>'}</dd></div>
        <div><dt>Dicatat</dt><dd>${created}</dd></div>
      </dl>
    </div>
    ${isMine(t) ? `<div class="sheet-actions">
      <button class="btn btn-ghost-danger" data-act="del">${I.trash}Hapus</button>
      <button class="btn btn-primary" data-act="edit">${I.edit}Ubah</button>
    </div>` : `<p class="readonly-note">${I.eye}Transaksi ${esc(t.owner)} hanya bisa dilihat.</p>`}`);
  if (isMine(t)) {
    $('[data-act="edit"]', body).onclick = () => openTxForm(t);
    $('[data-act="del"]', body).onclick = () => deleteTx(t);
  }
}

/* ============================================================
 * Sinkronisasi & antrean offline
 * ========================================================== */
let flushing = null;
function flushQueue() {
  if (!flushing) flushing = doFlush().finally(() => { flushing = null; });
  return flushing;
}
async function doFlush() {
  while (state.queue.length) {
    const item = state.queue[0];
    try {
      const saved = await api('addTransaction', item.tx);
      state.queue = state.queue.filter((q) => q.tx.id !== item.tx.id);
      state.tx = [saved, ...state.tx.filter((t) => t.id !== saved.id)];
      saveQueue(); saveCache();
    } catch (err) {
      if (err.isNetwork || err.code === 'BUSY') throw err;
      // Ditolak server (mis. validasi): buang dari antrean agar tidak macet, beri tahu pengguna.
      state.queue = state.queue.filter((q) => q.tx.id !== item.tx.id);
      saveQueue();
      toast(`Gagal menyimpan ${fmt(item.tx.amount)}: ${err.message}`, 'error', { id: 'save' });
      if (err.code === 'AUTH') throw err;
    }
  }
}

async function sync({ silent = false } = {}) {
  if (state.syncing) return;
  state.syncing = true;
  renderTopbar();
  try {
    await flushQueue();
    const data = await api('getAll');
    state.tx = data.transactions;
    state.categories = data.categories;
    state.sheetUrl = data.sheetUrl || '';
    state.me = data.me || '';
    state.users = data.users || [];
    state.lastSync = Date.now();
    state.loaded = true;
    state.syncError = '';
    saveCache();
    if (!silent) toast('Data sudah terbaru', 'success', { id: 'sync' });
  } catch (err) {
    state.syncError = err.message;
    if (!silent || err.code === 'AUTH' || err.code === 'SETUP') toast(err.message, err.isNetwork ? 'warn' : 'error', { id: 'sync' });
    if (!state.loaded && err.isNetwork) state.loaded = true;   // tampilkan apa adanya saat offline pertama
  } finally {
    state.syncing = false;
    render();
  }
}

/* ============================================================
 * Kategori (Pengaturan)
 * ========================================================== */
async function addCategory(form) {
  const nameEl = $('#cat-name', form);
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); toast('Isi nama kategori dulu.', 'error'); return; }
  if (state.categories.some((c) => c.type === state.catTab && c.name.toLowerCase() === name.toLowerCase())) {
    toast(`Kategori "${name}" sudah ada.`, 'error'); return;
  }
  const btn = $('button[type="submit"]', form);
  setBtnLoading(btn, true, '');
  try {
    state.categories = await api('addCategory', { type: state.catTab, name, icon: $('#emoji-btn').textContent });
    saveCache(); render();
    toast(`Kategori "${name}" ditambahkan`, 'success');
  } catch (err) {
    setBtnLoading(btn, false);
    toast(err.isNetwork ? 'Butuh koneksi internet untuk mengubah kategori.' : err.message, 'error');
  }
}

async function deleteCategory(name) {
  const ok = await confirmDialog({
    title: `Hapus kategori "${name}"?`,
    text: 'Kategori hilang dari pilihan. Transaksi lama dengan kategori ini <b>tetap tersimpan</b> dan tetap terhitung di dashboard.',
    confirm: 'Hapus', danger: true,
  });
  if (!ok) return;
  try {
    state.categories = await api('deleteCategory', { type: state.catTab, name });
    saveCache(); render();
    toast('Kategori dihapus', 'success');
  } catch (err) {
    toast(err.isNetwork ? 'Butuh koneksi internet untuk mengubah kategori.' : err.message, 'error');
  }
}

/* ============================================================
 * Sheet filter & periode custom
 * ========================================================== */
function openCustomPeriod() {
  const r = currentRange();
  const body = openSheet(`
    <div class="sheet-head"><h2>Periode custom</h2><button class="icon-btn" data-close aria-label="Tutup">${I.x}</button></div>
    <form id="custom-form" class="stack" novalidate>
      <div class="two">
        <label class="field"><span class="field-label">Dari</span><input type="date" class="input" id="c-start" value="${prefs.custom.start || r.start}" required></label>
        <label class="field"><span class="field-label">Sampai</span><input type="date" class="input" id="c-end" value="${prefs.custom.end || r.end}" required></label>
      </div>
      <div class="chips">
        <button type="button" class="chip" data-preset="7">7 hari terakhir</button>
        <button type="button" class="chip" data-preset="30">30 hari terakhir</button>
        <button type="button" class="chip" data-preset="lastmonth">Bulan lalu</button>
        <button type="button" class="chip" data-preset="year">Tahun ini</button>
      </div>
      <p class="field-error" id="c-err"></p>
      <button class="btn btn-primary btn-block btn-lg" type="submit">Terapkan</button>
    </form>`);
  body.addEventListener('click', (e) => {
    const p = e.target.closest('[data-preset]');
    if (!p) return;
    const t = U.today(); const d = U.fromISO(t);
    let s = t, en = t;
    if (p.dataset.preset === '7') s = U.addDays(t, -6);
    if (p.dataset.preset === '30') s = U.addDays(t, -29);
    if (p.dataset.preset === 'lastmonth') { s = U.toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)); en = U.toISO(new Date(d.getFullYear(), d.getMonth(), 0)); }
    if (p.dataset.preset === 'year') s = `${d.getFullYear()}-01-01`;
    $('#c-start', body).value = s; $('#c-end', body).value = en;
  });
  $('#custom-form', body).onsubmit = (e) => {
    e.preventDefault();
    const s = $('#c-start', body).value, en = $('#c-end', body).value;
    if (!s || !en) { $('#c-err', body).textContent = 'Isi kedua tanggal.'; return; }
    if (en < s) { $('#c-err', body).textContent = 'Tanggal akhir tidak boleh sebelum tanggal awal.'; return; }
    prefs.period = 'custom'; prefs.custom = { start: s, end: en }; savePrefs();
    closeSheet(); render();
  };
}

function openHistFilter() {
  const h = state.hist;
  const opt = (type) => state.categories.filter((c) => c.type === type)
    .map((c) => `<option value="${esc(c.name)}" ${h.cat === c.name ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('');
  const body = openSheet(`
    <div class="sheet-head"><h2>Filter riwayat</h2><button class="icon-btn" data-close aria-label="Tutup">${I.x}</button></div>
    <form id="hf-form" class="stack" novalidate>
      <label class="field"><span class="field-label">Kategori</span>
        <select class="input" id="hf-cat"><option value="">Semua kategori</option>
          <optgroup label="Pengeluaran">${opt('pengeluaran')}</optgroup><optgroup label="Pemasukan">${opt('pemasukan')}</optgroup></select></label>
      <div class="two">
        <label class="field"><span class="field-label">Dari tanggal</span><input type="date" class="input" id="hf-from" value="${h.from}"></label>
        <label class="field"><span class="field-label">Sampai tanggal</span><input type="date" class="input" id="hf-to" value="${h.to}"></label>
      </div>
      <div class="btn-row"><button type="button" class="btn btn-soft" id="hf-reset">Reset</button><button type="submit" class="btn btn-primary">Terapkan</button></div>
    </form>`);
  $('#hf-reset', body).onclick = () => { Object.assign(h, { cat: '', from: '', to: '', limit: 40 }); closeSheet(); render(); };
  $('#hf-form', body).onsubmit = (e) => {
    e.preventDefault();
    let from = $('#hf-from', body).value, to = $('#hf-to', body).value;
    if (from && to && to < from) [from, to] = [to, from];
    Object.assign(h, { cat: $('#hf-cat', body).value, from, to, limit: 40 });
    closeSheet(); render();
  };
}

/* ============================================================
 * Onboarding (hubungkan ke Apps Script)
 * ========================================================== */
function showOnboarding() {
  $('#app').hidden = true;
  const ob = $('#onboarding');
  ob.hidden = false;
  ob.innerHTML = `
    <div class="ob-card">
      <div class="ob-logo">${I.logo}</div>
      <h1>Selamat datang di Arus</h1>
      <p class="muted">Hubungkan aplikasi ke Google Sheets milikmu. Cukup sekali di HP ini.</p>
      <form id="ob-form" class="stack" novalidate>
        <label class="field"><span class="field-label">URL Web App</span>
          <input class="input" id="ob-url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false"
            placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label class="field"><span class="field-label">Kunci rahasia</span>
          <span class="input-wrap"><input class="input" id="ob-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Tempel kunci dari Apps Script">
          <button type="button" class="icon-btn" id="ob-eye" aria-label="Tampilkan kunci">${I.eye}</button></span></label>
        <p class="field-error" id="ob-err" role="alert"></p>
        <button class="btn btn-primary btn-block btn-lg" type="submit" id="ob-submit">Hubungkan</button>
      </form>
      <p class="ob-help">Belum punya URL dan kunci? Ikuti <b>Panduan Setup</b> bagian 1–3.</p>
    </div>`;
  $('#ob-eye').onclick = () => { const k = $('#ob-key'); k.type = k.type === 'password' ? 'text' : 'password'; };
  $('#ob-form').onsubmit = async (e) => {
    e.preventDefault();
    const url = $('#ob-url').value.trim(), key = $('#ob-key').value.trim();
    const err = $('#ob-err');
    if (!isValidScriptUrl(url)) { err.textContent = 'URL tidak valid. Harus diawali https://script.google.com/macros/s/ dan berakhiran /exec.'; return; }
    if (key.length < 20) { err.textContent = 'Kunci rahasia terlalu pendek. Salin lengkap dari Execution log.'; return; }
    err.textContent = '';
    const btn = $('#ob-submit');
    setBtnLoading(btn, true, 'Menghubungkan…');
    try {
      const info = await api('ping', {}, { url, key });
      setConfig({ url, key });
      ob.hidden = true; ob.innerHTML = '';
      $('#app').hidden = false;
      state.loaded = false;
      render();
      toast(info.me ? `Halo ${info.me}, terhubung ke "${info.spreadsheet}"` : `Terhubung ke "${info.spreadsheet}"`, 'success');
      sync({ silent: true });
    } catch (ex) {
      setBtnLoading(btn, false);
      err.textContent = ex.message;
    }
  };
}

async function disconnect() {
  const n = state.queue.length;
  const ok = await confirmDialog({
    title: 'Putuskan koneksi?',
    text: `Aplikasi di HP ini akan lupa URL dan kunci. Data di Google Sheets <b>tidak terhapus</b>.${n ? `<br><b class="c-bad">${n} transaksi belum terkirim akan hilang.</b>` : ''}`,
    confirm: 'Putuskan', danger: true,
  });
  if (!ok) return;
  clearConfig(); store.del(LS.cache); store.del(LS.queue);
  Object.assign(state, { tx: [], categories: [], queue: [], loaded: false, lastSync: 0, sheetUrl: '', me: '', users: [], syncError: '', view: 'home', renderedView: null });
  showOnboarding();
}

/* ============================================================
 * Event global
 * ========================================================== */
function bindEvents() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) return closeSheet();
    const nav = t.closest('[data-nav]');
    if (nav) return setView(nav.dataset.nav);
    const tx = t.closest('[data-tx]');
    if (tx) return openDetail(tx.dataset.tx);
    const per = t.closest('[data-period]');
    if (per) {
      if (per.dataset.period === 'custom') return openCustomPeriod();
      prefs.period = per.dataset.period; savePrefs(); return render();
    }
    const th = t.closest('[data-theme-pick]');
    if (th) { prefs.theme = th.dataset.themePick; savePrefs(); applyTheme(); return render(); }
    const ow = t.closest('[data-owner]');
    if (ow) { prefs.owner = ow.dataset.owner; savePrefs(); state.hist.limit = 40; return render(); }
    const tr = t.closest('[data-trend]');
    if (tr) { state.trend = tr.dataset.trend; return render(); }
    const ht = t.closest('[data-htype]');
    if (ht) { state.hist.type = ht.dataset.htype; state.hist.limit = 40; return render(); }
    const cl = t.closest('[data-clear]');
    if (cl) {
      if (cl.dataset.clear === 'cat') state.hist.cat = ''; else { state.hist.from = ''; state.hist.to = ''; }
      return render();
    }
    const gc = t.closest('[data-goto-cat]');
    if (gc) {
      const r = currentRange();
      Object.assign(state.hist, { q: '', type: 'pengeluaran', cat: gc.dataset.gotoCat, from: r.start, to: r.end, limit: 40 });
      return setView('history');
    }
    const ct = t.closest('[data-cattab]');
    if (ct) { state.catTab = ct.dataset.cattab; return render(); }
    const dc = t.closest('[data-delcat]');
    if (dc) return deleteCategory(dc.dataset.delcat);
    if (t.closest('#emoji-btn')) {
      const g = $('#emoji-grid'); g.hidden = !g.hidden;
      $('#emoji-btn').setAttribute('aria-expanded', String(!g.hidden));
      return;
    }
    const em = t.closest('[data-emoji]');
    if (em) { $('#emoji-btn').textContent = em.dataset.emoji; $('#emoji-grid').hidden = true; $('#cat-name').focus(); return; }

    const act = t.closest('[data-action]')?.dataset.action;
    if (!act) return;
    if (act === 'add') return openTxForm();
    if (act === 'sync') return sync();
    if (act === 'hist-filter') return openHistFilter();
    if (act === 'hist-more') { state.hist.limit += 60; return renderHistList(); }
    if (act === 'hist-reset') { Object.assign(state.hist, { q: '', type: 'all', cat: '', from: '', to: '', limit: 40 }); return render(); }
    if (act === 'disconnect') return disconnect();
    if (act === 'install' && state.installPrompt) {
      state.installPrompt.prompt();
      state.installPrompt.userChoice.finally(() => { state.installPrompt = null; render(); });
    }
  });

  const onSearch = U.debounce((v) => { state.hist.q = v; state.hist.limit = 40; renderHistList(); }, 150);
  document.addEventListener('input', (e) => { if (e.target.id === 'hist-q') onSearch(e.target.value); });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'carry-toggle') { prefs.carry = e.target.checked; savePrefs(); toast(prefs.carry ? 'Saldo bulan lalu ikut dihitung' : 'Saldo hanya dari periode ini', 'success'); }
  });
  document.addEventListener('submit', (e) => { if (e.target.id === 'cat-add') { e.preventDefault(); addCategory(e.target); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen && !$('#dialog-root').innerHTML) closeSheet(); });

  window.addEventListener('popstate', () => {
    if (ignorePop) { ignorePop = false; return; }
    if (sheetOpen) closeSheet({ fromPop: true });
  });
  window.addEventListener('online', () => { if (getConfig()) sync({ silent: true }); });
  window.addEventListener('offline', () => renderTopbar());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getConfig() && Date.now() - state.lastSync > 60_000) sync({ silent: true });
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installPrompt = e;
    if (state.view === 'settings') render();
  });
}

/* ============================================================
 * Mulai
 * ========================================================== */
function init() {
  applyTheme();
  bindEvents();
  if (!getConfig()) showOnboarding();
  else {
    $('#app').hidden = false;
    render();
    sync({ silent: true });
    // Pintasan dari ikon (tekan lama ikon Arus ▸ "Tambah transaksi")
    if (new URLSearchParams(location.search).get('aksi') === 'tambah') {
      history.replaceState(null, '', location.pathname);
      openTxForm();
    }
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();

// Untuk debugging di konsol browser
window.arus = { state, sync, ApiError };
