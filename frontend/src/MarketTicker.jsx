/**
 * MarketTicker — Live market summary banner
 * Shows major indices with live prices from /api/market/summary
 */
import React, { useState, useEffect } from 'react';
import { fetchMarketSummary } from './api.js';

const GREEN = '#0F7B3F';
const RED = '#C41B1B';
const NAVY = '#0B2545';

export default function MarketTicker() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = () => fetchMarketSummary().then(setData).catch(() => {});
    load();
    const id = setInterval(load, 120000); // refresh every 2 minutes
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      overflowX: 'auto', scrollbarWidth: 'none',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: '#061528',
    }}>
      {data.indices?.map((idx, i) => (
        <div key={idx.ticker} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', whiteSpace: 'nowrap',
          borderRight: i < data.indices.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{idx.name}</span>
          <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>
            {idx.value?.toLocaleString('it-IT', { maximumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: idx.chg1d >= 0 ? '#86EFAC' : '#FCA5A5' }}>
            {idx.chg1d >= 0 ? '+' : ''}{idx.chg1d?.toFixed(2)}%
          </span>
          {idx.live && <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#86EFAC' }} />}
        </div>
      ))}
      {data.timestamp && (
        <div style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 10, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
          {new Date(data.timestamp * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
