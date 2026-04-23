/**
 * ETF Tracker — Custom React Hooks for API data
 * 
 * Usage in App.jsx:
 *   import { useLiveQuote, useLiveHistory, useMarketSummary, useSearchEtfs } from './hooks.js';
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchQuote, fetchHistory, fetchMarketSummary, searchEtfs, fetchNews } from './api.js';

// ─────────────────────────────────────────────────────────────
// useApi — generic hook for one-shot API calls
// ─────────────────────────────────────────────────────────────

export function useApi(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (e) {
      setError(e.message || 'Errore API');
      console.warn('API error:', e);
      return null;
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    if (immediate) execute();
  }, [execute]); // eslint-disable-line

  return { data, loading, error, execute, refetch: execute };
}

// ─────────────────────────────────────────────────────────────
// useLiveQuote — real-time price polling for a single ETF
// ─────────────────────────────────────────────────────────────

export function useLiveQuote(ticker, { pollInterval = 60000 } = {}) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetch = useCallback(async () => {
    if (!ticker) return;
    try {
      const data = await fetchQuote(ticker);
      setQuote(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetch();
    // Poll every N seconds for live updates
    intervalRef.current = setInterval(fetch, pollInterval);
    return () => clearInterval(intervalRef.current);
  }, [fetch, pollInterval]);

  return { quote, loading, error, refetch: fetch };
}

// ─────────────────────────────────────────────────────────────
// useLiveHistory — OHLCV data for charts
// ─────────────────────────────────────────────────────────────

export function useLiveHistory(ticker, period = '1y', interval = '1d') {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);

    fetchHistory(ticker, period, interval)
      .then(res => {
        if (!cancelled) {
          setHistory(res.data || []);
          setIsLive(res.live || false);
          setError(null);
        }
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [ticker, period, interval]);

  return { history, loading, isLive, error };
}

// ─────────────────────────────────────────────────────────────
// useMarketSummary — major indices with auto-refresh
// ─────────────────────────────────────────────────────────────

export function useMarketSummary({ pollInterval = 120000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetchMarketSummary().then(setData).catch(console.warn).finally(() => setLoading(false));
    load();
    const id = setInterval(load, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval]);

  return { data, loading };
}

// ─────────────────────────────────────────────────────────────
// useSearchEtfs — debounced autocomplete
// ─────────────────────────────────────────────────────────────

export function useSearchEtfs(query, { debounce = 300 } = {}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      searchEtfs(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, debounce);

    return () => clearTimeout(timerRef.current);
  }, [query, debounce]);

  return { results, loading };
}

// ─────────────────────────────────────────────────────────────
// usePortfolioNews — news for user portfolio tickers
// ─────────────────────────────────────────────────────────────

export function usePortfolioNews(holdings = []) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!holdings.length) return;
    setLoading(true);
    const tickers = holdings.map(h => h.ticker);
    fetchNews(tickers)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [holdings.map(h => h.ticker).join(',')]); // eslint-disable-line

  return { news, loading };
}
