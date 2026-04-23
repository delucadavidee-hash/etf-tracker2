/**
 * ETF Tracker — API Client
 * Connects the React frontend to the FastAPI backend.
 * Falls back gracefully to static data if the API is unavailable.
 */

const BASE = import.meta.env.DEV
  ? 'http://localhost:8000'   // dev: proxy to FastAPI
  : '';                        // prod: same origin (FastAPI serves the SPA)

// ─────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────

async function get(path, params = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000), // 8s timeout
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────
// ETF endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Search and filter ETFs.
 * @param {object} filters - query, asset, region, distribution, replication, domicile, issuer, max_ter, min_aum, sort_by
 * @param {boolean} live - if true, fetches real-time prices (slower)
 */
export async function fetchEtfs(filters = {}, live = false) {
  return get('/etfs', { ...filters, live });
}

/**
 * Autocomplete search — returns top 10 matches.
 * @param {string} q - search query (ticker, name, ISIN)
 */
export async function searchEtfs(q) {
  if (!q || q.length < 1) return [];
  return get('/search', { q });
}

/**
 * Real-time quote for a single ETF.
 * Returns: price, chg1d, prev_close, day_high, day_low, volume, currency, live
 */
export async function fetchQuote(ticker) {
  return get(`/etfs/${ticker}/quote`);
}

/**
 * Full ETF info: description, top holdings, sector weights, country exposure.
 */
export async function fetchEtfInfo(ticker) {
  return get(`/etfs/${ticker}/info`);
}

/**
 * Historical OHLCV data for charts.
 * @param {string} ticker - ETF ticker (e.g. SWDA)
 * @param {string} period - 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
 * @param {string} interval - 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
 */
export async function fetchHistory(ticker, period = '1y', interval = '1d') {
  return get(`/etfs/${ticker}/history`, { period, interval });
}

// ─────────────────────────────────────────────────────────────
// Market & news endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Major market indices (S&P 500, MSCI World, Euro Stoxx, NASDAQ).
 */
export async function fetchMarketSummary() {
  return get('/market/summary');
}

/**
 * News relevant to the user's portfolio tickers.
 * @param {string[]} tickers - array of tickers (e.g. ['SWDA', 'VWCE'])
 */
export async function fetchNews(tickers = []) {
  return get('/news', { tickers: tickers.join(',') });
}

// ─────────────────────────────────────────────────────────────
// API health
// ─────────────────────────────────────────────────────────────

export async function fetchHealth() {
  return get('/health');
}
