/**
 * ARUS — js/utils.js
 * Format Rupiah, tanggal Indonesia, periode, dan helper kecil.
 */

const nf = new Intl.NumberFormat('id-ID');

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** 1250000 → "Rp 1.250.000" ; -5000 → "-Rp 5.000" */
export function rupiah(n, { sign = false } = {}) {
  const v = Math.round(Number(n) || 0);
  const s = 'Rp ' + nf.format(Math.abs(v));
  if (v < 0) return '-' + s;
  if (sign && v > 0) return '+' + s;
  return s;
}

/** 1250000 → "1,3 jt" (untuk label grafik) */
export function compact(n) {
  const v = Math.abs(n);
  const f = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
  if (v >= 1e9) return f(n / 1e9) + ' M';
  if (v >= 1e6) return f(n / 1e6) + ' jt';
  if (v >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(Math.round(n));
}

export const formatDigits = (n) => (n ? nf.format(n) : '');
export const parseDigits = (s) => Number(String(s).replace(/\D/g, '')) || 0;

/* ---------- Tanggal (semua disimpan sebagai "YYYY-MM-DD" waktu lokal) ---------- */

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const today = () => toISO(new Date());
export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}
const lastDayOfMonth = (y, m0) => new Date(y, m0 + 1, 0).getDate();
export const minISO = (a, b) => (a < b ? a : b);

/** style: long "Minggu, 1 Nov 2026" | medium "1 Nov 2026" | short "1 Nov" */
export function formatDate(iso, style = 'medium') {
  if (!iso) return '-';
  const d = fromISO(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (style === 'short') return base;
  if (style === 'long') return `${DAYS[d.getDay()]}, ${base} ${d.getFullYear()}`;
  return `${base} ${d.getFullYear()}`;
}

export function dayLabel(iso) {
  const t = today();
  if (iso === t) return 'Hari ini';
  if (iso === addDays(t, -1)) return 'Kemarin';
  return formatDate(iso, 'long');
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/* ---------- Periode ---------- */

/** Rentang periode penuh. Minggu dimulai Senin. */
export function periodRange(key, custom = {}) {
  const t = today();
  const d = fromISO(t);
  switch (key) {
    case 'today':
      return { key, start: t, end: t, label: 'Hari ini' };
    case 'week': {
      const start = addDays(t, -((d.getDay() + 6) % 7));
      return { key, start, end: addDays(start, 6), label: 'Minggu ini' };
    }
    case 'custom': {
      const start = custom.start || t;
      const end = custom.end && custom.end >= start ? custom.end : start;
      const label = start === end ? formatDate(start, 'medium') : `${formatDate(start, 'short')} – ${formatDate(end, 'medium')}`;
      return { key, start, end, label };
    }
    case 'month':
    default: {
      const y = d.getFullYear(), m = d.getMonth();
      return {
        key: 'month',
        start: `${y}-${pad(m + 1)}-01`,
        end: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth(y, m))}`,
        label: `${MONTHS_LONG[m]} ${y}`,
      };
    }
  }
}

/** Jumlah hari yang sudah berjalan dalam periode (minimal 1). */
export function elapsedDays(range) {
  const end = minISO(range.end, today());
  return Math.max(1, diffDays(range.start, end) + 1);
}

/**
 * Periode pembanding yang adil ("apel ke apel"):
 * bulan ini s/d tgl 12  ⇄  bulan lalu s/d tgl 12, dst.
 */
export function comparisonRanges(range) {
  const curEnd = minISO(range.end, today());
  const len = diffDays(range.start, curEnd);
  let prevStart, label;
  if (range.key === 'today') { prevStart = addDays(range.start, -1); label = 'kemarin'; }
  else if (range.key === 'week') { prevStart = addDays(range.start, -7); label = 'minggu lalu'; }
  else if (range.key === 'month') {
    const d = fromISO(range.start);
    prevStart = toISO(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    label = 'bulan lalu';
  } else {
    const total = diffDays(range.start, range.end) + 1;
    prevStart = addDays(range.start, -total);
    label = 'periode sebelumnya';
  }
  let prevEnd = addDays(prevStart, len);
  if (range.key === 'month') {
    const p = fromISO(prevStart);
    const last = `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(lastDayOfMonth(p.getFullYear(), p.getMonth()))}`;
    prevEnd = minISO(prevEnd, last);
  }
  return { current: { start: range.start, end: curEnd }, previous: { start: prevStart, end: prevEnd }, label };
}

/* ---------- Lain-lain ---------- */

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid() {
  return 'T' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function timeAgo(ts) {
  if (!ts) return 'belum pernah';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'baru saja';
  if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  return `${Math.round(s / 86400)} hari lalu`;
}
