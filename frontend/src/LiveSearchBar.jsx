/**
 * LiveSearchBar — Real-time ETF search with autocomplete
 * Uses the /api/search endpoint with 300ms debounce.
 * Drop-in replacement for the static search input.
 */
import React, { useState, useRef, useEffect } from 'react';
import { searchEtfs } from './api.js';

const GRAY_50 = '#F8FAFC';
const GRAY_100 = '#F1F4F8';
const GRAY_200 = '#E2E8F0';
const GRAY_600 = '#5A6A7A';
const NAVY = '#0B2545';
const GREEN = '#0F7B3F';
const RED = '#C41B1B';
const BLUE = '#1E5AA0';

export default function LiveSearchBar({ onSelect, placeholder = 'Cerca ETF, ticker, ISIN…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const containerRef = useRef(null);

  // Debounced search
  useEffect(() => {
    clearTimeout(timer.current);
    if (!query || query.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(() => {
      searchEtfs(query)
        .then(res => { setResults(res || []); setOpen(res?.length > 0); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 16px 10px 40px',
            borderRadius: 8,
            border: `1px solid ${GRAY_200}`,
            backgroundColor: GRAY_50,
            color: NAVY,
            fontSize: 14,
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
        <svg
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: loading ? BLUE : GRAY_600 }}
          width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          backgroundColor: 'white', border: `1px solid ${GRAY_200}`,
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          marginTop: 4, overflow: 'hidden',
        }}>
          {results.map((etf, i) => (
            <button
              key={etf.isin}
              onClick={() => { onSelect(etf); setQuery(''); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', border: 'none', background: 'white',
                cursor: 'pointer', textAlign: 'left', borderBottom: i < results.length - 1 ? `1px solid ${GRAY_100}` : 'none',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = GRAY_50}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 6, backgroundColor: NAVY,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 9, fontWeight: 700, flexShrink: 0,
              }}>
                {etf.ticker.slice(0, 4)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{etf.ticker}</span>
                  <span style={{ fontSize: 10, color: GRAY_600 }}>{etf.isin}</span>
                </div>
                <p style={{ fontSize: 11, color: GRAY_600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etf.name}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>€{etf.price?.toFixed(2)}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: etf.chg1d >= 0 ? GREEN : RED }}>
                  {etf.chg1d >= 0 ? '+' : ''}{etf.chg1d?.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
          {results.length === 0 && !loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: GRAY_600, fontSize: 13 }}>
              Nessun ETF trovato per "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
