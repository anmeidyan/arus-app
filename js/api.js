/**
 * ARUS — js/api.js
 * Komunikasi dengan Google Apps Script Web App.
 * URL & kunci disimpan di HP (localStorage), tidak pernah ada di kode.
 */

const CONFIG_KEY = 'arus.config.v1';

export class ApiError extends Error {
  constructor(message, code = 'SERVER') {
    super(message);
    this.code = code;
  }
  get isNetwork() { return this.code === 'NETWORK' || this.code === 'TIMEOUT'; }
}

export function getConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null; } catch { return null; }
}
export function setConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }
export function clearConfig() { localStorage.removeItem(CONFIG_KEY); }

export function isValidScriptUrl(url) {
  return /^https:\/\/script\.google\.com\/(a\/[^/]+\/)?macros\/s\/[\w-]+\/exec\/?$/.test(String(url).trim());
}

/**
 * Memanggil aksi di Apps Script.
 * Memakai Content-Type text/plain agar tidak memicu CORS preflight (Apps Script tidak mendukung OPTIONS).
 */
export async function api(action, payload = {}, cfg = getConfig(), { timeout = 25000 } = {}) {
  if (!cfg || !cfg.url || !cfg.key) throw new ApiError('Aplikasi belum terhubung ke spreadsheet.', 'SETUP');
  if (!navigator.onLine) throw new ApiError('Kamu sedang offline.', 'NETWORK');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(cfg.url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, key: cfg.key.trim(), payload }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new ApiError('Server terlalu lama merespons. Coba lagi.', 'TIMEOUT');
    throw new ApiError('Tidak bisa terhubung ke server. Periksa koneksi internet.', 'NETWORK');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new ApiError(`Server menolak permintaan (kode ${res.status}). Pastikan Web App di-deploy dengan akses "Anyone".`, 'HTTP');
  let json;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('Respons server tidak dikenali. Pastikan URL Web App benar (berakhiran /exec) dan akses "Anyone".', 'HTTP');
  }
  if (!json.ok) throw new ApiError(json.error || 'Terjadi kesalahan.', json.code || 'SERVER');
  return json.data;
}
