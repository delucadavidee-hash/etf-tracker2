import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fetchEtfs, fetchQuote, fetchEtfInfo, fetchHistory, fetchNews, fetchMarketSummary, searchEtfs } from './api.js';
import MarketTicker from './MarketTicker.jsx';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Bell, Users, BookOpen, BarChart3, Briefcase, Search, Plus, ArrowRight, AlertCircle, ChevronRight, Heart, MessageCircle, Share2, Shield, Target, Home, LineChart as LineIcon, Menu, X, Lock, CheckCircle2, Calendar, DollarSign, Activity, Eye, EyeOff, MoreHorizontal, ArrowUpRight, Filter, Star, Mail, User, LogIn, Globe, Building2, Percent, Coins, Settings, GitCompare, Trash2, Copy, Palette, Moon, Sun, CreditCard, Download, Wallet, Grid3x3, LayoutGrid, PieChart as PieIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// COLORS & DATA
// ─────────────────────────────────────────────────────────────

const NAVY = '#0A2540';
const NAVY_DARK = '#061528';
const NAVY_LIGHT = '#1E3A5F';
const BLUE = '#1E5AA0';
const GREEN = '#0F7B3F';
const GREEN_LIGHT = '#86EFAC';
const RED = '#B42318';
const GRAY_50 = '#F7F9FC';
const GRAY_100 = '#EDF1F7';
const GRAY_200 = '#DCE3ED';
const GRAY_400 = '#8A94A6';
const GRAY_600 = '#4B5768';

const userPortfolio = {
  name: 'Portafoglio Principale',
  totalValue: 47832.45,
  invested: 41200.00,
  pl: 6632.45,
  plPercent: 16.10,
  dayChange: 284.33,
  dayChangePercent: 0.60,
};

const portfolioHistory = Array.from({ length: 60 }, (_, i) => {
  const base = 30000 + i * 280;
  const noise = Math.sin(i / 4) * 1200 + Math.cos(i / 7) * 800;
  const bench = 30000 + i * 240 + Math.sin(i / 5) * 900;
  return {
    month: new Date(2021, i, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    portfolio: Math.round(base + noise),
    benchmark: Math.round(bench),
  };
});

const holdings = [
  { isin: 'IE00B4L5Y983', ticker: 'SWDA', name: 'iShares Core MSCI World', qty: 180, price: 92.45, value: 16641, weight: 34.8, pl: 2145, plPct: 14.8, ter: 0.20 },
  { isin: 'IE00BK5BQT80', ticker: 'VWCE', name: 'Vanguard FTSE All-World', qty: 95, price: 118.22, value: 11231, weight: 23.5, pl: 1687, plPct: 17.7, ter: 0.22 },
  { isin: 'IE00BKM4GZ66', ticker: 'EIMI', name: 'iShares Core MSCI Emerging Markets', qty: 310, price: 32.18, value: 9976, weight: 20.8, pl: 856, plPct: 9.4, ter: 0.18 },
  { isin: 'IE00B3F81R35', ticker: 'AGGH', name: 'iShares Core Global Aggregate Bond', qty: 95, price: 48.32, value: 4590, weight: 9.6, pl: -120, plPct: -2.5, ter: 0.10 },
  { isin: 'IE00B579F325', ticker: 'SGLD', name: 'Invesco Physical Gold', qty: 28, price: 195.40, value: 5471, weight: 11.4, pl: 1248, plPct: 29.5, ter: 0.12 },
];

const allocationByAsset = [
  { name: 'Azionario Sviluppati', value: 58.3, color: NAVY },
  { name: 'Azionario Emergenti', value: 20.8, color: BLUE },
  { name: 'Oro', value: 11.4, color: '#B8860B' },
  { name: 'Obbligazionario', value: 9.6, color: '#5A7A9A' },
];

const allocationByGeo = [
  { name: 'Nord America', value: 48.2 },
  { name: 'Europa', value: 18.5 },
  { name: 'Asia Pacifico', value: 12.3 },
  { name: 'Mercati Emergenti', value: 15.4 },
  { name: 'Altro', value: 5.6 },
];

const correlationMatrix = [
  { etf: 'SWDA', SWDA: 1.00, VWCE: 0.98, EIMI: 0.72, AGGH: 0.15, SGLD: 0.08 },
  { etf: 'VWCE', SWDA: 0.98, VWCE: 1.00, EIMI: 0.78, AGGH: 0.18, SGLD: 0.10 },
  { etf: 'EIMI', SWDA: 0.72, VWCE: 0.78, EIMI: 1.00, AGGH: 0.22, SGLD: 0.14 },
  { etf: 'AGGH', SWDA: 0.15, VWCE: 0.18, EIMI: 0.22, AGGH: 1.00, SGLD: 0.31 },
  { etf: 'SGLD', SWDA: 0.08, VWCE: 0.10, EIMI: 0.14, AGGH: 0.31, SGLD: 1.00 },
];

const modelPortfolios = [
  {
    id: 'all-weather',
    name: 'All-Weather',
    author: 'Ray Dalio',
    philosophy: 'Bilanciato per performare in ogni scenario economico: crescita, recessione, inflazione, deflazione.',
    risk: 'Medio-Basso',
    riskLevel: 2,
    allocation: [
      { name: 'Azioni Globali', value: 30, color: NAVY },
      { name: 'Treasury Lungo', value: 40, color: BLUE },
      { name: 'Treasury Medio', value: 15, color: '#5A7A9A' },
      { name: 'Oro', value: 7.5, color: '#B8860B' },
      { name: 'Commodities', value: 7.5, color: '#8A5A00' },
    ],
    cagr: 6.8, maxDD: -12.4, sharpe: 0.82,
  },
  {
    id: 'bogleheads',
    name: 'Bogleheads 3-Fund',
    author: 'John Bogle',
    philosophy: 'Semplicità ed efficienza: tre ETF, massima diversificazione, costi minimi.',
    risk: 'Medio', riskLevel: 3,
    allocation: [
      { name: 'MSCI World', value: 60, color: NAVY },
      { name: 'Emerging Markets', value: 20, color: BLUE },
      { name: 'Aggregate Bond', value: 20, color: '#5A7A9A' },
    ],
    cagr: 8.1, maxDD: -22.8, sharpe: 0.71,
  },
  {
    id: 'permanent',
    name: 'Permanent Portfolio',
    author: 'Harry Browne',
    philosophy: 'Quattro asset non correlati in parti uguali. Minimalista, robusto, anti-crisi.',
    risk: 'Basso', riskLevel: 1,
    allocation: [
      { name: 'Azioni', value: 25, color: NAVY },
      { name: 'Oro', value: 25, color: '#B8860B' },
      { name: 'Bond Lungo', value: 25, color: BLUE },
      { name: 'Cash/Bond Breve', value: 25, color: '#5A7A9A' },
    ],
    cagr: 5.9, maxDD: -8.2, sharpe: 0.74,
  },
  {
    id: 'growth',
    name: 'Growth 90/10',
    author: 'Long-term aggressive',
    philosophy: 'Per orizzonti lunghi (20+ anni): massimizza crescita accettando alta volatilità.',
    risk: 'Alto', riskLevel: 4,
    allocation: [
      { name: 'MSCI World', value: 70, color: NAVY },
      { name: 'Emerging Markets', value: 20, color: BLUE },
      { name: 'Aggregate Bond', value: 10, color: '#5A7A9A' },
    ],
    cagr: 9.4, maxDD: -31.5, sharpe: 0.68,
  },
  {
    id: 'coffeehouse',
    name: 'Coffeehouse Portfolio',
    author: 'Bill Schultheis',
    philosophy: 'Sette asset class diverse in pesi uguali tra azioni. Diversificazione smart con 40% bond.',
    risk: 'Medio', riskLevel: 3,
    allocation: [
      { name: 'S&P 500 Large', value: 10, color: NAVY },
      { name: 'US Large Value', value: 10, color: '#1E5AA0' },
      { name: 'US Small', value: 10, color: BLUE },
      { name: 'US Small Value', value: 10, color: '#6BA3E8' },
      { name: 'Internazionali', value: 10, color: '#5A7A9A' },
      { name: 'REITs', value: 10, color: '#B8860B' },
      { name: 'Aggregate Bond', value: 40, color: '#F59E0B' },
    ],
    cagr: 7.6, maxDD: -25.8, sharpe: 0.69,
  },
  {
    id: 'golden-butterfly',
    name: 'Golden Butterfly',
    author: 'Tyler (Portfolio Charts)',
    philosophy: 'Bilancia crescita azionaria con oro e treasuries, privilegia small cap value. Stabile e redditizio.',
    risk: 'Medio-Basso', riskLevel: 2,
    allocation: [
      { name: 'US Total Stock', value: 20, color: NAVY },
      { name: 'US Small Value', value: 20, color: BLUE },
      { name: 'Treasury Lungo', value: 20, color: '#5A7A9A' },
      { name: 'Treasury Breve', value: 20, color: '#6BA3E8' },
      { name: 'Oro', value: 20, color: '#B8860B' },
    ],
    cagr: 7.2, maxDD: -13.8, sharpe: 0.85,
  },
  {
    id: 'swensen',
    name: 'Yale Endowment (Swensen)',
    author: 'David Swensen',
    philosophy: 'Ispirato al fondo di Yale: massima diversificazione con REITs e Treasuries protetti da inflazione.',
    risk: 'Medio', riskLevel: 3,
    allocation: [
      { name: 'US Stock Market', value: 30, color: NAVY },
      { name: 'Internazionali Sviluppati', value: 15, color: BLUE },
      { name: 'Emerging Markets', value: 10, color: '#6BA3E8' },
      { name: 'REITs', value: 15, color: '#B8860B' },
      { name: 'Treasury Lungo', value: 15, color: '#5A7A9A' },
      { name: 'TIPS (inflation-linked)', value: 15, color: '#8A5A00' },
    ],
    cagr: 7.8, maxDD: -27.4, sharpe: 0.72,
  },
  {
    id: 'larry-swedroe',
    name: 'Larry Swedroe Portfolio',
    author: 'Larry Swedroe',
    philosophy: 'Piccola quota azionaria ma focalizzata su small cap value ad alto rendimento atteso. Difensivo ma efficiente.',
    risk: 'Basso', riskLevel: 2,
    allocation: [
      { name: 'US Small Cap Value', value: 15, color: NAVY },
      { name: 'International Small Value', value: 15, color: BLUE },
      { name: 'Emerging Markets', value: 5, color: '#6BA3E8' },
      { name: 'REITs', value: 5, color: '#B8860B' },
      { name: 'Treasury Intermedi', value: 60, color: '#5A7A9A' },
    ],
    cagr: 6.4, maxDD: -16.2, sharpe: 0.78,
  },
  {
    id: 'tobias',
    name: 'Andrew Tobias Simple',
    author: 'Andrew Tobias',
    philosophy: 'Tre ETF in parti uguali: semplicità estrema con diversificazione geografica e obbligazionaria.',
    risk: 'Medio', riskLevel: 3,
    allocation: [
      { name: 'US Total Stock', value: 33.3, color: NAVY },
      { name: 'Internazionali Total', value: 33.3, color: BLUE },
      { name: 'Aggregate Bond', value: 33.4, color: '#5A7A9A' },
    ],
    cagr: 7.4, maxDD: -24.2, sharpe: 0.68,
  },
  {
    id: 'ivy-five',
    name: 'Ivy Portfolio 5',
    author: 'Meb Faber',
    philosophy: 'Cinque asset class equipesate: azioni, bond, real estate, commodities, mercati internazionali.',
    risk: 'Medio', riskLevel: 3,
    allocation: [
      { name: 'US Stock', value: 20, color: NAVY },
      { name: 'Internazionali Sviluppati', value: 20, color: BLUE },
      { name: 'Bond 10y', value: 20, color: '#5A7A9A' },
      { name: 'REITs', value: 20, color: '#B8860B' },
      { name: 'Commodities', value: 20, color: '#8A5A00' },
    ],
    cagr: 6.9, maxDD: -24.6, sharpe: 0.66,
  },
  {
    id: 'bernstein-no-brainer',
    name: 'Bernstein No-Brainer',
    author: 'William Bernstein',
    philosophy: 'Quattro asset equipesati per principianti: semplice, robusto, raccomandato per chi inizia.',
    risk: 'Medio-Alto', riskLevel: 3,
    allocation: [
      { name: 'US Large Cap', value: 25, color: NAVY },
      { name: 'US Small Cap', value: 25, color: BLUE },
      { name: 'Internazionali', value: 25, color: '#6BA3E8' },
      { name: 'Aggregate Bond', value: 25, color: '#5A7A9A' },
    ],
    cagr: 7.8, maxDD: -28.1, sharpe: 0.65,
  },
];

const backtestData = Array.from({ length: 120 }, (_, i) => {
  const t = i / 12;
  return {
    month: `'${14 + Math.floor(t)}`,
    myPortfolio: Math.round(10000 * Math.pow(1.084, t) + Math.sin(i / 3) * 600),
    allWeather: Math.round(10000 * Math.pow(1.068, t) + Math.sin(i / 4) * 350),
    benchmark: Math.round(10000 * Math.pow(1.075, t) + Math.sin(i / 3.5) * 800),
  };
});

const alertsList = [
  { id: 1, etf: 'VWCE', message: 'Scende sotto €115 — occasione pre-PAC', time: '2h fa', active: true, icon: TrendingDown },
  { id: 2, etf: 'EIMI', message: 'Sopra target del 3.2% — valuta ribilanciamento', time: '1g fa', active: true, icon: Activity },
  { id: 3, etf: 'SGLD', message: 'Stacco dividendo previsto 28 aprile', time: '3g fa', active: false, icon: Calendar },
];

const communityPosts = [
  { id: 1, user: 'Marco R.', avatar: 'MR', time: '3h fa', content: 'Dopo 4 anni di PAC mensile su VWCE, finalmente ho raggiunto i 50k investiti. Lezione più grande: non guardare il portafoglio tutti i giorni.', likes: 127, comments: 34, portfolio: { cagr: 8.9, vol: 14.2, assets: 3 } },
  { id: 2, user: 'Sara E.', avatar: 'SE', time: '1g fa', content: 'Chiedo consiglio: ha senso aggiungere un ETF sui mercati di frontiera al mio portafoglio All-World + EM? Quale peso dare?', likes: 45, comments: 28, portfolio: { cagr: 7.4, vol: 13.8, assets: 2 } },
  { id: 3, user: 'Luca F.', avatar: 'LF', time: '2g fa', content: 'Condivido il mio portafoglio FIRE: SWDA 70%, EIMI 15%, AGGH 10%, SGLD 5%. Obiettivo indipendenza finanziaria entro il 2035.', likes: 203, comments: 67, portfolio: { cagr: 9.1, vol: 15.4, assets: 4 } },
];

const academyCourses = [
  { level: 'Base', title: "Cos'è un ETF e perché investirci", lessons: 8, duration: '45 min' },
  { level: 'Base', title: 'Scegliere il tuo primo ETF', lessons: 6, duration: '30 min' },
  { level: 'Intermedio', title: 'Asset allocation per obiettivi', lessons: 12, duration: '1h 20min' },
  { level: 'Intermedio', title: 'PAC vs PIC: strategie a confronto', lessons: 9, duration: '55 min' },
  { level: 'Intermedio', title: 'Fiscalità ETF in Italia', lessons: 7, duration: '50 min' },
  { level: 'Avanzato', title: 'Ribilanciamento e finestre ottimali', lessons: 10, duration: '1h 15min' },
  { level: 'Avanzato', title: 'Factor investing con ETF', lessons: 14, duration: '2h 10min' },
  { level: 'Avanzato', title: 'Hedging valutario: quando conviene', lessons: 8, duration: '1h' },
];

const etfDatabase = [
  { isin: 'IE00B4L5Y983', ticker: 'SWDA', name: 'iShares Core MSCI World UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.20, aum: 82400, price: 92.45, chg1d: 0.42, chg1y: 14.80, chg5y: 72.30, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BK5BQT80', ticker: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', issuer: 'Vanguard', asset: 'Azionario', region: 'Globale', ter: 0.22, aum: 18900, price: 118.22, chg1d: 0.38, chg1y: 17.70, chg5y: 68.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BKM4GZ66', ticker: 'EIMI', name: 'iShares Core MSCI EM IMI UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Emergenti', ter: 0.18, aum: 21300, price: 32.18, chg1d: -0.24, chg1y: 9.40, chg5y: 28.60, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B3F81R35', ticker: 'AGGH', name: 'iShares Core Global Aggregate Bond UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'Globale', ter: 0.10, aum: 5800, price: 48.32, chg1d: 0.08, chg1y: -2.50, chg5y: -8.20, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B579F325', ticker: 'SGLD', name: 'Invesco Physical Gold ETC', issuer: 'Invesco', asset: 'Commodities', region: 'Globale', ter: 0.12, aum: 16400, price: 195.40, chg1d: 0.92, chg1y: 29.50, chg5y: 82.10, replication: 'Fisica', distribution: 'N/A', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00B5BMR087', ticker: 'CSSPX', name: 'iShares Core S&P 500 UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'USA', ter: 0.07, aum: 97200, price: 548.30, chg1d: 0.55, chg1y: 18.20, chg5y: 94.50, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00B53SZB19', ticker: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF (Dist)', issuer: 'iShares', asset: 'Azionario', region: 'USA', ter: 0.07, aum: 8200, price: 72.15, chg1d: 0.54, chg1y: 17.90, chg5y: 91.20, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B4K48X80', ticker: 'CEU', name: 'iShares Core MSCI Europe UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Europa', ter: 0.12, aum: 7100, price: 87.40, chg1d: 0.18, chg1y: 8.30, chg5y: 42.80, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BP3QZ601', ticker: 'WSML', name: 'iShares MSCI World Small Cap UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Globale Small Cap', ter: 0.35, aum: 4300, price: 6.98, chg1d: 0.28, chg1y: 11.40, chg5y: 54.20, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BYZK4552', ticker: 'AUTO', name: 'iShares Automation & Robotics UCITS ETF', issuer: 'iShares', asset: 'Azionario Settoriale', region: 'Globale', ter: 0.40, aum: 3100, price: 14.82, chg1d: 1.24, chg1y: 22.60, chg5y: 88.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'LU0290357507', ticker: 'DBZB', name: 'Xtrackers II Eurozone Government Bond UCITS ETF', issuer: 'Xtrackers', asset: 'Obbligazionario', region: 'Eurozona', ter: 0.15, aum: 2800, price: 218.50, chg1d: 0.12, chg1y: 1.80, chg5y: -4.10, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00BFNM3J75', ticker: 'MVOL', name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF', issuer: 'iShares', asset: 'Azionario Factor', region: 'Globale', ter: 0.30, aum: 5900, price: 58.20, chg1d: 0.22, chg1y: 10.10, chg5y: 48.30, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'LU0290358497', ticker: 'XEON', name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF', issuer: 'Xtrackers', asset: 'Monetario', region: 'Eurozona', ter: 0.10, aum: 15200, price: 137.50, chg1d: 0.01, chg1y: 3.80, chg5y: 9.20, replication: 'Sintetica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00B3XXRP09', ticker: 'VUSA', name: 'Vanguard S&P 500 UCITS ETF (Dist)', issuer: 'Vanguard', asset: 'Azionario', region: 'USA', ter: 0.07, aum: 52400, price: 88.90, chg1d: 0.56, chg1y: 17.80, chg5y: 93.40, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BFMXXD54', ticker: 'VUAA', name: 'Vanguard S&P 500 UCITS ETF (Acc)', issuer: 'Vanguard', asset: 'Azionario', region: 'USA', ter: 0.07, aum: 48100, price: 95.20, chg1d: 0.55, chg1y: 18.10, chg5y: 94.20, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BK1PV551', ticker: 'VWRL', name: 'Vanguard FTSE All-World UCITS ETF (Dist)', issuer: 'Vanguard', asset: 'Azionario', region: 'Globale', ter: 0.22, aum: 12400, price: 112.80, chg1d: 0.37, chg1y: 17.50, chg5y: 67.90, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00B3YCGJ38', ticker: 'EUNK', name: 'iShares Core EURO STOXX 50 UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Eurozona', ter: 0.10, aum: 4900, price: 164.20, chg1d: 0.24, chg1y: 9.80, chg5y: 38.60, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B0M63177', ticker: 'IEUR', name: 'iShares STOXX Europe 600 UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Europa', ter: 0.20, aum: 6200, price: 52.80, chg1d: 0.22, chg1y: 9.10, chg5y: 41.20, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Germania', rating: 4 },
  { isin: 'IE00BD1F4M44', ticker: 'SPXP', name: 'Invesco S&P 500 UCITS ETF', issuer: 'Invesco', asset: 'Azionario', region: 'USA', ter: 0.05, aum: 15800, price: 93.40, chg1d: 0.58, chg1y: 18.50, chg5y: 95.80, replication: 'Sintetica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BYZK4669', ticker: 'CYBR', name: 'iShares Digital Security UCITS ETF', issuer: 'iShares', asset: 'Azionario Settoriale', region: 'Globale', ter: 0.40, aum: 2400, price: 9.12, chg1d: 1.08, chg1y: 19.40, chg5y: 72.80, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BYX2JD69', ticker: 'HEAL', name: 'iShares Healthcare Innovation UCITS ETF', issuer: 'iShares', asset: 'Azionario Settoriale', region: 'Globale', ter: 0.40, aum: 980, price: 8.45, chg1d: 0.42, chg1y: 6.20, chg5y: 34.10, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BGV5VN51', ticker: 'SUSW', name: 'iShares MSCI World SRI UCITS ETF', issuer: 'iShares', asset: 'Azionario ESG', region: 'Globale Sviluppati', ter: 0.20, aum: 7800, price: 13.68, chg1d: 0.36, chg1y: 13.90, chg5y: 65.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BZ163L38', ticker: 'VAGF', name: 'Vanguard Global Aggregate Bond UCITS ETF', issuer: 'Vanguard', asset: 'Obbligazionario', region: 'Globale', ter: 0.10, aum: 3200, price: 22.14, chg1d: 0.06, chg1y: -1.80, chg5y: -6.40, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BF4RFH31', ticker: 'IWDA', name: 'iShares Core MSCI World UCITS ETF (Dist)', issuer: 'iShares', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.20, aum: 9400, price: 88.30, chg1d: 0.42, chg1y: 14.60, chg5y: 71.80, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 5 },
  { isin: 'LU1829221024', ticker: 'MWRD', name: 'Amundi MSCI World UCITS ETF', issuer: 'Amundi', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.12, aum: 5200, price: 548.20, chg1d: 0.41, chg1y: 14.90, chg5y: 72.60, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00B14X4M10', ticker: 'EUDV', name: 'iShares Euro Dividend UCITS ETF', issuer: 'iShares', asset: 'Azionario Dividendi', region: 'Eurozona', ter: 0.40, aum: 2100, price: 24.60, chg1d: 0.15, chg1y: 6.20, chg5y: 28.40, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BWBXM500', ticker: 'PPFB', name: 'PIMCO Emerging Markets Bond UCITS ETF', issuer: 'PIMCO', asset: 'Obbligazionario', region: 'Emergenti', ter: 0.60, aum: 820, price: 73.40, chg1d: 0.18, chg1y: 4.10, chg5y: -2.80, replication: 'Campionamento', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BJ0KDQ92', ticker: 'XDWD', name: 'Xtrackers MSCI World UCITS ETF 1C', issuer: 'Xtrackers', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.19, aum: 11800, price: 105.40, chg1d: 0.41, chg1y: 14.70, chg5y: 72.10, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BDBRDM35', ticker: 'AGGU', name: 'iShares Core Global Aggregate Bond UCITS ETF USD', issuer: 'iShares', asset: 'Obbligazionario', region: 'Globale', ter: 0.10, aum: 3200, price: 4.82, chg1d: 0.09, chg1y: -2.30, chg5y: -7.90, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B52VJ196', ticker: 'EUNA', name: 'iShares MSCI Europe UCITS ETF (Acc)', issuer: 'iShares', asset: 'Azionario', region: 'Europa', ter: 0.12, aum: 3800, price: 83.20, chg1d: 0.19, chg1y: 8.40, chg5y: 42.10, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BKWQ0G16', ticker: 'USPY', name: 'SPDR S&P 500 UCITS ETF', issuer: 'SPDR', asset: 'Azionario', region: 'USA', ter: 0.03, aum: 13400, price: 62.80, chg1d: 0.56, chg1y: 18.30, chg5y: 94.80, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BFMXYX26', ticker: 'VUKE', name: 'Vanguard FTSE 100 UCITS ETF', issuer: 'Vanguard', asset: 'Azionario', region: 'UK', ter: 0.09, aum: 3900, price: 38.40, chg1d: 0.11, chg1y: 7.20, chg5y: 25.40, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'LU0274211480', ticker: 'XMME', name: 'Xtrackers MSCI Emerging Markets UCITS ETF', issuer: 'Xtrackers', asset: 'Azionario', region: 'Emergenti', ter: 0.18, aum: 4600, price: 54.60, chg1d: -0.22, chg1y: 9.30, chg5y: 28.20, replication: 'Sintetica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00BGHQ0G80', ticker: 'ESGE', name: 'iShares MSCI EM SRI UCITS ETF', issuer: 'iShares', asset: 'Azionario ESG', region: 'Emergenti', ter: 0.35, aum: 1600, price: 7.42, chg1d: -0.18, chg1y: 9.10, chg5y: 25.80, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BSKRJZ44', ticker: 'JPEA', name: 'iShares MSCI Japan UCITS ETF (Acc)', issuer: 'iShares', asset: 'Azionario', region: 'Giappone', ter: 0.15, aum: 5200, price: 58.20, chg1d: 0.31, chg1y: 11.80, chg5y: 38.60, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B52MJD48', ticker: 'CPXJ', name: 'iShares Core MSCI Pacific ex-Japan UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Asia Pacifico', ter: 0.20, aum: 2100, price: 140.40, chg1d: 0.28, chg1y: 10.20, chg5y: 32.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BKM4H197', ticker: 'ECAR', name: 'iShares Electric Vehicles and Driving Tech UCITS ETF', issuer: 'iShares', asset: 'Azionario Settoriale', region: 'Globale', ter: 0.40, aum: 1400, price: 6.20, chg1d: 0.82, chg1y: -4.20, chg5y: 14.60, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BM67HT60', ticker: 'EXV1', name: 'iShares STOXX Europe 600 Banks UCITS ETF', issuer: 'iShares', asset: 'Azionario Settoriale', region: 'Europa', ter: 0.46, aum: 820, price: 22.80, chg1d: 0.42, chg1y: 14.60, chg5y: 48.20, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Germania', rating: 3 },
  { isin: 'IE00B6YX5C33', ticker: 'SPY5', name: 'SPDR S&P US Dividend Aristocrats UCITS ETF', issuer: 'SPDR', asset: 'Azionario Dividendi', region: 'USA', ter: 0.35, aum: 3800, price: 78.40, chg1d: 0.32, chg1y: 10.80, chg5y: 52.40, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BF4RFH31', ticker: 'IBCI', name: 'iShares Global Inflation Linked Government Bond UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'Globale', ter: 0.25, aum: 2600, price: 168.20, chg1d: 0.08, chg1y: 1.20, chg5y: -8.40, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00B4WXJJ64', ticker: 'IBTM', name: 'iShares $ Treasury Bond 7-10yr UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'USA', ter: 0.07, aum: 5400, price: 193.20, chg1d: 0.14, chg1y: 1.80, chg5y: -6.20, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B1FZS798', ticker: 'IDTL', name: 'iShares $ Treasury Bond 20+yr UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'USA', ter: 0.07, aum: 1900, price: 3.82, chg1d: 0.22, chg1y: -4.60, chg5y: -28.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'LU1437017350', ticker: 'LYXWLD', name: 'Amundi ETF MSCI World UCITS ETF', issuer: 'Amundi', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.30, aum: 2400, price: 320.40, chg1d: 0.40, chg1y: 14.50, chg5y: 71.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00BMW42181', ticker: 'EQQQ', name: 'Invesco EQQQ NASDAQ-100 UCITS ETF', issuer: 'Invesco', asset: 'Azionario', region: 'USA Tech', ter: 0.30, aum: 7800, price: 440.20, chg1d: 0.72, chg1y: 24.80, chg5y: 142.60, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BFZXGZ54', ticker: 'EQAC', name: 'Invesco EQQQ NASDAQ-100 UCITS ETF Acc', issuer: 'Invesco', asset: 'Azionario', region: 'USA Tech', ter: 0.30, aum: 2600, price: 448.80, chg1d: 0.73, chg1y: 25.10, chg5y: 144.20, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00B5BMR087', ticker: 'CNDX', name: 'iShares NASDAQ 100 UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'USA Tech', ter: 0.33, aum: 6400, price: 1020.40, chg1d: 0.71, chg1y: 24.70, chg5y: 142.20, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'LU1781541179', ticker: 'LCWD', name: 'Lyxor Core MSCI World UCITS ETF', issuer: 'Lyxor', asset: 'Azionario', region: 'Globale Sviluppati', ter: 0.12, aum: 3800, price: 18.20, chg1d: 0.41, chg1y: 14.80, chg5y: 72.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00BMTX1Y45', ticker: 'ISAC', name: 'iShares MSCI ACWI UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'Globale', ter: 0.20, aum: 8200, price: 8.14, chg1d: 0.40, chg1y: 14.20, chg5y: 65.80, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BZ0PKV06', ticker: 'IUSN', name: 'iShares MSCI World Small Cap UCITS ETF', issuer: 'iShares', asset: 'Azionario Small Cap', region: 'Globale', ter: 0.35, aum: 4300, price: 6.98, chg1d: 0.28, chg1y: 11.40, chg5y: 54.20, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B6R52143', ticker: 'GLDW', name: 'WisdomTree Physical Swiss Gold', issuer: 'WisdomTree', asset: 'Commodities', region: 'Globale', ter: 0.15, aum: 4800, price: 264.20, chg1d: 0.90, chg1y: 29.20, chg5y: 81.80, replication: 'Fisica', distribution: 'N/A', domicile: 'Jersey', rating: 5 },
  { isin: 'IE00B3VWN518', ticker: 'PHAU', name: 'WisdomTree Physical Gold', issuer: 'WisdomTree', asset: 'Commodities', region: 'Globale', ter: 0.39, aum: 3200, price: 258.40, chg1d: 0.91, chg1y: 29.10, chg5y: 81.60, replication: 'Fisica', distribution: 'N/A', domicile: 'Jersey', rating: 4 },
  { isin: 'IE00B4ND3602', ticker: 'PHAG', name: 'WisdomTree Physical Silver', issuer: 'WisdomTree', asset: 'Commodities', region: 'Globale', ter: 0.49, aum: 1400, price: 30.20, chg1d: 1.24, chg1y: 22.40, chg5y: 68.20, replication: 'Fisica', distribution: 'N/A', domicile: 'Jersey', rating: 3 },
  { isin: 'IE00B3WJKG14', ticker: 'ISJP', name: 'iShares S&P 500 UCITS ETF (Acc)', issuer: 'iShares', asset: 'Azionario', region: 'USA', ter: 0.07, aum: 8800, price: 524.60, chg1d: 0.55, chg1y: 18.10, chg5y: 93.80, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'LU0292107645', ticker: 'XCHA', name: 'Xtrackers MSCI China UCITS ETF', issuer: 'Xtrackers', asset: 'Azionario', region: 'Cina', ter: 0.65, aum: 780, price: 12.40, chg1d: -0.82, chg1y: -8.20, chg5y: -18.40, replication: 'Sintetica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 2 },
  { isin: 'IE00B02KXL92', ticker: 'INDA', name: 'iShares MSCI India UCITS ETF', issuer: 'iShares', asset: 'Azionario', region: 'India', ter: 0.65, aum: 1800, price: 8.92, chg1d: 0.32, chg1y: 16.40, chg5y: 68.80, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BKX55T58', ticker: 'VHYL', name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF', issuer: 'Vanguard', asset: 'Azionario Dividendi', region: 'Globale', ter: 0.29, aum: 4400, price: 62.80, chg1d: 0.22, chg1y: 8.60, chg5y: 42.40, replication: 'Fisica', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B810Q511', ticker: 'VECP', name: 'Vanguard EUR Corporate Bond UCITS ETF', issuer: 'Vanguard', asset: 'Obbligazionario', region: 'Eurozona', ter: 0.09, aum: 3800, price: 48.20, chg1d: 0.06, chg1y: 4.80, chg5y: -2.40, replication: 'Campionamento', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BZ163G84', ticker: 'VGEA', name: 'Vanguard EUR Eurozone Government Bond UCITS ETF', issuer: 'Vanguard', asset: 'Obbligazionario', region: 'Eurozona', ter: 0.07, aum: 2400, price: 22.40, chg1d: 0.10, chg1y: 1.60, chg5y: -6.80, replication: 'Campionamento', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00B66F4759', ticker: 'EHYA', name: 'iShares Euro High Yield Corp Bond UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'Eurozona', ter: 0.50, aum: 5400, price: 103.80, chg1d: 0.14, chg1y: 7.20, chg5y: 6.40, replication: 'Campionamento', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'IE00BDBRDM35', ticker: 'IEAC', name: 'iShares Core Euro Corporate Bond UCITS ETF', issuer: 'iShares', asset: 'Obbligazionario', region: 'Eurozona', ter: 0.20, aum: 12400, price: 125.80, chg1d: 0.08, chg1y: 4.60, chg5y: -3.20, replication: 'Campionamento', distribution: 'Distribuzione', domicile: 'Irlanda', rating: 4 },
  { isin: 'LU1437018838', ticker: 'AEEM', name: 'Amundi MSCI Emerging Markets UCITS ETF', issuer: 'Amundi', asset: 'Azionario', region: 'Emergenti', ter: 0.20, aum: 2800, price: 5.84, chg1d: -0.21, chg1y: 9.20, chg5y: 28.10, replication: 'Sintetica', distribution: 'Accumulazione', domicile: 'Lussemburgo', rating: 4 },
  { isin: 'IE00BJLP1Y77', ticker: 'EWRD', name: 'SPDR MSCI ACWI IMI UCITS ETF', issuer: 'SPDR', asset: 'Azionario', region: 'Globale', ter: 0.17, aum: 3600, price: 215.80, chg1d: 0.39, chg1y: 14.10, chg5y: 65.40, replication: 'Campionamento', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 5 },
  { isin: 'IE00BD45T707', ticker: 'CLIM', name: 'iShares MSCI World Climate Transition Aware UCITS ETF', issuer: 'iShares', asset: 'Azionario ESG', region: 'Globale Sviluppati', ter: 0.20, aum: 1200, price: 5.64, chg1d: 0.38, chg1y: 13.80, chg5y: 62.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 3 },
  { isin: 'IE00BD0NCM55', ticker: 'SEMI', name: 'VanEck Semiconductor UCITS ETF', issuer: 'VanEck', asset: 'Azionario Settoriale', region: 'Globale', ter: 0.35, aum: 3200, price: 42.80, chg1d: 1.62, chg1y: 42.40, chg5y: 182.40, replication: 'Fisica', distribution: 'Accumulazione', domicile: 'Irlanda', rating: 4 },
];

const etfPriceHistory = Array.from({ length: 48 }, (_, i) => ({
  month: new Date(2022, i, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
  price: 72 + i * 0.45 + Math.sin(i / 3) * 2.8 + Math.cos(i / 5) * 1.4,
}));

// ─────────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────────

const fmt = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const Card = ({ children, className = '', style = {} }) => (
  <div className={`bg-white rounded-xl border ${className}`} style={{ borderColor: GRAY_200, boxShadow: '0 1px 2px rgba(10,37,64,0.04), 0 0 0 1px rgba(10,37,64,0.02)', ...style }}>
    {children}
  </div>
);

const Label = ({ children, variant = 'neutral' }) => {
  const styles = {
    neutral: { bg: GRAY_100, color: GRAY_600 },
    success: { bg: '#E6F4EC', color: GREEN },
    danger: { bg: '#FCEAE8', color: RED },
    warning: { bg: '#FEF3E7', color: '#B45309' },
    info: { bg: '#E8EEF7', color: BLUE },
  };
  const s = styles[variant];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
      {children}
    </span>
  );
};

const Button = ({ children, variant = 'primary', onClick, className = '' }) => {
  const variants = {
    primary: { bg: NAVY, color: 'white', hover: NAVY_LIGHT, border: 'none' },
    secondary: { bg: 'white', color: NAVY, border: `1px solid ${GRAY_200}`, hover: GRAY_50 },
  };
  const v = variants[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-colors ${className}`}
      style={{ backgroundColor: hover ? v.hover : v.bg, color: v.color, border: v.border }}
    >
      {children}
    </button>
  );
};

const SectionHeader = ({ title, description, action }) => (
  <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-7 rounded-sm" style={{ backgroundColor: GREEN_LIGHT }} />
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: 'white', letterSpacing: '-0.02em' }}>{title}</h1>
      </div>
      {description && <p className="text-sm ml-4" style={{ color: 'rgba(255,255,255,0.6)' }}>{description}</p>}
    </div>
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

const PortfolioWidgetGrid = () => {
  const [portfolios, setPortfolios] = useState([]);

  const [view, setView] = useState('grid');

  const removePortfolio = (id) => {
    setPortfolios(prev => prev.filter(p => p.id !== id));
  };

  const totalValue = portfolios.reduce((s, p) => s + p.value, 0);
  const totalChange = portfolios.reduce((s, p) => s + p.change, 0);

  if (portfolios.length === 0) return null; // hide section if empty

  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>I miei portafogli</h2>
          <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>
            {portfolios.length} {portfolios.length === 1 ? 'portafoglio' : 'portafogli'} · Totale: <span className="font-semibold">{fmt(totalValue)}</span>
            {' '}<span style={{ color: totalChange >= 0 ? GREEN : RED }}>({totalChange >= 0 ? '+' : ''}{fmt(totalChange)})</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
            <button
              onClick={() => setView('grid')}
              className="p-1.5 rounded"
              style={{ backgroundColor: view === 'grid' ? 'white' : 'transparent', boxShadow: view === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              <LayoutGrid className="w-3.5 h-3.5" style={{ color: view === 'grid' ? NAVY : GRAY_600 }} />
            </button>
            <button
              onClick={() => setView('list')}
              className="p-1.5 rounded"
              style={{ backgroundColor: view === 'list' ? 'white' : 'transparent', boxShadow: view === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
            >
              <Menu className="w-3.5 h-3.5" style={{ color: view === 'list' ? NAVY : GRAY_600 }} />
            </button>
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {portfolios.map(p => <PortfolioWidget key={p.id} portfolio={p} onRemove={() => removePortfolio(p.id)} />)}
          <AddPortfolioWidget />
        </div>
      ) : (
        <div className="space-y-2">
          {portfolios.map(p => <PortfolioListRow key={p.id} portfolio={p} onRemove={() => removePortfolio(p.id)} />)}
          <button className="w-full p-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition" style={{ border: `1px dashed ${GRAY_200}`, color: GRAY_600 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = GRAY_200; e.currentTarget.style.color = GRAY_600; }}>
            <Plus className="w-4 h-4" /> Aggiungi portafoglio
          </button>
        </div>
      )}
    </Card>
  );
};

const PortfolioWidget = ({ portfolio, onRemove }) => {
  const positive = portfolio.changePct >= 0;
  return (
    <div className="rounded-md p-4 flex flex-col transition-all cursor-pointer group relative" style={{
      border: `1px solid ${GRAY_200}`,
      backgroundColor: 'white',
      borderTopColor: portfolio.color,
      borderTopWidth: '3px',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = portfolio.color; e.currentTarget.style.borderTopColor = portfolio.color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = GRAY_200; e.currentTarget.style.borderTopColor = portfolio.color; }}>
      {!portfolio.isMain && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition"
          style={{ color: GRAY_400 }}
          onMouseEnter={(e) => e.currentTarget.style.color = RED}
          onMouseLeave={(e) => e.currentTarget.style.color = GRAY_400}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-start gap-2 mb-2 pr-4">
        <Wallet className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: portfolio.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate" style={{ color: NAVY }}>{portfolio.name}</p>
          {portfolio.isMain && <Label variant="success">Principale</Label>}
        </div>
      </div>
      <div className="mb-2">
        <p className="text-lg font-semibold tracking-tight" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
          {fmt(portfolio.value)}
        </p>
        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: positive ? GREEN : RED }}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {positive ? '+' : ''}{portfolio.changePct}%
        </div>
      </div>

      {/* Allocation micro-bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: GRAY_100 }}>
        {portfolio.allocation.map((a, i) => (
          <div key={i} style={{ width: `${a.value}%`, backgroundColor: a.color }} />
        ))}
      </div>

      <p className="text-[11px] mt-auto" style={{ color: GRAY_400 }}>{portfolio.etfs} ETF</p>
    </div>
  );
};

const PortfolioListRow = ({ portfolio, onRemove }) => {
  const positive = portfolio.changePct >= 0;
  return (
    <div className="flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all group" style={{ border: `1px solid ${GRAY_200}` }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = GRAY_50}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
      <div className="w-1 h-10 rounded-sm flex-shrink-0" style={{ backgroundColor: portfolio.color }} />
      <Wallet className="w-4 h-4 flex-shrink-0" style={{ color: portfolio.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>{portfolio.name}</p>
          {portfolio.isMain && <Label variant="success">Principale</Label>}
        </div>
        <p className="text-xs" style={{ color: GRAY_400 }}>{portfolio.etfs} ETF</p>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden hidden sm:flex" style={{ backgroundColor: GRAY_100, width: 80 }}>
        {portfolio.allocation.map((a, i) => (
          <div key={i} style={{ width: `${a.value}%`, backgroundColor: a.color }} />
        ))}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm" style={{ color: NAVY }}>{fmt(portfolio.value)}</p>
        <p className="text-xs font-semibold flex items-center gap-1 justify-end" style={{ color: positive ? GREEN : RED }}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {positive ? '+' : ''}{portfolio.changePct}%
        </p>
      </div>
      {!portfolio.isMain && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
          style={{ color: GRAY_400 }}
          onMouseEnter={(e) => e.currentTarget.style.color = RED}
          onMouseLeave={(e) => e.currentTarget.style.color = GRAY_400}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const AddPortfolioWidget = () => (
  <button
    className="rounded-md p-4 flex flex-col items-center justify-center gap-2 min-h-[140px] transition-all"
    style={{ border: `1px dashed ${GRAY_200}`, color: GRAY_600, backgroundColor: 'transparent' }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = NAVY; e.currentTarget.style.color = NAVY; e.currentTarget.style.backgroundColor = '#E8F0FE'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = GRAY_200; e.currentTarget.style.color = GRAY_600; e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: GRAY_100 }}>
      <Plus className="w-5 h-5" />
    </div>
    <p className="text-xs font-semibold">Nuovo portafoglio</p>
    <p className="text-[11px] text-center leading-tight">Crea o importa</p>
  </button>
);

const Dashboard = ({ holdings = [], onNewPortfolio, onGoToSearch, onGoToModels, onGoToImpara, onGoToAnalytics, onGoToSimulations, onGoToAlerts, onRemove }) => {
  const [timeframe, setTimeframe] = useState('1Y');
  const [hideValues, setHideValues] = useState(false);
  const [dashboardBenchmark, setDashboardBenchmark] = useState('MSCI World');
  const timeframes = ['1G', '1S', '1M', '3M', '6M', 'YTD', '1A', '3A', '5A', 'Max'];
  const dashboardBenchmarks = ['MSCI World', 'S&P 500', 'Euro Stoxx 600', 'FTSE All-World'];
  const mask = (v) => hideValues ? '••••••' : v;
  const isEmpty = holdings.length === 0;

  // Compute real portfolio metrics from holdings
  const metrics = useMemo(() => {
    if (isEmpty) return { totalValue: 0, invested: 0, pl: 0, plPercent: 0 };
    const totalValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
    const invested = holdings.reduce((s, h) => s + h.shares * h.avgPrice, 0);
    const pl = totalValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { totalValue, invested, pl, plPercent };
  }, [holdings, isEmpty]);

  const enrichedHoldings = useMemo(() => {
    const totalValue = metrics.totalValue;
    return holdings.map(h => {
      const value = h.shares * h.currentPrice;
      const cost = h.shares * h.avgPrice;
      const pl = value - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return { ...h, value, pl, plPct, weight };
    });
  }, [holdings, metrics.totalValue]);

  // Allocation by asset class computed from holdings
  const allocation = useMemo(() => {
    if (isEmpty) return [];
    const byAsset = {};
    enrichedHoldings.forEach(h => {
      const key = h.asset || 'Altro';
      byAsset[key] = (byAsset[key] || 0) + h.value;
    });
    const colors = { 'Azionario': NAVY, 'Azionario Settoriale': '#6366F1', 'Azionario ESG': '#10B981', 'Azionario Dividendi': '#0E7490', 'Azionario Factor': '#8B5CF6', 'Azionario Small Cap': '#3B82F6', 'Obbligazionario': '#F59E0B', 'Commodities': '#EAB308', 'Monetario': '#84CC16' };
    return Object.entries(byAsset).map(([name, val]) => ({ name, value: Math.round((val / metrics.totalValue) * 1000) / 10, color: colors[name] || GRAY_400 })).sort((a, b) => b.value - a.value);
  }, [enrichedHoldings, isEmpty, metrics.totalValue]);

  // EMPTY STATE
  if (isEmpty) {
    return (
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="p-8 md:p-12 text-center" style={{ background: `linear-gradient(135deg, #F7F9FC 0%, #FFFFFF 100%)` }}>
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#E8F0FE' }}>
              <Wallet className="w-7 h-7" style={{ color: NAVY }} />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
              Crea il tuo primo portafoglio
            </h1>
            <p className="text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed" style={{ color: GRAY_600 }}>
              Inizia cercando un ETF nel database e aggiungilo al tuo portafoglio con un clic. Una volta aggiunto il primo ETF, qui vedrai valore, rendimento, allocazione e molto altro.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={onGoToSearch}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md font-semibold text-sm"
                style={{ backgroundColor: NAVY, color: 'white' }}
              >
                <Search className="w-4 h-4" /> Cerca un ETF
              </button>
              <button
                onClick={onNewPortfolio}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md font-semibold text-sm"
                style={{ backgroundColor: GRAY_100, color: NAVY }}
              >
                <Plus className="w-4 h-4" /> Crea da zero
              </button>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'white' }}>Esplora le sezioni di ETF Tracker</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: BookOpen, title: 'Impara', onClick: onGoToImpara,
                desc: 'Manuale completo in 16 capitoli su ETF e costruzione portafoglio. Con esempi, quiz e casi reali.',
                color: '#0E7490',
              },
              {
                icon: Bell, title: 'Alert e report email', onClick: onGoToAlerts,
                desc: 'Alert su prezzo, ribilanciamento, calo giornaliero. Report email personalizzato con notizie impattanti.',
                color: '#EC4899',
              },
              {
                icon: BarChart3, title: 'Analisi e backtest', onClick: onGoToAnalytics,
                desc: 'Metriche professionali sul tuo portafoglio: CAGR, volatilità, Sharpe, drawdown, correlazioni.',
                color: '#6366F1',
              },
              {
                icon: GitCompare, title: 'Simulatore PAC', onClick: onGoToSimulations,
                desc: 'Proietta i tuoi investimenti nel tempo con simulazioni deterministiche e Monte Carlo probabilistiche.',
                color: '#B45309',
              },
              {
                icon: Briefcase, title: 'Modelli di portafoglio', onClick: onGoToModels,
                desc: 'Portafogli lazy pronti all\'uso: All-Weather, Bogleheads, Permanent, Growth e molti altri famosi.',
                color: GREEN,
              },
            ].map((f, i) => (
              <Card key={i} className="p-5 cursor-pointer transition-all group" onClick={f.onClick} role="button" tabIndex={0}
                style={{ borderLeft: `3px solid ${f.color}` }}>
                <div className="w-10 h-10 rounded-md flex items-center justify-center mb-3" style={{ backgroundColor: f.color + '15' }}>
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <p className="font-semibold text-sm mb-2" style={{ color: NAVY }}>{f.title}</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: GRAY_600 }}>{f.desc}</p>
                <div className="flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-1" style={{ color: f.color }}>
                  Apri <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Synthetic chart for now (real historical data would come from backend)
  const chartData = useMemo(() => {
    const tfMap = {
      '1G': { n: 24, unit: 'h' },
      '1S': { n: 7, unit: 'd' },
      '1M': { n: 22, unit: 'd' },
      '3M': { n: 65, unit: 'd' },
      '6M': { n: 130, unit: 'd' },
      'YTD': { n: 16, unit: 'w' },
      '1A': { n: 52, unit: 'w' },
      '3A': { n: 36, unit: 'm' },
      '5A': { n: 60, unit: 'm' },
      'Max': { n: 60, unit: 'm' },
    };
    const cfg = tfMap[timeframe] || tfMap['1A'];
    const now = new Date();
    const benchmarkFactor = { 'MSCI World': 0.92, 'S&P 500': 1.05, 'Euro Stoxx 600': 0.78, 'FTSE All-World': 0.88 }[dashboardBenchmark] || 0.92;
    return Array.from({ length: cfg.n }, (_, i) => {
      const progress = i / (cfg.n - 1);
      const benchmarkProgress = progress * benchmarkFactor;
      const noise = Math.sin(i / 4) * (metrics.totalValue * 0.015) + Math.cos(i / 7) * (metrics.totalValue * 0.008);
      const value = metrics.invested + (metrics.totalValue - metrics.invested) * progress + noise;
      const benchmark = metrics.invested + (metrics.totalValue - metrics.invested) * benchmarkProgress + noise * 0.7;
      const d = new Date(now);
      if (cfg.unit === 'h') d.setHours(d.getHours() - (cfg.n - 1 - i));
      else if (cfg.unit === 'd') d.setDate(d.getDate() - (cfg.n - 1 - i));
      else if (cfg.unit === 'w') d.setDate(d.getDate() - (cfg.n - 1 - i) * 7);
      else d.setMonth(d.getMonth() - (cfg.n - 1 - i));
      const dateFmt = cfg.unit === 'h' ? { hour: '2-digit', minute: '2-digit' } : cfg.unit === 'd' || cfg.unit === 'w' ? { day: '2-digit', month: 'short' } : { month: 'short', year: '2-digit' };
      return {
        date: d.toLocaleDateString('it-IT', dateFmt),
        portfolio: Math.round(value),
        benchmark: Math.round(benchmark),
        invested: metrics.invested,
      };
    });
  }, [timeframe, dashboardBenchmark, metrics.invested, metrics.totalValue]);

  return (
    <div className="space-y-5">
      {/* Hero value panel — compact */}
      <Card className="overflow-hidden">
        <div className="p-5 md:p-6" style={{ background: `linear-gradient(135deg, #F7F9FC 0%, #FFFFFF 100%)` }}>
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1 h-4 rounded-sm" style={{ backgroundColor: GREEN_LIGHT }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: GRAY_600, letterSpacing: '0.08em' }}>Il mio portafoglio</span>
                <button onClick={() => setHideValues(!hideValues)} className="p-1 rounded hover:bg-black/5 transition" style={{ color: GRAY_400 }}>
                  {hideValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-semibold tracking-tight" style={{ color: NAVY, letterSpacing: '-0.03em' }}>
                  {mask(fmtFull(metrics.totalValue))}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-xs" style={{ backgroundColor: metrics.pl >= 0 ? '#E6F4EC' : '#FCEAE8', color: metrics.pl >= 0 ? GREEN : RED }}>
                  {metrics.pl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {mask(`${metrics.pl >= 0 ? '+' : ''}${metrics.plPercent.toFixed(2)}%`)}
                </div>
              </div>
              <p className="text-xs mt-1" style={{ color: GRAY_600 }}>
                {mask(`${metrics.pl >= 0 ? '+' : ''}${fmt(metrics.pl)}`)} totali
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary" onClick={onGoToSearch}><Plus className="w-4 h-4" /> Aggiungi ETF</Button>
              <Button variant="primary" className="hidden sm:inline-flex" onClick={onNewPortfolio}><Plus className="w-4 h-4" /> Nuovo portafoglio</Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: `1px solid ${GRAY_100}` }}>
            <div>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>Investito</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: NAVY }}>{mask(fmt(metrics.invested))}</p>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>capitale</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>Valore</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: NAVY }}>{mask(fmt(metrics.totalValue))}</p>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>attuale</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>Posizioni</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: NAVY }}>{holdings.length} ETF</p>
              <p className="text-[11px]" style={{ color: GRAY_400 }}>{holdings.length === 1 ? 'da solo' : 'diversificato'}</p>
            </div>
          </div>
        </div>
      </Card>

      <PortfolioWidgetGrid />

      {/* Chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Andamento</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Portafoglio confrontato con il benchmark selezionato</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={dashboardBenchmark} onChange={(e) => setDashboardBenchmark(e.target.value)} className="px-2.5 py-1 rounded-md text-xs font-medium focus:outline-none cursor-pointer" style={{ backgroundColor: '#E8F0FE', border: `1px solid ${BLUE}`, color: BLUE }}>
              {dashboardBenchmarks.map(b => <option key={b} value={b}>vs {b}</option>)}
            </select>
            <div className="flex gap-0.5 p-0.5 rounded-md overflow-x-auto" style={{ backgroundColor: GRAY_100 }}>
              {timeframes.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} className="px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap"
                  style={{ backgroundColor: timeframe === tf ? 'white' : 'transparent', color: timeframe === tf ? NAVY : GRAY_600, boxShadow: timeframe === tf ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 pb-4" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Min {timeframe}</p>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{fmt(Math.min(...chartData.map(d => d.portfolio)))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Max {timeframe}</p>
            <p className="text-sm font-semibold" style={{ color: NAVY }}>{fmt(Math.max(...chartData.map(d => d.portfolio)))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Var {timeframe}</p>
            <p className="text-sm font-semibold" style={{ color: chartData[chartData.length - 1].portfolio >= chartData[0].portfolio ? GREEN : RED }}>
              {chartData[chartData.length - 1].portfolio >= chartData[0].portfolio ? '+' : ''}{(((chartData[chartData.length - 1].portfolio / chartData[0].portfolio) - 1) * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>vs Benchmark</p>
            <p className="text-sm font-semibold" style={{ color: GREEN }}>
              +{(((chartData[chartData.length - 1].portfolio / chartData[chartData.length - 1].benchmark) - 1) * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.2} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.08} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
            <XAxis dataKey="date" stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
            <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(1)}k`} domain={['dataMin - 200', 'dataMax + 200']} />
            <Tooltip
              contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12, padding: '10px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: NAVY, fontWeight: 600, marginBottom: 6 }}
              formatter={(v, name) => {
                const label = name === 'portfolio' ? 'Portafoglio' : name === 'benchmark' ? 'MSCI World' : 'Capitale investito';
                return [fmt(v), label];
              }}
            />
            <ReferenceLine y={metrics.invested} stroke={GRAY_400} strokeDasharray="4 4" strokeWidth={1}
              label={{ value: 'Investito', position: 'insideTopRight', fill: GRAY_400, fontSize: 10 }} />
            <Area type="monotone" dataKey="benchmark" stroke={BLUE} strokeWidth={1.5} strokeDasharray="4 4" fill="url(#colorBenchmark)" name="benchmark" />
            <Area type="monotone" dataKey="portfolio" stroke={NAVY} strokeWidth={2.5} fill="url(#colorPortfolio)" name="portfolio" />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
          <div className="flex items-center gap-2"><div className="w-3 h-0.5" style={{ backgroundColor: NAVY }} /><span style={{ color: GRAY_600 }}>Portafoglio</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: BLUE, borderTopWidth: 2 }} /><span style={{ color: GRAY_600 }}>{dashboardBenchmark}</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: GRAY_400, borderTopWidth: 2 }} /><span style={{ color: GRAY_600 }}>Capitale investito</span></div>
        </div>
        <p className="text-[10px] mt-3" style={{ color: GRAY_400 }}>* Andamento simulato. Con broker collegato i dati saranno reali.</p>
      </Card>

      {/* Technical stats card */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Dati tecnici</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Metriche calcolate sul periodo {timeframe}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const portfolioValues = chartData.map(d => d.portfolio);
            const minValue = Math.min(...portfolioValues);
            const maxValue = Math.max(...portfolioValues);
            const first = portfolioValues[0];
            const last = portfolioValues[portfolioValues.length - 1];
            const returnPct = first > 0 ? ((last / first) - 1) * 100 : 0;
            // Daily returns
            const dailyReturns = portfolioValues.slice(1).map((v, i) => (v / portfolioValues[i]) - 1);
            const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
            const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / dailyReturns.length;
            const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
            // Drawdown
            let peak = portfolioValues[0];
            let maxDD = 0;
            portfolioValues.forEach(v => {
              if (v > peak) peak = v;
              const dd = ((v - peak) / peak) * 100;
              if (dd < maxDD) maxDD = dd;
            });
            // Benchmark comparison
            const benchmarkValues = chartData.map(d => d.benchmark);
            const benchFirst = benchmarkValues[0];
            const benchLast = benchmarkValues[benchmarkValues.length - 1];
            const benchReturn = benchFirst > 0 ? ((benchLast / benchFirst) - 1) * 100 : 0;
            const alpha = returnPct - benchReturn;
            // Sharpe approx (risk free = 2%)
            const sharpe = vol > 0 ? ((returnPct - 2) / vol) : 0;

            return (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Min / Max periodo</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{fmt(minValue)}</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>/ {fmt(maxValue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Volatilità annua</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{vol.toFixed(1)}%</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>deviazione std</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Max Drawdown</p>
                  <p className="text-sm font-semibold" style={{ color: RED }}>{maxDD.toFixed(1)}%</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>calo massimo</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Sharpe Ratio</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{sharpe.toFixed(2)}</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>rischio aggiustato</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Rendimento periodo</p>
                  <p className="text-sm font-semibold" style={{ color: returnPct >= 0 ? GREEN : RED }}>{returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>portafoglio</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>vs {dashboardBenchmark}</p>
                  <p className="text-sm font-semibold" style={{ color: alpha >= 0 ? GREEN : RED }}>{alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>alpha</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Beta stimato</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{(0.85 + Math.random() * 0.3).toFixed(2)}</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>vs benchmark</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Correlazione</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>0.{(88 + Math.floor(Math.random() * 10))}</p>
                  <p className="text-[11px]" style={{ color: GRAY_400 }}>vs benchmark</p>
                </div>
              </>
            );
          })()}
        </div>
      </Card>

      {/* Holdings + Allocation */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Posizioni</h2>
            <button onClick={onGoToSearch} className="text-sm font-medium flex items-center gap-1" style={{ color: BLUE }}>
              <Plus className="w-4 h-4" /> Aggiungi
            </button>
          </div>
          <div>
            <div className="grid grid-cols-12 gap-3 px-2 pb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: GRAY_400, borderBottom: `1px solid ${GRAY_100}` }}>
              <div className="col-span-5">Strumento</div>
              <div className="col-span-2 text-right">Quote</div>
              <div className="col-span-2 text-right">Valore</div>
              <div className="col-span-3 text-right">P&L</div>
            </div>
            {enrichedHoldings.map((h, idx) => (
              <div key={h.isin} className="grid grid-cols-12 gap-3 px-2 py-3 items-center group" style={{ borderBottom: idx < enrichedHoldings.length - 1 ? `1px solid ${GRAY_100}` : 'none' }}>
                <div className="col-span-5 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm" style={{ color: NAVY }}>{h.ticker}</span>
                    <Label variant="neutral">{h.weight.toFixed(1)}%</Label>
                  </div>
                  <p className="text-xs truncate" style={{ color: GRAY_600 }}>{h.name}</p>
                </div>
                <div className="col-span-2 text-right text-sm" style={{ color: GRAY_600 }}>{h.shares.toFixed(2)}</div>
                <div className="col-span-2 text-right">
                  <div className="text-sm font-semibold" style={{ color: NAVY }}>{fmt(h.value)}</div>
                  <div className="text-[11px]" style={{ color: GRAY_400 }}>€{h.avgPrice.toFixed(2)} med.</div>
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: h.pl >= 0 ? GREEN : RED }}>
                      {h.pl >= 0 ? '+' : ''}{h.plPct.toFixed(1)}%
                    </div>
                    <div className="text-[11px]" style={{ color: GRAY_400 }}>
                      {h.pl >= 0 ? '+' : ''}{fmt(h.pl)}
                    </div>
                  </div>
                  <button onClick={() => onRemove(h.isin)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition" style={{ color: GRAY_400 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = RED}
                    onMouseLeave={(e) => e.currentTarget.style.color = GRAY_400}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Asset Allocation</h2>
          {allocation.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={allocation} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={1} strokeWidth={0}>
                    {allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 mt-4">
                {allocation.map(a => (
                  <div key={a.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="flex-1 truncate" style={{ color: GRAY_600 }}>{a.name}</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{a.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: GRAY_400 }}>Nessun dato</p>
          )}
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────

const getCorrColor = (v) => {
  if (v >= 0.9) return '#B42318';
  if (v >= 0.7) return '#DD6B20';
  if (v >= 0.4) return '#D69E2E';
  if (v >= 0.2) return '#68A063';
  return GREEN;
};

const Analytics = ({ holdings = [], onGoToSearch }) => {
  const [btRange, setBtRange] = useState('10Y');
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [mcYears, setMcYears] = useState(20);
  const [mcMonthly, setMcMonthly] = useState(500);
  const [mcInitial, setMcInitial] = useState(10000);
  const [benchmark, setBenchmark] = useState('MSCI World');
  const btRanges = ['1Y', '3Y', '5Y', '10Y'];
  const benchmarks = ['MSCI World', 'S&P 500', 'Euro Stoxx 600', 'FTSE All-World'];
  const isEmpty = holdings.length === 0;

  // Compute real metrics from holdings
  const realMetrics = useMemo(() => {
    if (isEmpty) return null;
    const totalValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
    const invested = holdings.reduce((s, h) => s + h.shares * h.avgPrice, 0);
    const pl = totalValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    // Approximated CAGR assuming 3 year holding (realistic for backtest context)
    const cagr = invested > 0 ? (Math.pow(totalValue / invested, 1/3) - 1) * 100 : 0;
    // Estimated volatility by asset mix
    const stocksWeight = holdings.filter(h => h.asset && h.asset.startsWith('Azion')).reduce((s, h) => s + (h.shares * h.currentPrice) / totalValue, 0);
    const volatility = stocksWeight * 16 + (1 - stocksWeight) * 5;
    return { totalValue, invested, pl, plPercent, cagr, volatility, stocksWeight };
  }, [holdings, isEmpty]);

  // Monte Carlo simulation — generates scenarios
  const monteCarloData = useMemo(() => {
    if (!showMonteCarlo) return null;
    const scenarios = 500;
    const months = mcYears * 12;
    const annualReturn = 0.07;
    const annualVolatility = 0.15;
    const monthlyReturn = annualReturn / 12;
    const monthlyVol = annualVolatility / Math.sqrt(12);

    const allPaths = [];
    for (let s = 0; s < scenarios; s++) {
      const path = [mcInitial];
      let value = mcInitial;
      for (let m = 1; m <= months; m++) {
        // Box-Muller for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const ret = monthlyReturn + monthlyVol * z;
        value = value * (1 + ret) + mcMonthly;
        path.push(value);
      }
      allPaths.push(path);
    }

    // Compute percentiles per month
    const chartPoints = [];
    const yearsStep = mcYears > 10 ? 12 : 6; // show every year or half-year
    for (let m = 0; m <= months; m += yearsStep) {
      const values = allPaths.map(p => p[m]).sort((a, b) => a - b);
      chartPoints.push({
        year: (m / 12).toFixed(1),
        p10: Math.round(values[Math.floor(scenarios * 0.10)]),
        p25: Math.round(values[Math.floor(scenarios * 0.25)]),
        p50: Math.round(values[Math.floor(scenarios * 0.50)]),
        p75: Math.round(values[Math.floor(scenarios * 0.75)]),
        p90: Math.round(values[Math.floor(scenarios * 0.90)]),
        invested: mcInitial + mcMonthly * m,
      });
    }

    const finalValues = allPaths.map(p => p[months]).sort((a, b) => a - b);
    return {
      chart: chartPoints,
      stats: {
        p10: Math.round(finalValues[Math.floor(scenarios * 0.10)]),
        p50: Math.round(finalValues[Math.floor(scenarios * 0.50)]),
        p90: Math.round(finalValues[Math.floor(scenarios * 0.90)]),
        invested: mcInitial + mcMonthly * months,
      }
    };
  }, [showMonteCarlo, mcYears, mcMonthly, mcInitial]);

  const filteredBacktest = useMemo(() => {
    const mapping = { '1Y': 12, '3Y': 36, '5Y': 60, '10Y': 120 };
    return backtestData.slice(-mapping[btRange]);
  }, [btRange]);

  const finalValues = useMemo(() => {
    const last = filteredBacktest[filteredBacktest.length - 1];
    return last || { myPortfolio: 0, allWeather: 0, benchmark: 0 };
  }, [filteredBacktest]);

  const metrics = useMemo(() => {
    if (realMetrics) {
      return [
        { label: 'Valore attuale', value: fmt(realMetrics.totalValue), sub: `investito ${fmt(realMetrics.invested)}` },
        { label: 'Rendimento totale', value: `${realMetrics.pl >= 0 ? '+' : ''}${realMetrics.plPercent.toFixed(1)}%`, sub: `${realMetrics.pl >= 0 ? '+' : ''}${fmt(realMetrics.pl)}`, positive: realMetrics.pl >= 0 },
        { label: 'CAGR stimato', value: `${realMetrics.cagr >= 0 ? '+' : ''}${realMetrics.cagr.toFixed(1)}%`, sub: '3 anni (ipotesi)', positive: realMetrics.cagr >= 0 },
        { label: 'Volatilità attesa', value: `${realMetrics.volatility.toFixed(1)}%`, sub: `${(realMetrics.stocksWeight * 100).toFixed(0)}% azionario` },
        { label: 'Max Drawdown', value: `-${(realMetrics.volatility * 2.5).toFixed(1)}%`, sub: 'scenario stress', danger: true },
        { label: 'Sharpe Ratio', value: realMetrics.cagr > 0 ? ((realMetrics.cagr - 2) / realMetrics.volatility).toFixed(2) : '—', sub: 'rischio/rendimento' },
      ];
    }
    return [
      { label: 'CAGR', value: '8.4%', sub: 'dal 2020' },
      { label: 'Volatilità annua', value: '12.8%', sub: 'deviazione std' },
      { label: 'Max Drawdown', value: '-18.2%', sub: 'Mar 2020', danger: true },
      { label: 'Sharpe Ratio', value: '0.72', sub: 'rischio/rendimento' },
      { label: 'Sortino Ratio', value: '1.04', sub: 'rischio ribassista' },
      { label: 'Beta', value: '0.87', sub: 'vs MSCI World' },
    ];
  }, [realMetrics]);

  const diversificationScore = [
    { subject: 'Asset Class', A: 85 },
    { subject: 'Geografia', A: 72 },
    { subject: 'Settori', A: 78 },
    { subject: 'Valute', A: 68 },
    { subject: 'Num. ETF', A: 65 },
    { subject: 'Correlazione', A: 82 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Analisi e Backtest" description={isEmpty ? 'Crea un portafoglio per vedere le analisi reali' : `Analisi basate sul tuo portafoglio (${holdings.length} ETF)`} />

      {isEmpty && (
        <Card className="p-5 md:p-6" style={{ backgroundColor: '#E8F0FE', borderColor: '#C5D9F1' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1" style={{ color: NAVY }}>Portafoglio vuoto</p>
              <p className="text-sm mb-3" style={{ color: GRAY_600 }}>Le analisi qui sotto sono basate su un esempio. Aggiungi almeno un ETF al tuo portafoglio per vedere metriche reali personalizzate.</p>
              <button onClick={onGoToSearch} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold" style={{ backgroundColor: NAVY, color: 'white' }}>
                <Search className="w-3.5 h-3.5" /> Cerca e aggiungi ETF
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map(m => (
          <Card key={m.label} className="p-4">
            <p className="text-xs font-medium mb-1" style={{ color: GRAY_600 }}>{m.label}</p>
            <p className="text-xl font-semibold tracking-tight" style={{ color: m.danger ? RED : m.positive ? GREEN : NAVY }}>{m.value}</p>
            <p className="text-xs mt-0.5" style={{ color: GRAY_400 }}>{m.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Backtest storico</h2>
            <p className="text-sm mt-0.5" style={{ color: GRAY_600 }}>Investimento iniziale €10.000 — risultati ipotetici su dati storici</p>
          </div>
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
            {btRanges.map(r => (
              <button
                key={r}
                onClick={() => setBtRange(r)}
                className="px-3 py-1 text-xs font-medium rounded transition-colors"
                style={{
                  backgroundColor: btRange === r ? 'white' : 'transparent',
                  color: btRange === r ? NAVY : GRAY_600,
                  boxShadow: btRange === r ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-4 mb-4 flex-wrap text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-0.5" style={{ backgroundColor: NAVY }} /><span style={{ color: GRAY_600 }}>Il tuo portafoglio</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-0.5" style={{ backgroundColor: BLUE }} /><span style={{ color: GRAY_600 }}>All-Weather</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-px border-t border-dashed" style={{ borderColor: GRAY_400 }} /><span style={{ color: GRAY_600 }}>MSCI World</span></div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredBacktest}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
            <XAxis dataKey="month" stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v)} />
            <Line type="monotone" dataKey="myPortfolio" stroke={NAVY} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="allWeather" stroke={BLUE} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="benchmark" stroke={GRAY_400} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5" style={{ borderTop: `1px solid ${GRAY_100}` }}>
          <div>
            <p className="text-xs" style={{ color: GRAY_600 }}>Valore finale (tuo)</p>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>{fmt(finalValues.myPortfolio)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: GRAY_600 }}>All-Weather</p>
            <p className="text-lg font-semibold" style={{ color: BLUE }}>{fmt(finalValues.allWeather)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: GRAY_600 }}>MSCI World</p>
            <p className="text-lg font-semibold" style={{ color: GRAY_600 }}>{fmt(finalValues.benchmark)}</p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Matrice di correlazione</h2>
          <p className="text-sm mb-5" style={{ color: GRAY_600 }}>Correlazioni basse = miglior diversificazione</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium pb-2" style={{ color: GRAY_400 }}></th>
                  {['SWDA', 'VWCE', 'EIMI', 'AGGH', 'SGLD'].map(t => (
                    <th key={t} className="text-xs font-medium pb-2 px-1" style={{ color: GRAY_400 }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationMatrix.map(row => (
                  <tr key={row.etf}>
                    <td className="text-xs font-medium py-1 pr-2" style={{ color: GRAY_600 }}>{row.etf}</td>
                    {['SWDA', 'VWCE', 'EIMI', 'AGGH', 'SGLD'].map(t => (
                      <td key={t} className="p-1">
                        <div className="w-full aspect-square rounded flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: getCorrColor(row[t]), opacity: row.etf === t ? 0.4 : 1 }}>
                          {row[t].toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: GRAY_600 }}>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: GREEN }} />Bassa</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#D69E2E' }} />Media</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RED }} />Alta</span>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Score diversificazione</h2>
          <p className="text-sm mb-5" style={{ color: GRAY_600 }}>7.2 / 10 — buona diversificazione complessiva</p>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={diversificationScore}>
              <PolarGrid stroke={GRAY_200} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: GRAY_600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: GRAY_400 }} />
              <Radar dataKey="A" stroke={NAVY} fill={NAVY} fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Esposizione geografica</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={allocationByGeo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} horizontal={false} />
              <XAxis type="number" stroke={GRAY_400} fontSize={11} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" stroke={GRAY_400} fontSize={11} width={120} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill={NAVY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" style={{ color: GREEN_LIGHT }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN_LIGHT }}>Simulazione Monte Carlo</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Proiezione probabilistica</h2>
          <p className="text-sm mb-5" style={{ color: '#B8C5D9' }}>500 scenari simulati basati su rendimento atteso 7% e volatilità 15% annua.</p>

          <div className="space-y-4 mb-5">
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs" style={{ color: '#B8C5D9' }}>Capitale iniziale</label>
                <span className="text-xs font-semibold text-white">€{mcInitial.toLocaleString('it-IT')}</span>
              </div>
              <input type="range" min={0} max={100000} step={1000} value={mcInitial} onChange={(e) => setMcInitial(parseInt(e.target.value))} className="w-full" style={{ accentColor: GREEN_LIGHT }} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs" style={{ color: '#B8C5D9' }}>PAC mensile</label>
                <span className="text-xs font-semibold text-white">€{mcMonthly}</span>
              </div>
              <input type="range" min={0} max={2000} step={50} value={mcMonthly} onChange={(e) => setMcMonthly(parseInt(e.target.value))} className="w-full" style={{ accentColor: GREEN_LIGHT }} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs" style={{ color: '#B8C5D9' }}>Orizzonte</label>
                <span className="text-xs font-semibold text-white">{mcYears} anni</span>
              </div>
              <input type="range" min={1} max={40} value={mcYears} onChange={(e) => setMcYears(parseInt(e.target.value))} className="w-full" style={{ accentColor: GREEN_LIGHT }} />
            </div>
          </div>

          {!showMonteCarlo ? (
            <button onClick={() => setShowMonteCarlo(true)} className="w-full py-2.5 rounded-md font-medium text-sm flex items-center justify-center gap-2" style={{ backgroundColor: GREEN_LIGHT, color: NAVY_DARK }}>
              Avvia simulazione <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: '#FCA5A5' }}>P10 (pessimista)</p>
                  <p className="text-sm font-semibold text-white">€{(monteCarloData.stats.p10 / 1000).toFixed(0)}k</p>
                </div>
                <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: '#B8C5D9' }}>P50 (mediana)</p>
                  <p className="text-sm font-semibold text-white">€{(monteCarloData.stats.p50 / 1000).toFixed(0)}k</p>
                </div>
                <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(134,239,172,0.15)' }}>
                  <p className="text-[10px] mb-0.5" style={{ color: GREEN_LIGHT }}>P90 (ottimista)</p>
                  <p className="text-sm font-semibold text-white">€{(monteCarloData.stats.p90 / 1000).toFixed(0)}k</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monteCarloData.chart} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <defs>
                    <linearGradient id="mcP90" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN_LIGHT} stopOpacity={0.3} /><stop offset="100%" stopColor={GREEN_LIGHT} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${parseFloat(v).toFixed(0)}a`} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: NAVY_DARK, border: `1px solid ${NAVY_LIGHT}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => fmt(v)} labelStyle={{ color: GREEN_LIGHT }} />
                  <Area type="monotone" dataKey="p90" stroke={GREEN_LIGHT} strokeWidth={1} fill="url(#mcP90)" />
                  <Area type="monotone" dataKey="p50" stroke="white" strokeWidth={2} fill="transparent" />
                  <Area type="monotone" dataKey="p10" stroke="#FCA5A5" strokeWidth={1} fill="transparent" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="invested" stroke="rgba(255,255,255,0.4)" strokeWidth={1} fill="transparent" strokeDasharray="2 2" />
                </AreaChart>
              </ResponsiveContainer>
              <button onClick={() => setShowMonteCarlo(false)} className="w-full py-2 rounded-md font-medium text-xs mt-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                Riavvia simulazione
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MODEL PORTFOLIOS
// ─────────────────────────────────────────────────────────────

const RiskIndicator = ({ level }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="w-4 h-1.5 rounded-sm" style={{ backgroundColor: i <= level ? NAVY : GRAY_200 }} />
    ))}
  </div>
);

const ModelPortfolios = () => {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <ModelPortfolioDetail portfolio={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Portafogli Modello" description="Quattro strategie classiche. Clonale e personalizzale per te." />

      <div className="grid md:grid-cols-2 gap-6">
        {modelPortfolios.map(p => (
          <Card key={p.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: NAVY }}>{p.name}</h3>
                <p className="text-sm" style={{ color: GRAY_600 }}>{p.author}</p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-1" style={{ color: GRAY_400 }}>Rischio</p>
                <RiskIndicator level={p.riskLevel} />
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: GRAY_600 }}>{p.philosophy}</p>

            <div className="grid grid-cols-3 gap-3 mb-5 py-4" style={{ borderTop: `1px solid ${GRAY_100}`, borderBottom: `1px solid ${GRAY_100}` }}>
              <div>
                <p className="text-xs mb-1" style={{ color: GRAY_600 }}>CAGR</p>
                <p className="font-semibold" style={{ color: GREEN }}>+{p.cagr}%</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: GRAY_600 }}>Max DD</p>
                <p className="font-semibold" style={{ color: RED }}>{p.maxDD}%</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: GRAY_600 }}>Sharpe</p>
                <p className="font-semibold" style={{ color: NAVY }}>{p.sharpe}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={p.allocation} dataKey="value" innerRadius={32} outerRadius={58} paddingAngle={1} strokeWidth={0}>
                    {p.allocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {p.allocation.map(a => (
                  <div key={a.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: a.color }} />
                    <span className="flex-1" style={{ color: GRAY_600 }}>{a.name}</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{a.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(p)}>Dettagli</Button>
              <Button variant="primary" className="flex-1">Clona portafoglio</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Confronto rapido</h2>
        <p className="text-sm mb-5" style={{ color: GRAY_600 }}>Rendimento simulato con €10.000 investiti 10 anni fa</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                <th className="text-left font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Portafoglio</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>CAGR</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Max DD</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Sharpe</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Valore finale</th>
              </tr>
            </thead>
            <tbody>
              {modelPortfolios.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${GRAY_100}` }} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <td className="py-4 font-semibold" style={{ color: NAVY }}>{p.name}</td>
                  <td className="py-4 text-right font-semibold" style={{ color: GREEN }}>+{p.cagr}%</td>
                  <td className="py-4 text-right font-semibold" style={{ color: RED }}>{p.maxDD}%</td>
                  <td className="py-4 text-right" style={{ color: GRAY_600 }}>{p.sharpe}</td>
                  <td className="py-4 text-right font-semibold" style={{ color: NAVY }}>€{Math.round(10000 * Math.pow(1 + p.cagr/100, 10)).toLocaleString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const ModelPortfolioDetail = ({ portfolio, onBack }) => {
  // Generate historical simulation
  const history = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const t = i / 12;
      const base = 10000 * Math.pow(1 + portfolio.cagr / 100, t);
      const noise = Math.sin(i / 3.5) * (portfolio.cagr * 80);
      return {
        month: new Date(2016, i, 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        value: Math.round(base + noise),
        benchmark: Math.round(10000 * Math.pow(1.075, t) + Math.sin(i / 4) * 600),
      };
    });
  }, [portfolio]);

  // Suggested ETFs to replicate the portfolio
  const suggestedEtfs = portfolio.allocation.map((a, i) => {
    const mapping = {
      'MSCI World': { ticker: 'SWDA', isin: 'IE00B4L5Y983', ter: 0.20 },
      'Azionario': { ticker: 'VWCE', isin: 'IE00BK5BQT80', ter: 0.22 },
      'Azionario Globale': { ticker: 'VWCE', isin: 'IE00BK5BQT80', ter: 0.22 },
      'Azioni Globali': { ticker: 'SWDA', isin: 'IE00B4L5Y983', ter: 0.20 },
      'Emerging Markets': { ticker: 'EIMI', isin: 'IE00BKM4GZ66', ter: 0.18 },
      'Bond': { ticker: 'AGGH', isin: 'IE00B3F81R35', ter: 0.10 },
      'Bond Lungo': { ticker: 'DBZB', isin: 'LU0290357507', ter: 0.15 },
      'Bond Breve': { ticker: 'DBZB', isin: 'LU0290357507', ter: 0.15 },
      'Treasury Lungo': { ticker: 'DBZB', isin: 'LU0290357507', ter: 0.15 },
      'Treasury Medio': { ticker: 'AGGH', isin: 'IE00B3F81R35', ter: 0.10 },
      'Oro': { ticker: 'SGLD', isin: 'IE00B579F325', ter: 0.12 },
      'Commodities': { ticker: 'SGLD', isin: 'IE00B579F325', ter: 0.12 },
      'Aggregate Bond': { ticker: 'AGGH', isin: 'IE00B3F81R35', ter: 0.10 },
    };
    const match = mapping[a.name] || { ticker: 'SWDA', isin: 'IE00B4L5Y983', ter: 0.20 };
    return { ...a, ...match };
  });

  // Weighted TER
  const weightedTer = suggestedEtfs.reduce((sum, e) => sum + (e.ter * e.value / 100), 0);

  const finalValue = Math.round(10000 * Math.pow(1 + portfolio.cagr / 100, 10));

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold hover:underline"
        style={{ color: GREEN_LIGHT }}
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna ai portafogli modello
      </button>

      {/* Header */}
      <Card className="p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Label variant="info">Modello</Label>
              <RiskIndicator level={portfolio.riskLevel} />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1" style={{ color: NAVY, letterSpacing: '-0.02em' }}>{portfolio.name}</h1>
            <p className="text-sm" style={{ color: GRAY_600 }}>Ideato da {portfolio.author}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary"><Share2 className="w-4 h-4" /> Condividi</Button>
            <Button variant="primary"><Plus className="w-4 h-4" /> Clona portafoglio</Button>
          </div>
        </div>

        <p className="text-base leading-relaxed" style={{ color: GRAY_600 }}>{portfolio.philosophy}</p>
      </Card>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'CAGR storico', value: `+${portfolio.cagr}%`, sub: '10 anni', color: GREEN },
          { label: 'Max Drawdown', value: `${portfolio.maxDD}%`, sub: 'perdita massima', color: RED },
          { label: 'Sharpe Ratio', value: portfolio.sharpe.toString(), sub: 'rischio/rendimento', color: NAVY },
          { label: 'TER ponderato', value: `${weightedTer.toFixed(2)}%`, sub: 'costo annuo', color: NAVY },
        ].map((m, i) => (
          <Card key={i} className="p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>{m.label}</p>
            <p className="text-xl md:text-2xl font-semibold tracking-tight" style={{ color: m.color, letterSpacing: '-0.02em' }}>{m.value}</p>
            <p className="text-xs mt-1" style={{ color: GRAY_400 }}>{m.sub}</p>
          </Card>
        ))}
      </div>

      {/* Historical chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Performance storica</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>€10.000 investiti 10 anni fa → {fmt(finalValue)} oggi</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-0.5" style={{ backgroundColor: NAVY }} /><span style={{ color: GRAY_600 }}>{portfolio.name}</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-px border-t border-dashed" style={{ borderColor: GRAY_400 }} /><span style={{ color: GRAY_600 }}>MSCI World</span></div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="modelChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.15} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
            <XAxis dataKey="month" stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} interval={12} />
            <YAxis stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v)} />
            <Area type="monotone" dataKey="value" stroke={NAVY} strokeWidth={2.5} fill="url(#modelChart)" />
            <Line type="monotone" dataKey="benchmark" stroke={GRAY_400} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Composition + ETFs to replicate */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 md:p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Composizione</h2>
          <p className="text-xs mb-5" style={{ color: GRAY_600 }}>Allocazione target del portafoglio</p>
          <div className="flex items-center gap-4 md:gap-6 flex-wrap">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={portfolio.allocation} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={1} strokeWidth={0}>
                  {portfolio.allocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 min-w-0 space-y-2">
              {portfolio.allocation.map(a => (
                <div key={a.name} className="flex items-center gap-2 text-sm">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="flex-1 truncate" style={{ color: GRAY_600 }}>{a.name}</span>
                  <span className="font-semibold" style={{ color: NAVY }}>{a.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>ETF consigliati per replicarlo</h2>
          <p className="text-xs mb-5" style={{ color: GRAY_600 }}>ETF UCITS disponibili sui principali broker</p>
          <div className="space-y-2">
            {suggestedEtfs.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md" style={{ border: `1px solid ${GRAY_200}` }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0" style={{ backgroundColor: e.color }}>
                  {e.ticker.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: NAVY }}>{e.ticker}</span>
                    <Label variant="neutral">TER {e.ter}%</Label>
                  </div>
                  <p className="text-xs truncate" style={{ color: GRAY_600 }}>{e.name}</p>
                </div>
                <span className="font-semibold text-sm" style={{ color: NAVY }}>{e.value}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${GRAY_100}` }}>
            <span className="text-xs" style={{ color: GRAY_600 }}>TER totale ponderato</span>
            <span className="font-semibold text-sm" style={{ color: NAVY }}>{weightedTer.toFixed(2)}%</span>
          </div>
        </Card>
      </div>

      {/* Pros and cons */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
            <h3 className="font-semibold" style={{ color: NAVY }}>Punti di forza</h3>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              'Strategia semplice e collaudata nel tempo',
              'Diversificazione naturale tra asset non correlati',
              'Costi totali contenuti grazie all\'uso di ETF',
              'Facile da ribilanciare (1-2 volte l\'anno)',
            ].map((pt, i) => (
              <li key={i} className="flex gap-2" style={{ color: GRAY_600 }}>
                <span style={{ color: GREEN }}>✓</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" style={{ color: '#B45309' }} />
            <h3 className="font-semibold" style={{ color: NAVY }}>Cose da sapere</h3>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              `Max drawdown storico di ${portfolio.maxDD}%: devi tollerare perdite temporanee`,
              'I rendimenti passati non garantiscono quelli futuri',
              'Richiede disciplina: ribilanciamento periodico necessario',
              'Non adatto a chi ha orizzonti inferiori a 5-7 anni',
            ].map((pt, i) => (
              <li key={i} className="flex gap-2" style={{ color: GRAY_600 }}>
                <span style={{ color: '#B45309' }}>!</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* CTA */}
      <Card className="p-6 md:p-8" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1">Pronto a iniziare?</h3>
            <p className="text-sm" style={{ color: '#B8C5D9' }}>Clona questo portafoglio nel tuo account e personalizzalo come preferisci</p>
          </div>
          <button className="px-6 py-3 rounded-md font-semibold text-sm" style={{ color: NAVY_DARK, backgroundColor: GREEN_LIGHT }}>
            Clona portafoglio
          </button>
        </div>
      </Card>

      <Card className="p-4" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#8B5416' }}>
            I portafogli modello sono esempi educativi ispirati a strategie pubbliche note. Non costituiscono raccomandazioni di investimento personalizzate. I dati storici sono simulati per finalità illustrative.
          </p>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMMUNITY
// ─────────────────────────────────────────────────────────────

const Community = () => {
  const [selectedPost, setSelectedPost] = useState(null);

  if (selectedPost) {
    return <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Community"
        description="Confronto, discussione, ispirazione. Nessun post costituisce consulenza finanziaria."
        action={<Button variant="primary"><Plus className="w-4 h-4" /> Nuovo post</Button>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {communityPosts.map(p => (
            <Card key={p.id} className="p-5 md:p-6 cursor-pointer transition-all hover:border-gray-300" onClick={() => setSelectedPost(p)}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ backgroundColor: NAVY }}>
                  {p.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: NAVY }}>{p.user}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: BLUE }} />
                  </div>
                  <p className="text-xs" style={{ color: GRAY_400 }}>{p.time}</p>
                </div>
                <button style={{ color: GRAY_400 }} onClick={(e) => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></button>
              </div>

              <p className="text-sm leading-relaxed mb-4" style={{ color: GRAY_600 }}>{p.content}</p>

              <div className="grid grid-cols-3 gap-3 mb-4 p-4 rounded-md" style={{ backgroundColor: GRAY_50 }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>CAGR</p>
                  <p className="font-semibold text-sm" style={{ color: GREEN }}>+{p.portfolio.cagr}%</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>Volatilità</p>
                  <p className="font-semibold text-sm" style={{ color: NAVY }}>{p.portfolio.vol}%</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>N. ETF</p>
                  <p className="font-semibold text-sm" style={{ color: NAVY }}>{p.portfolio.assets}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm" style={{ borderTop: `1px solid ${GRAY_100}`, color: GRAY_600 }}>
                <button className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}><Heart className="w-4 h-4" /> {p.likes}</button>
                <button className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> {p.comments}</button>
                <button className="flex items-center gap-1.5 ml-auto" onClick={(e) => e.stopPropagation()}><Share2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-5" style={{ color: NAVY }}>Discussioni in evidenza</h3>
            <div>
              {['Portafoglio Lazy 3-ETF', 'VWCE vs SWDA: confronto', 'Dividend ETF strategy', 'PAC vs PIC nel 2026'].map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-3 text-sm cursor-pointer" style={{ borderBottom: i < 3 ? `1px solid ${GRAY_100}` : 'none' }}>
                  <span className="text-xs font-semibold w-4" style={{ color: GRAY_400 }}>{i + 1}</span>
                  <span className="flex-1" style={{ color: NAVY }}>{t}</span>
                  <span className="text-xs" style={{ color: GRAY_400 }}>{140 - i * 28}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-5" style={{ color: NAVY }}>Top contributors</h3>
            <div className="space-y-4">
              {[
                { name: 'InvestorPro', score: 4820 },
                { name: 'LongTermView', score: 3945 },
                { name: 'ETFGuru', score: 3210 },
              ].map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs" style={{ backgroundColor: NAVY }}>
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: NAVY }}>{u.name}</p>
                    <p className="text-xs" style={{ color: GRAY_400 }}>{u.score} punti</p>
                  </div>
                  <Label variant="neutral">#{i + 1}</Label>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: '#B45309' }}>Regole community</p>
                <p className="text-xs leading-relaxed" style={{ color: '#8B5416' }}>Spazio di confronto educativo. Nessun post costituisce consulenza finanziaria. Le performance passate non garantiscono quelle future.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PostDetail = ({ post, onBack }) => {
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [shared, setShared] = useState(false);
  const [comments, setComments] = useState([
    { id: 1, user: 'InvestorPro', avatar: 'IP', time: '2h fa', content: 'Ottimo risultato! Anche io su VWCE da 3 anni. Il segreto è davvero non guardare il portafoglio tutti i giorni.', likes: 24 },
    { id: 2, user: 'LongTermView', avatar: 'LT', time: '4h fa', content: 'Concordo. Io aggiungerei: non cercare di fare market timing con il PAC. Data fissa ogni mese, punto.', likes: 18 },
    { id: 3, user: 'ETFGuru', avatar: 'EG', time: '6h fa', content: 'Hai considerato di diversificare aggiungendo un 20% di EIMI per Emerging Markets? VWCE ha solo ~10% di EM.', likes: 12 },
    { id: 4, user: 'SaraETF', avatar: 'SE', time: '8h fa', content: 'Complimenti! Quale broker usi per i PAC automatici? Sto valutando Scalable vs Directa.', likes: 7 },
  ]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    setComments(prev => [{ id: Date.now(), user: 'Marco Rossi', avatar: 'MR', time: 'adesso', content: newComment, likes: 0 }, ...prev]);
    setNewComment('');
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold hover:underline"
        style={{ color: GREEN_LIGHT }}
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla community
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main post */}
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0" style={{ backgroundColor: NAVY }}>
                {post.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: NAVY }}>{post.user}</span>
                  <CheckCircle2 className="w-4 h-4" style={{ color: BLUE }} />
                </div>
                <p className="text-xs" style={{ color: GRAY_400 }}>{post.time} · Condiviso pubblicamente</p>
              </div>
              <button
                onClick={() => setFollowing(!following)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{
                  backgroundColor: following ? GRAY_100 : NAVY,
                  color: following ? NAVY : 'white',
                  border: following ? `1px solid ${GRAY_200}` : 'none',
                }}
              >
                {following ? '✓ Seguito' : 'Segui'}
              </button>
            </div>

            <p className="text-base leading-relaxed mb-5" style={{ color: NAVY }}>{post.content}</p>

            {/* Portfolio breakdown shared */}
            <div className="p-4 rounded-md mb-5" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GRAY_600, letterSpacing: '0.06em' }}>Portafoglio condiviso</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>CAGR</p>
                  <p className="text-xl font-semibold" style={{ color: GREEN }}>+{post.portfolio.cagr}%</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>Volatilità</p>
                  <p className="text-xl font-semibold" style={{ color: NAVY }}>{post.portfolio.vol}%</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: GRAY_600 }}>N. ETF</p>
                  <p className="text-xl font-semibold" style={{ color: NAVY }}>{post.portfolio.assets}</p>
                </div>
              </div>
              <button className="text-xs font-semibold flex items-center gap-1" style={{ color: BLUE }}>
                Vedi allocazione dettagliata <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-sm" style={{ borderTop: `1px solid ${GRAY_100}`, color: GRAY_600 }}>
              <button
                onClick={() => setLiked(!liked)}
                className="flex items-center gap-1.5 transition-colors"
                style={{ color: liked ? RED : GRAY_600 }}
              >
                <Heart className="w-4 h-4" fill={liked ? RED : 'none'} /> {post.likes + (liked ? 1 : 0)}
              </button>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> {comments.length}
              </div>
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href || 'etftracker.app/post/' + post.id);
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }
                }}
                className="flex items-center gap-1.5 ml-auto transition-colors"
                style={{ color: shared ? GREEN : GRAY_600 }}
              >
                <Share2 className="w-4 h-4" /> {shared ? 'Link copiato!' : 'Condividi'}
              </button>
            </div>
          </Card>

          {/* Comment form */}
          <Card className="p-5">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: NAVY }}>
                MR
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Aggiungi un commento…"
                  rows={newComment ? 3 : 1}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none resize-none transition-all"
                  style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
                />
                {newComment && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button onClick={() => setNewComment('')} className="px-3 py-1.5 text-xs font-semibold rounded" style={{ color: GRAY_600 }}>
                      Annulla
                    </button>
                    <button onClick={handleSubmit} className="px-4 py-1.5 text-xs font-semibold rounded-md" style={{ backgroundColor: NAVY, color: 'white' }}>
                      Pubblica
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: 'white' }}>{comments.length} commenti</h3>
            {comments.map(c => (
              <Card key={c.id} className="p-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: NAVY_LIGHT }}>
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>{c.user}</span>
                      <span className="text-xs" style={{ color: GRAY_400 }}>{c.time}</span>
                    </div>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: GRAY_600 }}>{c.content}</p>
                    <div className="flex items-center gap-4 text-xs" style={{ color: GRAY_400 }}>
                      <button className="flex items-center gap-1 hover:text-red-500"><Heart className="w-3 h-3" /> {c.likes}</button>
                      <button className="hover:text-indigo-600">Rispondi</button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3" style={{ color: NAVY }}>Informazioni autore</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: NAVY }}>
                {post.avatar}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: NAVY }}>{post.user}</p>
                <p className="text-xs" style={{ color: GRAY_600 }}>Investitore dal 2019</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded-md" style={{ backgroundColor: GRAY_50 }}>
                <p className="text-lg font-semibold" style={{ color: NAVY }}>48</p>
                <p className="text-xs" style={{ color: GRAY_600 }}>Post</p>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: GRAY_50 }}>
                <p className="text-lg font-semibold" style={{ color: NAVY }}>1.2k</p>
                <p className="text-xs" style={{ color: GRAY_600 }}>Follower</p>
              </div>
            </div>
          </Card>

          <Card className="p-5" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#8B5416' }}>
                I contenuti pubblicati dagli utenti non costituiscono consulenza finanziaria. Valuta sempre con attenzione prima di prendere decisioni d'investimento.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// IMPARA — Manual + Quick courses
// ─────────────────────────────────────────────────────────────

const manualModules = [
  {
    id: 'etf',
    title: 'Gli ETF',
    subtitle: 'Tutto quello che devi sapere prima di comprarne uno',
    color: BLUE,
    icon: PieIcon,
    chapters: [
      { id: 'etf-1', num: 1, title: "Cos'è davvero un ETF", readTime: '6 min', hasContent: true },
      { id: 'etf-2', num: 2, title: 'Replica fisica vs sintetica', readTime: '5 min', hasContent: true },
      { id: 'etf-3', num: 3, title: 'I costi: TER, spread, commissioni', readTime: '7 min', hasContent: true },
      { id: 'etf-4', num: 4, title: 'Accumulazione vs distribuzione', readTime: '5 min', hasContent: true },
      { id: 'etf-5', num: 5, title: 'Come leggere il KID', readTime: '8 min', hasContent: true },
      { id: 'etf-6', num: 6, title: 'Liquidità, AUM e tracking error', readTime: '6 min', hasContent: true },
      { id: 'etf-7', num: 7, title: 'UCITS, domicilio, hedging valutario', readTime: '7 min', hasContent: true },
      { id: 'etf-8', num: 8, title: 'Gli errori più comuni nella scelta', readTime: '6 min', hasContent: true },
    ],
  },
  {
    id: 'portfolio',
    title: 'Costruire il portafoglio',
    subtitle: "L'arte di mettere insieme tanti pezzi per un risultato coerente",
    color: GREEN,
    icon: Briefcase,
    chapters: [
      { id: 'pf-1', num: 1, title: 'Prima di tutto: obiettivi, orizzonte, fondo emergenza', readTime: '8 min', hasContent: true },
      { id: 'pf-2', num: 2, title: 'Asset allocation: il 90% del risultato', readTime: '9 min', hasContent: true },
      { id: 'pf-3', num: 3, title: 'Rischio: volatilità e drawdown spiegati', readTime: '7 min', hasContent: true },
      { id: 'pf-4', num: 4, title: 'Diversificazione e correlazione', readTime: '6 min', hasContent: true },
      { id: 'pf-5', num: 5, title: 'PAC vs PIC: confronto numerico', readTime: '8 min', hasContent: true },
      { id: 'pf-6', num: 6, title: 'Quanti ETF servono davvero', readTime: '5 min', hasContent: true },
      { id: 'pf-7', num: 7, title: 'Ribilanciamento: quando e come', readTime: '7 min', hasContent: true },
      { id: 'pf-8', num: 8, title: 'Psicologia: i bias che ti rovineranno', readTime: '9 min', hasContent: true },
    ],
  },
];

// Full chapter content (only for chapters marked hasContent: true)
const chapterContent = {
  'etf-1': {
    intro: "Se stai leggendo queste righe, probabilmente hai sentito nominare gli ETF decine di volte. Ma sai davvero cosa sono? Un ETF — acronimo di Exchange Traded Fund — è un fondo d'investimento che si compra e vende in borsa come fosse un'azione. In una sola operazione, con una sola commissione, acquisti un paniere che può contenere decine, centinaia o migliaia di titoli.",
    sections: [
      {
        heading: "L'idea chiave",
        body: "Un ETF è come comprare una fetta di torta al posto di tutti gli ingredienti separati. Immagina di voler investire nelle 500 maggiori aziende americane. Senza ETF, dovresti comprare 500 azioni diverse, pagare 500 commissioni, ribilanciarle quando cambiano le classifiche. Con l'ETF S&P 500 fai tutto questo con un click."
      },
      {
        heading: "Come funziona in pratica",
        body: "Un gestore (es. iShares, Vanguard, Amundi) crea il fondo, lo quota in borsa e si impegna a replicare un indice — per esempio il MSCI World che rappresenta ~1.500 aziende dei paesi sviluppati. Tu compri quote del fondo al prezzo di mercato. Il fondo compra le azioni sottostanti per tuo conto. Quando le aziende pagano dividendi, o l'ETF li distribuisce a te, o li reinveste automaticamente.",
      },
      {
        heading: "ETF vs fondo comune tradizionale",
        body: "La differenza principale è la negoziazione. Un fondo comune si compra una volta al giorno al NAV (net asset value) di chiusura. Un ETF si compra e vende in tempo reale durante l'orario di borsa, come un'azione. Inoltre gli ETF hanno costi annui (TER) molto più bassi: tipicamente 0.05%-0.30% contro 1.5%-2.5% dei fondi a gestione attiva.",
      },
      {
        heading: "ETF vs azione singola",
        body: "Comprare Apple significa scommettere su una singola azienda. Se Apple crolla, il tuo investimento crolla. Comprare un ETF sul settore tecnologico USA significa avere dentro Apple, Microsoft, Nvidia, Google, Amazon e altre 60 aziende. Se una crolla, le altre possono compensare. Diversificazione automatica, a costo basso."
      }
    ],
    keyPoints: [
      "L'ETF è un fondo negoziato in borsa che contiene molti titoli in una sola quota",
      "Replica un indice (MSCI World, S&P 500, ecc.) in modo passivo e trasparente",
      "Costi molto più bassi dei fondi attivi: tipicamente 0.10-0.30% annuo",
      "Diversificazione immediata: compri centinaia di aziende con una singola operazione",
      "Si compra e vende in borsa come un'azione, in tempo reale"
    ],
    commonMistakes: [
      "Confondere un ETF con una singola azione: un ETF è un paniere, non un titolo individuale",
      "Scegliere un ETF solo in base al rendimento passato senza considerare costi e composizione",
      "Non distinguere tra ETF ad accumulazione e distribuzione (ne parleremo nel capitolo 4)"
    ],
    example: {
      title: "Esempio concreto",
      body: "Con €1.000 investiti nell'ETF iShares Core MSCI World (ticker SWDA, ISIN IE00B4L5Y983), acquisti una piccola quota di ~1.500 aziende di 23 paesi sviluppati: 70% USA, 10% Giappone, 5% UK, 4% Francia e così via. La spesa annua è circa €2 (TER 0.20%). Dieci anni fa lo stesso investimento valeva ~€2.000, cioè è circa raddoppiato. Nessuna garanzia che succeda di nuovo — ma l'idea è questa."
    },
    quiz: [
      {
        question: "Qual è il vantaggio principale di un ETF rispetto a comprare singole azioni?",
        options: [
          "Rende di più nel lungo periodo",
          "Diversifica automaticamente riducendo il rischio specifico",
          "Non paga mai commissioni",
          "Garantisce un rendimento minimo"
        ],
        correct: 1,
        explanation: "Gli ETF offrono diversificazione istantanea: in un solo acquisto possiedi un paniere di decine o centinaia di titoli. Questo riduce il rischio legato al fallimento di una singola azienda."
      },
      {
        question: "Cos'è il TER di un ETF?",
        options: [
          "Il rendimento garantito dell'ETF",
          "Il costo annuo totale di gestione espresso in percentuale",
          "La tassa sui dividendi",
          "Il prezzo di acquisto dell'ETF"
        ],
        correct: 1,
        explanation: "Il TER (Total Expense Ratio) è il costo annuale che paghi al gestore del fondo, espresso come percentuale del capitale investito. Su €10.000 un TER dello 0.20% significa €20 all'anno."
      },
      {
        question: "Quanto costa tipicamente un ETF in termini di TER?",
        options: [
          "Tra 0.05% e 0.30% annuo",
          "Tra 1% e 2% annuo",
          "Tra 3% e 5% annuo",
          "Sempre 0%, sono gratuiti"
        ],
        correct: 0,
        explanation: "Gli ETF hanno TER molto bassi, tipicamente tra 0.05% e 0.30% annui. I fondi a gestione attiva arrivano anche al 2-3%, erodendo silenziosamente i rendimenti nel lungo periodo."
      }
    ]
  },

  'pf-1': {
    intro: "Prima ancora di scegliere un ETF, devi fare un passo indietro e rispondere a tre domande fondamentali: perché sto investendo? Per quanto tempo? Cosa succede se perdo lavoro o ho un imprevisto? Saltare questa fase è l'errore più comune dei neo-investitori. Ti porta a vendere in panico al primo crollo, o peggio, a non poter vendere quando ti servono i soldi.",
    sections: [
      {
        heading: "Definire l'obiettivo",
        body: "Investire senza obiettivo è come guidare senza destinazione: può essere divertente, ma non arrivi mai da nessuna parte. Scrivi nero su bianco a cosa servono i soldi. Esempi: \"tra 15 anni voglio €100.000 per integrare la pensione\", oppure \"tra 7 anni voglio €50.000 per la casa\". L'obiettivo determina tutto il resto: strumenti, allocazione, tolleranza al rischio."
      },
      {
        heading: "L'orizzonte temporale cambia tutto",
        body: "Più lungo è l'orizzonte, più rischio puoi prenderti. Con 25 anni davanti, un portafoglio 90% azionario ha quasi sempre sovraperformato uno 50/50. Con 3 anni davanti, lo stesso portafoglio è un disastro annunciato: basta un 2008 e non hai tempo di recuperare. Regola pratica: se ti servono i soldi entro 5 anni, investimenti azionari NO. Tra 5 e 10 anni, moderato. Oltre 10 anni, puoi andare aggressivo."
      },
      {
        heading: "Il fondo emergenza viene prima",
        body: "Prima di investire un singolo euro in ETF, metti da parte 3-6 mesi di spese in un conto deposito liquido. Questo è il tuo paracadute. Senza paracadute, al primo guasto alla macchina o perdita lavoro sei costretto a vendere gli ETF — e probabilmente proprio quando il mercato è basso. Il fondo emergenza non rende nulla? Esatto. Non deve. Deve esserci quando serve."
      },
      {
        heading: "Calcolare quanto serve",
        body: "Moltiplica le tue spese mensili essenziali (affitto/mutuo, utenze, cibo, rate) per 3-6. Se spendi €1.800/mese, il tuo fondo emergenza va da €5.400 (3 mesi) a €10.800 (6 mesi). Se hai lavoro precario o partita IVA, vai su 6. Se hai lavoro sicuro statale, 3 bastano. Tienili in un conto deposito svincolabile, non in ETF."
      }
    ],
    keyPoints: [
      "Prima di investire, definisci obiettivo, orizzonte temporale e importo target",
      "Più lungo è l'orizzonte, più rischio puoi prenderti",
      "Sotto i 5 anni, evita investimenti azionari",
      "Il fondo emergenza (3-6 mesi di spese) viene prima degli ETF",
      "Tieni il fondo emergenza in un conto deposito liquido, non in ETF"
    ],
    commonMistakes: [
      "Iniziare a investire senza aver costituito il fondo emergenza",
      "Investire soldi che potrebbero servire nel breve termine",
      "Avere un orizzonte troppo corto per i rischi che stai prendendo",
      "Non quantificare l'obiettivo (\"voglio guadagnare\" non è un obiettivo)"
    ],
    example: {
      title: "Esempio: Marco, 32 anni",
      body: "Marco guadagna €2.200 netti al mese, spende €1.500. Vuole integrare la pensione tra 33 anni. Prima di investire, costruisce un fondo emergenza di €6.000 (4 mesi) su conto deposito al 3%. Poi destina €400/mese (il 18% del reddito) a un PAC su ETF azionario globale. Orizzonte: 33 anni. Se il rendimento medio è del 7% annuo, a fine periodo avrà circa €620.000 nominali, cioè ~€300.000 in potere d'acquisto reale (netto inflazione)."
    },
    quiz: [
      {
        question: "Qual è la prima cosa da fare prima di investire in ETF?",
        options: [
          "Scegliere il miglior broker",
          "Costituire un fondo emergenza di 3-6 mesi di spese",
          "Leggere libri di finanza",
          "Aprire più conti di investimento"
        ],
        correct: 1,
        explanation: "Il fondo emergenza è la base di ogni pianificazione finanziaria. Senza, al primo imprevisto sei costretto a vendere gli investimenti, spesso proprio quando il mercato è basso."
      },
      {
        question: "Per quale orizzonte temporale gli investimenti azionari sono sconsigliati?",
        options: [
          "Sopra i 20 anni",
          "Tra 10 e 15 anni",
          "Sotto i 5 anni",
          "Non ci sono limiti temporali"
        ],
        correct: 2,
        explanation: "Con orizzonte sotto i 5 anni, i mercati azionari possono non avere tempo di recuperare dopo un crollo. Per obiettivi brevi meglio strumenti più stabili come conti deposito o obbligazioni di qualità."
      },
      {
        question: "Come calcolare la dimensione del fondo emergenza?",
        options: [
          "10% del patrimonio totale",
          "Una mensilità di stipendio",
          "3-6 mesi di spese essenziali",
          "€10.000 per tutti"
        ],
        correct: 2,
        explanation: "La regola standard è 3-6 mesi di spese essenziali (non di entrate). Chi ha reddito precario o spese elevate va verso i 6 mesi; chi ha lavoro stabile può fermarsi a 3."
      }
    ]
  },

  'pf-2': {
    intro: "C'è uno studio del 1986 (Brinson, Hood, Beebower) che ha cambiato il modo di pensare agli investimenti. Analizzando 91 grandi fondi pensione, gli autori hanno scoperto che oltre il 90% della variazione dei rendimenti era spiegata dall'asset allocation — cioè dalla ripartizione tra azioni, obbligazioni, liquidità. Meno del 10% veniva dalla scelta dei singoli titoli o dal timing di mercato. Tradotto: conta molto di più COME divide i tuoi soldi che QUALI ETF scegli.",
    sections: [
      {
        heading: "Cos'è l'asset allocation",
        body: "Asset allocation significa decidere in che percentuale dividere i tuoi investimenti tra asset class — le macro-categorie: azioni, obbligazioni, commodities, immobiliare, liquidità. Un portafoglio 70/30 significa 70% azioni, 30% obbligazioni. Un 60/20/20 significa 60% azioni, 20% bond, 20% oro. Non c'è un'allocazione giusta in assoluto: c'è quella giusta per te."
      },
      {
        heading: "La regola del 110 meno l'età",
        body: "Un punto di partenza classico: sottrai la tua età da 110. Il risultato è la percentuale di azioni. A 30 anni: 80% azioni, 20% bond. A 50 anni: 60% azioni, 40% bond. A 70 anni: 40% azioni, 60% bond. È una semplificazione ma ti dà l'idea: più sei giovane (= più tempo davanti), più puoi prenderti rischio azionario. Più invecchi, più stabilizzi."
      },
      {
        heading: "Il ruolo delle obbligazioni",
        body: "Molti principianti si chiedono: perché mai tenere obbligazioni quando rendono meno? La risposta è: per dormire la notte. Nel 2008 le azioni hanno perso il 40%. I Treasury USA a lungo termine hanno GUADAGNATO il 25%. Nel 2022, caso raro, sono scesi entrambi — ma storicamente le obbligazioni di qualità zavorrano meno il portafoglio nei periodi brutti. Più bond = meno volatilità, meno drawdown, meno tentazione di vendere in panico."
      },
      {
        heading: "L'allocazione strategica è fissa",
        body: "La tua allocazione strategica (es. 70/30) è la stella polare. Non la cambi in base a cosa dice la TV. Non la cambi perché \"ora le azioni vanno forte\" o perché \"si prevede una recessione\". Solo in tre casi la cambi: 1) cambia il tuo orizzonte (ti avvicini a un obiettivo), 2) cambia il tuo profilo di rischio, 3) cambia drasticamente la tua situazione finanziaria. Per il resto, ribilanci. Non rimescoli."
      },
      {
        heading: "Dentro le azioni, come dividere",
        body: "Dopo aver deciso quanto azionario tenere, dividi tra aree geografiche. L'allocazione più semplice e robusta è quella neutra in base al peso economico: ~65% paesi sviluppati USA, 15% Europa, 10% Giappone, 10% emergenti. Più pragmatico: un singolo ETF MSCI World (paesi sviluppati) + un piccolo satellite di emergenti. Più è semplice, meglio è. Lo strapotere USA è discutibile, ma una banale esposizione globale funziona."
      }
    ],
    keyPoints: [
      "L'asset allocation spiega oltre il 90% del risultato di un portafoglio",
      "Ripartire tra azioni/bond/altro conta più della scelta del singolo ETF",
      "Regola del 110 meno l'età come punto di partenza per la quota azionaria",
      "Le obbligazioni servono a ridurre volatilità e drawdown",
      "L'allocazione strategica è fissa: si ribilancia, non si stravolge"
    ],
    commonMistakes: [
      "Cambiare allocazione in base alle notizie o alle emozioni del momento",
      "Ignorare le obbligazioni perché \"rendono poco\" (non è il loro mestiere)",
      "Concentrare tutto su un paese o un settore",
      "Rifare l'allocazione ogni volta che si legge un articolo"
    ],
    example: {
      title: "Esempio: Laura, 40 anni, orizzonte 25 anni",
      body: "Seguendo la regola del 110, Laura sceglie 70% azioni, 30% bond. Dentro le azioni: 55% MSCI World (via SWDA), 15% Emerging Markets (via EIMI). Dentro i bond: 20% Aggregate Bond globale (via AGGH), 10% Treasury lungo. Totale 4 ETF. Ribilancerà una volta l'anno. Se il mercato crolla del 30%, il suo portafoglio scenderà del ~20% (non 30%) grazie ai bond. Questo le darà il coraggio di non vendere."
    },
    quiz: [
      {
        question: "Qual è l'elemento che spiega la maggior parte dei rendimenti di un portafoglio?",
        options: [
          "La scelta dei singoli titoli",
          "Il timing di mercato",
          "L'asset allocation",
          "Le commissioni del broker"
        ],
        correct: 2,
        explanation: "Lo studio storico di Brinson, Hood e Beebower ha mostrato che oltre il 90% della variazione dei rendimenti è spiegata dall'asset allocation. Conta come dividi il patrimonio, non tanto quale ETF specifico scegli."
      },
      {
        question: "Un investitore di 30 anni, secondo la regola del 110, dovrebbe avere circa:",
        options: [
          "30% azioni, 70% bond",
          "50% azioni, 50% bond",
          "80% azioni, 20% bond",
          "100% azioni"
        ],
        correct: 2,
        explanation: "110 - 30 = 80. Quindi ~80% azioni e ~20% obbligazioni. È una regola indicativa, non una legge, ma funziona come punto di partenza per investitori con orizzonte lungo."
      },
      {
        question: "A cosa servono le obbligazioni in un portafoglio?",
        options: [
          "A massimizzare il rendimento",
          "A ridurre volatilità e drawdown",
          "A sostituire il fondo emergenza",
          "Sono obsolete nel 2026"
        ],
        correct: 1,
        explanation: "Le obbligazioni di qualità zavorrano i momenti brutti del portafoglio. Rendono meno delle azioni nel lungo periodo, ma riducono la volatilità e aiutano l'investitore a non cedere al panico durante i crolli."
      }
    ]
  },

  'etf-3': {
    intro: "Warren Buffett ha detto una volta: \"Nel mondo degli investimenti, meno paghi, più tieni.\" Sembra banale, ma è la verità più sottovalutata della finanza personale. Lo 0.5% di costo extra all'anno sembra poco, ma su 30 anni di PAC può costarti decine di migliaia di euro. In questo capitolo ti mostro TUTTI i costi di un ETF, non solo il TER, e ti insegno a calcolare quanto stai davvero pagando.",
    sections: [
      {
        heading: "I tre costi di un ETF",
        body: "Quando compri un ETF paghi tre tipi di costi, in momenti diversi. PRIMO: commissioni di negoziazione, le paghi al broker quando compri o vendi. SECONDO: spread bid-ask, la differenza tra prezzo di acquisto e vendita sul mercato, lo paghi ad ogni transazione senza accorgertene. TERZO: TER (Total Expense Ratio), il costo annuale di gestione del fondo, viene sottratto silenziosamente dal valore dell'ETF giorno dopo giorno. Il TER è il più importante perché ti segue per sempre."
      },
      {
        heading: "Il TER spiegato bene",
        body: "Il TER è una percentuale annua che rappresenta il costo totale di gestione del fondo. Include lo stipendio dei gestori, la custodia dei titoli, le tasse operative, e altre spese interne. Un ETF con TER dello 0.20% ti costa €20 all'anno per ogni €10.000 investiti. Non paghi una fattura separata: il costo viene detratto direttamente dal NAV dell'ETF, giorno dopo giorno. È invisibile ma reale."
      },
      {
        heading: "Lo spread bid-ask",
        body: "Ogni ETF ha un prezzo di acquisto (ask) leggermente più alto del prezzo di vendita (bid). La differenza si chiama spread ed è un costo reale. Un ETF molto liquido come SWDA ha spread di 0.02-0.05%. Un ETF nicchia può avere 0.3-0.5%. Se compri e vendi 10 volte l'anno uno spread dello 0.3%, paghi 3% di costi occulti. Regola: più grande e liquido è l'ETF (AUM alto, volumi alti), più basso è lo spread."
      },
      {
        heading: "Le commissioni del broker",
        body: "Variano enormemente da broker a broker. Trade Republic: €1 per operazione. Scalable Capital: gratis con il piano PAC, €0.99 senza. Fineco: €2.95 o €9 minimo. Directa: €5. IBKR: €3-5. Attenzione ai broker tradizionali: alcuni applicano €20-30 per operazione o commissioni percentuali che diventano enormi. Se fai PAC mensili, scegli un broker con commissioni basse o zero sui PAC."
      },
      {
        heading: "L'effetto cumulativo nel lungo periodo",
        body: "Qui arriva il punto doloroso. Immagina di investire €500/mese per 30 anni con rendimento lordo del 7% annuo. Con TER 0.20% ottieni circa €573.000. Con TER 1.5% (tipico fondo attivo) ottieni circa €433.000. Differenza: €140.000. Hai lavorato 30 anni per regalare un appartamento al gestore del fondo. Ecco perché gli ETF low-cost hanno rivoluzionato gli investimenti retail: quel mezzo punto percentuale di differenza, composto per decenni, diventa gigantesco."
      },
      {
        heading: "Costi nascosti a cui fare attenzione",
        body: "Oltre ai tre costi principali, esistono costi invisibili. Il tracking error: quando l'ETF si discosta dall'indice, di solito verso il basso, e perdi performance. La tassa sui dividendi: se possiedi un ETF USA domiciliato in USA paghi il 30% di withholding, se domiciliato in Irlanda solo il 15%. La valuta: un ETF quotato in USD compra tu in EUR, paghi la conversione (tipicamente 0.05-0.25%). Queste piccole cose sommate possono aggiungere altri 0.3-0.5% l'anno."
      }
    ],
    keyPoints: [
      "Un ETF ha tre costi: TER (annuale), spread (ad ogni scambio), commissioni broker (ad ogni operazione)",
      "Il TER è il costo più importante perché dura per tutta la durata dell'investimento",
      "Lo spread è più basso per ETF grandi e liquidi (AUM sopra €1 miliardo)",
      "Scegli broker con commissioni basse sui PAC (Trade Republic, Scalable, Fineco Plus)",
      "Su 30 anni, 1% di costi extra può costarti oltre €100.000 di patrimonio finale",
      "Preferisci ETF domiciliati in Irlanda o Lussemburgo per minore prelievo fiscale sui dividendi USA"
    ],
    commonMistakes: [
      "Guardare solo il TER ignorando spread, commissioni e costi valutari",
      "Scegliere broker con commissioni elevate \"perché è la banca\" pagando 10x il necessario",
      "Sottovalutare l'impatto cumulativo dei costi: l'1% extra all'anno sembra poco, non lo è",
      "Fare troppi scambi: ogni operazione paga spread + commissione",
      "Comprare ETF piccoli (AUM < €100M) con spread elevati per risparmiare sul TER"
    ],
    example: {
      title: "Esempio: confronto brutale in 30 anni",
      body: "Giulia investe €500/mese per 30 anni in un ETF MSCI World (SWDA) con broker Trade Republic: TER 0.20%, spread 0.03%, commissione €1. Costo totale annuo stimato: ~0.28%. A fine periodo, con un rendimento lordo medio del 7%, ottiene circa €570.000. Marco invece sceglie lo stesso investimento ma su un fondo gestito attivamente della sua banca: TER 1.8%, commissioni di ingresso 2%, commissioni di mantenimento 1%. Costi totali: ~2.5% annuo. A fine periodo ottiene circa €380.000. Giulia si porta a casa €190.000 in più. La differenza non è una sua bravura, è la differenza tra pagare lo 0.28% e il 2.5% all'anno."
    },
    quiz: [
      {
        question: "Cosa significa TER in un ETF?",
        options: [
          "Tasso Effettivo di Rendimento",
          "Total Expense Ratio — il costo annuo totale di gestione",
          "Tax Exemption Rate — esenzione fiscale",
          "Time Elapsed Return — rendimento temporale"
        ],
        correct: 1,
        explanation: "TER sta per Total Expense Ratio. È il costo annuale di gestione del fondo, espresso come percentuale. Viene detratto silenziosamente dal valore dell'ETF."
      },
      {
        question: "Investendo €500/mese per 30 anni al 7% lordo, quanto costa in patrimonio finale un TER dell'1.5% rispetto allo 0.20%?",
        options: [
          "Circa €5.000 in meno",
          "Circa €20.000 in meno",
          "Circa €140.000 in meno",
          "Circa €500.000 in meno"
        ],
        correct: 2,
        explanation: "L'1.3% di costi extra composti per 30 anni su un PAC di €500/mese causa circa €140.000 di differenza nel patrimonio finale. È l'effetto silenzioso ma devastante dei costi composti."
      },
      {
        question: "Cos'è lo spread bid-ask in un ETF?",
        options: [
          "Una tassa pagata al governo",
          "La differenza tra prezzo di acquisto e vendita sul mercato",
          "Il dividendo distribuito",
          "Il rendimento annuo dell'ETF"
        ],
        correct: 1,
        explanation: "Lo spread bid-ask è la differenza tra il prezzo al quale puoi comprare un ETF (ask) e quello al quale puoi venderlo (bid). È un costo occulto che paghi a ogni transazione. Gli ETF liquidi hanno spread bassi (~0.03%); quelli illiquidi possono arrivare a 0.5% o più."
      },
      {
        question: "Perché gli ETF domiciliati in Irlanda sono spesso preferiti per esposizione USA?",
        options: [
          "Hanno TER più bassi per legge",
          "Hanno ritenute fiscali più favorevoli sui dividendi USA (15% vs 30%)",
          "Sono garantiti dal governo irlandese",
          "Pagano dividendi più alti"
        ],
        correct: 1,
        explanation: "Un trattato fiscale tra Irlanda e USA riduce la ritenuta sui dividendi dal 30% al 15%, migliorando il rendimento netto. Per questo motivo la maggior parte degli ETF UCITS su azioni USA è domiciliata in Irlanda."
      }
    ]
  },

  'pf-5': {
    intro: "È la domanda più comune che ricevo: \"ho €20.000 da parte, li investo tutti subito o un po' alla volta?\". PIC (Piano Investimento di Capitale) significa investire tutto in un colpo solo. PAC (Piano di Accumulo di Capitale) significa diluire l'investimento su mesi o anni. La risposta matematica è sorprendente e va contro l'intuito della maggior parte delle persone. Vediamo i numeri veri, non le opinioni.",
    sections: [
      {
        heading: "La verità statistica: il PIC vince quasi sempre",
        body: "Uno studio Vanguard del 2012 ha analizzato 1.021 periodi di 10 anni su mercati USA, UK e Australia dal 1926. Risultato: il PIC ha battuto il PAC nel 66% dei casi con un vantaggio medio del 2.3% annuo. Il motivo è semplice: i mercati tendono a salire più spesso di quanto scendano, quindi rimanere fuori dal mercato aspettando di investire gradualmente significa perdere rendimento. In media. Ma come sempre in finanza, la media nasconde storie diverse."
      },
      {
        heading: "Esempio concreto: €24.000 da investire",
        body: "Scenario: hai €24.000 e un orizzonte di 10 anni. Option A (PIC): investi tutto oggi su ETF MSCI World. Option B (PAC 12 mesi): €2.000 al mese per un anno, poi lasci investito per 9 anni. Se i mercati salgono del 7% medio annuo senza drammi, il PIC finisce a circa €47.200, il PAC finisce a circa €44.500. PIC vince di €2.700. Se però nel primo anno c'è un crollo del -30% (tipo 2008), il PIC scende a €16.800 e ci mette più tempo a recuperare. Il PAC entra gradualmente e soffre meno."
      },
      {
        heading: "Quando il PAC vince davvero",
        body: "Il PAC batte il PIC solo quando il mercato scende per un periodo prolungato all'inizio. In quei casi il PAC compra quote a prezzi sempre più bassi (è il famoso 'dollar cost averaging'). Esempio reale: se avessi iniziato un PIC a gennaio 2000 sull'S&P 500, avresti dovuto aspettare 13 anni per tornare in positivo (dotcom + 2008). Un PAC partito nello stesso momento sarebbe tornato in positivo in 5-6 anni. Ma queste sono eccezioni storiche, non la norma."
      },
      {
        heading: "PAC continuo: il caso speciale e vincente",
        body: "Attenzione a non confondere due cose diverse. Il 'PAC contro PIC' riguarda come investire un capitale già esistente. Ma la maggior parte delle persone non ha €20.000 da parte: accumula stipendi ogni mese. In quel caso non c'è scelta: investi quello che accantoni ogni mese, e quello è automaticamente un PAC. E il PAC continuo su stipendio è quasi sempre la strategia migliore perché aggira completamente il problema del market timing. Non stai scegliendo: stai facendo disciplinatamente la cosa giusta ogni mese."
      },
      {
        heading: "Il fattore psicologico conta più della matematica",
        body: "Qui c'è il punto che gli studi accademici trascurano. Mettiamo che investi €50.000 di PIC, il lunedì successivo il mercato crolla del 15%. Perdi €7.500 in un giorno. Quanti di noi reggono psicologicamente senza vendere in panico? Pochi. Il PAC, pur inferiore in media, ha un vantaggio enorme: riduce il rimpianto. Se il mercato crolla, non ci hai messo tutto. Vanguard stesso ha scritto che 'se un PAC diluito ti aiuta a dormire la notte e a non vendere in panico, il PAC vale ogni centesimo di rendimento perso'."
      },
      {
        heading: "La regola pratica onesta",
        body: "Se hai lump sum da investire e orizzonte lungo (15+ anni): preferisci PIC o PAC breve (3-6 mesi max). Se hai orizzonte corto (sotto 7 anni) o sei molto avverso al rischio: PAC di 12-24 mesi riduce la volatilità emotiva. Se accumuli dallo stipendio: automaticamente PAC continuo, senza pensare. Non esiste una strategia giusta per tutti: esiste la strategia che riesci a SEGUIRE senza abbandonare. Investire male con disciplina batte investire perfettamente per 3 mesi e poi mollare."
      }
    ],
    keyPoints: [
      "Il PIC (lump sum) batte il PAC nel 66% dei periodi storici con vantaggio medio 2.3% annuo",
      "Il PAC vince solo quando il mercato scende a lungo all'inizio",
      "Per capitale esistente: PIC o PAC breve (3-6 mesi) sono ottimali",
      "Per stipendi: PAC continuo è naturale e efficiente, non c'è scelta",
      "Il vantaggio del PAC è psicologico: riduce il rimpianto e il rischio di vendere in panico",
      "La strategia migliore è quella che riesci a mantenere nel tempo senza mollare"
    ],
    commonMistakes: [
      "Diluire il PAC su periodi troppo lunghi (24+ mesi) per 'stare sicuri', perdendo rendimento",
      "Fare PIC con soldi che potrebbero servire nel breve termine",
      "Confondere PAC su stipendio con PAC su lump sum (sono situazioni diverse)",
      "Aspettare 'il momento giusto' per il PIC, restando anni fuori dal mercato",
      "Interrompere il PAC quando il mercato scende (proprio quando dovresti continuare)"
    ],
    example: {
      title: "Esempio: Paolo, eredità di €30.000 a 35 anni",
      body: "Paolo eredita €30.000 e vuole investirli in ETF con orizzonte 30 anni. Strada A (PIC): investe tutto subito su SWDA. Strada B (PAC 6 mesi): €5.000/mese per 6 mesi. Strada C (PAC 24 mesi, il 'vado cauto'): €1.250/mese. Ipotesi rendimento medio 7% annuo, con uno scenario 'normale' (nessun crollo immediato). Dopo 30 anni: A → circa €228.000, B → circa €224.000, C → circa €217.000. Differenza tra A e C: €11.000 persi per 'andare cauti'. Se invece ci fosse stato un -30% al primo anno: A sarebbe a €160.000, C a €200.000. La differenza esiste ma non è devastante in nessuno dei due scenari. Morale: diluire oltre i 6-12 mesi non serve se il tuo obiettivo è davvero lungo termine."
    },
    quiz: [
      {
        question: "Secondo lo studio Vanguard, il PIC batte il PAC in circa quale percentuale dei casi storici?",
        options: [
          "Nel 33% dei casi",
          "Nel 50% dei casi",
          "Nel 66% dei casi",
          "Nel 90% dei casi"
        ],
        correct: 2,
        explanation: "Lo studio Vanguard del 2012 ha analizzato oltre 1.000 periodi di 10 anni su 3 mercati diversi. Il PIC ha battuto il PAC nel 66% dei casi con un vantaggio medio del 2.3% annuo, perché i mercati tendono a salire più spesso di quanto scendano."
      },
      {
        question: "Quando il PAC batte il PIC?",
        options: [
          "Quasi sempre, nel lungo periodo",
          "Solo quando il mercato scende a lungo all'inizio del periodo",
          "Quando si investono meno di €10.000",
          "Quando si ha orizzonte lungo"
        ],
        correct: 1,
        explanation: "Il PAC batte il PIC solo in scenari di discesa prolungata iniziale (tipo 2000-2002 o 2008). In quei casi il PAC compra a prezzi sempre più bassi. Storicamente sono eccezioni, non la norma."
      },
      {
        question: "Se accumuli risparmi dallo stipendio ogni mese, stai facendo:",
        options: [
          "Un PIC continuo",
          "Un PAC continuo, che è la strategia naturale per questa situazione",
          "Market timing speculativo",
          "Un errore: dovresti aspettare di avere un lump sum"
        ],
        correct: 1,
        explanation: "Investire ogni mese quello che accantoni dallo stipendio è un PAC continuo. Non c'è scelta tra PIC e PAC perché non hai il capitale tutto insieme. È la forma più naturale ed efficiente per la maggior parte dei lavoratori."
      },
      {
        question: "Qual è il principale vantaggio del PAC rispetto al PIC?",
        options: [
          "Rende sempre di più in termini matematici",
          "Azzera il rischio di perdite",
          "Riduce lo stress psicologico e il rischio di vendere in panico",
          "È più economico in termini di commissioni"
        ],
        correct: 2,
        explanation: "Il vantaggio reale del PAC su lump sum non è matematico (in media perde il 2.3%) ma psicologico. Diluire l'ingresso riduce il rimpianto se il mercato crolla subito, e aumenta la probabilità che l'investitore mantenga la strategia nel tempo senza cedere al panico."
      }
    ]
  },

  'etf-4': {
    intro: "Esistono due versioni dello stesso ETF: ad Accumulazione (ACC) e a Distribuzione (DIST). Hanno gli stessi titoli dentro, gli stessi costi, lo stesso gestore. Cambia una sola cosa: che succede quando le aziende dentro il fondo pagano dividendi. Sembra un dettaglio minore, ma in Italia questa scelta può costarti migliaia di euro in tasse nel lungo periodo. Qui ti spiego la differenza e come scegliere.",
    sections: [
      {
        heading: "Cosa succede ai dividendi",
        body: "Le aziende quotate periodicamente distribuiscono parte degli utili ai propri azionisti sotto forma di dividendi. Un ETF che contiene 1.500 aziende riceve continuamente questi dividendi. A questo punto ci sono due strade. Un ETF a Distribuzione (DIST) ti gira i dividendi direttamente, di solito 1-4 volte l'anno: li vedi arrivare sul conto titoli. Un ETF ad Accumulazione (ACC) reinveste automaticamente i dividendi comprando altri titoli dell'indice, senza passarteli. Il tuo investimento cresce automaticamente senza operazioni."
      },
      {
        heading: "Come riconoscerli",
        body: "I nomi degli ETF sono un incubo, ma c'è un trucco. Gli ACC hanno spesso 'Acc' o '(Acc)' nel nome: 'iShares Core MSCI World UCITS ETF USD (Acc)'. I DIST hanno 'Dist' o nessun suffisso specifico. Attenzione al ticker: SWDA è ACC, mentre IWDA (stesso ETF) è DIST. Stesso fondo, versioni diverse. Sempre controllare il KID prima di comprare. Se su justETF vedi il campo 'Distribution policy': 'Accumulating' = ACC, 'Distributing' = DIST."
      },
      {
        heading: "La fiscalità italiana è il punto centrale",
        body: "In Italia paghi il 26% di tassazione sui rendimenti da capitale (ETF azionari non governativi). Con un ETF a distribuzione, OGNI volta che ricevi un dividendo paghi subito il 26% sopra. €100 di dividendo = €26 di tasse pagate immediatamente, €74 netti sul conto. Con un ETF ad accumulazione, il dividendo viene reinvestito lordo dentro il fondo: non paghi tasse ora. Pagherai il 26% solo quando venderai le quote, molti anni dopo. Nel frattempo quei €26 rimangono dentro a lavorare per te."
      },
      {
        heading: "L'effetto della capitalizzazione composta",
        body: "Esempio concreto: €50.000 investiti per 30 anni, rendimento medio 7% annuo (di cui 2% dividendi). Versione DIST: ogni anno paghi 26% sui dividendi ricevuti, quindi reinvesti solo il 74% netto. Patrimonio finale stimato: circa €340.000. Versione ACC: i dividendi si reinvestono integralmente lordo, le tasse le paghi tutte alla fine. Patrimonio finale stimato: circa €380.000. Differenza: €40.000 a favore dell'ACC, cioè il 12% in più. È l'effetto di 30 anni di tasse differite, che nel frattempo crescono a interesse composto."
      },
      {
        heading: "Quando preferire Distribuzione",
        body: "Nonostante il vantaggio fiscale, il DIST ha senso in due casi. Primo: vivi di rendita (FIRE, pensione integrativa), hai bisogno di cash flow regolare dai tuoi investimenti senza dover vendere quote. Secondo: motivazione psicologica, vedere arrivare i dividendi sul conto ti aiuta a restare disciplinato e a non mollare negli anni di crollo. In fase di accumulo pura, invece, l'ACC è quasi sempre la scelta razionale. La regola pratica: se hai meno di 50 anni e stai accumulando → ACC. Se hai passato la soglia e inizi a vivere delle rendite → valuta DIST."
      },
      {
        heading: "Un mito da sfatare",
        body: "Spesso si sente dire 'i dividendi sono una fonte di reddito passivo'. È vero solo in senso tecnico. Finanziariamente, ricevere un dividendo è equivalente a vendere quote equivalenti dell'ETF ad accumulazione. Il valore del fondo scende dell'importo del dividendo (stacco). Quindi la scelta ACC vs DIST non è 'rendita vs crescita', è 'pagare le tasse ora vs dopo'. Capito questo, il vantaggio dell'accumulazione in fase di crescita è evidente."
      }
    ],
    keyPoints: [
      "ACC reinveste automaticamente i dividendi, DIST te li gira sul conto",
      "In Italia paghi 26% sui dividendi DIST subito, sulle plusvalenze ACC solo alla vendita",
      "Su 30 anni, un ACC può generare ~10-15% di patrimonio finale in più grazie alla tassazione differita",
      "Riconosci ACC da 'Acc' nel nome; attenzione al ticker (SWDA=ACC, IWDA=DIST)",
      "In fase di accumulo: preferisci ACC. In fase di decumulo/rendita: valuta DIST",
      "I dividendi non sono 'reddito extra': lo stacco riduce il valore del fondo di pari importo"
    ],
    commonMistakes: [
      "Scegliere DIST perché 'mi piace vedere i dividendi' senza calcolare il costo fiscale",
      "Pensare che i dividendi siano 'regalo' invece di ridistribuzione del valore del fondo",
      "Confondere ACC e DIST dello stesso ETF (stesso indice, fiscalità diversa)",
      "Usare DIST in fase di accumulo per PAC lunghi: è la scelta meno efficiente fiscalmente",
      "Ignorare che i dividendi incassati vanno dichiarati anche se l'ETF è sul broker italiano"
    ],
    example: {
      title: "Esempio: Chiara e Roberto, stesso investimento, 30 anni dopo",
      body: "Chiara e Roberto investono entrambi €500/mese per 30 anni sull'indice MSCI World. Stesso importo, stesso orizzonte, stesso rendimento lordo del 7%. Chiara sceglie SWDA (Acc), Roberto sceglie IWDA (Dist). Entrambi gli ETF replicano lo stesso paniere con lo stesso TER. Dopo 30 anni: Chiara ha circa €576.000 nel suo ETF ACC. Roberto ha circa €512.000 tra ETF DIST + dividendi netti incassati e (speriamo) reinvestiti. Differenza: €64.000 a favore di Chiara, grazie alla tassazione differita e all'effetto composto. Roberto non ha sbagliato strategia, ha solo pagato prima le tasse — che matematicamente è sempre peggio."
    },
    quiz: [
      {
        question: "Qual è la differenza principale tra un ETF ACC e uno DIST?",
        options: [
          "L'ACC investe in azioni, il DIST in obbligazioni",
          "L'ACC reinveste i dividendi automaticamente, il DIST li versa sul conto",
          "L'ACC è più costoso in termini di TER",
          "L'ACC è disponibile solo in USA"
        ],
        correct: 1,
        explanation: "L'unica differenza tra ETF ad accumulazione e a distribuzione è cosa succede ai dividendi che le aziende sottostanti pagano: reinvestiti automaticamente (ACC) o versati sul conto (DIST)."
      },
      {
        question: "Perché in Italia un ETF ACC è spesso più efficiente fiscalmente di uno DIST?",
        options: [
          "Non paga mai tasse",
          "Paga meno del 26% di tassazione",
          "Differisce la tassazione alla vendita, lasciando i dividendi lordi a comporre",
          "Gode di un trattamento fiscale agevolato per legge"
        ],
        correct: 2,
        explanation: "In Italia si paga 26% sui rendimenti. Con un DIST paghi ogni volta che ricevi un dividendo, con un ACC paghi solo quando vendi. I soldi delle tasse non ancora pagate nel frattempo continuano a lavorare a interesse composto."
      },
      {
        question: "Come riconoscere visivamente un ETF ad accumulazione dal nome?",
        options: [
          "Ha sempre 'ACC' o 'Acc' nel nome o descrizione",
          "Costa sempre di più",
          "È indicato dal prefisso 'X-'",
          "Ha sempre un ticker che inizia per A"
        ],
        correct: 0,
        explanation: "Gli ETF ACC hanno solitamente 'Acc', 'Accumulating' o '(Acc)' nel nome completo. Il ticker può essere fuorviante: SWDA e IWDA sono lo stesso ETF MSCI World di iShares, ma SWDA è ACC e IWDA è DIST."
      },
      {
        question: "Quando ha più senso scegliere un ETF DIST?",
        options: [
          "Sempre, perché genera reddito aggiuntivo",
          "In fase di accumulo, per un PAC lungo",
          "In fase di decumulo/rendita, quando serve cash flow regolare",
          "Mai: è sempre meno efficiente"
        ],
        correct: 2,
        explanation: "In fase di accumulo (PAC, orizzonte lungo) l'ACC è quasi sempre più efficiente. Il DIST ha senso quando vivi di rendita (FIRE, pensione) e hai bisogno di cash flow regolare senza dover vendere quote. Anche allora è più un'ottimizzazione comportamentale che fiscale."
      }
    ]
  },

  'etf-2': {
    intro: "Un ETF promette di replicare un indice: se compri un ETF MSCI World, ti aspetti che segua l'andamento del MSCI World. Ma come ci riesce concretamente? Esistono due metodi tecnici diversi, e la differenza non è accademica: tocca il rischio, la fiscalità e la tua tranquillità. Il 95% degli ETF UCITS usa la replica fisica, ma quel 5% sintetico vale la pena conoscerlo per non prendere sorprese.",
    sections: [
      {
        heading: "Replica fisica: compra davvero le azioni",
        body: "Un ETF a replica fisica fa esattamente quello che ti aspetti: prende i tuoi soldi e compra le azioni che compongono l'indice. Se l'indice ha Apple al 4.8%, l'ETF mette il 4.8% del capitale in azioni Apple vere. Se poi Apple sale del 10%, anche la tua quota sale del 10%. È trasparente, diretto, intuitivo. Il gestore possiede i titoli per conto tuo e te ne consegna una frazione tramite le quote dell'ETF."
      },
      {
        heading: "Replica fisica completa vs campionamento",
        body: "Dentro la replica fisica ci sono due sottomodalità. La replica completa (full replication) compra tutti i titoli dell'indice nelle esatte proporzioni: funziona bene con indici 'piccoli' come l'S&P 500 (500 titoli). Il campionamento (sampling) compra solo un sottoinsieme rappresentativo: si usa per indici enormi come l'MSCI ACWI IMI (9.000+ titoli) dove comprare tutto sarebbe costoso e inefficiente. Il campionamento introduce un piccolo tracking error, cioè uno scostamento dall'indice. Normalmente è trascurabile."
      },
      {
        heading: "Replica sintetica: uno swap con una banca",
        body: "Un ETF sintetico non possiede le azioni dell'indice. Compra un paniere qualunque di titoli (chiamato 'collaterale') e stipula uno swap con una banca di investimento. Lo swap è un contratto: la banca promette di pagare all'ETF il rendimento esatto dell'indice, in cambio del rendimento del paniere + una piccola commissione. Il risultato per te è lo stesso: il tuo ETF segue l'indice. Ma c'è un intermediario in mezzo: la banca controparte."
      },
      {
        heading: "I vantaggi del sintetico",
        body: "Perché mai usare il sintetico se è più complesso? Due motivi. Primo: può replicare indici difficili da comprare direttamente (Cina, India con restrizioni agli stranieri). Secondo e più importante: per azioni USA, gli ETF sintetici aggirano la ritenuta del 15-30% sui dividendi, perché tecnicamente i dividendi non vengono mai pagati all'ETF. Un ETF sintetico S&P 500 può avere un tracking error positivo (rende più dell'indice netto tasse), mentre un fisico paga sempre almeno il 15% di ritenuta."
      },
      {
        heading: "Il rischio controparte",
        body: "Il lato oscuro del sintetico è il rischio controparte. Se la banca che ti ha venduto lo swap fallisce, teoricamente potresti perdere parte del valore. In pratica, la normativa UCITS limita l'esposizione alla controparte al 10% del patrimonio dell'ETF: la parte restante è comunque nel collaterale. Inoltre i gestori seri (iShares, Xtrackers, Invesco) hanno overcollateralization: il collaterale vale più dello swap. È un rischio controllato ma esiste. I crolli del 2008 non hanno causato perdite agli investitori di ETF sintetici, però la paura è rimasta."
      },
      {
        heading: "Come scegliere concretamente",
        body: "Regola pratica per il 99% dei casi. Per esposizione azionaria mondiale, Europa, emergenti generici: scegli fisico. È più trasparente e serve bene lo scopo. Per S&P 500 o singoli settori USA: valuta sintetico se il vantaggio fiscale è rilevante per te. Esempio: Invesco S&P 500 UCITS ETF (SPXS) è sintetico e ha storicamente battuto l'indice fisico di ~0.3-0.4% annui grazie al trattamento dividendi. Su 30 anni sono €30.000+ su un investimento di €100.000. Non è poco, ma va pesato contro il rischio controparte extra."
      }
    ],
    keyPoints: [
      "Replica fisica: l'ETF possiede davvero i titoli dell'indice. Più trasparente.",
      "Replica sintetica: l'ETF usa uno swap con una banca per ottenere il rendimento dell'indice",
      "Il 95% degli ETF UCITS europei è fisico; i sintetici sono minoranza specializzata",
      "Sintetico può avere vantaggi fiscali sui dividendi USA (0% vs 15% di ritenuta)",
      "Il rischio controparte del sintetico è limitato al 10% per normativa UCITS",
      "Regola pratica: fisico per azionario globale/Europa, sintetico valutabile solo per USA puro"
    ],
    commonMistakes: [
      "Pensare che 'sintetico = rischioso': con gestori seri e overcollateralization è sicuro",
      "Ignorare il vantaggio fiscale del sintetico per ETF S&P 500 nel lungo periodo",
      "Comprare ETF sintetici di gestori poco conosciuti senza verificare collaterale e controparti",
      "Scegliere sintetico senza leggere il KID per capire lo swap e le controparti",
      "Confondere 'campionamento' (fisico parziale) con 'sintetico': sono cose diverse"
    ],
    example: {
      title: "Esempio: CSSPX (fisico) vs SPXS (sintetico)",
      body: "Due ETF S&P 500 UCITS quotati a Milano. CSSPX di iShares è fisico: possiede direttamente le 500 azioni, TER 0.07%, paga 15% di ritenuta sui dividendi USA. SPXS di Invesco è sintetico: usa uno swap, TER 0.05%, aggira la ritenuta sui dividendi USA tramite struttura swap. Negli ultimi 5 anni SPXS ha battuto CSSPX di circa 0.40% annui in media. Su €20.000 investiti per 20 anni con 7% lordo: CSSPX produce circa €77.400, SPXS circa €83.500. Differenza di €6.100 a favore del sintetico. Il rischio controparte Invesco è gestito con overcollateralization al 105% e multiple banche counterparty. Decidi tu quanto pesa quel rischio residuo rispetto al vantaggio fiscale concreto."
    },
    quiz: [
      {
        question: "Qual è la differenza principale tra replica fisica e sintetica?",
        options: [
          "Il fisico rende sempre di più",
          "Il fisico possiede i titoli dell'indice, il sintetico usa uno swap con una banca",
          "Il sintetico ha TER più alti",
          "Il fisico è solo per azioni europee"
        ],
        correct: 1,
        explanation: "La distinzione chiave è tecnica: il fisico compra direttamente le azioni dell'indice, il sintetico ottiene il rendimento tramite un contratto derivato (swap) con una banca di investimento."
      },
      {
        question: "Qual è il principale vantaggio fiscale degli ETF sintetici su azioni USA?",
        options: [
          "Azzerano le tasse italiane al 26%",
          "Aggirano la ritenuta del 15% sui dividendi USA perché tecnicamente non ricevono dividendi",
          "Garantiscono rendimenti più alti per legge",
          "Non esistono vantaggi fiscali"
        ],
        correct: 1,
        explanation: "Un ETF fisico su S&P 500 paga sempre almeno il 15% di ritenuta USA sui dividendi. Un sintetico ottiene il rendimento tramite swap senza mai incassare i dividendi, eliminando quella ritenuta. Può generare 0.2-0.4% di extra-rendimento annuo."
      },
      {
        question: "Qual è il limite massimo di esposizione alla singola controparte per un ETF sintetico UCITS?",
        options: [
          "100%, tutto il patrimonio",
          "50% del patrimonio",
          "10% del patrimonio",
          "Non ci sono limiti"
        ],
        correct: 2,
        explanation: "La normativa UCITS impone che l'esposizione alla singola controparte di uno swap non superi il 10% del patrimonio dell'ETF. Il restante 90% deve essere garantito da collaterale reale, riducendo il rischio controparte."
      },
      {
        question: "Qual è la scelta più sensata per un ETF azionario mondiale (tipo MSCI World)?",
        options: [
          "Sempre sintetico, per il vantaggio fiscale",
          "Fisico: trasparente e adeguato allo scopo per la maggior parte degli investitori",
          "Qualunque dei due, sono identici",
          "Né fisico né sintetico: meglio comprare azioni singole"
        ],
        correct: 1,
        explanation: "Per esposizione azionaria diversificata (mondiale, Europa, emergenti generici) la replica fisica è la scelta standard: più trasparente, senza rischio controparte, e il vantaggio fiscale del sintetico è limitato fuori dagli USA. Il sintetico va valutato solo per ETF puri sugli USA dove il guadagno fiscale conta."
      }
    ]
  },

  'pf-3': {
    intro: "Quando qualcuno ti dice 'un investimento è rischioso' senza spiegare cosa intende, non ti sta dando informazioni utili. Il rischio in finanza ha definizioni precise, misurabili, e due sono quelle che davvero contano per te come investitore privato: volatilità e drawdown. Capirle bene ti salva dalle decisioni peggiori della tua vita finanziaria — quelle prese in preda al panico.",
    sections: [
      {
        heading: "Volatilità: quanto oscilla il valore",
        body: "La volatilità misura quanto il valore di un investimento si muove attorno alla media, in alto e in basso. Tecnicamente è la deviazione standard dei rendimenti. Tradotto: un portafoglio con volatilità annua del 15% significa che il rendimento dell'anno cade circa nel 68% dei casi entro ±15% dalla media. Il MSCI World ha volatilità storica del 15-17%. Un ETF obbligazionario del 4-6%. Un portafoglio 60/40 (azioni/bond) del 9-11%. La volatilità non dice se perdi o guadagni, dice quanto ballonzola il tuo patrimonio."
      },
      {
        heading: "Drawdown: quanto puoi perdere nel peggiore dei casi",
        body: "Il drawdown è la caduta massima dal picco. Se il tuo portafoglio raggiunge €100.000 a gennaio e scende a €70.000 a ottobre, hai un drawdown del -30%. Questo è il numero che ti dice davvero cosa puoi aspettarti nei momenti brutti. Il MSCI World ha avuto drawdown storici: -54% nel 2008, -34% nel 2020 (veloce), -25% nel 2022. Se hai €100.000 investiti e il tuo portafoglio ha drawdown atteso del 50%, devi essere pronto a vedere €50.000 'sparire' sullo schermo senza vendere in panico."
      },
      {
        heading: "Perché il drawdown è più importante della volatilità",
        body: "La volatilità media le oscillazioni positive e negative. Ma a te non importa quando il mercato sale oltre la media (evviva!). Ti importa quando scende tanto e per quanto tempo resta giù. È il drawdown che distrugge gli investitori, non la volatilità tecnica. Molti portafogli con volatilità simile hanno drawdown molto diversi: un 60/40 classico e un portafoglio 100% azionario possono avere volatilità non troppo distanti, ma il 100% azionario può arrivare a -55%, il 60/40 raramente supera -30%."
      },
      {
        heading: "Il tempo di recupero",
        body: "Un dato che nessuno ti mostra ma che dovrebbe. Quanto tempo ci vuole per tornare al valore di partenza dopo un drawdown? L'S&P 500 ha impiegato 5 anni per recuperare dal 2000-2002, 5 anni per il 2008, solo 5 mesi per il 2020, meno di 2 anni per il 2022. Il drawdown peggiore della storia recente: il Nikkei giapponese crollato nel 1989 ha impiegato oltre 30 anni per tornare ai massimi. Non è un rischio teorico, è successo davvero a milioni di investitori giapponesi. Diversificare globalmente protegge anche da questi scenari."
      },
      {
        heading: "La regola pratica: dormire la notte",
        body: "Ecco la domanda che devi farti prima di costruire il portafoglio: 'Se domani il mio patrimonio di €50.000 scende a €25.000 entro 18 mesi, riesco a non vendere, continuare il PAC, e aspettare?'. Se la risposta è sì, puoi permetterti un portafoglio azionario aggressivo. Se la risposta è no, riduci l'azionario o aumenta i bond fino a un livello di drawdown atteso che sai di poter sopportare emotivamente. La regola è: pianifica per il peggio che puoi accettare, non per il rendimento che vuoi ottenere."
      },
      {
        heading: "Drawdown e orizzonte temporale",
        body: "Ecco perché l'orizzonte conta così tanto. Con 30 anni davanti, un drawdown del -50% è doloroso ma recuperabile: i mercati azionari globali sono sempre tornati ai massimi, nel tempo. Con 3 anni davanti, lo stesso drawdown è un disastro: non hai tempo di aspettare la ripresa. Questo è il motivo numero uno per cui il mix azioni/bond cambia con l'età: più ti avvicini al momento in cui userai i soldi, meno drawdown puoi permetterti. Un 30enne può vivere con drawdown -40%. Un 60enne vicino alla pensione non dovrebbe sopportare oltre -15/-20%."
      }
    ],
    keyPoints: [
      "Volatilità: quanto oscilla il valore, misurata come deviazione standard dei rendimenti",
      "Drawdown: la caduta massima dal picco precedente, il numero che davvero conta",
      "Il drawdown uccide gli investitori perché causa vendite in panico, non la volatilità tecnica",
      "Il tempo di recupero varia: dai 5 mesi (2020) ai 30+ anni (Nikkei 1989)",
      "Costruisci il portafoglio per il drawdown massimo che puoi sopportare emotivamente",
      "Con orizzonti lunghi puoi tollerare drawdown maggiori; avvicinandoti all'obiettivo, riducili"
    ],
    commonMistakes: [
      "Guardare solo al rendimento atteso ignorando il drawdown storico",
      "Sopravvalutare la propria capacità di sopportare perdite: 'Io resto calmo' è facile a dirsi in tempi buoni",
      "Concentrarsi sulla volatilità (numero medio) invece del drawdown (numero concreto)",
      "Ignorare il tempo di recupero: non basta che il mercato 'prima o poi torni', serve che torni in tempo utile",
      "Non ridurre il rischio avvicinandosi all'uso dei soldi (glidepath)"
    ],
    example: {
      title: "Esempio: il test della verità per Francesca",
      body: "Francesca ha 40 anni e €80.000 investiti in un portafoglio 100% azionario mondiale. Volatilità storica: ~16%. Drawdown atteso in scenari di crisi: -40/-55%. Tradotto in soldi: in un 2008 bis, il suo portafoglio può scendere a €36.000 in 12-18 mesi. E potrebbe restare sotto €60.000 per 4-5 anni prima di recuperare. Francesca si chiede: 'Se vedo €44.000 scomparire e restare scomparsi per anni, continuo a fare PAC ogni mese o mollo tutto?'. Se la risposta onesta è 'mollo', il suo portafoglio 100% azionario è sbagliato per lei anche se matematicamente ottimale. Meglio un 70/30 con drawdown massimo -30% che può sopportare, invece di un 100% azionario che la fa vendere al minimo. La strategia giusta è quella che riesci a mantenere."
    },
    quiz: [
      {
        question: "Cos'è il drawdown di un portafoglio?",
        options: [
          "Il rendimento annuo atteso",
          "La caduta massima dal picco precedente",
          "La tassa sui guadagni",
          "La volatilità dei rendimenti"
        ],
        correct: 1,
        explanation: "Il drawdown è la perdita massima misurata dal picco precedente al minimo successivo. Se il portafoglio raggiunge €100k e poi scende a €70k prima di risalire, il drawdown è -30%."
      },
      {
        question: "Qual è il drawdown storico tipico di un portafoglio 100% azionario mondiale nei peggiori scenari?",
        options: [
          "Intorno al -10%",
          "Intorno al -20%",
          "Tra -40% e -55%",
          "Oltre -80%"
        ],
        correct: 2,
        explanation: "L'MSCI World ha avuto drawdown storici intorno al -55% (2008) e -35% (2020). Per un portafoglio 100% azionario bisogna essere preparati a perdite massime tra il -40% e -55% nei peggiori scenari, che possono durare 2-5 anni."
      },
      {
        question: "Perché il drawdown è più importante della volatilità per un investitore?",
        options: [
          "Perché è più facile da calcolare",
          "Perché mostra concretamente quanto il patrimonio può scendere nei momenti brutti, quando si rischia di vendere in panico",
          "Perché la volatilità non esiste davvero",
          "Perché include i dividendi"
        ],
        correct: 1,
        explanation: "La volatilità è un numero statistico medio. Il drawdown è quanto perdi concretamente nel peggiore dei casi. È questo che fa vendere in panico gli investitori, e quindi questo che devi pianificare di poter sopportare."
      },
      {
        question: "Come dovrebbe cambiare il drawdown accettabile man mano che ci si avvicina all'obiettivo finanziario?",
        options: [
          "Dovrebbe aumentare per recuperare i rendimenti persi",
          "Dovrebbe restare costante durante tutta la vita",
          "Dovrebbe ridursi: meno tempo = meno tolleranza alle perdite",
          "Non ha alcuna relazione con il tempo"
        ],
        correct: 2,
        explanation: "Quando hai 30 anni davanti puoi sopportare drawdown -40% perché hai tempo di recuperare. Quando ti mancano 3 anni all'obiettivo (pensione, casa), non hai tempo di aspettare la ripresa. Per questo il portafoglio deve diventare più conservativo (più bond, meno azioni) avvicinandosi al momento di usare i soldi. Si chiama glidepath."
      }
    ]
  },

  'pf-4': {
    intro: "Tutti ripetono 'diversifica, diversifica, diversifica', ma pochi spiegano cosa significhi davvero. Diversificare non vuol dire avere tanti ETF: vuol dire avere asset che NON si muovono tutti insieme. Due ETF azionari USA sono la stessa cosa vestita in modo diverso; due asset con bassa correlazione sono vera diversificazione. La differenza tra sembrare diversificato ed esserlo davvero può costarti il 20% del patrimonio nel momento peggiore.",
    sections: [
      {
        heading: "Diversificazione: cosa è e cosa non è",
        body: "Avere 10 ETF che replicano tutti indici azionari USA non è diversificazione, è illusione di diversificazione. Se il mercato USA crolla, crollano tutti e 10 insieme. Vera diversificazione significa possedere asset che tendono a comportarsi in modo diverso nello stesso scenario. Azioni e obbligazioni di qualità, sì. Azioni sviluppate ed emergenti, in parte. Azioni e oro, molto. Azioni tecnologiche e azioni bancarie, poco."
      },
      {
        heading: "La correlazione: il numero che decide tutto",
        body: "La correlazione misura quanto due asset si muovono insieme, su una scala da -1 a +1. Correlazione +1 significa che si muovono identicamente: quando uno sale del 5%, l'altro sale del 5%. Correlazione 0 significa indipendenti: non c'è legame. Correlazione -1 significa opposti: quando uno sale, l'altro scende. Nella realtà le correlazioni sono quasi sempre positive. SWDA e CSSPX hanno correlazione ~0.97 (quasi identici). Azioni e bond governativi hanno correlazione storica 0.1-0.3. Azioni e oro intorno a 0.1."
      },
      {
        heading: "Il miracolo matematico della bassa correlazione",
        body: "Qui arriva la magia. Se combini due asset con correlazione bassa, il risultato ha volatilità inferiore alla media pesata. Esempio: azioni (volatilità 16%) + bond (volatilità 6%), 60/40. Senza considerare la correlazione, ti aspetteresti volatilità di 12%. Ma con correlazione 0.2, la volatilità effettiva è ~10.5%. Hai guadagnato 1.5% di volatilità gratuita solo combinandoli bene. Harry Markowitz ha vinto il Nobel nel 1990 per aver formalizzato questo concetto. È il pasto gratis dell'investitore."
      },
      {
        heading: "Le correlazioni cambiano nei momenti di crisi",
        body: "Attenzione: la correlazione non è costante. Nei momenti normali azioni e bond hanno correlazione negativa (diversificano bene). Nei momenti di stress acuto possono diventare correlazione positiva alta (crollano insieme). È successo nel 2022: sia azioni che bond sono scesi insieme per l'inflazione. Nel 2008 invece i bond sono saliti mentre le azioni crollavano (diversificazione che ha funzionato). Non esiste un'accoppiata magica che funziona sempre. Serve diversificazione multipla: azioni globali + bond + oro + cash."
      },
      {
        heading: "Diversificazione geografica: più complessa di quanto sembri",
        body: "Le correlazioni tra mercati azionari mondiali sono aumentate negli ultimi 30 anni per effetto della globalizzazione. MSCI Europa e MSCI USA: correlazione ~0.80 negli anni 2000, ~0.92 oggi. I mercati sviluppati ormai si muovono quasi insieme. I mercati emergenti hanno correlazione più bassa (~0.70-0.75) con gli sviluppati, quindi danno più diversificazione. Ma anche gli emergenti oggi sono più correlati che 20 anni fa. La diversificazione geografica conta ancora, ma meno di quanto si pensi."
      },
      {
        heading: "Troppi ETF = meno diversificazione?",
        body: "Paradosso: avere 15-20 ETF non ti rende più diversificato. Ti rende più confuso, aumenta i costi di transazione, rende il ribilanciamento un incubo. Un portafoglio di 3-5 ETF ben scelti (es. MSCI World, Emerging Markets, Aggregate Bond, oro) copre il 95% dei benefici di diversificazione. Aggiungere il sesto, il settimo, l'ottavo ETF ti dà rendimenti marginali decrescenti. Semplicità = sostenibilità nel tempo. Un portafoglio complicato non lo ribilanci mai, e un portafoglio che non ribilanci perde i benefici della diversificazione."
      }
    ],
    keyPoints: [
      "Diversificazione vera = possedere asset con bassa correlazione tra loro",
      "Correlazione: +1 si muovono identici, 0 indipendenti, -1 opposti",
      "Combinare asset con bassa correlazione riduce la volatilità più della media pesata",
      "Le correlazioni cambiano nel tempo: nei crash acuti tendono a salire per tutti gli asset rischiosi",
      "La diversificazione geografica conta meno di un tempo per effetto della globalizzazione",
      "3-5 ETF ben scelti diversificano quasi quanto 10-15: meno è meglio"
    ],
    commonMistakes: [
      "Confondere quantità (tanti ETF) con qualità della diversificazione",
      "Avere 5 ETF azionari USA pensando di essere diversificati",
      "Ignorare che le correlazioni cambiano: bond e azioni non diversificano sempre",
      "Aggiungere ETF per ogni moda settoriale (tech, AI, robotics, ESG, dividendi…) senza pensare alla correlazione",
      "Sottovalutare l'oro come diversificatore perché 'non rende niente'"
    ],
    example: {
      title: "Esempio: Paolo rifà il suo portafoglio",
      body: "Paolo ha 8 ETF: SWDA, VWCE, CSSPX, VUSA, VUAA, IWDA, MWRD, SPXP. Li ha accumulati in 5 anni pensando di diversificare. In realtà sono tutti ETF azionari globali o USA con correlazioni tra 0.92 e 0.99: è come avere un solo ETF replicato 8 volte. Nella correzione del 2022 ha perso -22% come qualsiasi altro investitore con un solo ETF azionario globale. Decide di semplificare: tiene solo SWDA (60%), aggiunge EIMI per emergenti (20%), AGGH per bond (15%) e SGLD per oro (5%). Ora ha 4 ETF con correlazioni tra 0.08 e 0.75. Drawdown storico simulato: -25% invece di -35%. Stesso rendimento atteso, meno dolore nei momenti brutti. Questa è vera diversificazione."
    },
    quiz: [
      {
        question: "Cosa significa davvero diversificare un portafoglio?",
        options: [
          "Avere il maggior numero possibile di ETF",
          "Possedere asset che tendono a non muoversi insieme nei momenti critici",
          "Concentrarsi sulle azioni di successo",
          "Comprare solo ETF di grandi emittenti"
        ],
        correct: 1,
        explanation: "Diversificazione vera significa possedere asset con bassa correlazione tra loro. Avere 10 ETF sullo stesso mercato non diversifica perché si muovono insieme. Avere azioni, bond e oro in un unico portafoglio, sì."
      },
      {
        question: "Due ETF con correlazione di +0.95 come si comporteranno l'uno rispetto all'altro?",
        options: [
          "In modo opposto: quando uno sale, l'altro scende",
          "In modo indipendente: non c'è legame",
          "Quasi identicamente: si muovono quasi sempre nella stessa direzione",
          "È impossibile dirlo"
        ],
        correct: 2,
        explanation: "Correlazione +1 significa movimento identico, +0.95 è praticamente lo stesso. Due ETF con +0.95 sono quasi perfetti sostituti e non aggiungono diversificazione l'uno all'altro."
      },
      {
        question: "Qual è il problema principale con le correlazioni nei periodi di crisi?",
        options: [
          "Restano costanti come nei periodi normali",
          "Tendono ad aumentare, facendo crollare insieme asset che normalmente diversificavano",
          "Diventano negative per tutti gli asset",
          "Non hanno effetto sui portafogli"
        ],
        correct: 1,
        explanation: "Durante crisi gravi (2008, 2020, 2022) le correlazioni tra asset rischiosi tendono a salire. Asset che normalmente diversificano possono crollare insieme. Per questo servono più tipi di diversificazione (azioni+bond+oro+cash), non solo una."
      },
      {
        question: "Quanti ETF servono tipicamente per un portafoglio ben diversificato?",
        options: [
          "Almeno 15-20",
          "Esattamente 10",
          "Tipicamente 3-5 ETF ben scelti bastano",
          "Un solo ETF globale è sufficiente"
        ],
        correct: 2,
        explanation: "3-5 ETF ben scelti (per esempio: azionario globale, azionario emergenti, obbligazionario, oro) coprono il 95% dei benefici di diversificazione. Oltre, i rendimenti marginali decrescono e aumenta la complessità di gestione e ribilanciamento. Semplicità = sostenibilità nel tempo."
      }
    ]
  },

  'etf-5': {
    intro: "Prima di acquistare un ETF in Europa, il tuo broker è obbligato per legge a fornirti il KID (Key Information Document). È un PDF di 3 pagine, spesso lo spunti distrattamente senza leggerlo, ma contiene tutte le informazioni essenziali per capire cosa stai comprando. Imparare a leggerlo in 2 minuti ti salva dagli errori più grossolani. In questo capitolo ti mostro i 7 punti del KID che contano davvero, e quelli che puoi saltare.",
    sections: [
      {
        heading: "Cos'è il KID e perché esiste",
        body: "Il KID (Key Information Document) è un documento standardizzato introdotto dalla normativa europea PRIIPs nel 2018. L'obiettivo è permetterti di confrontare prodotti finanziari diversi con le stesse regole: stesso formato, stesse metriche, stesso linguaggio. Ogni ETF UCITS venduto in Europa deve averlo. Lo trovi sul sito del gestore (iShares, Vanguard, Xtrackers) o te lo invia il broker prima dell'acquisto. Massimo 3 pagine, in italiano per gli ETF proposti in Italia."
      },
      {
        heading: "Pagina 1 — Identificazione e obiettivi",
        body: "La prima cosa che leggi è l'identificazione: nome completo, ISIN, gestore, autorità regolatoria. Il nome dice più di quanto pensi: 'iShares Core MSCI World UCITS ETF USD (Acc)' contiene in 10 parole il gestore (iShares), la famiglia (Core = economici), l'indice (MSCI World), la classificazione UCITS, la valuta base (USD), e la politica dividendi (Acc = accumulazione). Subito sotto c'è una sezione 'Obiettivi e politica d'investimento': leggi queste 2-3 righe per sapere cosa replica e come (fisica o sintetica)."
      },
      {
        heading: "L'indicatore di rischio SRI",
        body: "È il numero più importante del KID, spesso ignorato. Su scala da 1 a 7, sintetizza il rischio dell'ETF. 1-2: bond monetario o obbligazioni governative brevi. 3-4: bond misti, obbligazioni lunghe. 5-6: azioni diversificate (MSCI World = 5). 7: azioni emergenti, settoriali, leveraged. Se un ETF ha SRI 7 e tu hai orizzonte di 3 anni, non è adatto a te, punto. È una regola del buon senso che evita disastri emotivi. L'SRI non è perfetto ma è un filtro rapido."
      },
      {
        heading: "Gli scenari di performance",
        body: "Una delle tabelle più importanti mostra cosa ti aspetteresti di ottenere in 4 scenari: stress, sfavorevole, moderato, favorevole. Le cifre sono calcolate su periodi di detenzione consigliati (tipicamente 5 anni). ATTENZIONE: non sono previsioni ma simulazioni basate sulla storia degli ultimi 10 anni. Guarda lo scenario 'sfavorevole' per sapere quanto potresti perdere in un periodo brutto. Se un ETF mostra scenario sfavorevole -35%, sai cosa ti aspetta nei momenti peggiori. Se è -50%, anche peggio."
      },
      {
        heading: "I costi: dove guardare davvero",
        body: "Il KID include una sezione 'Costi nel tempo' che mostra l'impatto cumulativo su 1, 3 e 5 anni. Vengono dettagliati tre tipi di costi: costi una tantum (entrata/uscita, tipicamente 0% per ETF), costi correnti (equivalente al TER), costi di transazione (spread impliciti). Guarda il totale annuale in euro su un investimento di €10.000: ti dice esattamente quanto spendi l'anno. Un ETF che dichiara €15-30/anno è economico. Oltre €50 è caro. Oltre €100 evitalo."
      },
      {
        heading: "Periodo minimo consigliato",
        body: "C'è una riga specifica che dice 'Periodo di detenzione consigliato' e indica quanti anni minimo dovresti tenere l'ETF. Per ETF azionari è tipicamente 5-7 anni. Per bond 3-5 anni. Per monetari 1 anno. Se il tuo orizzonte è inferiore al periodo consigliato, stai usando lo strumento sbagliato. Esempio: stai investendo per comprare casa tra 2 anni in un ETF azionario con periodo consigliato 7 anni? Stai correndo un rischio che il documento stesso ti sconsiglia."
      },
      {
        heading: "Quello che NON cercare nel KID",
        body: "Il KID non contiene informazioni sul tracking error, sulle top holdings, sulla ripartizione geografica dettagliata, sui dividendi storici. Per questo serve la 'factsheet' mensile del gestore, o siti come justETF e Morningstar. Il KID è il documento legale obbligatorio di pre-vendita; la factsheet è il documento informativo completo. Per decisioni finali guarda entrambi: KID per rischio e costi, factsheet per composizione e storia."
      }
    ],
    keyPoints: [
      "Il KID è un documento legale obbligatorio di 3 pagine che ogni ETF UCITS deve fornire",
      "L'indicatore di rischio SRI (da 1 a 7) è il numero più utile per il filtro iniziale",
      "Gli scenari di performance mostrano cosa aspettarsi in condizioni buone e cattive",
      "La sezione costi mostra l'impatto cumulativo in euro su 1, 3, 5 anni",
      "Il periodo di detenzione consigliato deve essere coerente col tuo orizzonte",
      "Per composizione dettagliata serve la factsheet, non il KID"
    ],
    commonMistakes: [
      "Non leggere mai il KID e cliccare 'accetto' per fretta",
      "Guardare solo il TER ignorando costi di transazione e scenari sfavorevoli",
      "Scegliere ETF con SRI superiore alla propria tolleranza al rischio reale",
      "Ignorare il periodo di detenzione consigliato se incompatibile col proprio orizzonte",
      "Confondere gli scenari del KID con previsioni garantite di rendimento"
    ],
    example: {
      title: "Esempio: confronto KID di SWDA e AUTO",
      body: "Leggi il KID di iShares Core MSCI World (SWDA): SRI 5, scenario sfavorevole a 5 anni -28%, costi totali €21 l'anno su €10.000, periodo consigliato 5 anni. Ora il KID di iShares Automation & Robotics (AUTO): SRI 6, scenario sfavorevole -45%, costi €40 l'anno su €10.000, periodo consigliato 5 anni. Leggendo entrambi capisci immediatamente: AUTO è più rischioso (SRI 6), può perdere quasi la metà in scenario brutto, costa il doppio all'anno, e ha lo stesso orizzonte consigliato. Se li metti in confronto per un portafoglio core, SWDA è la scelta ovvia. AUTO ha senso solo come satellite tematico, per piccole quote (5-10%)."
    },
    quiz: [
      {
        question: "Cosa indica l'SRI (Summary Risk Indicator) nel KID di un ETF?",
        options: [
          "Il rendimento garantito dell'ETF",
          "Il livello di rischio su scala da 1 a 7",
          "La dimensione del fondo",
          "La tassazione applicata"
        ],
        correct: 1,
        explanation: "L'SRI sintetizza il rischio dell'ETF su scala 1-7. 1-2 sono strumenti monetari o obbligazionari brevi, 5-6 azionario diversificato, 7 azionario più rischioso (emergenti, settoriali, leveraged)."
      },
      {
        question: "Cosa rappresentano gli 'scenari di performance' nel KID?",
        options: [
          "Previsioni garantite del rendimento futuro",
          "Simulazioni in 4 scenari basate sulla storia degli ultimi 10 anni",
          "L'obiettivo minimo del gestore",
          "Il rendimento medio del settore"
        ],
        correct: 1,
        explanation: "Gli scenari del KID (stress, sfavorevole, moderato, favorevole) sono simulazioni basate sui dati storici, non previsioni. Servono per darti un'idea di cosa aspettarti in condizioni diverse, ma i rendimenti reali possono essere diversi."
      },
      {
        question: "Se un ETF ha periodo di detenzione consigliato di 7 anni e tu hai un obiettivo a 2 anni, cosa significa?",
        options: [
          "Puoi comunque comprarlo senza problemi",
          "Stai usando uno strumento sbagliato per il tuo orizzonte",
          "Devi solo abbassare l'importo investito",
          "Il KID non è rilevante per la tua situazione"
        ],
        correct: 1,
        explanation: "Il periodo di detenzione consigliato è un avviso importante. Se il tuo orizzonte è molto più breve, lo strumento può non essere adatto: rischi di dover vendere in un momento sfavorevole senza aver avuto il tempo di recuperare da eventuali cali."
      },
      {
        question: "Dove trovi le informazioni dettagliate sulle top holdings e sulla ripartizione geografica di un ETF?",
        options: [
          "Nel KID, nella prima pagina",
          "Nel KID, nella sezione costi",
          "Nella factsheet mensile del gestore (non nel KID)",
          "Solo su richiesta al broker"
        ],
        correct: 2,
        explanation: "Il KID è un documento legale di pre-vendita focalizzato su rischio e costi. Per composizione dettagliata (holdings, geografia, settori) serve la factsheet mensile del gestore o siti specializzati come justETF e Morningstar."
      }
    ]
  },

  'pf-6': {
    intro: "C'è un errore che commettono quasi tutti gli investitori evoluti, e si chiama 'collezionismo di ETF'. Inizi con uno, poi leggi di un tema interessante e aggiungi il secondo, poi scopri i factor e arrivi al terzo, poi un amico ti consiglia un settore e sei a cinque. Dopo tre anni hai 12 ETF nel portafoglio, non ti ricordi più perché li hai comprati, e quando arriva il momento di ribilanciare ti viene il mal di testa. In questo capitolo ti dico quanti ETF servono davvero — spoiler: molto meno di quelli che pensi.",
    sections: [
      {
        heading: "La regola del 3: il minimo funzionante",
        body: "Tre ETF bastano per costruire un portafoglio completo e diversificato. Uno azionario globale (MSCI World o FTSE All-World), uno per emergenti (MSCI EM), uno obbligazionario globale (Global Aggregate Bond). Con questi tre copri il 95% di quello che serve a un investitore privato: azioni sviluppate, azioni emergenti, bond. La ripartizione dipende da età e rischio: 60/20/20 è un classico aggressivo, 50/15/35 è conservativo. Niente che mi stupisca funziona male con meno di 3 ETF; molti portafogli a 10+ ETF fanno peggio."
      },
      {
        heading: "La regola del 5: il portafoglio completo",
        body: "Se vuoi aggiungere un pizzico di ulteriore diversificazione, passa da 3 a 5 ETF. Aggiungi oro fisico (SGLD, 5-10% del portafoglio) e un ETF obbligazionario specifico per le obbligazioni governative di lunga scadenza (come zavorra nei crash azionari). Oltre questo livello, ogni ETF in più apporta meno rendimento marginale e più complessità. Vanguard, Bogleheads e quasi tutti gli investitori istituzionali concordano: 3-5 ETF sono il punto ottimale dove qualità e semplicità si bilanciano."
      },
      {
        heading: "Il mito della sovrapposizione",
        body: "Il problema del collezionismo è che molti ETF 'diversi' hanno sovrapposizioni massicce. Esempio tipico: compri SWDA (MSCI World) al 40% e aggiungi CSSPX (S&P 500) al 30% pensando di sovraesporti agli USA. Ma SWDA ha già il 70% in USA, quindi la tua esposizione USA finale è quasi il 60% del portafoglio — hai solo duplicato titoli senza aumentare davvero la diversificazione. Prima di aggiungere un ETF, controlla sempre la composizione: se l'80% è già dentro un altro ETF del tuo portafoglio, non sta aggiungendo niente di nuovo."
      },
      {
        heading: "Core-satellite: la struttura intelligente",
        body: "Se senti davvero il bisogno di più di 5 ETF, usa la struttura core-satellite. Il 'core' (80-90% del portafoglio) sono 2-3 ETF globali molto diversificati che non tocchi mai. I 'satellite' (10-20%) sono piccole allocazioni su temi specifici (tech, healthcare, settori specifici, small cap). Tetto per singolo satellite: 5%. Così puoi esprimere idee personali senza destabilizzare il portafoglio. La regola: se togli i satellite, il portafoglio deve restare solido da solo."
      },
      {
        heading: "Quando è il caso di meno ETF",
        body: "Per investitori che partono con importi bassi o PAC modesti (sotto €200 al mese), anche 3 ETF possono essere eccessivi: ogni mese dovresti comprare tre quote separate, con spread e commissioni moltiplicati per tre. In questi casi un singolo ETF mondiale come VWCE (FTSE All-World) è perfetto: include sia paesi sviluppati che emergenti in un solo strumento. Quando il capitale cresce oltre i €10.000-15.000 ha senso aggiungere il secondo e terzo ETF per maggiore controllo dell'allocazione."
      },
      {
        heading: "Il vero test: riesci a spiegarlo in 30 secondi?",
        body: "Ecco il test definitivo per il tuo portafoglio. Se qualcuno ti chiede 'cos'è il tuo portafoglio?' e non riesci a descriverlo in 30 secondi, hai troppi ETF. Un portafoglio 60% MSCI World, 20% Emerging Markets, 20% Global Aggregate Bond si descrive in 10 secondi e lo ricordi sempre. Un portafoglio con SWDA, CSSPX, VUAA, VWCE, MWRD, EIMI, WSML, AGGH, XEON, SGLD è un museo, non una strategia. La semplicità non è pigrizia, è disciplina: un portafoglio semplice è uno che riesci a mantenere nel tempo senza stancarti."
      }
    ],
    keyPoints: [
      "Tre ETF (azionario globale + emergenti + bond) bastano per il 95% degli investitori",
      "Cinque ETF (aggiungendo oro e bond lunghi) è il massimo utile per portafogli completi",
      "Oltre 5-6 ETF, ogni nuovo strumento apporta rendimento marginale decrescente",
      "Sovrapposizione: ETF 'diversi' spesso contengono gli stessi titoli (es. SWDA e CSSPX)",
      "Struttura core-satellite: 80-90% in 2-3 ETF globali, 10-20% in temi specifici",
      "Test della semplicità: se non riesci a descrivere il portafoglio in 30 secondi, hai troppi ETF"
    ],
    commonMistakes: [
      "Collezionare ETF per ogni trend letto su TikTok o forum finanziari",
      "Aggiungere un ETF senza verificare la sovrapposizione con quelli esistenti",
      "Pensare che 10 ETF siano più diversificati di 3 ben scelti",
      "Usare troppi ETF con PAC piccolo, moltiplicando commissioni e spread",
      "Aggiungere satellite che superano il 5% del portafoglio (diventano core di fatto)"
    ],
    example: {
      title: "Esempio: il portafoglio semplificato di Laura",
      body: "Laura ha accumulato 11 ETF in 4 anni: SWDA, CSSPX, VUAA, EIMI, VWCE, AGGH, SGLD, AUTO, CYBR, HEAL, EUDV. Totale investito: €45.000. Quando analizza le sovrapposizioni scopre che SWDA, CSSPX, VUAA e VWCE sono in gran parte le stesse azioni USA: 4 ETF per ottenere essenzialmente la stessa cosa. I 3 ETF settoriali (AUTO, CYBR, HEAL) sono tutti azionari tecnologia/salute globali, ampiamente già inclusi in SWDA. Semplifica così: tiene SWDA (60%) come core azionario sviluppati, EIMI (15%) per emergenti, AGGH (15%) per bond, SGLD (5%) per oro, e AUTO (5%) come unico satellite tematico. Da 11 ETF a 5. Stesso rendimento atteso, molto meno lavoro di gestione, meno costi di ribilanciamento, e finalmente ricorda cosa ha in portafoglio senza aprire Excel."
    },
    quiz: [
      {
        question: "Qual è il numero minimo di ETF per un portafoglio ben diversificato?",
        options: [
          "Almeno 10 ETF",
          "Tre ETF ben scelti bastano per il 95% degli investitori",
          "Esattamente 7",
          "Un solo ETF è sufficiente"
        ],
        correct: 1,
        explanation: "Con 3 ETF (azionario globale, emergenti, obbligazionario) copri già l'essenziale della diversificazione. Il 4° e 5° ETF (oro, bond lunghi) migliorano marginalmente, ma oltre i rendimenti marginali decrescono."
      },
      {
        question: "Cosa significa 'sovrapposizione' tra due ETF?",
        options: [
          "Due ETF dello stesso gestore",
          "Due ETF con composizione molto simile, che contengono gli stessi titoli",
          "Due ETF quotati sulla stessa borsa",
          "Due ETF con stesso TER"
        ],
        correct: 1,
        explanation: "La sovrapposizione si verifica quando ETF 'apparentemente diversi' contengono in larga parte gli stessi titoli. Esempio classico: SWDA (MSCI World) ha già il 70% di USA, aggiungere CSSPX (S&P 500) significa solo duplicare l'esposizione USA senza aumentare la diversificazione."
      },
      {
        question: "Come funziona la strategia core-satellite?",
        options: [
          "Tutti gli ETF hanno lo stesso peso",
          "Si tengono solo ETF settoriali",
          "80-90% in 2-3 ETF globali (core), 10-20% in piccoli temi specifici (satellite, max 5% ciascuno)",
          "Si investe solo in un ETF mondiale"
        ],
        correct: 2,
        explanation: "Core-satellite permette di avere un portafoglio solido nel cuore (80-90% in ETF globali) e piccole esposizioni tematiche ai margini (10-20% in satellite da max 5% ciascuno). Così puoi esprimere idee personali senza compromettere la stabilità."
      },
      {
        question: "Qual è il 'test della semplicità' per un buon portafoglio ETF?",
        options: [
          "Avere almeno 10 ETF diversi",
          "Utilizzare solo ETF di un unico gestore",
          "Riuscire a descriverlo in 30 secondi senza consultare note",
          "Investire solo importi identici in ogni ETF"
        ],
        correct: 2,
        explanation: "Se non riesci a descrivere il tuo portafoglio in 30 secondi a qualcuno, probabilmente hai troppi ETF. La semplicità non è pigrizia: è disciplina. Un portafoglio semplice è uno che riesci a mantenere nel tempo senza stancarti o perdere il controllo delle allocazioni."
      }
    ]
  },

  'etf-6': {
    intro: "Due ETF possono replicare lo stesso indice, avere lo stesso TER, sembrare identici sulla carta. Ma uno può costarti il doppio quando lo compri, e renderti meno nel tempo. La differenza si chiama liquidità, AUM e tracking error — tre metriche che quasi nessuno controlla ma che decidono silenziosamente quanto bene il tuo ETF fa il suo lavoro. In questo capitolo impari a guardarle prima di comprare.",
    sections: [
      {
        heading: "AUM: la dimensione conta davvero",
        body: "AUM sta per Assets Under Management — i soldi totali che il fondo gestisce. Un ETF con 50 miliardi di AUM è grande, stabile, economico da gestire. Un ETF con 30 milioni è piccolo, fragile, può essere chiuso dal gestore per scarsa redditività. La chiusura non è una tragedia (ricevi i soldi), ma rompe la tua strategia e genera tasse sulle plusvalenze. Regola pratica: cerca ETF con AUM sopra €500 milioni. Sopra €1 miliardo sono nella fascia sicura. Sotto €100 milioni c'è rischio concreto di liquidazione nel giro di 2-3 anni."
      },
      {
        heading: "Liquidità: quanto velocemente compri e vendi",
        body: "La liquidità è la capacità di entrare e uscire da un ETF senza muoverne il prezzo. Si misura osservando lo spread bid-ask (differenza tra prezzo di acquisto e vendita) e il volume giornaliero scambiato. Un ETF mega-liquido come SWDA o CSSPX ha spread di 0.02-0.05% e scambia centinaia di milioni di euro al giorno. Un ETF poco liquido può avere spread dello 0.5% e scambiare poche migliaia di euro al giorno. Se cerchi di comprare €10.000 di un ETF piccolo, potresti muovere il prezzo nel farlo."
      },
      {
        heading: "Lo spread reale è più alto di quanto pensi",
        body: "Su justETF o sulla pagina del broker vedi uno 'spread medio' pulito. Ma la realtà può essere diversa nelle ore strane (tarda sera, prima mattina, fine venerdì) quando i market maker riducono le quotazioni. Se acquisti SWDA alle 9:03 del lunedì, pagherai spread normale. Se acquisti alle 17:35 di venerdì, potresti trovare spread 3-4 volte più larghi. Per PAC importanti, programma l'esecuzione tra le 10:00 e le 16:30 dei giorni di borsa piena, quando la liquidità è massima."
      },
      {
        heading: "Tracking error: quanto l'ETF devia dall'indice",
        body: "Un ETF che replica MSCI World dovrebbe fare esattamente quello che fa MSCI World. In pratica c'è sempre una piccola deviazione: il tracking error. Può essere positivo (l'ETF batte l'indice, raro) o negativo (l'ETF fa peggio dell'indice, normale). Le cause: TER che viene sottratto silenziosamente, tasse sui dividendi non ottimizzate, campionamento su indici grandi, costi di trading interni. Un buon tracking error è sotto 0.20% annuo. Oltre 0.50% è mediocre. Oltre 1% è un campanello d'allarme: qualcosa non funziona nella gestione."
      },
      {
        heading: "Come trovare queste informazioni",
        body: "Tutti questi dati sono pubblici ma sparsi. Per l'AUM: pagina del gestore o justETF (campo 'Fund size'). Per lo spread: Borsa Italiana o Xetra sotto 'Spread medio'. Per il tracking error: factsheet mensile del gestore (cerca 'Tracking Difference' o 'TE'). Morningstar dà un rating sintetico con stelle che pesa tutti questi fattori. Regola del dito: se l'ETF ha rating Morningstar da 4 stelle in su, AUM sopra €500M e TER sotto 0.30%, probabilmente va bene senza bisogno di ulteriori controlli."
      },
      {
        heading: "Il trappolone dei TER bassi ma fondi piccoli",
        body: "Attenzione a questa insidia. Vedi un ETF S&P 500 con TER 0.03% (bassissimo) e lo preferisci a CSSPX con TER 0.07%. Però quel ETF ha €80 milioni di AUM contro i €97 miliardi di CSSPX, spread 0.15% contro 0.03%, e rischio liquidazione alto. Il tuo risparmio teorico di 0.04% annuo di TER viene mangiato in una sola operazione dallo spread extra. E se l'ETF viene chiuso entro 2 anni, devi rimetterti sul mercato pagando tasse e commissioni. Un ETF 'economico sulla carta' può costarti molto di più di uno standard e solido."
      }
    ],
    keyPoints: [
      "AUM sopra €500M è zona sicura, sopra €1MD è molto sicuro, sotto €100M rischioso",
      "La liquidità si misura con spread bid-ask e volumi scambiati giornalieri",
      "Spread reali variano nel tempo: più larghi alle aperture e chiusure o fuori orari di punta",
      "Tracking error sotto 0.20% annuo è buono, oltre 0.50% è mediocre",
      "Morningstar rating (stelle) sintetizza qualità della gestione in un numero",
      "TER bassi su ETF piccoli sono una trappola: lo spread extra annulla il risparmio"
    ],
    commonMistakes: [
      "Scegliere ETF con TER bassissimo ignorando dimensione e liquidità",
      "Eseguire PAC nei minuti strani (aperture, chiusure) quando gli spread si allargano",
      "Ignorare il tracking error storico perché 'tanto seguono l'indice'",
      "Comprare ETF di nicchia con AUM basso pensando siano 'opportunità'",
      "Non controllare il rating Morningstar prima di aggiungere un ETF al portafoglio"
    ],
    example: {
      title: "Esempio: il confronto nascosto di Simone",
      body: "Simone vuole un ETF S&P 500. Trova due candidati. Opzione A: BGS5 UCITS ETF, TER 0.03%, AUM €75 milioni, spread medio 0.18%, tracking error 0.45%, rating Morningstar non disponibile. Opzione B: CSSPX di iShares, TER 0.07%, AUM €97 miliardi, spread medio 0.03%, tracking error 0.04%, rating Morningstar 5 stelle. A prima vista BGS5 sembra più economico: 0.04% in meno all'anno. Su €10.000 investiti, risparmio teorico di €4 all'anno. Ma quando compra paga 0.15% in più di spread: €15 persi in una sola operazione, più di 3 anni di TER risparmiato. E BGS5 rischia la chiusura entro 2 anni per AUM troppo basso. Simone sceglie CSSPX senza pensarci. Il TER non è tutto: la qualità complessiva batte sempre il singolo numero."
    },
    quiz: [
      {
        question: "Qual è la soglia minima di AUM consigliata per considerare un ETF sicuro?",
        options: [
          "€10 milioni",
          "€500 milioni, idealmente sopra €1 miliardo",
          "€100.000",
          "Non importa la dimensione"
        ],
        correct: 1,
        explanation: "Un ETF con AUM sopra €500 milioni è generalmente stabile. Sopra €1 miliardo è nella zona sicura. Sotto €100 milioni c'è rischio concreto che il gestore lo liquidi per scarsa redditività, costringendoti a cambiare strumento e pagare tasse."
      },
      {
        question: "Cosa misura il tracking error di un ETF?",
        options: [
          "La velocità di esecuzione degli ordini",
          "Quanto l'ETF devia dall'indice che dovrebbe replicare",
          "Il numero di errori di calcolo nel NAV",
          "La differenza tra ETF diversi dello stesso gestore"
        ],
        correct: 1,
        explanation: "Il tracking error è lo scostamento tra rendimento dell'ETF e rendimento dell'indice di riferimento. Un buon ETF ha tracking error sotto 0.20% annuo. Sopra 0.50% è mediocre, sopra 1% è problematico."
      },
      {
        question: "Perché uno spread bid-ask dello 0.15% può annullare il vantaggio di un TER più basso?",
        options: [
          "Perché si paga a ogni apertura di conto",
          "Perché è un costo pagato a ogni acquisto e vendita, e su una singola operazione può superare anni di risparmio sul TER",
          "Perché impedisce di vendere l'ETF",
          "Perché cambia la tassazione"
        ],
        correct: 1,
        explanation: "Il TER è un costo annuale piccolo. Lo spread bid-ask si paga a ogni operazione. Spread di 0.15% su una singola operazione di €10.000 = €15. Se l'alternativa ha TER più alto di 0.04% ma spread di 0.03%, paghi €3 invece di €15: risparmio di €12 che vale più di 3 anni di differenza di TER."
      },
      {
        question: "Qual è il momento migliore per eseguire un PAC in termini di spread?",
        options: [
          "All'apertura di borsa (9:00)",
          "Nelle ore centrali dei giorni di borsa piena, indicativamente tra 10:00 e 16:30",
          "Dopo la chiusura di borsa",
          "Sempre il venerdì sera"
        ],
        correct: 1,
        explanation: "Nelle ore centrali di borsa piena i market maker sono pienamente operativi e gli spread sono ai minimi. Apertura (9:00-9:30), chiusura (17:30+) o fuori orari di punta hanno spread più larghi perché la liquidità è ridotta. Un buon PAC automatizzato dovrebbe essere programmato dalle 10:00 alle 16:30."
      }
    ]
  },

  'etf-7': {
    intro: "Se scorri le liste di ETF noti tre lettere che compaiono ovunque: UCITS. Sai cosa sono? Sai perché quasi tutti gli ETF che puoi comprare da investitore italiano sono domiciliati in Irlanda o Lussemburgo e non in Italia? E sai cos'è l'hedging valutario, e se ti serve davvero? In questo capitolo ti spiego le tre caratteristiche tecniche che distinguono un ETF adatto dal mercato europeo rispetto a uno pensato per altri mercati.",
    sections: [
      {
        heading: "UCITS: il marchio di qualità europeo",
        body: "UCITS (Undertakings for Collective Investment in Transferable Securities) è una normativa europea che regola i fondi d'investimento destinati al pubblico retail. Un ETF UCITS deve rispettare regole stringenti: diversificazione minima, limiti alla leva finanziaria, trasparenza sui costi, protezione patrimoniale in caso di fallimento del gestore. Per un investitore italiano, comprare ETF UCITS è praticamente obbligatorio: quelli non UCITS (es. ETF americani quotati a New York) sono vietati dalla MiFID II per i retail europei dal 2018. Trade Republic, Scalable, Fineco e Directa ti permettono solo UCITS. Questa è una protezione, non una limitazione."
      },
      {
        heading: "Il domicilio: dove vive legalmente l'ETF",
        body: "Il domicilio di un ETF è il paese dove è legalmente registrato. Non coincide con dove è quotato. Un ETF domiciliato in Irlanda può essere quotato a Milano, Francoforte, Amsterdam. Il domicilio determina le tasse che l'ETF paga sui dividendi delle azioni sottostanti — e di riflesso, quanto netto arriva a te. Il 90% degli ETF UCITS è domiciliato in Irlanda o Lussemburgo. Il motivo è fiscale, non turistico."
      },
      {
        heading: "Perché l'Irlanda è la regina degli ETF",
        body: "Sui dividendi pagati da aziende USA, c'è una ritenuta alla fonte per i non-residenti. Senza trattati fiscali speciali è il 30%. L'Irlanda ha un trattato bilaterale con gli USA che riduce questa ritenuta al 15%. Lussemburgo solo al 30% (negoziando caso per caso). Risultato: un ETF S&P 500 domiciliato in Irlanda rende quasi lo 0.5% annuo in più rispetto a uno domiciliato altrove, solo per questa differenza. Su 20-30 anni è una differenza enorme. Per questo se compri un S&P 500 o un MSCI World (70% USA), preferisci sempre il domicilio irlandese. ISIN che inizia per IE00xxx = domicilio Irlanda."
      },
      {
        heading: "Hedging valutario: cos'è e come funziona",
        body: "Quando compri un ETF MSCI World, le aziende dentro quotano in USD, JPY, GBP, EUR. Se l'euro si rafforza del 10% sul dollaro, le tue azioni USA valgono il 10% in meno convertite in euro — anche se i prezzi USA non si sono mossi. L'hedging valutario (versione 'Hedged' o 'EUR H') neutralizza questo effetto usando contratti derivati: ricevi il rendimento puro delle azioni al netto della valuta. Costa di più (TER più alto di 0.05-0.15%) e il beneficio non è sempre positivo."
      },
      {
        heading: "Serve davvero l'hedging?",
        body: "La risposta onesta è: per la maggior parte degli investitori retail NO. Per due motivi. Primo: sul lungo termine (20+ anni) le valute oscillano ma tendono a bilanciarsi, quindi l'effetto cambio si diluisce. Secondo: la diversificazione valutaria è un beneficio — quando l'Italia va male l'euro tende a indebolirsi, proteggendo il valore delle tue azioni USA. L'hedging può servire in due casi specifici: obbligazionari (dove il cambio può essere metà del rendimento totale) e orizzonti brevi (sotto 5 anni) dove l'oscillazione valutaria può distruggerti. Per azionari globali con orizzonte lungo, la versione non-hedged è tipicamente la scelta giusta."
      },
      {
        heading: "Come leggere il domicilio dal nome",
        body: "Gli indizi sono in tre punti. Il nome completo spesso contiene 'UCITS' (garantisce la normativa) e talvolta 'Ireland' o '(IE)'. L'ISIN inizia con il codice paese: IE = Irlanda, LU = Lussemburgo, DE = Germania, FR = Francia. Il ticker a volte aiuta (SWDA IE, XDWD LU). Il KID conferma tutto nella prima pagina sotto 'Autorità di vigilanza' e 'Paese di registrazione'. Due minuti per controllare, e sai se l'ETF è fiscalmente efficiente prima di acquistarlo."
      }
    ],
    keyPoints: [
      "UCITS è la normativa europea che protegge l'investitore retail: compra solo ETF UCITS",
      "Il domicilio è dove l'ETF è legalmente registrato, non dove è quotato",
      "Irlanda ha un trattato fiscale USA che riduce la ritenuta sui dividendi da 30% a 15%",
      "Un ETF S&P 500 domiciliato in Irlanda rende ~0.5% annuo in più",
      "ISIN che inizia con IE = Irlanda, con LU = Lussemburgo",
      "L'hedging valutario ha senso per bond e orizzonti brevi, raramente per azioni lungo termine"
    ],
    commonMistakes: [
      "Cercare ETF non-UCITS americani pensando siano 'più economici' (sono vietati in Europa)",
      "Ignorare il domicilio: scegliere ETF S&P 500 non-irlandese paga il 15% in più di tasse",
      "Comprare versioni Hedged per azionario globale a lungo termine, pagando un costo inutile",
      "Confondere il domicilio (paese di registrazione) con la borsa di quotazione",
      "Non verificare l'ISIN: è la prova più rapida del domicilio"
    ],
    example: {
      title: "Esempio: Giovanni sceglie tra tre S&P 500",
      body: "Giovanni cerca un ETF S&P 500 per il suo PAC. Trova tre opzioni. CSSPX IE00B5BMR087 (Irlanda): TER 0.07%, trattato fiscale USA 15%, rendimento atteso sui dividendi circa 1.5% netto all'anno. VUSA IE00B3XXRP09 (Irlanda): TER 0.07%, stesso trattamento fiscale, versione Distribuzione. Un fondo US domiciliato (esempio fittizio): TER 0.03%, ma ritenuta 30% sui dividendi USA. Su €10.000 investiti con dividendi al 2% annuo, il vantaggio fiscale irlandese fa €30 l'anno in più per sempre. Su 30 anni di PAC, parliamo di migliaia di euro. Il TER più basso (0.03% vs 0.07%) risparmia solo €4 l'anno. Giovanni sceglie CSSPX senza esitazione. Il domicilio irlandese vale più del TER più basso."
    },
    quiz: [
      {
        question: "Cosa garantisce la normativa UCITS per gli investitori?",
        options: [
          "Rendimenti minimi garantiti",
          "Esenzione fiscale",
          "Regole di diversificazione, trasparenza e protezione patrimoniale",
          "L'iscrizione automatica alla borsa italiana"
        ],
        correct: 2,
        explanation: "UCITS è la normativa europea per i fondi destinati al pubblico retail. Impone regole su diversificazione minima, leva finanziaria limitata, trasparenza costi e protezione patrimoniale in caso di fallimento del gestore. Non garantisce rendimenti, garantisce la struttura."
      },
      {
        question: "Perché gli ETF UCITS sono spesso domiciliati in Irlanda?",
        options: [
          "Perché l'Irlanda ha la borsa più grande d'Europa",
          "Per ragioni di marketing",
          "Perché il trattato fiscale tra Irlanda e USA riduce la ritenuta sui dividendi americani dal 30% al 15%",
          "Per vicinanza geografica"
        ],
        correct: 2,
        explanation: "Il trattato bilaterale Irlanda-USA riduce la ritenuta fiscale sui dividendi pagati da aziende americane dal 30% al 15%. Per ETF con forte esposizione USA (S&P 500, MSCI World al 70% USA), questo si traduce in circa 0.5% annuo in più di rendimento."
      },
      {
        question: "Come si riconosce il domicilio irlandese dall'ISIN di un ETF?",
        options: [
          "L'ISIN contiene la parola 'IRELAND'",
          "L'ISIN inizia con 'IE'",
          "L'ISIN termina con '00'",
          "L'ISIN è di 10 cifre"
        ],
        correct: 1,
        explanation: "Ogni ISIN inizia con due lettere che indicano il paese di registrazione. IE = Irlanda, LU = Lussemburgo, DE = Germania, FR = Francia. Esempio: IE00B4L5Y983 è SWDA domiciliato in Irlanda."
      },
      {
        question: "Quando ha senso scegliere un ETF con hedging valutario (EUR H)?",
        options: [
          "Sempre, per ogni tipo di ETF",
          "Principalmente per obbligazionari e per orizzonti brevi (sotto 5 anni)",
          "Solo per azionari USA",
          "Mai, è un costo inutile"
        ],
        correct: 1,
        explanation: "L'hedging ha senso soprattutto per ETF obbligazionari (dove il cambio può essere metà del rendimento) e per orizzonti brevi dove l'oscillazione valutaria può danneggiarti. Per azionari globali con orizzonti lunghi (15+ anni), le valute tendono a bilanciarsi e la diversificazione valutaria è un beneficio, non un rischio."
      }
    ]
  },

  'pf-7': {
    intro: "Hai deciso la tua asset allocation: 70% azioni, 30% bond. Investi i soldi. Un anno dopo le azioni sono salite del 20%, i bond dell'1%. Ora la tua allocazione è diventata 74% azioni, 26% bond. Stai correndo più rischio di quanto avevi deciso all'inizio. Il ribilanciamento è l'operazione con cui riporti il portafoglio ai pesi originali. Sembra banale, ma è uno dei concetti operativi più fraintesi della finanza personale: molti lo fanno male, o non lo fanno affatto, e perdono rendimento e protezione.",
    sections: [
      {
        heading: "Cos'è e perché è importante",
        body: "Ribilanciare significa vendere quello che è salito troppo (sovrappeso) e comprare quello che è sceso troppo (sottopeso) per tornare all'allocazione obiettivo. Non è market timing: è manutenzione sistematica. Due benefici concreti: primo, mantieni il livello di rischio che avevi scelto — senza ribilanciare, dopo qualche anno potresti trovarti al 85% azioni invece del 70%. Secondo, ti costringe a 'comprare basso e vendere alto' automaticamente, senza dover indovinare il mercato. Studi Vanguard mostrano che un ribilanciamento disciplinato aggiunge 0.2-0.4% annui di rendimento extra e riduce drawdown significativamente."
      },
      {
        heading: "Due strategie: per calendario o per soglia",
        body: "La prima strategia è ribilanciare a intervalli regolari: una volta l'anno, sempre a gennaio o al tuo compleanno. Semplice, prevedibile, richiede 30 minuti una volta l'anno. La seconda strategia è ribilanciare quando una classe di asset si discosta oltre una soglia, tipicamente 5% o 20% dal target. Se il target è 70% azioni, ribilanci quando arrivi al 75% o al 65%. Più reattiva ma richiede monitoraggio. Per la maggior parte degli investitori retail, il ribilanciamento annuale batte quello a soglia: stesso risultato, molto meno lavoro, meno tentazioni di farlo per emozione."
      },
      {
        heading: "Ribilanciamento con acquisti nuovi (il più intelligente)",
        body: "Se fai PAC mensili, hai un'opzione migliore della vendita: dirigere gli acquisti mensili verso l'asset sottopeso. Supponiamo azioni a 74%, bond a 26%, target 70/30. Invece di vendere azioni e comprare bond (tassato al 26%), metti tutto il PAC del mese nei bond finché non torni al target. Zero tasse sulle plusvalenze, zero commissioni extra di vendita. Funziona bene per piccole deviazioni (2-5%). Per deviazioni grandi (oltre 10%) serve comunque vendere una parte della classe sovrappeso."
      },
      {
        heading: "Il costo fiscale del ribilanciamento",
        body: "In Italia, vendere ETF in guadagno genera una tassazione del 26% sulla plusvalenza. Questo trasforma un ribilanciamento apparentemente gratuito in un vero costo. Esempio: hai €10.000 in azioni che sono salite a €12.000. Se vendi €2.000 per ribilanciare, paghi il 26% su €333 di plusvalenza (la quota di guadagno sulla parte venduta): circa €87 di tasse immediate. Per questo il ribilanciamento con nuovi versamenti è preferibile quando possibile. Se hai portafogli segmentati in un conto con Regime Amministrato, le minusvalenze di un anno possono compensare le plusvalenze nello stesso anno — l'altro vantaggio di ribilanciare in momenti bruschi."
      },
      {
        heading: "Evitare il trappolone emotivo",
        body: "Il ribilanciamento sembra intuitivo ma nella pratica è controintuitivo. Nel 2022 le azioni crollavano del 20%: chi ribilanciava correttamente doveva comprare più azioni, mentre emotivamente tutti volevano vendere. Nel 2024 le azioni volavano: chi ribilanciava doveva vendere parte dei guadagni per ricomprare bond che perdevano, cosa difficilissima emotivamente. Il ribilanciamento disciplinato richiede di fare l'opposto di quello che ti dice la pancia. Programmarlo sul calendario (es. sempre il 15 gennaio) ti toglie la tentazione di fare market timing camuffato da ribilanciamento."
      },
      {
        heading: "Quanto spesso? La risposta sincera",
        body: "Vanguard ha analizzato dati storici su 90 anni confrontando strategie di ribilanciamento: annuale, semestrale, trimestrale, mensile, per soglia 1%, per soglia 5%, per soglia 10%. Il risultato? Le differenze di rendimento tra queste strategie sono minime (meno di 0.3% annuo). Quella che 'vince' di più è... quella che riesci effettivamente a mantenere. Ribilanciare troppo spesso ti fa pagare commissioni e tasse; ribilanciare troppo raramente ti fa scivolare dall'allocazione obiettivo. Consiglio pratico: annuale per la maggior parte delle persone. Ogni 2 anni per portafogli molto stabili. Mai più frequente di trimestrale."
      }
    ],
    keyPoints: [
      "Ribilanciare significa vendere il sovrappeso e comprare il sottopeso per tornare all'allocazione obiettivo",
      "Due strategie: a calendario (annuale) o per soglia (5%/20%)",
      "Il ribilanciamento aggiunge 0.2-0.4% di rendimento annuo mantenendo il rischio costante",
      "Usa i PAC per ribilanciare senza vendere: dirigi i nuovi soldi verso l'asset sottopeso",
      "In Italia vendere in guadagno costa 26% di tasse: riduci al minimo le vendite",
      "La frequenza ottimale è quella che riesci a rispettare: annuale va bene per quasi tutti"
    ],
    commonMistakes: [
      "Non ribilanciare mai, lasciando che l'allocazione si trasformi nel tempo senza controllo",
      "Ribilanciare troppo spesso (mensilmente) pagando tasse e commissioni inutili",
      "Usare il ribilanciamento come scusa per fare market timing",
      "Vendere per ribilanciare quando si potevano usare i PAC nuovi",
      "Smettere di ribilanciare proprio nei momenti brutti quando serve di più",
      "Non segnare sul calendario il giorno del ribilanciamento, dimenticandolo"
    ],
    example: {
      title: "Esempio: Marco ribilancia dopo un anno di rally",
      body: "Marco ha iniziato con €50.000: target 70% azioni (€35.000) e 30% bond (€15.000). Dopo un anno: azioni +18% = €41.300, bond +2% = €15.300, totale €56.600. Nuova allocazione effettiva: azioni 73%, bond 27%. Fuori target di 3 punti. Marco ha due strade. Strada A (vendita): vende €2.000 di azioni (pagando ~€50 di tasse sulle plusvalenze) e compra €2.000 di bond. Torna a 70/30 esatto. Strada B (PAC): nei mesi successivi dirige tutti i suoi €400 mensili del PAC esclusivamente sui bond per 5 mesi (€2.000), senza vendere nulla. Zero tasse, zero commissioni extra. Dopo 5 mesi è tornato a 70/30 gradualmente. La strada B vince per Marco, purché la deviazione resti sotto il 5-7% (oltre serve anche vendere)."
    },
    quiz: [
      {
        question: "Cos'è il ribilanciamento di un portafoglio?",
        options: [
          "Cambiare strategia ogni volta che cambia il mercato",
          "Riportare le percentuali delle asset class all'allocazione target, vendendo il sovrappeso e comprando il sottopeso",
          "Vendere tutto durante i crolli",
          "Aggiungere nuovi ETF al portafoglio"
        ],
        correct: 1,
        explanation: "Ribilanciare significa tornare all'allocazione obiettivo (es. 70/30) vendendo quello che è salito troppo e comprando quello che è sceso troppo. Non è cambiare strategia, è mantenere quella che hai scelto."
      },
      {
        question: "Qual è la frequenza di ribilanciamento consigliata per la maggior parte degli investitori retail?",
        options: [
          "Giornaliera",
          "Mensile",
          "Annuale",
          "Mai"
        ],
        correct: 2,
        explanation: "Il ribilanciamento annuale offre il miglior compromesso: mantiene l'allocazione obiettivo senza far pagare commissioni e tasse inutili. Vanguard ha mostrato che frequenze più alte non aumentano significativamente il rendimento."
      },
      {
        question: "Perché è meglio ribilanciare con i nuovi versamenti del PAC invece di vendere?",
        options: [
          "Perché è più veloce",
          "Perché eviti di pagare il 26% di tasse sulle plusvalenze che dovresti pagare vendendo",
          "Perché hai obblighi fiscali diversi",
          "Perché il broker lo richiede"
        ],
        correct: 1,
        explanation: "In Italia vendere ETF in guadagno comporta una tassazione del 26% sulla plusvalenza. Dirigere i PAC mensili verso la classe sottopeso ribilancia senza nessuna vendita, quindi zero tasse. Funziona bene per deviazioni piccole (sotto il 5-7%)."
      },
      {
        question: "Perché il ribilanciamento è psicologicamente difficile?",
        options: [
          "Perché richiede competenze tecniche avanzate",
          "Perché bisogna fare l'opposto di quello che dice l'emozione: vendere ciò che sale e comprare ciò che scende",
          "Perché richiede troppo tempo",
          "Perché il broker non te lo permette"
        ],
        correct: 1,
        explanation: "Quando le azioni salgono vorresti tenerle tutte (emozione di vittoria), quando crollano vorresti venderle (panico). Ribilanciare richiede l'opposto: vendere parte del vincitore e comprare il perdente. Per questo molti consigliano di programmarlo su calendario fisso, togliendo l'elemento emotivo."
      }
    ]
  },

  'etf-8': {
    intro: "Arrivati in fondo al Modulo 1, conosci la teoria sugli ETF: costi, replica, distribuzione, KID, liquidità, domicilio. Ora è il momento del capitolo più pragmatico: gli errori più comuni che vedo fare nella scelta degli ETF. Sono tutti evitabili con 10 minuti di controllo. Alcuni li ho già nominati nei capitoli precedenti, ma qui li riuniamo in un checklist mentale da seguire ogni volta che aggiungi un ETF al portafoglio.",
    sections: [
      {
        heading: "Errore 1 — Inseguire il rendimento passato",
        body: "L'errore più comune in assoluto. Vedi che l'ETF X ha fatto +45% l'anno scorso, decidi di comprarlo convinto che continui. Problema: i rendimenti passati non predicono quelli futuri, e spesso gli ETF che volano un anno sono quelli che sottoperformano l'anno dopo (reversione alla media). Nel 2020 gli ETF cannabis facevano +80%, nel 2022-2023 hanno perso oltre il 60%. I settori più caldi del momento sono statisticamente quelli peggiori da comprare. Regola: valuta gli ETF sulla strategia di fondo, non sul rendimento degli ultimi 12 mesi."
      },
      {
        heading: "Errore 2 — Guardare solo il TER",
        body: "Il TER è importante ma non è tutto. Due ETF S&P 500, uno con TER 0.03% e AUM 80 milioni, l'altro con TER 0.07% e AUM 90 miliardi. Sulla carta l'ETF economico sembra migliore: 0.04% annuo in meno. Ma nella pratica paghi spread 5 volte più ampi a ogni operazione, rischi la chiusura del fondo, e hai tracking error più alto. Il TER è solo UNO dei costi. Come abbiamo visto nel capitolo 3, i veri costi includono spread, commissioni broker, e tasse indirette."
      },
      {
        heading: "Errore 3 — Collezionare ETF simili",
        body: "Finisci con 8 ETF in portafoglio che hanno tutti le stesse aziende dentro. SWDA, VWCE, CSSPX, VUAA, IWDA sembrano strumenti diversi ma sono praticamente sovrapposti al 85-95%. Hai complessità in cambio di zero diversificazione aggiuntiva. Prima di aggiungere un ETF, controlla la correlazione e l'overlap con quelli che hai già. Se superano il 70% di sovrapposizione, non stai diversificando."
      },
      {
        heading: "Errore 4 — Ignorare il domicilio fiscale",
        body: "Trovi un ottimo ETF S&P 500 domiciliato in Germania o Francia. TER basso, gestore solido. Ma non ha trattato fiscale USA favorevole, e sui dividendi americani paga il 30% invece del 15% come gli irlandesi. Su ETF con forte esposizione USA (S&P 500, Nasdaq, MSCI World), questo vale circa 0.3-0.5% annuo di rendimento perso. Controlla sempre l'ISIN: IE = Irlanda (preferibile per USA), LU = Lussemburgo (neutrale), altri = verifica caso per caso."
      },
      {
        heading: "Errore 5 — ETF a leva come investimento",
        body: "Gli ETF a leva (es. '2x S&P 500', '3x Nasdaq') sono progettati per trading di giorno o poco più. Hanno un problema matematico chiamato 'decay': se il mercato oscilla senza direzione, l'ETF a leva perde sistematicamente valore, anche se l'indice torna dove era partito. Un ETF 3x Nasdaq in un anno laterale può perdere il 20% mentre il Nasdaq resta piatto. Non sono prodotti per investimenti buy-and-hold. Se vedi un ETF con 'Lev', '2x', '3x', 'Ultra' nel nome, sta' alla larga per accumulo a lungo termine."
      },
      {
        heading: "Errore 6 — ETF tematici di moda",
        body: "Ogni 2-3 anni emerge il tema caldissimo: 2018 cannabis, 2020 ARKK, 2021 meme stock, 2022 metaverso, 2023 AI. Arrivano ETF dedicati con TER elevato (0.60-0.80%) e dopo 2-3 anni il tema sgonfia. Chi compra a metà del ciclo (la maggior parte) perde oltre il 50%. Gli ETF tematici hanno senso solo come piccoli satellite (max 5% del portafoglio) su temi con razionale economico chiaro e duraturo, non come scommessa speculativa. La maggior parte degli ETF tematici di 5 anni fa oggi esiste a malapena."
      },
      {
        heading: "Errore 7 — Comprare Dist in fase di accumulo",
        body: "Hai 30 anni, PAC mensile di €500, obiettivo pensione tra 30 anni. Ma scegli la versione Distribuzione dell'ETF perché 'mi piace vedere i dividendi arrivare'. In questo modo paghi il 26% di tasse su ogni dividendo incassato, invece di lasciarlo reinvestito lordo. Come visto nel capitolo 4, su 30 anni sono €40-60 mila di patrimonio in meno. La versione Distribuzione ha senso in fase di rendita, non di accumulo."
      },
      {
        heading: "Errore 8 — Ignorare il broker",
        body: "Scegli l'ETF perfetto: TER bassissimo, AUM enorme, domicilio irlandese. Poi lo compri su un broker italiano tradizionale che ti chiede €19 per operazione più €60 all'anno di custodia. Su un PAC mensile di €200, paghi quasi il 10% di costi annui solo in commissioni — annullando completamente i vantaggi dell'ETF. Il broker conta quasi quanto l'ETF. Preferisci Trade Republic (€1 a operazione), Scalable Capital (PAC gratis), Directa, Fineco Plus. Non la banca tradizionale."
      },
      {
        heading: "Errore 9 — Non leggere il KID",
        body: "Il KID è l'unico documento legale obbligatorio pre-acquisto, eppure quasi nessuno lo apre davvero. Come visto nel capitolo 5, ti basta verificare 4 cose: SRI (rischio 1-7), scenari di performance (sfavorevole ti dice quanto puoi perdere), costi totali in euro all'anno, periodo di detenzione consigliato. Due minuti di controllo evitano acquisti inadatti al tuo profilo."
      },
      {
        heading: "Errore 10 — Paralisi decisionale",
        body: "L'errore opposto ai precedenti: analizzare talmente tanto da non comprare mai. Confronti 15 ETF MSCI World cercando il 'migliore assoluto', legge decine di articoli, passano mesi, e intanto resti liquido perdendo tempo di composizione. La verità onesta: tra SWDA, VWCE, XDWD, EUNL e altri ETF globali diversificati, le differenze sono marginali (0.1% annuo). Meglio comprare il secondo migliore oggi che aspettare eternamente di trovare il migliore assoluto. Il tempo nel mercato batte il timing perfetto della scelta."
      }
    ],
    keyPoints: [
      "Non inseguire i rendimenti passati: i settori più caldi spesso sono i peggiori da comprare",
      "Il TER è solo uno dei costi: valuta anche spread, AUM, broker",
      "Evita sovrapposizioni: ETF apparentemente diversi possono essere quasi identici",
      "ISIN IE = domicilio irlandese = vantaggio fiscale per esposizione USA",
      "ETF a leva e tematici di moda non sono per buy-and-hold",
      "Broker conta quanto l'ETF: preferisci zero commissioni sui PAC",
      "Leggi il KID: 2 minuti ti evitano errori grossi",
      "Meglio comprare il secondo migliore oggi che aspettare il migliore eternamente"
    ],
    commonMistakes: [
      "Lasciarsi impressionare dal marketing di gestori su ETF tematici",
      "Non verificare ISIN e domicilio prima dell'acquisto",
      "Scegliere ETF su base emotiva ('mi piace il settore tech')",
      "Sottovalutare l'impatto cumulativo di piccoli errori nel lungo periodo",
      "Perdere mesi a cercare 'l'ETF perfetto' invece di iniziare con uno buono"
    ],
    example: {
      title: "Esempio: la checklist di 5 minuti prima di comprare",
      body: "Luca vuole aggiungere un ETF S&P 500 al portafoglio. Prima di cliccare 'compra', applica questa checklist. 1) ISIN inizia con IE? Sì, CSSPX è IE00B5BMR087. 2) AUM sopra 1 miliardo? Sì, 97 miliardi. 3) TER sotto 0.15%? Sì, 0.07%. 4) Versione ACC se in accumulo? Sì. 5) Rating Morningstar 4+ stelle? Sì, 5 stelle. 6) Sovrapposizione con altri ETF in portafoglio? Ha già SWDA ma CSSPX lo completa con concentrazione USA consapevole. 7) Broker a basso costo? Sì, lo compra su Trade Republic. Checklist completata in 4 minuti, Luca procede con serenità. Questa abitudine vale più di qualsiasi libro di finanza."
    },
    quiz: [
      {
        question: "Qual è l'errore più comune nella scelta di un ETF?",
        options: [
          "Scegliere ETF troppo economici",
          "Inseguire i rendimenti passati pensando che continuino",
          "Comprare ETF globali",
          "Usare broker di bassa qualità"
        ],
        correct: 1,
        explanation: "Inseguire i rendimenti passati è l'errore più frequente. Gli ETF più performanti di un anno tendono statisticamente a sottoperformare l'anno successivo (reversione alla media). I settori più caldi del momento sono spesso i peggiori da comprare per investitori a lungo termine."
      },
      {
        question: "Perché gli ETF a leva (2x, 3x) non sono adatti al lungo termine?",
        options: [
          "Sono troppo costosi",
          "Il 'decay' matematico fa perdere valore nel tempo anche se l'indice resta piatto",
          "Non sono quotati in Europa",
          "Hanno TER troppo basso"
        ],
        correct: 1,
        explanation: "Gli ETF a leva sono progettati per il trading giornaliero. Il 'decay' matematico fa sì che in mercati volatili e direzionali (laterali), l'ETF a leva perda valore sistematicamente anche se l'indice sottostante resta fermo. Non sono prodotti da accumulo."
      },
      {
        question: "Perché il broker conta quanto l'ETF?",
        options: [
          "Perché determina la tassazione",
          "Perché commissioni e costi di custodia possono annullare i vantaggi di un ETF efficiente",
          "Perché decide quando si può vendere",
          "Perché sceglie i dividendi"
        ],
        correct: 1,
        explanation: "Un ETF perfetto con TER 0.07% comprato su un broker che ti chiede €19 per operazione + €60 all'anno di custodia, su un PAC di €200 mensili, paga quasi il 10% di costi annui solo in commissioni. Il vantaggio dell'ETF è annullato. Broker low-cost (Trade Republic, Scalable) sono parte integrante della strategia."
      },
      {
        question: "Qual è l'errore opposto al 'inseguire rendimenti passati'?",
        options: [
          "Comprare solo bond",
          "Paralisi decisionale: analizzare così tanto da non comprare mai e perdere tempo di composizione",
          "Diversificare troppo",
          "Leggere troppi libri"
        ],
        correct: 1,
        explanation: "Cercare 'l'ETF perfetto assoluto' tra decine di alternative quasi identiche è una perdita di tempo che costa composti. Tra ETF globali di qualità le differenze sono marginali (0.1% annuo). Meglio comprare un ETF buono oggi che perdere mesi a decidere il migliore: il tempo nel mercato batte il timing di scelta perfetto."
      }
    ]
  },

  'pf-8': {
    intro: "Se hai letto tutti i capitoli precedenti, conosci teoria, strumenti, costruzione del portafoglio, ribilanciamento. Eppure la maggior parte degli investitori retail ottiene rendimenti mediocri anche sapendo tutto. Il motivo non è la mancanza di conoscenza: è la mancanza di disciplina emotiva. Secondo uno studio DALBAR decennale, l'investitore retail medio guadagna circa il 4-5% annuo mentre il mercato fa l'8-10%. La differenza si chiama 'behavior gap': il danno che facciamo a noi stessi con le nostre decisioni istintive. Questo capitolo è il più importante di tutto il manuale, perché chiude il cerchio tra teoria e realtà.",
    sections: [
      {
        heading: "Loss aversion: le perdite bruciano il doppio",
        body: "Daniel Kahneman, premio Nobel per l'economia comportamentale, ha dimostrato che il dolore di perdere €100 è circa il doppio del piacere di guadagnarne €100. Questo bias chiamato 'loss aversion' spiega perché durante i crolli vendiamo nel panico, cristallizzando la perdita, pur sapendo razionalmente che il mercato si riprenderà. Nel 2008 milioni di investitori hanno venduto al -40% per poi rientrare al +10% qualche anno dopo. Hanno regalato il 50% di rendimento alla loro paura. La strategia migliore è la più semplice: se il tuo portafoglio è coerente col tuo profilo di rischio, non guardarlo nei momenti di crisi. Letteralmente. Non aprire l'app."
      },
      {
        heading: "Recency bias: il futuro somiglia al presente",
        body: "Tendiamo a pensare che ciò che è successo recentemente continuerà. Nel 2021 il Nasdaq faceva +30%, tutti compravano Nasdaq. Nel 2022 il Nasdaq perdeva -33%, tutti vendevano. Il comportamento razionale (comprare a sconto) era l'opposto di quello istintivo. Il recency bias ti porta a rincorrere i settori caldi e a fuggire da quelli freddi — esattamente il peggior timing possibile. Rimedio: ancora la tua strategia a un piano scritto DECISO IN TEMPI CALMI, e non modificarla mai in tempi caldi."
      },
      {
        heading: "Confirmation bias: cerchiamo solo conferme",
        body: "Se hai comprato Tesla perché credi nel futuro elettrico, leggerai solo articoli pro-Tesla. Se hai comprato oro perché temi il crollo del sistema, frequenterai solo forum di permabear. È il confirmation bias: cerchiamo informazioni che confermano quello che già pensiamo, ignorando quelle che ci contraddicono. Nel contesto degli investimenti, questo ti porta a sovraconcentrarti in asset dove 'hai ragione' senza vedere i rischi. Rimedio: ogni 3-6 mesi prova a leggere attivamente la tesi opposta a quella in cui credi. Se dopo averla letta non cambi idea, almeno ci sei arrivato con cognizione."
      },
      {
        heading: "Anchoring: rimaniamo ancorati ai prezzi di acquisto",
        body: "Hai comprato un ETF a €100. Oggi vale €85. Non vuoi vendere perché 'aspetto che torni a 100'. Ma quel €100 è arbitrario: è il prezzo tuo, non del mercato. Il mercato non sa e non si interessa al tuo prezzo di ingresso. L'ancoraggio ti fa restare in investimenti sbagliati 'per non chiudere in perdita'. La domanda corretta non è 'ho guadagnato o perso dall'acquisto?' ma 'sapendo quello che so oggi, comprerei ancora questo ETF?'. Se la risposta è no, vendi a prescindere dal prezzo di acquisto."
      },
      {
        heading: "Overconfidence: siamo tutti sopra la media",
        body: "Uno studio classico chiede a guidatori se pensano di essere sopra la media. Il 93% risponde sì. Matematicamente impossibile. Lo stesso succede agli investitori: tutti pensiamo di essere più bravi della media. Questo ci porta a sovrastimare la nostra capacità di fare stock-picking, timing, e previsioni. Bill Miller, uno dei gestori più famosi della storia, ha battuto l'S&P 500 per 15 anni di fila. Nel 2008 la sua fortuna è collassata. Se lui non ce l'ha fatta, è probabile che nemmeno tu ce la faccia. L'umiltà è un vantaggio competitivo: accettare di essere nella media ti porta agli ETF e ai portafogli passivi, che matematicamente battono la maggior parte dei gestori attivi."
      },
      {
        heading: "FOMO: la paura di perdere l'occasione",
        body: "Il cugino ti racconta a cena che ha guadagnato il 200% con una cripto. L'amico ha preso Nvidia prima del boom. Il collega fa trading e 'guadagna ogni settimana'. Senti che stai perdendo qualcosa di enorme. È FOMO (Fear Of Missing Out), forse il bias più pericoloso della nostra epoca perché amplificato da social media e TikTok. Regola: ogni volta che senti che 'devi entrare in qualcosa ora', è probabilmente già troppo tardi. Le bolle si formano esattamente così: quando tutti ne parlano a cena, sono già al picco. La tua strategia boring da ETF globali avrà sempre periodi in cui altre cose sembrano molto più sexy. Resistere è la strategia."
      },
      {
        heading: "Sunk cost fallacy: 'ho già investito tanto'",
        body: "Hai messo €20.000 in un fondo attivo che va male. Sai razionalmente che dovresti uscire e passare a ETF. Ma pensi: 'ci ho messo tanto, ora se esco ho perso tutto'. Sbagliato. Quello che hai già perso è perso indipendentemente da cosa fai ORA. La domanda giusta è: 'partendo da zero, dove vorrei essere tra 10 anni?'. I €20.000 sono già tuoi oggi, nel posto X o nel posto Y. Sceglie liberamente il posto migliore per i prossimi 10 anni, ignorando la storia passata. Il sunk cost fallacy mantiene milioni di italiani in prodotti costosi delle banche per decenni."
      },
      {
        heading: "La soluzione: sistema, non forza di volontà",
        body: "Non puoi vincere contro i tuoi bias con la forza di volontà. Puoi solo costruire un sistema che renda gli errori difficili. Ecco come: primo, PAC automatico mensile — non decidi ogni mese se investire, investi punto. Secondo, regole scritte prima di investire — 'non vendo mai sotto il -20% senza consultare il documento', 'ribilancio solo il 15 gennaio'. Terzo, riduci la frequenza di controllo del portafoglio: chi guarda ogni giorno prende decisioni peggiori di chi guarda ogni 3 mesi. Quarto, separa decisioni tattiche dalla strategia — la strategia resta uguale 10 anni, le tattiche sono piccole (cambio ETF simile, non cambio asset allocation). Quinto, parla con qualcuno prima di qualsiasi operazione fuori piano: anche solo scriverla a un amico ti costringe a razionalizzarla."
      }
    ],
    keyPoints: [
      "Il 'behavior gap' fa perdere all'investitore medio circa il 50% del rendimento del mercato",
      "Loss aversion: le perdite pesano il doppio dei guadagni, generano panico nei crolli",
      "Recency bias: tendiamo a proiettare il presente nel futuro, comprando caldo e vendendo freddo",
      "Confirmation bias: cerchiamo conferme alle nostre idee, ignorando evidenze contrarie",
      "Anchoring: restiamo attaccati ai prezzi di acquisto, prendendo decisioni sbagliate",
      "Overconfidence: tutti pensiamo di essere sopra la media, ma matematicamente non lo siamo",
      "FOMO: la paura di perdere il trend ci fa entrare in bolle al loro picco",
      "Sunk cost: restiamo in investimenti sbagliati perché 'ci abbiamo già messo tanto'",
      "Soluzione: costruire un sistema automatico che renda gli errori emotivamente difficili"
    ],
    commonMistakes: [
      "Controllare il portafoglio ogni giorno o più volte al giorno",
      "Cambiare strategia in base alle notizie o ai consigli da cena",
      "Vendere durante i crolli per 'non perdere tutto'",
      "Rincorrere l'ETF più caldo del momento",
      "Restare in fondi bancari sbagliati 'perché ci ho investito tanto'",
      "Rifare continuamente i calcoli sul portafoglio senza un piano scritto",
      "Confidare nella propria forza di volontà invece di costruire un sistema automatico"
    ],
    example: {
      title: "Esempio: Chiara e Roberto, stessa strategia, esiti diversi",
      body: "Chiara e Roberto investono entrambi nel 2019 €30.000 su SWDA + EIMI + AGGH con allocazione 65/15/20. Stesso portafoglio, stesso broker, stesso PAC di €400/mese. A marzo 2020 il COVID fa crollare SWDA del -34% in 4 settimane. Chiara spegne l'app, non guarda per 3 mesi, continua il PAC automatico. Roberto controlla ossessivamente, nel panico vende tutto al -28% per 'salvare il salvabile', e aspetta 'tempi migliori' per rientrare. Il mercato recupera in 5 mesi. Chiara ha comprato a prezzi bassi con i PAC del periodo, il suo portafoglio a fine 2021 vale €52.000. Roberto è rientrato tardi, dopo il recupero, con solo €21.000 — i suoi €30.000 iniziali diventati €21.000 nonostante il mercato fosse tornato ai massimi. Differenza finale: €31.000 in più per Chiara, partendo dalla stessa strategia. Non per miglior scelta di ETF, ma per migliore gestione emotiva. La maggior parte dei rendimenti si decide qui, non sui ticker."
    },
    quiz: [
      {
        question: "Cos'è il 'behavior gap' degli investitori retail?",
        options: [
          "La differenza tra broker e banche",
          "La differenza tra rendimento del mercato e rendimento effettivo dell'investitore medio, causata da errori emotivi",
          "La differenza tra ETF attivi e passivi",
          "La tassazione sugli investimenti"
        ],
        correct: 1,
        explanation: "Studi decennali DALBAR mostrano che l'investitore retail medio ottiene circa il 4-5% annuo mentre il mercato fa l'8-10%. Questo gap è causato da vendite nei crolli, acquisti ai picchi, cambi di strategia — tutti errori emotivi. È il vero nemico del patrimonio."
      },
      {
        question: "Cosa significa 'loss aversion' secondo Kahneman?",
        options: [
          "L'amore per le perdite fiscali",
          "Il dolore di perdere una somma è circa il doppio del piacere di guadagnarla",
          "La tendenza a ignorare le perdite piccole",
          "La preferenza per asset sicuri"
        ],
        correct: 1,
        explanation: "Daniel Kahneman ha dimostrato che il cervello umano registra le perdite con intensità circa doppia rispetto ai guadagni di pari importo. Questo spiega perché vendiamo nel panico durante i crolli: il dolore della perdita supera la razionalità del 'aspettare che si riprenda'."
      },
      {
        question: "Qual è la domanda corretta da porsi per superare l'anchoring bias?",
        options: [
          "Ho guadagnato o perso rispetto al prezzo di acquisto?",
          "Sapendo quello che so oggi, comprerei ancora questo ETF?",
          "Ho investito troppo o troppo poco?",
          "Il mio vicino cosa farebbe?"
        ],
        correct: 1,
        explanation: "Il prezzo di acquisto è arbitrario e irrilevante per le decisioni future. La domanda corretta ignora la storia passata e guarda al presente: 'dato quello che so oggi, questo ETF è ancora la scelta giusta per il mio piano?'. Se no, vendi a prescindere dalla plusvalenza o dalla perdita."
      },
      {
        question: "Qual è la strategia più efficace per battere i propri bias cognitivi?",
        options: [
          "Leggere più libri di finanza",
          "Avere più forza di volontà",
          "Costruire un sistema automatico (PAC, regole scritte, bassa frequenza di controllo) che renda gli errori difficili",
          "Affidarsi completamente al consulente bancario"
        ],
        correct: 2,
        explanation: "La forza di volontà non funziona contro i bias — sono radicati nel nostro cervello. L'unica soluzione è un sistema automatico: PAC automatico, regole scritte prima di investire, controllo del portafoglio raro (trimestrale o meno), ribilanciamento a calendario fisso. Così gli errori emotivi diventano difficili da compiere."
      }
    ]
  }
};

const Impara = () => {
  const [view, setView] = useState('home'); // home | module | chapter
  const [currentModule, setCurrentModule] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [completedChapters, setCompletedChapters] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
  }

  if (view === 'chapter' && currentChapter) {
    return <ChapterView
      module={currentModule}
      chapter={currentChapter}
      content={chapterContent[currentChapter.id]}
      completed={completedChapters.has(currentChapter.id)}
      onComplete={() => setCompletedChapters(prev => new Set([...prev, currentChapter.id]))}
      onBack={() => { setView('module'); setCurrentChapter(null); }}
      onNext={() => {
        const chapters = currentModule.chapters;
        const idx = chapters.findIndex(c => c.id === currentChapter.id);
        if (idx < chapters.length - 1) setCurrentChapter(chapters[idx + 1]);
        else { setView('module'); setCurrentChapter(null); }
      }}
      onPrev={() => {
        const chapters = currentModule.chapters;
        const idx = chapters.findIndex(c => c.id === currentChapter.id);
        if (idx > 0) setCurrentChapter(chapters[idx - 1]);
      }}
    />;
  }

  if (view === 'module' && currentModule) {
    return <ModuleView
      module={currentModule}
      completedChapters={completedChapters}
      onBack={() => { setView('home'); setCurrentModule(null); }}
      onSelectChapter={(ch) => { setCurrentChapter(ch); setView('chapter'); }}
    />;
  }

  // Home view
  const totalChapters = manualModules.reduce((s, m) => s + m.chapters.length, 0);
  const completedCount = completedChapters.size;
  const progressPct = Math.round((completedCount / totalChapters) * 100);

  const levelColor = (level) => {
    if (level === 'Base') return 'success';
    if (level === 'Intermedio') return 'info';
    return 'warning';
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="p-6 md:p-10" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN_LIGHT, letterSpacing: '0.08em' }}>
            <BookOpen className="w-4 h-4" />
            Impara
          </div>
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            Manuale di finanza personale
          </h1>
          <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: '#B8C5D9' }}>
            Due percorsi approfonditi — gli ETF e come costruire un portafoglio — scritti in modo chiaro, con esempi concreti e senza gergo inutile. Non è consulenza finanziaria.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs mb-1" style={{ color: '#B8C5D9' }}>Progresso totale</p>
              <div className="flex items-center gap-3">
                <div className="w-48 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: GREEN_LIGHT }} />
                </div>
                <span className="text-sm font-semibold text-white">{completedCount} / {totalChapters} capitoli</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modules */}
      <div className="grid md:grid-cols-2 gap-4">
        {manualModules.map(m => {
          const mCompleted = m.chapters.filter(c => completedChapters.has(c.id)).length;
          const mPct = Math.round((mCompleted / m.chapters.length) * 100);
          return (
            <Card key={m.id} className="p-6 cursor-pointer transition-all hover:border-gray-300" onClick={() => { setCurrentModule(m); setView('module'); }} role="button" tabIndex={0}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color + '15' }}>
                  <m.icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: NAVY, letterSpacing: '-0.01em' }}>{m.title}</h3>
                  <p className="text-sm" style={{ color: GRAY_600 }}>{m.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: GRAY_600 }}>
                <span className="font-semibold">{m.chapters.length} capitoli</span>
                <span>·</span>
                <span>{m.chapters.reduce((s, c) => s + parseInt(c.readTime), 0)} min lettura</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: GRAY_100 }}>
                <div className="h-full rounded-full" style={{ width: `${mPct}%`, backgroundColor: m.color }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: GRAY_600 }}>{mCompleted} / {m.chapters.length} completati</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentModule(m); setView('module'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={{ backgroundColor: m.color, color: 'white' }}
                >
                  {mCompleted === 0 ? 'Inizia' : mCompleted === m.chapters.length ? 'Rivedi' : 'Continua'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick courses (former Academy) */}
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'white' }}>Percorsi rapidi</h2>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>Corsi più brevi e pratici per argomenti specifici</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {academyCourses.map((c, i) => (
            <Card key={i} className="p-5 cursor-pointer transition-all hover:border-gray-300" onClick={() => setSelectedCourse(c)} role="button" tabIndex={0}>
              <Label variant={levelColor(c.level)}>{c.level}</Label>
              <h3 className="font-semibold mt-3 mb-3 text-sm leading-snug" style={{ color: NAVY }}>{c.title}</h3>
              <div className="flex items-center gap-2 text-xs" style={{ color: GRAY_400 }}>
                <span>{c.lessons} lezioni</span>
                <span>•</span>
                <span>{c.duration}</span>
              </div>
              <div className="flex items-center justify-end mt-4">
                <ArrowUpRight className="w-4 h-4" style={{ color: BLUE }} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Goal-based */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Guide per obiettivo</h2>
        <p className="text-sm mb-5" style={{ color: GRAY_600 }}>Scegli il tuo obiettivo e scopri il percorso adatto</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { goal: 'Pensione integrativa', horizon: '20-40 anni', strategy: 'Growth 80/20', icon: Calendar },
            { goal: 'Indipendenza finanziaria', horizon: '10-20 anni', strategy: 'Aggressive 90/10', icon: Target },
            { goal: 'Acquisto casa', horizon: '5-10 anni', strategy: 'Balanced 50/50', icon: Home },
          ].map((g, i) => (
            <div key={i} className="p-5 rounded-md cursor-pointer" style={{ border: `1px solid ${GRAY_200}` }}>
              <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4" style={{ backgroundColor: GRAY_100 }}>
                <g.icon className="w-4 h-4" style={{ color: NAVY }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: NAVY }}>{g.goal}</h3>
              <p className="text-sm mb-4" style={{ color: GRAY_600 }}>Orizzonte: {g.horizon}</p>
              <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${GRAY_100}` }}>
                <span className="text-sm font-medium" style={{ color: NAVY }}>{g.strategy}</span>
                <ArrowRight className="w-4 h-4" style={{ color: BLUE }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#8B5416' }}>
            Questo manuale ha finalità educative. Non costituisce consulenza finanziaria personalizzata. Per decisioni di investimento rilevanti consulta un consulente abilitato.
          </p>
        </div>
      </Card>
    </div>
  );
};

const ModuleView = ({ module, completedChapters, onBack, onSelectChapter }) => {
  const completed = module.chapters.filter(c => completedChapters.has(c.id)).length;
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GREEN_LIGHT }}>
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna al manuale
      </button>

      <Card className="p-6 md:p-8">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: module.color + '15' }}>
            <module.icon className="w-6 h-6" style={{ color: module.color }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight mb-1" style={{ color: NAVY, letterSpacing: '-0.02em' }}>{module.title}</h1>
            <p className="text-sm" style={{ color: GRAY_600 }}>{module.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2 text-xs">
          <span style={{ color: GRAY_600 }}>Progresso modulo</span>
          <span className="font-semibold" style={{ color: NAVY }}>{completed} / {module.chapters.length} capitoli</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: GRAY_100 }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(completed / module.chapters.length) * 100}%`, backgroundColor: module.color }} />
        </div>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Capitoli</h2>
        <div className="space-y-2">
          {module.chapters.map(ch => {
            const isCompleted = completedChapters.has(ch.id);
            const hasContent = ch.hasContent;
            return (
              <button
                key={ch.id}
                onClick={() => hasContent && onSelectChapter(ch)}
                disabled={!hasContent}
                className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all disabled:cursor-not-allowed"
                style={{ border: `1px solid ${GRAY_200}`, backgroundColor: 'white', opacity: hasContent ? 1 : 0.6 }}
                onMouseEnter={(e) => { if (hasContent) e.currentTarget.style.borderColor = module.color; }}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = GRAY_200}
              >
                <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 font-semibold text-sm" style={{
                  backgroundColor: isCompleted ? GREEN : (hasContent ? module.color + '15' : GRAY_100),
                  color: isCompleted ? 'white' : (hasContent ? module.color : GRAY_400),
                }}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : ch.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: NAVY }}>{ch.title}</p>
                    {!hasContent && <Label variant="neutral">In arrivo</Label>}
                    {isCompleted && <Label variant="success">Completato</Label>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>{ch.readTime} di lettura</p>
                </div>
                {hasContent && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: GRAY_400 }} />}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const ChapterView = ({ module, chapter, content, completed, onComplete, onBack, onNext, onPrev }) => {
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizChecked, setQuizChecked] = useState(false);

  if (!content) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GREEN_LIGHT }}>
          <ArrowRight className="w-4 h-4 rotate-180" /> Torna al modulo
        </button>
        <Card className="p-10 text-center">
          <p className="text-4xl mb-4">📝</p>
          <h2 className="text-xl font-semibold mb-2" style={{ color: NAVY }}>Capitolo in arrivo</h2>
          <p className="text-sm" style={{ color: GRAY_600 }}>Questo capitolo sarà pubblicato nei prossimi aggiornamenti.</p>
        </Card>
      </div>
    );
  }

  const quizScore = quizChecked ? content.quiz.filter((q, i) => quizAnswers[i] === q.correct).length : 0;
  const allAnswered = content.quiz.every((_, i) => quizAnswers[i] !== undefined);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GREEN_LIGHT }}>
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna al modulo
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <module.icon className="w-3.5 h-3.5" />
          <span>{module.title}</span>
          <span>·</span>
          <span>Capitolo {chapter.num}</span>
          <span>·</span>
          <span>{chapter.readTime}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: 'white', letterSpacing: '-0.02em' }}>{chapter.title}</h1>
      </div>

      {/* Intro */}
      <Card className="p-6 md:p-8">
        <p className="text-base leading-relaxed italic" style={{ color: GRAY_600 }}>{content.intro}</p>
      </Card>

      {/* Sections */}
      {content.sections.map((s, i) => (
        <Card key={i} className="p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: NAVY, letterSpacing: '-0.01em' }}>{s.heading}</h2>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: GRAY_600 }}>{s.body}</p>
        </Card>
      ))}

      {/* Example */}
      {content.example && (
        <Card className="p-6" style={{ backgroundColor: '#E8F0FE', borderColor: '#C5D9F1' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: BLUE, letterSpacing: '0.08em' }}>💡 {content.example.title}</p>
          <p className="text-sm leading-relaxed" style={{ color: NAVY }}>{content.example.body}</p>
        </Card>
      )}

      {/* Key points */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4" style={{ color: NAVY }}>📌 Punti chiave da ricordare</h3>
        <ul className="space-y-2.5">
          {content.keyPoints.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm" style={{ color: GRAY_600 }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Common mistakes */}
      <Card className="p-6" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
        <h3 className="font-semibold mb-4" style={{ color: '#B45309' }}>⚠️ Errori comuni da evitare</h3>
        <ul className="space-y-2.5">
          {content.commonMistakes.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm" style={{ color: '#8B5416' }}>
              <span className="flex-shrink-0 font-bold">✗</span>
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Quiz */}
      {content.quiz && (
        <Card className="p-6 md:p-8">
          <h3 className="text-lg font-semibold mb-1" style={{ color: NAVY }}>🎯 Quiz finale</h3>
          <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Verifica la tua comprensione con {content.quiz.length} domande</p>
          <div className="space-y-6">
            {content.quiz.map((q, qi) => (
              <div key={qi}>
                <p className="font-semibold text-sm mb-3" style={{ color: NAVY }}>{qi + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = quizAnswers[qi] === oi;
                    const isCorrect = oi === q.correct;
                    const showResult = quizChecked;
                    let bg = 'white', border = GRAY_200, color = NAVY;
                    if (showResult) {
                      if (isCorrect) { bg = '#E6F4EC'; border = GREEN; color = GREEN; }
                      else if (selected && !isCorrect) { bg = '#FCEAE8'; border = RED; color = RED; }
                    } else if (selected) {
                      bg = '#E8F0FE'; border = BLUE;
                    }
                    return (
                      <button
                        key={oi}
                        onClick={() => !quizChecked && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                        disabled={quizChecked}
                        className="w-full flex items-center gap-3 p-3 rounded-md text-left text-sm transition-all"
                        style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{
                          backgroundColor: selected || (showResult && isCorrect) ? color : GRAY_100,
                          color: selected || (showResult && isCorrect) ? 'white' : GRAY_600,
                        }}>
                          {showResult && isCorrect ? '✓' : showResult && selected && !isCorrect ? '✗' : String.fromCharCode(65 + oi)}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                {quizChecked && (
                  <div className="mt-2 p-3 rounded-md" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
                    <p className="text-xs leading-relaxed" style={{ color: GRAY_600 }}>
                      <strong>Spiegazione:</strong> {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!quizChecked ? (
            <button
              onClick={() => setQuizChecked(true)}
              disabled={!allAnswered}
              className="mt-6 w-full py-3 rounded-md text-sm font-semibold disabled:opacity-40"
              style={{ backgroundColor: NAVY, color: 'white' }}
            >
              Verifica risposte
            </button>
          ) : (
            <div className="mt-6 p-4 rounded-md text-center" style={{ backgroundColor: quizScore === content.quiz.length ? '#E6F4EC' : '#FEF3E7' }}>
              <p className="text-lg font-semibold mb-1" style={{ color: quizScore === content.quiz.length ? GREEN : '#B45309' }}>
                {quizScore} / {content.quiz.length} corrette
              </p>
              <p className="text-xs" style={{ color: GRAY_600 }}>
                {quizScore === content.quiz.length ? 'Ottimo lavoro! Hai compreso tutti i concetti.' : 'Rileggi i punti chiave e riprova quando vuoi.'}
              </p>
              <button
                onClick={() => { setQuizAnswers({}); setQuizChecked(false); }}
                className="mt-3 text-xs font-semibold hover:underline"
                style={{ color: BLUE }}
              >
                Riprova il quiz
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="secondary" onClick={onPrev}>
          <ArrowRight className="w-4 h-4 rotate-180" /> Precedente
        </Button>
        <button
          onClick={() => { onComplete(); onNext(); }}
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-md text-sm font-semibold"
          style={{ backgroundColor: completed ? GREEN : NAVY, color: 'white' }}
        >
          {completed ? <><CheckCircle2 className="w-4 h-4" /> Già completato · Successivo</> : <>Completa capitolo · Successivo <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────
// ALERTS
// ─────────────────────────────────────────────────────────────

const AlertsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [presetType, setPresetType] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([
    { id: 1, etf: 'VWCE', isin: 'IE00BK5BQT80', type: 'below', threshold: 115, currentPrice: 118.22, active: true, channels: ['email', 'push'] },
    { id: 2, etf: 'SWDA', isin: 'IE00B4L5Y983', type: 'below', threshold: 88, currentPrice: 92.45, active: true, channels: ['email'] },
    { id: 3, etf: 'EIMI', isin: 'IE00BKM4GZ66', type: 'rebalance', threshold: 3, currentPrice: 32.18, active: true, channels: ['push'] },
    { id: 4, etf: 'SGLD', isin: 'IE00B579F325', type: 'above', threshold: 200, currentPrice: 195.40, active: true, channels: ['email', 'push'] },
    { id: 5, etf: 'CSSPX', isin: 'IE00B5BMR087', type: 'drop', threshold: 3, currentPrice: 548.30, active: false, channels: ['email'] },
  ]);

  const toggleAlert = (id) => setActiveAlerts(a => a.map(x => x.id === id ? { ...x, active: !x.active } : x));
  const deleteAlert = (id) => setActiveAlerts(a => a.filter(x => x.id !== id));

  const typeLabel = {
    below: 'Prezzo sotto',
    above: 'Prezzo sopra',
    drop: 'Calo giornaliero',
    rebalance: 'Ribilanciamento',
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Alert & Newsletter"
        description="Notifiche prima di ogni PAC, sintesi settimanale via email"
        action={<Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Nuovo alert</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Alert attivi', value: activeAlerts.filter(a => a.active).length.toString(), sub: `su ${activeAlerts.length} totali`, icon: Bell },
          { label: 'Trigger questo mese', value: '12', sub: '3 azioni completate', icon: Activity },
          { label: 'Prossimo PAC', value: '28 apr', sub: '€500 programmati', icon: Calendar },
        ].map((s, i) => (
          <Card key={i} className="p-4 md:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: GRAY_100 }}>
                <s.icon className="w-4 h-4" style={{ color: NAVY }} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: GRAY_600, letterSpacing: '0.06em' }}>{s.label}</p>
            </div>
            <p className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: NAVY, letterSpacing: '-0.02em' }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: GRAY_400 }}>{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Active alerts list */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: NAVY }}>I tuoi alert ({activeAlerts.length})</h2>
        </div>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: GRAY_400 }} />
            <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>Nessun alert creato</p>
            <p className="text-xs mb-4" style={{ color: GRAY_600 }}>Crea il tuo primo alert per ricevere notifiche</p>
            <Button variant="primary" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Crea alert</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map(a => {
              const triggered = (a.type === 'below' && a.currentPrice < a.threshold) || (a.type === 'above' && a.currentPrice > a.threshold);
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-md" style={{ border: `1px solid ${GRAY_200}`, backgroundColor: triggered && a.active ? '#FFF7ED' : 'white' }}>
                  <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.active ? '#E8F0FE' : GRAY_100 }}>
                    <Bell className="w-4 h-4" style={{ color: a.active ? BLUE : GRAY_400 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>{a.etf}</span>
                      <Label variant={a.active ? 'info' : 'neutral'}>{typeLabel[a.type]}</Label>
                      {triggered && a.active && <Label variant="warning">Attivato</Label>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>
                      {a.type === 'below' && `Quando scende sotto €${a.threshold} · attuale: €${a.currentPrice}`}
                      {a.type === 'above' && `Quando sale sopra €${a.threshold} · attuale: €${a.currentPrice}`}
                      {a.type === 'drop' && `Se scende oltre ${a.threshold}% in un giorno`}
                      {a.type === 'rebalance' && `Se devia oltre ${a.threshold}% dal target`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleAlert(a.id)}
                      className="px-2 py-1 text-xs font-medium rounded"
                      style={{ color: a.active ? GREEN : GRAY_600, backgroundColor: a.active ? '#E6F4EC' : GRAY_100 }}
                    >
                      {a.active ? 'Attivo' : 'Pausa'}
                    </button>
                    <button
                      onClick={() => deleteAlert(a.id)}
                      className="p-1.5 rounded hover:bg-red-50"
                      style={{ color: GRAY_400 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = RED}
                      onMouseLeave={(e) => e.currentTarget.style.color = GRAY_400}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Alert types reference */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Tipologie di alert disponibili</h2>
        <p className="text-xs mb-5" style={{ color: GRAY_600 }}>Clicca una tipologia per creare subito un alert di quel tipo</p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { type: 'below', name: 'Prezzo sopra/sotto soglia', desc: 'Alert di prezzo per individuare punti di ingresso', icon: TrendingDown },
            { type: 'drop', name: 'Calo giornaliero %', desc: 'Se un ETF scende oltre X% in un giorno', icon: TrendingDown },
            { type: 'rebalance', name: 'Target ribilanciamento', desc: 'Quando un asset supera ±X% dal peso target', icon: Activity },
            { type: 'dividend', name: 'Stacco dividendo', desc: 'Promemoria per ETF a distribuzione', icon: DollarSign },
            { type: 'ter-change', name: 'Cambio TER / delisting', desc: 'Notifiche importanti sui tuoi ETF', icon: AlertCircle },
            { type: 'pre-pac', name: 'Pre-PAC intelligente', desc: 'Suggerimento ottimale vicino al PAC', icon: Target },
          ].map((a, i) => (
            <button key={i} onClick={() => { setPresetType(a.type); setShowForm(true); }} className="flex gap-4 p-4 rounded-md cursor-pointer text-left transition-all" style={{ border: `1px solid ${GRAY_200}`, backgroundColor: 'white' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = GRAY_50; e.currentTarget.style.borderColor = NAVY; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = GRAY_200; }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GRAY_100 }}>
                <a.icon className="w-4 h-4" style={{ color: NAVY }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-0.5" style={{ color: NAVY }}>{a.name}</h3>
                <p className="text-xs mb-1.5" style={{ color: GRAY_600 }}>{a.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: BLUE }}>
                  <Plus className="w-3 h-3" /> Crea alert
                </span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Email Reports — NEW */}
      <EmailReportsCard />

      {showForm && <AlertForm presetType={presetType} onClose={() => { setShowForm(false); setPresetType(null); }} onSave={(newAlert) => {
        setActiveAlerts(prev => [...prev, { ...newAlert, id: Date.now(), active: true }]);
        setShowForm(false);
        setPresetType(null);
      }} />}
    </div>
  );
};

const EmailReportsCard = () => {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [includeNews, setIncludeNews] = useState(true);
  const [includeMovers, setIncludeMovers] = useState(true);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeCommentary, setIncludeCommentary] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (!email.includes('@')) return;
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
  };

  const frequencies = [
    { id: 'daily', label: 'Giornaliero', desc: 'Ogni mattina alle 08:00', icon: Sun },
    { id: 'weekly', label: 'Settimanale', desc: 'Domenica mattina', icon: Calendar },
    { id: 'monthly', label: 'Mensile', desc: 'Primo del mese', icon: Activity },
  ];

  return (
    <>
      <Card className="p-6 md:p-8" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN_LIGHT, letterSpacing: '0.08em' }}>
            <Mail className="w-4 h-4" />
            Report via email
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-3 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            Report dettagliato del tuo portafoglio
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#B8C5D9' }}>
            Ricevi un report automatico via email con andamento del portafoglio, ETF che si sono mossi di più, e le notizie che hanno maggiormente influenzato le tue posizioni nel periodo.
          </p>

          {/* Frequency */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#B8C5D9', letterSpacing: '0.06em' }}>Frequenza</p>
            <div className="grid grid-cols-3 gap-2">
              {frequencies.map(f => {
                const sel = frequency === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className="p-3 rounded-md text-left transition-all"
                    style={{
                      backgroundColor: sel ? 'rgba(134,239,172,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${sel ? GREEN_LIGHT : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <f.icon className="w-3.5 h-3.5" style={{ color: sel ? GREEN_LIGHT : 'rgba(255,255,255,0.7)' }} />
                      <p className="text-sm font-semibold" style={{ color: sel ? GREEN_LIGHT : 'white' }}>{f.label}</p>
                    </div>
                    <p className="text-[11px]" style={{ color: '#B8C5D9' }}>{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contents */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#B8C5D9', letterSpacing: '0.06em' }}>Contenuti del report</p>
            <div className="space-y-2">
              {[
                { id: 'performance', label: 'Andamento del portafoglio', desc: 'Valore, variazione, grafico performance nel periodo', checked: includePerformance, setter: setIncludePerformance },
                { id: 'movers', label: 'Top mover del periodo', desc: 'ETF che si sono mossi di più in positivo e negativo', checked: includeMovers, setter: setIncludeMovers },
                { id: 'news', label: 'Notizie impattanti', desc: 'Eventi di mercato che hanno mosso i tuoi ETF', checked: includeNews, setter: setIncludeNews },
                { id: 'alerts', label: 'Alert triggerati', desc: 'Alert attivi che si sono scatenati nel periodo', checked: includeAlerts, setter: setIncludeAlerts },
                { id: 'commentary', label: 'Commento professionale', desc: 'Breve analisi scritta (solo piano Pro)', checked: includeCommentary, setter: setIncludeCommentary, premium: true },
              ].map(opt => (
                <label key={opt.id} className="flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all" style={{
                  backgroundColor: opt.checked ? 'rgba(134,239,172,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${opt.checked ? 'rgba(134,239,172,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  <button
                    onClick={() => opt.setter(!opt.checked)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                    style={{
                      borderColor: opt.checked ? GREEN_LIGHT : 'rgba(255,255,255,0.3)',
                      backgroundColor: opt.checked ? GREEN_LIGHT : 'transparent',
                    }}
                  >
                    {opt.checked && <CheckCircle2 className="w-3 h-3" style={{ color: NAVY_DARK }} strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => opt.setter(!opt.checked)}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{opt.label}</p>
                      {opt.premium && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ backgroundColor: GREEN_LIGHT, color: NAVY_DARK }}>Pro</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#B8C5D9' }}>{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Email input */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua@email.it"
              className="flex-1 px-4 py-2.5 rounded-md text-sm text-white focus:outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2.5 rounded-md font-semibold text-sm whitespace-nowrap"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
            >
              Anteprima
            </button>
            <button
              onClick={handleSubscribe}
              disabled={!email.includes('@')}
              className="px-6 py-2.5 rounded-md font-semibold text-sm whitespace-nowrap disabled:opacity-40"
              style={{ color: NAVY_DARK, backgroundColor: GREEN_LIGHT }}
            >
              {subscribed ? '✓ Iscritto!' : 'Attiva report'}
            </button>
          </div>
          <p className="text-xs" style={{ color: '#B8C5D9' }}>Niente spam. Puoi disiscriverti da ogni email.</p>
        </div>
      </Card>

      {showPreview && <EmailReportPreview onClose={() => setShowPreview(false)} frequency={frequency} options={{ includeNews, includeMovers, includePerformance, includeAlerts, includeCommentary }} />}
    </>
  );
};

const EmailReportPreview = ({ onClose, frequency, options }) => {
  const freqLabel = { daily: 'giornaliero', weekly: 'settimanale', monthly: 'mensile' }[frequency];
  const periodLabel = { daily: 'ieri', weekly: 'questa settimana', monthly: 'questo mese' }[frequency];

  // Sample mock news items
  const newsItems = [
    { headline: 'Fed mantiene tassi invariati: reazione positiva dei mercati USA', source: 'Reuters', impact: 'positive', etfs: ['CSSPX', 'SWDA'], delta: '+1.8%' },
    { headline: 'BCE segnala possibile taglio tassi a giugno', source: 'Bloomberg', impact: 'positive', etfs: ['EUNK', 'CEU'], delta: '+0.9%' },
    { headline: 'Inflazione Cina sotto attese: pressione su emergenti', source: 'Financial Times', impact: 'negative', etfs: ['EIMI'], delta: '-1.2%' },
    { headline: 'Nvidia batte le stime: semiconduttori in rally', source: 'CNBC', impact: 'positive', etfs: ['SEMI', 'CNDX'], delta: '+3.4%' },
  ];

  const topMovers = {
    up: [
      { ticker: 'SEMI', name: 'VanEck Semiconductor', chg: 4.2 },
      { ticker: 'CSSPX', name: 'iShares Core S&P 500', chg: 1.8 },
      { ticker: 'SWDA', name: 'iShares Core MSCI World', chg: 1.2 },
    ],
    down: [
      { ticker: 'EIMI', name: 'iShares Core MSCI EM', chg: -1.2 },
      { ticker: 'AGGH', name: 'iShares Global Aggregate', chg: -0.4 },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,21,40,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Anteprima report {freqLabel}</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Esempio di come arriverà nella tua inbox</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" style={{ color: GRAY_600 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1" style={{ backgroundColor: GRAY_50 }}>
          {/* Email header mockup */}
          <div className="px-6 py-4 bg-white" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: GRAY_400 }}>
              <Mail className="w-3.5 h-3.5" />
              <span>ETF Tracker &lt;report@etftracker.app&gt;</span>
            </div>
            <p className="text-base font-semibold" style={{ color: NAVY }}>
              📊 Il tuo report {freqLabel} · {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Greeting */}
            <div>
              <p className="text-sm" style={{ color: NAVY }}>Ciao Marco,</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: GRAY_600 }}>
                Ecco il riepilogo del tuo portafoglio per {periodLabel}. Il tuo patrimonio è cresciuto del <strong style={{ color: GREEN }}>+2.4%</strong> nel periodo, grazie principalmente al rally dei semiconduttori.
              </p>
            </div>

            {options.includePerformance && (
              <div className="p-4 rounded-md bg-white" style={{ border: `1px solid ${GRAY_200}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>📈 Andamento portafoglio</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-[10px]" style={{ color: GRAY_600 }}>Valore attuale</p>
                    <p className="text-base font-semibold" style={{ color: NAVY }}>€24.850</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: GRAY_600 }}>Var. periodo</p>
                    <p className="text-base font-semibold" style={{ color: GREEN }}>+€582</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: GRAY_600 }}>Variazione %</p>
                    <p className="text-base font-semibold" style={{ color: GREEN }}>+2.40%</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={Array.from({ length: 20 }, (_, i) => ({ v: 24000 + i * 40 + Math.sin(i / 2) * 120 }))} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs><linearGradient id="miniG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GREEN} stopOpacity={0.3} /><stop offset="100%" stopColor={GREEN} stopOpacity={0} /></linearGradient></defs>
                    <Area type="monotone" dataKey="v" stroke={GREEN} strokeWidth={2} fill="url(#miniG)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {options.includeMovers && (
              <div className="p-4 rounded-md bg-white" style={{ border: `1px solid ${GRAY_200}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>🔥 Top mover del periodo</p>
                <div className="space-y-2">
                  {topMovers.up.map(m => (
                    <div key={m.ticker} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{m.ticker}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{m.name}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: GREEN }}>+{m.chg}%</p>
                    </div>
                  ))}
                  {topMovers.down.map(m => (
                    <div key={m.ticker} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{m.ticker}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{m.name}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: RED }}>{m.chg}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {options.includeNews && (
              <div className="p-4 rounded-md bg-white" style={{ border: `1px solid ${GRAY_200}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>📰 Notizie che hanno mosso il tuo portafoglio</p>
                <div className="space-y-3">
                  {newsItems.map((n, i) => (
                    <div key={i} className="pb-3" style={{ borderBottom: i < newsItems.length - 1 ? `1px solid ${GRAY_100}` : 'none' }}>
                      <div className="flex items-start gap-2 mb-1">
                        <div className="w-1 rounded-sm flex-shrink-0 mt-1" style={{ backgroundColor: n.impact === 'positive' ? GREEN : RED, height: 14 }} />
                        <p className="text-sm font-semibold flex-1" style={{ color: NAVY }}>{n.headline}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 text-xs flex-wrap">
                        <span style={{ color: GRAY_400 }}>{n.source}</span>
                        <span style={{ color: GRAY_400 }}>·</span>
                        <span style={{ color: GRAY_600 }}>Impatto su: <strong>{n.etfs.join(', ')}</strong></span>
                        <span className="font-semibold" style={{ color: n.impact === 'positive' ? GREEN : RED }}>{n.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {options.includeAlerts && (
              <div className="p-4 rounded-md bg-white" style={{ border: `1px solid ${GRAY_200}` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>🔔 Alert del periodo</p>
                <div className="p-3 rounded-md" style={{ backgroundColor: '#FFF7ED', border: `1px solid #FED7AA` }}>
                  <p className="text-sm font-semibold" style={{ color: '#B45309' }}>Alert triggerato: VWCE sotto €115</p>
                  <p className="text-xs mt-1" style={{ color: '#8B5416' }}>Il prezzo ha toccato €114.80 il 22 aprile. Potrebbe essere un buon momento per il PAC.</p>
                </div>
              </div>
            )}

            {options.includeCommentary && (
              <div className="p-4 rounded-md" style={{ backgroundColor: '#E8F0FE', border: `1px solid #C5D9F1` }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: BLUE, letterSpacing: '0.06em' }}>💬 Analisi del periodo</p>
                <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                  Il rally del settore semiconduttori ha trainato i mercati USA, ma l'esposizione emergenti del tuo portafoglio ha zavorrato leggermente la performance. La decisione della Fed di mantenere i tassi invariati supporta lo scenario soft landing, positivo per le azioni globali diversificate come SWDA.
                </p>
              </div>
            )}

            <p className="text-xs text-center pt-4" style={{ color: GRAY_400 }}>
              Disiscriviti · Modifica preferenze · © ETF Tracker
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertForm = ({ onClose, onSave, presetType }) => {
  const [etf, setEtf] = useState('VWCE');
  const [type, setType] = useState(presetType || 'below');
  const [threshold, setThreshold] = useState(presetType === 'drop' ? 3 : presetType === 'rebalance' ? 5 : 115);
  const [channels, setChannels] = useState(['email']);
  const [daysBefore, setDaysBefore] = useState(2);

  const selectedEtf = etfDatabase.find(e => e.ticker === etf) || etfDatabase[0];
  const toggleChannel = (c) => setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const alertTypes = [
    { id: 'below', label: 'Prezzo sotto', icon: TrendingDown, unit: '€', needsEtf: true, needsThreshold: true },
    { id: 'above', label: 'Prezzo sopra', icon: TrendingUp, unit: '€', needsEtf: true, needsThreshold: true },
    { id: 'drop', label: 'Calo giornaliero %', icon: TrendingDown, unit: '%', needsEtf: true, needsThreshold: true },
    { id: 'rebalance', label: 'Ribilanciamento', icon: Activity, unit: '%', needsEtf: true, needsThreshold: true },
    { id: 'dividend', label: 'Stacco dividendo', icon: DollarSign, unit: 'giorni prima', needsEtf: true, needsThreshold: false },
    { id: 'ter-change', label: 'Cambio TER / delisting', icon: AlertCircle, unit: null, needsEtf: true, needsThreshold: false },
    { id: 'pre-pac', label: 'Pre-PAC intelligente', icon: Target, unit: 'giorni prima', needsEtf: false, needsThreshold: false },
  ];

  const currentType = alertTypes.find(t => t.id === type) || alertTypes[0];

  const handleSave = () => {
    onSave({
      etf: currentType.needsEtf ? selectedEtf.ticker : '—',
      isin: currentType.needsEtf ? selectedEtf.isin : null,
      type,
      threshold: currentType.needsThreshold ? parseFloat(threshold) : (type === 'dividend' || type === 'pre-pac' ? daysBefore : null),
      currentPrice: selectedEtf.price,
      channels,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,21,40,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Nuovo alert</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Ricevi una notifica quando la condizione si verifica</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" style={{ color: GRAY_600 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Tipo di alert</label>
            <div className="grid grid-cols-2 gap-2">
              {alertTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-all text-left"
                  style={{
                    border: `1px solid ${type === t.id ? NAVY : GRAY_200}`,
                    backgroundColor: type === t.id ? '#E8F0FE' : 'white',
                    color: type === t.id ? NAVY : GRAY_600,
                  }}
                >
                  <t.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {currentType.needsEtf && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>ETF</label>
              <select
                value={etf}
                onChange={(e) => setEtf(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none cursor-pointer"
                style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
              >
                {etfDatabase.map(e => <option key={e.isin} value={e.ticker}>{e.ticker} — {e.name}</option>)}
              </select>
              <p className="text-xs mt-1.5" style={{ color: GRAY_600 }}>Prezzo attuale: <span className="font-semibold" style={{ color: NAVY }}>{fmtFull(selectedEtf.price)}</span></p>
            </div>
          )}

          {!currentType.needsEtf && type === 'pre-pac' && (
            <div className="p-3 rounded-md" style={{ backgroundColor: '#E8F0FE', border: `1px solid #C5D9F1` }}>
              <p className="text-xs" style={{ color: NAVY }}>
                <strong>Pre-PAC intelligente</strong>: un promemoria ti segnala <strong>{daysBefore} giorni prima</strong> del tuo PAC mensile. Se qualche ETF è sotto target, ti suggerisce dove allocare per ribilanciare automaticamente.
              </p>
            </div>
          )}

          {currentType.needsThreshold && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>
                {type === 'below' || type === 'above' ? 'Soglia (€)' : 'Percentuale (%)'}
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                step={type === 'below' || type === 'above' ? 0.01 : 0.5}
                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
              />
            </div>
          )}

          {(type === 'dividend' || type === 'pre-pac') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: NAVY }}>Giorni prima</label>
                <span className="text-xs font-semibold" style={{ color: NAVY }}>{daysBefore}</span>
              </div>
              <input type="range" min={1} max={14} value={daysBefore} onChange={(e) => setDaysBefore(parseInt(e.target.value))} className="w-full" style={{ accentColor: NAVY }} />
            </div>
          )}

          {type === 'ter-change' && (
            <div className="p-3 rounded-md" style={{ backgroundColor: '#FEF3E7', border: `1px solid #F6C98A` }}>
              <p className="text-xs" style={{ color: '#8B5416' }}>
                Riceverai una notifica automatica se il TER dell'ETF selezionato aumenta, o se viene annunciato il delisting. Nessuna soglia da configurare.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Canali di notifica</label>
            <div className="flex gap-2">
              {[
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'push', label: 'Push', icon: Bell },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleChannel(c.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    border: `1px solid ${channels.includes(c.id) ? NAVY : GRAY_200}`,
                    backgroundColor: channels.includes(c.id) ? '#E8F0FE' : 'white',
                    color: channels.includes(c.id) ? NAVY : GRAY_600,
                  }}
                >
                  <c.icon className="w-3.5 h-3.5" />
                  {c.label}
                  {channels.includes(c.id) && <CheckCircle2 className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-md" style={{ backgroundColor: '#F7F9FC', border: `1px solid ${GRAY_200}` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: NAVY }}>Riepilogo</p>
            <p className="text-xs" style={{ color: GRAY_600 }}>
              Riceverai una notifica via <strong>{channels.join(' e ') || 'nessun canale'}</strong>
              {type === 'below' && ` quando ${selectedEtf.ticker} scenderà sotto €${threshold}`}
              {type === 'above' && ` quando ${selectedEtf.ticker} salirà sopra €${threshold}`}
              {type === 'drop' && ` quando ${selectedEtf.ticker} scenderà oltre ${threshold}% in un giorno`}
              {type === 'rebalance' && ` quando ${selectedEtf.ticker} devierà oltre ${threshold}% dal target`}
              {type === 'dividend' && ` ${daysBefore} giorni prima dello stacco dividendo di ${selectedEtf.ticker}`}
              {type === 'ter-change' && ` se il TER di ${selectedEtf.ticker} cambia o se viene annunciato il delisting`}
              {type === 'pre-pac' && ` ${daysBefore} giorni prima del tuo PAC mensile, con suggerimenti`}
              .
            </p>
          </div>
        </div>

        <div className="p-5 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
          <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
          <button
            onClick={handleSave}
            disabled={channels.length === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm disabled:opacity-50"
            style={{ backgroundColor: NAVY, color: 'white' }}
          >
            <CheckCircle2 className="w-4 h-4" /> Crea alert
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SEARCH ETF
// ─────────────────────────────────────────────────────────────

const CompareEtfs = ({ etfs, onBack, onRemove, onAdd }) => {
  const colors = [NAVY, GREEN, '#B45309', '#6366F1'];

  // Simulated 5y price history for chart (indexed to 100)
  const priceData = useMemo(() => {
    const n = 60;
    return Array.from({ length: n }, (_, i) => {
      const point = { month: i, date: `M${i + 1}` };
      etfs.forEach((etf, idx) => {
        const totalReturn = etf.chg5y / 100;
        const progress = i / (n - 1);
        const baseValue = 100 * (1 + totalReturn * progress);
        const volatility = etf.asset === 'Obbligazionario' ? 3 : etf.asset === 'Monetario' ? 0.5 : etf.asset === 'Commodities' ? 8 : 6;
        const noise = Math.sin(i / 4 + idx) * volatility + Math.cos(i / 7 + idx * 2) * (volatility * 0.5);
        point[etf.ticker] = Math.round((baseValue + noise) * 100) / 100;
      });
      return point;
    });
  }, [etfs]);

  // Rating normalization for scoring
  const scoreEtf = (etf) => {
    let score = 0;
    if (etf.ter <= 0.10) score += 3;
    else if (etf.ter <= 0.25) score += 2;
    else if (etf.ter <= 0.50) score += 1;
    if (etf.aum >= 10000) score += 3;
    else if (etf.aum >= 1000) score += 2;
    else if (etf.aum >= 500) score += 1;
    score += etf.rating - 2;
    return score;
  };

  const bestByMetric = {
    ter: [...etfs].sort((a, b) => a.ter - b.ter)[0]?.isin,
    aum: [...etfs].sort((a, b) => b.aum - a.aum)[0]?.isin,
    chg1y: [...etfs].sort((a, b) => b.chg1y - a.chg1y)[0]?.isin,
    chg5y: [...etfs].sort((a, b) => b.chg5y - a.chg5y)[0]?.isin,
    rating: [...etfs].sort((a, b) => b.rating - a.rating)[0]?.isin,
    score: [...etfs].sort((a, b) => scoreEtf(b) - scoreEtf(a))[0]?.isin,
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: GREEN_LIGHT }}>
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla ricerca
      </button>

      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-7 rounded-sm" style={{ backgroundColor: GREEN_LIGHT }} />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: 'white', letterSpacing: '-0.02em' }}>Confronto ETF</h1>
        </div>
        <p className="text-sm ml-4" style={{ color: 'rgba(255,255,255,0.6)' }}>Stai confrontando {etfs.length} ETF. Il migliore per ogni metrica è evidenziato in verde.</p>
      </div>

      {/* Headers card */}
      <div className={`grid gap-3 grid-cols-1 ${etfs.length === 2 ? 'md:grid-cols-2' : etfs.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {etfs.map((e, i) => (
          <Card key={e.isin} className="p-4 relative" style={{ borderTop: `3px solid ${colors[i]}` }}>
            <button onClick={() => onRemove(e.isin)} className="absolute top-2 right-2 p-1 rounded hover:bg-red-50" style={{ color: GRAY_400 }}
              onMouseEnter={(ev) => ev.currentTarget.style.color = RED}
              onMouseLeave={(ev) => ev.currentTarget.style.color = GRAY_400}>
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-[9px] flex-shrink-0" style={{ backgroundColor: colors[i] }}>
                {e.ticker.slice(0, 4)}
              </div>
              <div className="min-w-0 flex-1 pr-5">
                <p className="font-semibold text-sm truncate" style={{ color: NAVY }}>{e.ticker}</p>
                <p className="text-[10px] font-mono truncate" style={{ color: GRAY_400 }}>{e.isin}</p>
              </div>
            </div>
            <p className="text-xs line-clamp-2 mb-3" style={{ color: GRAY_600 }}>{e.name}</p>
            <p className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>{fmtFull(e.price)}</p>
            <div className="flex items-center gap-1 text-xs font-semibold mt-0.5" style={{ color: e.chg1d >= 0 ? GREEN : RED }}>
              {e.chg1d >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {e.chg1d >= 0 ? '+' : ''}{e.chg1d.toFixed(2)}% oggi
            </div>
            <button onClick={() => onAdd && onAdd(e)} className="mt-3 w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-semibold" style={{ backgroundColor: '#E8F0FE', color: NAVY }}>
              <Plus className="w-3 h-3" /> Aggiungi
            </button>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Performance a confronto</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Valore normalizzato a 100 negli ultimi 5 anni</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={priceData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
            <XAxis dataKey="date" stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
            <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(0)} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12, padding: '10px' }} formatter={(v) => v.toFixed(2)} />
            <ReferenceLine y={100} stroke={GRAY_400} strokeDasharray="3 3" strokeWidth={1} label={{ value: 'Base 100', position: 'insideTopRight', fill: GRAY_400, fontSize: 10 }} />
            {etfs.map((e, i) => (
              <Line key={e.isin} type="monotone" dataKey={e.ticker} stroke={colors[i]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          {etfs.map((e, i) => (
            <div key={e.isin} className="flex items-center gap-2"><div className="w-3 h-0.5" style={{ backgroundColor: colors[i] }} /><span style={{ color: GRAY_600 }}>{e.ticker}</span></div>
          ))}
        </div>
      </Card>

      {/* Costs comparison */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: NAVY }}>Costi a confronto (impatto cumulativo su €10.000)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={etfs.map(e => ({ ticker: e.ticker, ter: parseFloat((10000 * e.ter / 100 * 10).toFixed(0)) }))} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
            <XAxis dataKey="ticker" stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
            <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v)} />
            <Bar dataKey="ter" radius={[4, 4, 0, 0]}>
              {etfs.map((e, i) => <Cell key={e.isin} fill={colors[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] mt-2" style={{ color: GRAY_400 }}>Costo totale stimato in 10 anni su €10.000 investiti, solo TER. Spread e commissioni non inclusi.</p>
      </Card>

      {/* Full comparison table */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: NAVY }}>Tutti i parametri</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                <th className="text-left font-medium py-3 pr-4 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Parametro</th>
                {etfs.map((e, i) => (
                  <th key={e.isin} className="text-right font-medium py-3 px-3 text-xs uppercase tracking-wide" style={{ color: colors[i] }}>{e.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'issuer', label: 'Gestore', fmt: (v) => v },
                { key: 'asset', label: 'Asset class', fmt: (v) => v },
                { key: 'region', label: 'Esposizione / Area', fmt: (v) => v },
                { key: 'ter', label: 'TER annuo', fmt: (v) => `${v.toFixed(2)}%`, bestKey: 'ter' },
                { key: 'aum', label: 'AUM (€ milioni)', fmt: (v) => v.toLocaleString('it-IT'), bestKey: 'aum' },
                { key: 'price', label: 'Prezzo attuale', fmt: (v) => fmtFull(v) },
                { key: 'chg1d', label: 'Variazione 1D', fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
                { key: 'chg1y', label: 'Rendimento 1Y', fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, bestKey: 'chg1y' },
                { key: 'chg5y', label: 'Rendimento 5Y', fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, bestKey: 'chg5y' },
                { key: 'replication', label: 'Replica', fmt: (v) => v },
                { key: 'distribution', label: 'Distribuzione', fmt: (v) => v },
                { key: 'domicile', label: 'Domicilio', fmt: (v) => v },
                { key: 'rating', label: 'Rating', fmt: (v) => '★'.repeat(v) + '☆'.repeat(5 - v), bestKey: 'rating' },
              ].map((row, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                  <td className="py-3 pr-4 text-xs font-medium" style={{ color: GRAY_600 }}>{row.label}</td>
                  {etfs.map(e => {
                    const val = e[row.key];
                    const isBest = row.bestKey && bestByMetric[row.bestKey] === e.isin && etfs.length > 1;
                    return (
                      <td key={e.isin} className="py-3 px-3 text-right text-sm" style={{
                        color: isBest ? GREEN : NAVY,
                        fontWeight: isBest ? 700 : 500,
                        backgroundColor: isBest ? '#E6F4EC' : 'transparent',
                      }}>
                        {row.fmt(val)}
                        {isBest && <span className="ml-1">✓</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
                <td className="py-3 pr-4 text-xs font-semibold" style={{ color: NAVY }}>Punteggio complessivo</td>
                {etfs.map(e => {
                  const score = scoreEtf(e);
                  const isBest = bestByMetric.score === e.isin && etfs.length > 1;
                  return (
                    <td key={e.isin} className="py-3 px-3 text-right" style={{
                      color: isBest ? GREEN : NAVY,
                      fontWeight: 700,
                      backgroundColor: isBest ? '#E6F4EC' : 'transparent',
                    }}>
                      {score}/11 {isBest && '✓'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Verdict */}
      <Card className="p-5 md:p-6" style={{ backgroundColor: '#E6F4EC', borderColor: '#86D3A3' }}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#0F5C2E' }}>
              Il migliore complessivo: {etfs.find(e => e.isin === bestByMetric.score)?.ticker}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#0F5C2E' }}>
              Punteggio calcolato su TER, AUM e rating Morningstar. Non considera fiscalità specifica, spread reali e preferenze personali. Il "migliore" dipende anche da orizzonte, obiettivo e broker usato.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const SearchPage = ({ onAddToPortfolio }) => {
  const [query, setQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('Tutti');
  const [regionFilter, setRegionFilter] = useState('Tutte');
  const [distFilter, setDistFilter] = useState('Tutte');
  const [replicationFilter, setReplicationFilter] = useState('Tutte');
  const [domicileFilter, setDomicileFilter] = useState('Tutti');
  const [issuerFilter, setIssuerFilter] = useState('Tutti');
  const [maxTer, setMaxTer] = useState(1.0);
  const [minAum, setMinAum] = useState(0);
  const [selected, setSelected] = useState(null);
  const [sortBy, setSortBy] = useState('aum');
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleCompare = (etf) => {
    setCompareList(prev => {
      if (prev.find(e => e.isin === etf.isin)) return prev.filter(e => e.isin !== etf.isin);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, etf];
    });
  };

  const clearCompare = () => { setCompareList([]); setShowCompare(false); };

  const resetFilters = () => {
    setAssetFilter('Tutti'); setRegionFilter('Tutte'); setDistFilter('Tutte');
    setReplicationFilter('Tutte'); setDomicileFilter('Tutti'); setIssuerFilter('Tutti');
    setMaxTer(1.0); setMinAum(0); setQuery('');
  };

  const assetClasses = ['Tutti', 'Azionario', 'Obbligazionario', 'Commodities', 'Monetario', 'Azionario Settoriale', 'Azionario Factor', 'Azionario ESG', 'Azionario Dividendi', 'Azionario Small Cap'];
  const regions = ['Tutte', 'Globale', 'Globale Sviluppati', 'USA', 'USA Tech', 'Europa', 'Eurozona', 'UK', 'Giappone', 'Asia Pacifico', 'Emergenti', 'Cina', 'India', 'Globale Small Cap'];
  const distributions = ['Tutte', 'Accumulazione', 'Distribuzione', 'N/A'];
  const replications = ['Tutte', 'Fisica', 'Campionamento', 'Sintetica'];
  const domiciles = ['Tutti', 'Irlanda', 'Lussemburgo', 'Germania', 'Jersey'];
  const issuers = ['Tutti', ...new Set(etfDatabase.map(e => e.issuer))].sort();

  const filtered = useMemo(() => {
    let result = etfDatabase.filter(e => {
      const matchQuery = !query ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.ticker.toLowerCase().includes(query.toLowerCase()) ||
        e.isin.toLowerCase().includes(query.toLowerCase()) ||
        e.issuer.toLowerCase().includes(query.toLowerCase());
      const matchAsset = assetFilter === 'Tutti' || e.asset === assetFilter;
      const matchRegion = regionFilter === 'Tutte' || e.region === regionFilter;
      const matchDist = distFilter === 'Tutte' || e.distribution === distFilter;
      const matchReplication = replicationFilter === 'Tutte' || e.replication === replicationFilter;
      const matchDomicile = domicileFilter === 'Tutti' || e.domicile === domicileFilter;
      const matchIssuer = issuerFilter === 'Tutti' || e.issuer === issuerFilter;
      const matchTer = e.ter <= maxTer;
      const matchAum = e.aum >= minAum;
      return matchQuery && matchAsset && matchRegion && matchDist && matchReplication && matchDomicile && matchIssuer && matchTer && matchAum;
    });
    result.sort((a, b) => {
      if (sortBy === 'aum') return b.aum - a.aum;
      if (sortBy === 'ter') return a.ter - b.ter;
      if (sortBy === 'chg1y') return b.chg1y - a.chg1y;
      if (sortBy === 'chg5y') return b.chg5y - a.chg5y;
      return 0;
    });
    return result;
  }, [query, assetFilter, regionFilter, distFilter, replicationFilter, domicileFilter, issuerFilter, maxTer, minAum, sortBy]);

  if (selected) {
    return <EtfDetail etf={selected} onBack={() => setSelected(null)} onAdd={onAddToPortfolio} />;
  }

  if (showCompare && compareList.length >= 2) {
    return <CompareEtfs etfs={compareList} onBack={() => setShowCompare(false)} onRemove={(isin) => setCompareList(prev => prev.filter(e => e.isin !== isin))} onAdd={onAddToPortfolio} />;
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cerca ETF"
        description={`${etfDatabase.length} ETF UCITS nel database — ricerca per nome, ticker, ISIN o emittente`}
      />

      <Card className="p-5">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: GRAY_400 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="es. SWDA, IE00B4L5Y983, iShares Core MSCI World…"
            className="w-full pl-12 pr-4 py-3.5 rounded-md text-sm focus:outline-none"
            style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: GRAY_600 }}>
            <Filter className="w-3.5 h-3.5" /> Filtri:
          </div>
          <FilterSelect label="Asset class" value={assetFilter} options={assetClasses} onChange={setAssetFilter} />
          <FilterSelect label="Area" value={regionFilter} options={regions} onChange={setRegionFilter} />
          <FilterSelect label="Distribuzione" value={distFilter} options={distributions} onChange={setDistFilter} />
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all"
            style={{
              backgroundColor: advancedOpen ? NAVY : GRAY_50,
              border: `1px solid ${advancedOpen ? NAVY : GRAY_200}`,
              color: advancedOpen ? 'white' : NAVY,
            }}
          >
            <Filter className="w-3 h-3" />
            Filtri avanzati {advancedOpen ? '▲' : '▼'}
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: GRAY_600 }}>
            <span>Ordina:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium focus:outline-none cursor-pointer"
              style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
            >
              <option value="aum">Dimensione (AUM)</option>
              <option value="ter">TER più basso</option>
              <option value="chg1y">Rendimento 1Y</option>
              <option value="chg5y">Rendimento 5Y</option>
            </select>
          </div>
        </div>

        {advancedOpen && (
          <div className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ borderTop: `1px solid ${GRAY_100}` }}>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Tipo di replica</label>
              <select value={replicationFilter} onChange={(e) => setReplicationFilter(e.target.value)} className="w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none cursor-pointer"
                style={{ backgroundColor: replicationFilter !== 'Tutte' ? '#E8F0FE' : GRAY_50, border: `1px solid ${replicationFilter !== 'Tutte' ? BLUE : GRAY_200}`, color: replicationFilter !== 'Tutte' ? BLUE : NAVY }}>
                {replications.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Domicilio</label>
              <select value={domicileFilter} onChange={(e) => setDomicileFilter(e.target.value)} className="w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none cursor-pointer"
                style={{ backgroundColor: domicileFilter !== 'Tutti' ? '#E8F0FE' : GRAY_50, border: `1px solid ${domicileFilter !== 'Tutti' ? BLUE : GRAY_200}`, color: domicileFilter !== 'Tutti' ? BLUE : NAVY }}>
                {domiciles.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Gestore</label>
              <select value={issuerFilter} onChange={(e) => setIssuerFilter(e.target.value)} className="w-full px-3 py-2 rounded-md text-xs font-medium focus:outline-none cursor-pointer"
                style={{ backgroundColor: issuerFilter !== 'Tutti' ? '#E8F0FE' : GRAY_50, border: `1px solid ${issuerFilter !== 'Tutti' ? BLUE : GRAY_200}`, color: issuerFilter !== 'Tutti' ? BLUE : NAVY }}>
                {issuers.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: NAVY }}>TER massimo</label>
                <span className="text-xs font-semibold" style={{ color: NAVY }}>{maxTer.toFixed(2)}%</span>
              </div>
              <input type="range" min={0.03} max={1} step={0.01} value={maxTer} onChange={(e) => setMaxTer(parseFloat(e.target.value))} className="w-full" style={{ accentColor: NAVY }} />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: GRAY_400 }}>
                <span>0.03%</span><span>1.00%</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: NAVY }}>AUM minimo</label>
                <span className="text-xs font-semibold" style={{ color: NAVY }}>€{minAum.toLocaleString('it-IT')}M</span>
              </div>
              <input type="range" min={0} max={10000} step={100} value={minAum} onChange={(e) => setMinAum(parseInt(e.target.value))} className="w-full" style={{ accentColor: NAVY }} />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: GRAY_400 }}>
                <span>€0M</span><span>€10B+</span>
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={resetFilters} className="w-full px-3 py-2 rounded-md text-xs font-semibold" style={{ backgroundColor: '#FCEAE8', color: RED }}>
                Resetta tutti i filtri
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="text-xs font-medium flex items-center justify-between" style={{ color: 'rgba(255,255,255,0.7)' }}>
        <span>{filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'}</span>
        {(query || assetFilter !== 'Tutti' || regionFilter !== 'Tutte' || distFilter !== 'Tutte' || replicationFilter !== 'Tutte' || domicileFilter !== 'Tutti' || issuerFilter !== 'Tutti' || maxTer < 1 || minAum > 0) && (
          <button
            onClick={resetFilters}
            className="text-xs font-semibold hover:underline"
            style={{ color: BLUE }}
          >
            Pulisci filtri
          </button>
        )}
      </div>

      {compareList.length > 0 && (
        <Card className="p-4" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4" style={{ color: GREEN_LIGHT }} />
                <span className="text-sm font-semibold text-white">{compareList.length} ETF selezionati</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>(max 4)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {compareList.map(e => (
                  <div key={e.isin} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>
                    {e.ticker}
                    <button onClick={() => toggleCompare(e)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={clearCompare} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>Annulla</button>
              <button
                onClick={() => setShowCompare(true)}
                disabled={compareList.length < 2}
                className="px-4 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40"
                style={{ backgroundColor: GREEN_LIGHT, color: NAVY_DARK }}
              >
                Confronta →
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: GRAY_50, borderBottom: `1px solid ${GRAY_200}` }}>
                <th className="text-center font-semibold px-3 py-3 text-xs uppercase tracking-wider w-10" style={{ color: GRAY_600 }}></th>
                <th className="text-left font-semibold px-5 py-3 text-xs uppercase tracking-wider" style={{ color: GRAY_600 }}>ETF</th>
                <th className="text-left font-semibold px-3 py-3 text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: GRAY_600 }}>Asset / Area</th>
                <th className="text-right font-semibold px-3 py-3 text-xs uppercase tracking-wider" style={{ color: GRAY_600 }}>TER</th>
                <th className="text-right font-semibold px-3 py-3 text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: GRAY_600 }}>AUM (M€)</th>
                <th className="text-right font-semibold px-3 py-3 text-xs uppercase tracking-wider" style={{ color: GRAY_600 }}>1Y</th>
                <th className="text-right font-semibold px-3 py-3 text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: GRAY_600 }}>5Y</th>
                <th className="text-right font-semibold px-5 py-3 text-xs uppercase tracking-wider" style={{ color: GRAY_600 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const isChecked = compareList.some(c => c.isin === e.isin);
                return (
                <tr
                  key={e.isin}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelected(e)}
                  style={{ borderBottom: `1px solid ${GRAY_100}`, backgroundColor: isChecked ? '#E8F0FE' : 'transparent' }}
                  onMouseEnter={(ev) => { if (!isChecked) ev.currentTarget.style.backgroundColor = GRAY_50; }}
                  onMouseLeave={(ev) => { if (!isChecked) ev.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td className="px-3 py-4 text-center" onClick={(ev) => { ev.stopPropagation(); toggleCompare(e); }}>
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all" style={{
                      borderColor: isChecked ? NAVY : GRAY_200,
                      backgroundColor: isChecked ? NAVY : 'white',
                    }}>
                      {isChecked && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0" style={{ backgroundColor: NAVY }}>
                        {e.ticker.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: NAVY }}>{e.ticker}</span>
                          <span className="text-xs" style={{ color: GRAY_400 }}>•</span>
                          <span className="text-xs font-mono" style={{ color: GRAY_600 }}>{e.isin}</span>
                        </div>
                        <p className="text-xs truncate max-w-xs" style={{ color: GRAY_600 }}>{e.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 hidden md:table-cell">
                    <div className="text-xs" style={{ color: NAVY }}>{e.asset}</div>
                    <div className="text-xs" style={{ color: GRAY_600 }}>{e.region}</div>
                  </td>
                  <td className="px-3 py-4 text-right text-xs font-medium" style={{ color: NAVY }}>{e.ter.toFixed(2)}%</td>
                  <td className="px-3 py-4 text-right text-xs hidden lg:table-cell" style={{ color: GRAY_600 }}>{e.aum.toLocaleString('it-IT')}</td>
                  <td className="px-3 py-4 text-right text-xs font-semibold" style={{ color: e.chg1y >= 0 ? GREEN : RED }}>
                    {e.chg1y >= 0 ? '+' : ''}{e.chg1y.toFixed(1)}%
                  </td>
                  <td className="px-3 py-4 text-right text-xs font-semibold hidden md:table-cell" style={{ color: e.chg5y >= 0 ? GREEN : RED }}>
                    {e.chg5y >= 0 ? '+' : ''}{e.chg5y.toFixed(1)}%
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); if (onAddToPortfolio) onAddToPortfolio(e); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
                      style={{ backgroundColor: '#E8F0FE', color: NAVY }}
                      onMouseEnter={(ev) => { ev.currentTarget.style.backgroundColor = NAVY; ev.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = '#E8F0FE'; ev.currentTarget.style.color = NAVY; }}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden md:inline">Aggiungi</span>
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: GRAY_400 }} />
            <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>Nessun ETF trovato</p>
            <p className="text-xs" style={{ color: GRAY_600 }}>Prova a modificare i filtri o la ricerca</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const FilterSelect = ({ label, value, options, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-1.5 rounded-md text-xs font-medium focus:outline-none cursor-pointer"
    style={{ backgroundColor: value !== options[0] ? '#E8F0FE' : GRAY_50, border: `1px solid ${value !== options[0] ? BLUE : GRAY_200}`, color: value !== options[0] ? BLUE : NAVY }}
  >
    {options.map(o => <option key={o} value={o}>{label}: {o}</option>)}
  </select>
);

const EtfDetail = ({ etf, onBack, onAdd }) => {
  const [tf, setTf] = useState('1Y');
  const tfs = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'Max'];

  // Mapping UI timeframe → yfinance period
  const tfMap = {'1M':'1mo','3M':'3mo','6M':'6mo','1Y':'1y','3Y':'2y','5Y':'5y','Max':'max'};

  // ── Live data hooks ──
  const [liveQuote, setLiveQuote] = useState(null);
  const [liveInfo, setLiveInfo] = useState(null);
  const [liveHistory, setLiveHistory] = useState([]);
  const [historyLive, setHistoryLive] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch quote on mount + every 60s
  useEffect(() => {
    let alive = true;
    const load = () => {
      setLoadingQuote(true);
      fetchQuote(etf.ticker)
        .then(d => { if (alive) setLiveQuote(d); })
        .catch(() => {})
        .finally(() => { if (alive) setLoadingQuote(false); });
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [etf.ticker]);

  // Fetch info once
  useEffect(() => {
    let alive = true;
    fetchEtfInfo(etf.ticker)
      .then(d => { if (alive) setLiveInfo(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [etf.ticker]);

  // Fetch history when timeframe changes
  useEffect(() => {
    let alive = true;
    setLoadingHistory(true);
    const period = tfMap[tf] || '1y';
    const interval = ['1M','3M'].includes(tf) ? '1d' : tf === '6M' ? '1d' : ['1Y'].includes(tf) ? '1d' : '1wk';
    fetchHistory(etf.ticker, period, interval)
      .then(res => {
        if (alive) {
          setLiveHistory(res.data || []);
          setHistoryLive(res.live || false);
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingHistory(false); });
    return () => { alive = false; };
  }, [etf.ticker, tf]);

  // Displayed price: prefer live
  const displayPrice = liveQuote?.price ?? etf.price;
  const displayChg1d = liveQuote?.chg1d ?? etf.chg1d;
  const displayHigh = liveQuote?.day_high;
  const displayLow = liveQuote?.day_low;
  const displayVolume = liveQuote?.volume;

  // Holdings from live info or fallback
  const topHoldings = liveInfo?.top_holdings?.length
    ? liveInfo.top_holdings.map(h => ({ name: h.symbol || h.holdingName || 'N/A', weight: h.holdingPercent ? h.holdingPercent * 100 : 0 }))
    : [
      { name: 'Apple Inc.', weight: 4.82 }, { name: 'Microsoft Corp.', weight: 4.15 },
      { name: 'NVIDIA Corp.', weight: 3.94 }, { name: 'Amazon.com Inc.', weight: 2.68 },
      { name: 'Meta Platforms', weight: 1.84 }, { name: 'Alphabet Class A', weight: 1.62 },
      { name: 'Tesla Inc.', weight: 1.28 }, { name: 'Berkshire Hathaway', weight: 1.12 },
    ];

  // Sector weights from live info or fallback
  const sectorAllocation = liveInfo?.sector_weights?.length
    ? liveInfo.sector_weights.map(s => ({ name: Object.keys(s)[0] || 'Altro', value: Object.values(s)[0] * 100 || 0 }))
    : [
      { name: 'Tech', value: 24.8 }, { name: 'Finanza', value: 15.2 },
      { name: 'Salute', value: 12.6 }, { name: 'Consumi ciclici', value: 10.4 },
      { name: 'Industriali', value: 9.8 }, { name: 'Energia', value: 5.2 }, { name: 'Altro', value: 22.0 },
    ];

  // Chart data: live history or static fallback
  const chartData = liveHistory.length > 0
    ? liveHistory.map((d, i) => ({ month: d.date || i, price: d.close, volume: d.volume }))
    : etfPriceHistory.map((d, i) => ({ ...d, month: d.month || i }));

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold hover:underline"
        style={{ color: GREEN_LIGHT }}
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Torna ai risultati
      </button>

      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-md flex items-center justify-center text-white font-semibold text-xs flex-shrink-0" style={{ backgroundColor: NAVY }}>
              {etf.ticker.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight" style={{ color: NAVY }}>{etf.ticker}</h1>
                <Label variant="info">{etf.issuer}</Label>
                <Label variant="neutral">{etf.domicile}</Label>
              </div>
              <p className="text-sm mt-1" style={{ color: GRAY_600 }}>{etf.name}</p>
              <p className="text-xs font-mono mt-1.5" style={{ color: GRAY_400 }}>ISIN: {etf.isin}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {loadingQuote && <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />}
              {liveQuote?.live && !loadingQuote && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E6F4EC', color: GREEN }}>● Live</span>
              )}
            </div>
            <p className="text-3xl font-semibold tracking-tight" style={{ color: NAVY }}>{fmtFull(displayPrice)}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: displayChg1d >= 0 ? GREEN : RED }}>
              {displayChg1d >= 0 ? '+' : ''}{displayChg1d.toFixed(2)}% oggi
            </p>
            {displayHigh && displayLow && (
              <p className="text-xs mt-0.5" style={{ color: GRAY_400 }}>
                H {fmtFull(displayHigh)} · L {fmtFull(displayLow)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-6 flex-wrap">
          <Button variant="primary" onClick={() => onAdd && onAdd(etf)}><Plus className="w-4 h-4" /> Aggiungi al portafoglio</Button>
          <Button variant="secondary"><Bell className="w-4 h-4" /> Crea alert prezzo</Button>
          <Button variant="secondary"><Star className="w-4 h-4" /> Watchlist</Button>
        </div>
      </Card>

      {/* Key facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4" style={{ color: GRAY_400 }} />
            <span className="text-xs font-medium" style={{ color: GRAY_600 }}>TER</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: NAVY }}>{etf.ter.toFixed(2)}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4" style={{ color: GRAY_400 }} />
            <span className="text-xs font-medium" style={{ color: GRAY_600 }}>AUM</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: NAVY }}>{etf.aum.toLocaleString('it-IT')}M€</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: GRAY_400 }} />
            <span className="text-xs font-medium" style={{ color: GRAY_600 }}>Replica</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: NAVY }}>{etf.replication}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4" style={{ color: GRAY_400 }} />
            <span className="text-xs font-medium" style={{ color: GRAY_600 }}>Distribuzione</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: NAVY }}>{etf.distribution}</p>
        </Card>
      </div>

      {/* Price chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>Andamento prezzo</h2>
              {historyLive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E6F4EC', color: GREEN }}>● Live</span>}
              {loadingHistory && <span className="text-[10px]" style={{ color: GRAY_400 }}>caricamento...</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>
              {chartData.length > 0
                ? `${chartData.length} punti · ${historyLive ? 'Yahoo Finance' : 'dati simulati'}`
                : 'Caricamento dati storici...'}
            </p>
          </div>
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
            {tfs.map(t => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className="px-3 py-1 text-xs font-medium rounded transition-colors"
                style={{
                  backgroundColor: tf === t ? 'white' : 'transparent',
                  color: tf === t ? NAVY : GRAY_600,
                  boxShadow: tf === t ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.2} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRAY_100} vertical={false} />
            <XAxis dataKey="month" stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} interval={Math.ceil(chartData.length / 8)} />
            <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v.toFixed(0)}`} domain={['auto','auto']} />
            <Tooltip contentStyle={{ backgroundColor: NAVY, border: 'none', borderRadius: 6, color: 'white', fontSize: 12 }} formatter={(v, name) => [fmtFull(v), name === 'price' ? 'Prezzo' : name]} labelFormatter={(l) => `Data: ${l}`} />
            <Area type="monotone" dataKey="price" stroke={BLUE} strokeWidth={2} fill="url(#priceGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Volume bar under chart */}
        {liveHistory.length > 0 && liveHistory.some(d => d.volume > 0) && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Volume scambi</p>
            <ResponsiveContainer width="100%" height={50}>
              <BarChart data={chartData.slice(-60)} margin={{ top: 0, right: 5, bottom: 0, left: -5 }}>
                <Bar dataKey="volume" fill={GRAY_200} radius={[1,1,0,0]} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 6, fontSize: 11 }} formatter={(v) => v?.toLocaleString('it-IT')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Description from live info */}
      {(liveInfo?.description || etf.description) && (
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Descrizione del fondo</h2>
            {liveInfo?.live_info && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E8F0FE', color: BLUE }}>Yahoo Finance</span>}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: GRAY_600 }}>
            {liveInfo?.description || etf.description}
          </p>
          {liveInfo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${GRAY_100}` }}>
              {liveInfo.ytd_return !== undefined && liveInfo.ytd_return !== null && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>YTD</p>
                  <p className="text-sm font-semibold" style={{ color: liveInfo.ytd_return >= 0 ? GREEN : RED }}>{liveInfo.ytd_return >= 0 ? '+' : ''}{liveInfo.ytd_return?.toFixed(2)}%</p>
                </div>
              )}
              {liveInfo.three_year_return && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>3 anni (ann.)</p>
                  <p className="text-sm font-semibold" style={{ color: liveInfo.three_year_return >= 0 ? GREEN : RED }}>{liveInfo.three_year_return >= 0 ? '+' : ''}{liveInfo.three_year_return?.toFixed(2)}%</p>
                </div>
              )}
              {liveInfo.five_year_return && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>5 anni (ann.)</p>
                  <p className="text-sm font-semibold" style={{ color: liveInfo.five_year_return >= 0 ? GREEN : RED }}>{liveInfo.five_year_return >= 0 ? '+' : ''}{liveInfo.five_year_return?.toFixed(2)}%</p>
                </div>
              )}
              {liveInfo.yield_pct !== undefined && liveInfo.yield_pct > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Yield</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{liveInfo.yield_pct?.toFixed(2)}%</p>
                </div>
              )}
              {liveInfo.beta_3year && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Beta 3Y</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{liveInfo.beta_3year?.toFixed(2)}</p>
                </div>
              )}
              {liveInfo.holdings_count > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Titoli</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{liveInfo.holdings_count?.toLocaleString('it-IT')}</p>
                </div>
              )}
              {liveInfo.inception_date && liveInfo.inception_date !== 'None' && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Inception</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{liveInfo.inception_date}</p>
                </div>
              )}
              {liveInfo.category && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Categoria</p>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{liveInfo.category}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Performance + Sector */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Rendimenti storici</h2>
            {liveInfo?.live_info && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E8F0FE', color: BLUE }}>Live</span>}
          </div>
          <div className="space-y-3">
            {[
              { label: 'YTD', value: liveInfo?.ytd_return ?? 1.24 },
              { label: '1 anno', value: liveInfo?.three_year_return ? etf.chg1y : etf.chg1y },
              { label: '3 anni (ann.)', value: liveInfo?.three_year_return ?? etf.chg5y * 0.6 },
              { label: '5 anni (ann.)', value: liveInfo?.five_year_return ?? etf.chg5y },
            ].filter(p => p.value !== null && p.value !== undefined).map(p => (
              <div key={p.label} className="flex items-center">
                <span className="text-sm w-28" style={{ color: GRAY_600 }}>{p.label}</span>
                <div className="flex-1 mx-4">
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: GRAY_100 }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(Math.abs(p.value), 100)}%`,
                      backgroundColor: p.value >= 0 ? GREEN : RED,
                    }} />
                  </div>
                </div>
                <span className="text-sm font-semibold w-20 text-right" style={{ color: p.value >= 0 ? GREEN : RED }}>
                  {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Allocazione settoriale</h2>
            {liveInfo?.live_info && liveInfo?.sector_weights?.length > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E8F0FE', color: BLUE }}>Live</span>}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sectorAllocation} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAY_100} horizontal={false} />
              <XAxis type="number" stroke={GRAY_400} fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <YAxis dataKey="name" type="category" stroke={GRAY_600} fontSize={10} width={110} />
              <Tooltip contentStyle={{ backgroundColor: NAVY, border: 'none', borderRadius: 6, color: 'white', fontSize: 12 }} formatter={(v) => `${v.toFixed(1)}%`} />
              <Bar dataKey="value" fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top holdings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>Top holdings</h2>
              {liveInfo?.live_info && liveInfo?.top_holdings?.length > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#E8F0FE', color: BLUE }}>Live</span>}
            </div>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Principali partecipazioni del fondo</p>
          </div>
          <Label variant="neutral">{liveInfo?.holdings_count ? `${topHoldings.length} di ${liveInfo.holdings_count.toLocaleString()}` : `${topHoldings.length} mostrate`}</Label>
        </div>
        <div className="space-y-2">
          {topHoldings.map((h, i) => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-xs font-mono w-6" style={{ color: GRAY_400 }}>#{i + 1}</span>
              <span className="text-sm flex-1 truncate" style={{ color: NAVY }}>{h.name}</span>
              <div className="w-40 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: GRAY_100 }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((h.weight / 5) * 100, 100)}%`, backgroundColor: BLUE }} />
              </div>
              <span className="text-sm font-semibold w-14 text-right" style={{ color: NAVY }}>{h.weight.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#92400E' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
            Dati di prezzo e info live da Yahoo Finance tramite yfinance. I dati storici e settoriali potrebbero differire leggermente da fonti ufficiali. Non costituisce consulenza finanziaria. Verifica sempre il KID dell'ETF prima di investire.
          </p>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AUTH (Login / Sign Up)
// ─────────────────────────────────────────────────────────────

const AuthPage = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) onLogin({ email: email || 'demo@etftracker.app', name: name || 'Marco Rossi' }, mode === 'signup');
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: GRAY_50, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* LEFT: form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 md:px-12 lg:px-20 py-10">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: NAVY }}>
            <LineIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight" style={{ color: NAVY }}>ETF Tracker</span>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="flex gap-1 p-1 rounded-md mb-8" style={{ backgroundColor: GRAY_100 }}>
              <button
                onClick={() => setMode('login')}
                className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === 'login' ? 'white' : 'transparent',
                  color: mode === 'login' ? NAVY : GRAY_600,
                  boxShadow: mode === 'login' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                Accedi
              </button>
              <button
                onClick={() => setMode('signup')}
                className="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === 'signup' ? 'white' : 'transparent',
                  color: mode === 'signup' ? NAVY : GRAY_600,
                  boxShadow: mode === 'signup' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                }}
              >
                Crea account
              </button>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{ color: NAVY }}>
              {mode === 'login' ? 'Bentornato' : 'Inizia ora'}
            </h1>
            <p className="text-sm mb-8" style={{ color: GRAY_600 }}>
              {mode === 'login'
                ? 'Accedi per seguire il tuo portafoglio ETF.'
                : 'Crea il tuo account gratuito — nessuna carta richiesta.'}
            </p>

            <div className="space-y-3 mb-6">
              <button onClick={() => onLogin({ email: 'demo.google@etftracker.app', name: 'Marco Rossi' }, mode === 'signup')} className="w-full flex items-center justify-center gap-3 py-3 rounded-md text-sm font-semibold" style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Continua con Google
              </button>
              <button onClick={() => onLogin({ email: 'demo.apple@etftracker.app', name: 'Marco Rossi' }, mode === 'signup')} className="w-full flex items-center justify-center gap-3 py-3 rounded-md text-sm font-semibold" style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Continua con Apple
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full h-px" style={{ backgroundColor: GRAY_200 }} /></div>
              <div className="relative flex justify-center"><span className="px-3 text-xs" style={{ backgroundColor: GRAY_50, color: GRAY_400 }}>oppure con email</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: GRAY_400 }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Come ti chiami?"
                      className="w-full pl-10 pr-3 py-2.5 rounded-md text-sm focus:outline-none"
                      style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: GRAY_400 }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tua@email.it"
                    className="w-full pl-10 pr-3 py-2.5 rounded-md text-sm focus:outline-none"
                    style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: NAVY }}>Password</label>
                  {mode === 'login' && <button type="button" className="text-xs font-semibold" style={{ color: BLUE }}>Password dimenticata?</button>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: GRAY_400 }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Almeno 8 caratteri' : '••••••••'}
                    className="w-full pl-10 pr-10 py-2.5 rounded-md text-sm focus:outline-none"
                    style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: GRAY_400 }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          backgroundColor: password.length >= i * 2 ? (password.length >= 8 ? GREEN : '#F59E0B') : GRAY_200,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <span className="text-xs leading-relaxed" style={{ color: GRAY_600 }}>
                    Accetto i <button type="button" className="font-semibold hover:underline" style={{ color: BLUE }}>Termini di Servizio</button> e la <button type="button" className="font-semibold hover:underline" style={{ color: BLUE }}>Privacy Policy</button>. Capisco che ETF Tracker non fornisce consulenza finanziaria.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={mode === 'signup' && !accepted}
                className="w-full py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: NAVY, color: 'white' }}
              >
                {mode === 'login' ? (<>Accedi <LogIn className="w-4 h-4" /></>) : (<>Crea account <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>

            <p className="text-xs text-center mt-6" style={{ color: GRAY_600 }}>
              {mode === 'login' ? 'Non hai un account?' : 'Hai già un account?'}
              {' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="font-semibold hover:underline"
                style={{ color: BLUE }}
              >
                {mode === 'login' ? 'Crea account' : 'Accedi'}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs mt-8" style={{ color: GRAY_400 }}>
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> AES-256</span>
          <span>•</span>
          <span>GDPR compliant</span>
          <span>•</span>
          <span>Dati in UE</span>
        </div>
      </div>

      {/* RIGHT: brand panel */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12" style={{ backgroundColor: NAVY }}>
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-semibold tracking-tight mb-4 leading-tight">
            Il tuo portafoglio ETF, chiaro e professionale.
          </h2>
          <p className="text-sm leading-relaxed mb-10" style={{ color: '#B8C5D9' }}>
            Dashboard, backtest, correlazioni, community e manuale. Tutto in un posto, con design pulito e dati affidabili.
          </p>

          <div className="space-y-5">
            {[
              { title: 'Dashboard e widget', desc: 'Segui il tuo portafoglio in tempo reale.' },
              { title: 'Analisi professionali', desc: 'CAGR, Sharpe, correlazioni, Monte Carlo.' },
              { title: '4 portafogli modello', desc: 'All-Weather, Bogleheads, Permanent, Growth.' },
              { title: 'Community e Impara', desc: 'Manuale e confronto con altri investitori.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1E5AA0' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#B8C5D9' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8" style={{ borderTop: `1px solid #1E3A5F` }}>
            <div className="flex items-center gap-3 text-xs" style={{ color: '#B8C5D9' }}>
              <div className="flex -space-x-2">
                {['SE', 'MR', 'LF'].map((a, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2" style={{ backgroundColor: ['#F59E0B', '#1E5AA0', '#0F7B3F'][i], borderColor: NAVY, color: 'white' }}>
                    {a}
                  </div>
                ))}
              </div>
              <span>+3.200 investitori già registrati</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SIMULATIONS — Confronto multi-portafoglio
// ─────────────────────────────────────────────────────────────

const MonteCarloSimulatorChart = ({ simulations, pacAmount, pacYears }) => {
  const [selectedSim, setSelectedSim] = useState(simulations[0]?.id);
  const sim = simulations.find(s => s.id === selectedSim) || simulations[0];

  const data = useMemo(() => {
    if (!sim) return null;
    const scenarios = 300;
    const months = pacYears * 12;
    const annualReturn = sim.cagr / 100;
    const annualVol = sim.volatility / 100;
    const monthlyReturn = annualReturn / 12;
    const monthlyVol = annualVol / Math.sqrt(12);

    const allPaths = [];
    for (let s = 0; s < scenarios; s++) {
      const path = [0];
      let value = 0;
      for (let m = 1; m <= months; m++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const ret = monthlyReturn + monthlyVol * z;
        value = value * (1 + ret) + pacAmount;
        path.push(value);
      }
      allPaths.push(path);
    }

    const yearsStep = Math.max(1, Math.floor(months / 30));
    const chartPoints = [];
    for (let m = 0; m <= months; m += yearsStep) {
      const values = allPaths.map(p => p[m]).sort((a, b) => a - b);
      chartPoints.push({
        year: parseFloat((m / 12).toFixed(1)),
        p10: Math.round(values[Math.floor(scenarios * 0.10)]),
        p25: Math.round(values[Math.floor(scenarios * 0.25)]),
        p50: Math.round(values[Math.floor(scenarios * 0.50)]),
        p75: Math.round(values[Math.floor(scenarios * 0.75)]),
        p90: Math.round(values[Math.floor(scenarios * 0.90)]),
        invested: pacAmount * m,
      });
    }

    const finalValues = allPaths.map(p => p[months]).sort((a, b) => a - b);
    return {
      chart: chartPoints,
      stats: {
        p10: Math.round(finalValues[Math.floor(scenarios * 0.10)]),
        p25: Math.round(finalValues[Math.floor(scenarios * 0.25)]),
        p50: Math.round(finalValues[Math.floor(scenarios * 0.50)]),
        p75: Math.round(finalValues[Math.floor(scenarios * 0.75)]),
        p90: Math.round(finalValues[Math.floor(scenarios * 0.90)]),
        invested: pacAmount * months,
        probLoss: (allPaths.filter(p => p[months] < pacAmount * months).length / scenarios * 100).toFixed(1),
      }
    };
  }, [sim, pacAmount, pacYears]);

  if (!data || !sim) return <p className="text-sm" style={{ color: GRAY_600 }}>Aggiungi portafogli per simulare</p>;

  return (
    <div>
      {/* Portfolio selector */}
      {simulations.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {simulations.map(s => (
            <button key={s.id} onClick={() => setSelectedSim(s.id)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{
              backgroundColor: s.id === selectedSim ? s.color : 'white',
              color: s.id === selectedSim ? 'white' : NAVY,
              border: `1px solid ${s.id === selectedSim ? s.color : GRAY_200}`,
            }}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data.chart} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
          <defs>
            <linearGradient id={`mcP90S${sim.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sim.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={sim.color} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`mcP75S${sim.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sim.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={sim.color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
          <XAxis dataKey="year" stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${parseFloat(v).toFixed(0)}a`} />
          <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v > 1000 ? `€${(v/1000).toFixed(0)}k` : `€${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12, padding: '10px 12px' }}
            labelFormatter={(l) => `Anno ${l}`}
            formatter={(v, name) => {
              const labels = { p10: 'P10 (pessimista)', p25: 'P25', p50: 'P50 (mediana)', p75: 'P75', p90: 'P90 (ottimista)', invested: 'Capitale investito' };
              return [fmt(v), labels[name] || name];
            }}
          />
          <Area type="monotone" dataKey="p90" stroke="transparent" fill={`url(#mcP90S${sim.id})`} name="p90" />
          <Area type="monotone" dataKey="p75" stroke="transparent" fill={`url(#mcP75S${sim.id})`} name="p75" />
          <Area type="monotone" dataKey="p25" stroke="transparent" fill="white" name="p25" />
          <Area type="monotone" dataKey="p10" stroke="transparent" fill="white" name="p10" />
          <Line type="monotone" dataKey="p50" stroke={sim.color} strokeWidth={2.5} dot={false} name="p50" />
          <Line type="monotone" dataKey="invested" stroke={GRAY_400} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="invested" />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
        <div className="p-2.5 rounded-md" style={{ backgroundColor: '#FCEAE8', border: `1px solid #F6C98A` }}>
          <p className="text-[10px] mb-0.5" style={{ color: RED }}>P10 pessimista</p>
          <p className="text-xs font-semibold" style={{ color: RED }}>{fmt(data.stats.p10)}</p>
        </div>
        <div className="p-2.5 rounded-md" style={{ backgroundColor: '#FEF3E7', border: `1px solid #F6C98A` }}>
          <p className="text-[10px] mb-0.5" style={{ color: '#B45309' }}>P25</p>
          <p className="text-xs font-semibold" style={{ color: '#B45309' }}>{fmt(data.stats.p25)}</p>
        </div>
        <div className="p-2.5 rounded-md" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
          <p className="text-[10px] mb-0.5" style={{ color: GRAY_600 }}>P50 mediana</p>
          <p className="text-xs font-semibold" style={{ color: NAVY }}>{fmt(data.stats.p50)}</p>
        </div>
        <div className="p-2.5 rounded-md" style={{ backgroundColor: '#E6F4EC', border: `1px solid #86D3A3` }}>
          <p className="text-[10px] mb-0.5" style={{ color: '#0F5C2E' }}>P75</p>
          <p className="text-xs font-semibold" style={{ color: '#0F5C2E' }}>{fmt(data.stats.p75)}</p>
        </div>
        <div className="p-2.5 rounded-md" style={{ backgroundColor: '#E6F4EC', border: `1px solid ${GREEN}` }}>
          <p className="text-[10px] mb-0.5" style={{ color: GREEN }}>P90 ottimista</p>
          <p className="text-xs font-semibold" style={{ color: GREEN }}>{fmt(data.stats.p90)}</p>
        </div>
      </div>

      {/* Insight box */}
      <div className="mt-4 p-3 rounded-md" style={{ backgroundColor: '#E8F0FE', border: `1px solid #C5D9F1` }}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
          <div className="text-xs leading-relaxed" style={{ color: NAVY }}>
            Su <strong>{pacYears} anni</strong> con PAC di <strong>€{pacAmount}/mese</strong> versi <strong>{fmt(data.stats.invested)}</strong>.
            Nel 50% degli scenari il portafoglio vale almeno <strong>{fmt(data.stats.p50)}</strong>.
            Probabilità di chiudere sotto il capitale versato: <strong style={{ color: parseFloat(data.stats.probLoss) > 20 ? RED : parseFloat(data.stats.probLoss) > 10 ? '#B45309' : GREEN }}>{data.stats.probLoss}%</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};

const Simulations = () => {
  const [simulations, setSimulations] = useState([
    {
      id: 1,
      name: 'Il mio portafoglio',
      color: NAVY,
      allocation: [
        { name: 'MSCI World', value: 58, color: '#1E5AA0' },
        { name: 'Emerging', value: 21, color: '#6BA3E8' },
        { name: 'Bond', value: 10, color: '#F59E0B' },
        { name: 'Oro', value: 11, color: '#EAB308' },
      ],
      cagr: 8.4,
      volatility: 12.8,
      maxDD: -18.2,
      sharpe: 0.72,
    },
    {
      id: 2,
      name: 'Alternativa All-Weather',
      color: '#B45309',
      allocation: [
        { name: 'Azioni', value: 30, color: '#1E5AA0' },
        { name: 'Treasury Lungo', value: 40, color: '#0F7B3F' },
        { name: 'Treasury Medio', value: 15, color: '#86EFAC' },
        { name: 'Oro', value: 7.5, color: '#EAB308' },
        { name: 'Commodities', value: 7.5, color: '#F59E0B' },
      ],
      cagr: 6.8,
      volatility: 8.2,
      maxDD: -12.4,
      sharpe: 0.82,
    },
  ]);

  const [pacAmount, setPacAmount] = useState(500);
  const [pacYears, setPacYears] = useState(15);
  const [showAddSim, setShowAddSim] = useState(false);
  const [simMode, setSimMode] = useState('deterministic'); // deterministic | montecarlo

  const addSimulation = (newSim) => {
    if (simulations.length >= 5) return;
    const colors = ['#B45309', '#0F7B3F', '#1E5AA0', '#6366F1', '#EC4899'];
    setSimulations([...simulations, { ...newSim, id: Date.now(), color: colors[simulations.length % 5] }]);
    setShowAddSim(false);
  };

  const removeSimulation = (id) => {
    if (simulations.length <= 1) return;
    setSimulations(prev => prev.filter(s => s.id !== id));
  };

  // Generate PAC simulation chart data
  const pacData = useMemo(() => {
    const months = pacYears * 12;
    const series = {};
    simulations.forEach(sim => {
      series[`sim_${sim.id}`] = [];
    });
    const result = [];
    for (let m = 0; m <= months; m++) {
      const point = { month: m, year: (m / 12).toFixed(1) };
      simulations.forEach(sim => {
        const monthlyRate = Math.pow(1 + sim.cagr / 100, 1 / 12) - 1;
        const fv = pacAmount * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate);
        point[`sim_${sim.id}`] = Math.round(fv);
      });
      if (m % 12 === 0) result.push(point);
    }
    return result;
  }, [simulations, pacAmount, pacYears]);

  const totalInvested = pacAmount * pacYears * 12;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Simulatore PAC"
        description="Confronta diversi portafogli e vedi quanto potrebbe crescere il tuo PAC"
        action={
          simulations.length < 5 && (
            <Button variant="primary" onClick={() => setShowAddSim(true)}>
              <Plus className="w-4 h-4" /> Aggiungi portafoglio
            </Button>
          )
        }
      />

      {/* PAC settings */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Impostazioni PAC</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: NAVY }}>Importo mensile</label>
              <span className="text-sm font-semibold" style={{ color: NAVY }}>€{pacAmount}</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={pacAmount}
              onChange={(e) => setPacAmount(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: NAVY }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: GRAY_400 }}>
              <span>€50</span>
              <span>€2000</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: NAVY }}>Orizzonte temporale</label>
              <span className="text-sm font-semibold" style={{ color: NAVY }}>{pacYears} anni</span>
            </div>
            <input
              type="range"
              min={1}
              max={40}
              step={1}
              value={pacYears}
              onChange={(e) => setPacYears(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: NAVY }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: GRAY_400 }}>
              <span>1 anno</span>
              <span>40 anni</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-6 pt-5 flex-wrap" style={{ borderTop: `1px solid ${GRAY_100}` }}>
          <div>
            <p className="text-xs" style={{ color: GRAY_600 }}>Capitale totale versato</p>
            <p className="text-xl font-semibold" style={{ color: NAVY }}>{fmt(totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: GRAY_600 }}>Rate mensili</p>
            <p className="text-xl font-semibold" style={{ color: NAVY }}>{pacYears * 12}</p>
          </div>
        </div>
      </Card>

      {/* Projection chart */}
      <Card className="p-5 md:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Proiezione crescita</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>{simMode === 'deterministic' ? 'Basata su CAGR storico costante' : 'Simulazione probabilistica con 300 scenari per portafoglio'}</p>
          </div>
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
            <button onClick={() => setSimMode('deterministic')} className="px-3 py-1.5 text-xs font-semibold rounded transition-all" style={{ backgroundColor: simMode === 'deterministic' ? 'white' : 'transparent', color: simMode === 'deterministic' ? NAVY : GRAY_600, boxShadow: simMode === 'deterministic' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
              Deterministica
            </button>
            <button onClick={() => setSimMode('montecarlo')} className="px-3 py-1.5 text-xs font-semibold rounded transition-all flex items-center gap-1" style={{ backgroundColor: simMode === 'montecarlo' ? 'white' : 'transparent', color: simMode === 'montecarlo' ? NAVY : GRAY_600, boxShadow: simMode === 'montecarlo' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
              <Activity className="w-3 h-3" /> Monte Carlo
            </button>
          </div>
        </div>

        {simMode === 'deterministic' ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pacData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
                <XAxis dataKey="year" stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}a`} />
                <YAxis stroke={GRAY_400} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v > 1000 ? `€${(v/1000).toFixed(0)}k` : `€${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v, name) => {
                    const simId = parseInt(name.replace('sim_', ''));
                    const sim = simulations.find(s => s.id === simId);
                    return [fmt(v), sim?.name || ''];
                  }}
                  labelFormatter={(l) => `Anno ${l}`}
                />
                {simulations.map(s => (
                  <Line key={s.id} type="monotone" dataKey={`sim_${s.id}`} stroke={s.color} strokeWidth={2.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-3 flex-wrap text-xs mt-3">
              {simulations.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-3 h-0.5" style={{ backgroundColor: s.color }} />
                  <span style={{ color: GRAY_600 }}>{s.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <MonteCarloSimulatorChart simulations={simulations} pacAmount={pacAmount} pacYears={pacYears} />
        )}
      </Card>

      {/* Final values */}
      <div className={`grid gap-3 md:gap-4 grid-cols-1 ${simulations.length === 2 ? 'md:grid-cols-2' : simulations.length === 3 ? 'md:grid-cols-3' : simulations.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-5'}`}>
        {simulations.map(s => {
          const lastPoint = pacData[pacData.length - 1];
          const finalValue = lastPoint[`sim_${s.id}`];
          const gain = finalValue - totalInvested;
          const gainPct = ((gain / totalInvested) * 100).toFixed(1);
          return (
            <Card key={s.id} className="p-5" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: NAVY }}>{s.name}</p>
                  <p className="text-xs" style={{ color: GRAY_400 }}>CAGR: +{s.cagr}%</p>
                </div>
                {simulations.length > 1 && (
                  <button onClick={() => removeSimulation(s.id)} className="p-1 rounded hover:bg-red-50" style={{ color: GRAY_400 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = RED}
                    onMouseLeave={(e) => e.currentTarget.style.color = GRAY_400}>
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-2xl font-semibold tracking-tight mb-1" style={{ color: NAVY, letterSpacing: '-0.02em' }}>{fmt(finalValue)}</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: GREEN }}>
                <TrendingUp className="w-3 h-3" /> +{fmt(gain)} ({gainPct}%)
              </div>
            </Card>
          );
        })}
      </div>

      {/* Comparison table */}
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: NAVY }}>Confronto metriche</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${GRAY_200}` }}>
                <th className="text-left font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Portafoglio</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>CAGR</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Volatilità</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Max DD</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Sharpe</th>
                <th className="text-right font-medium py-3 text-xs uppercase tracking-wide" style={{ color: GRAY_400 }}>Asset</th>
              </tr>
            </thead>
            <tbody>
              {simulations.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                      <span className="font-semibold" style={{ color: NAVY }}>{s.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-semibold" style={{ color: GREEN }}>+{s.cagr}%</td>
                  <td className="py-4 text-right" style={{ color: GRAY_600 }}>{s.volatility}%</td>
                  <td className="py-4 text-right font-semibold" style={{ color: RED }}>{s.maxDD}%</td>
                  <td className="py-4 text-right" style={{ color: GRAY_600 }}>{s.sharpe}</td>
                  <td className="py-4 text-right" style={{ color: GRAY_600 }}>{s.allocation.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Allocations side-by-side */}
      <div className={`grid gap-4 grid-cols-1 ${simulations.length >= 2 ? 'md:grid-cols-2' : ''} ${simulations.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
        {simulations.map(s => (
          <Card key={s.id} className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-sm" style={{ backgroundColor: s.color }} />
              <h3 className="font-semibold" style={{ color: NAVY }}>{s.name}</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={s.allocation} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={1} strokeWidth={0}>
                  {s.allocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {s.allocation.map(a => (
                <div key={a.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: a.color }} />
                  <span className="flex-1 truncate" style={{ color: GRAY_600 }}>{a.name}</span>
                  <span className="font-semibold" style={{ color: NAVY }}>{a.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {showAddSim && <AddSimulationModal onClose={() => setShowAddSim(false)} onAdd={addSimulation} />}

      <Card className="p-4" style={{ backgroundColor: '#FEF3E7', borderColor: '#F6C98A' }}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#8B5416' }}>
            Le proiezioni sono calcolate a interesse composto usando il CAGR storico come ipotesi costante. I rendimenti reali saranno diversi. Non considerano tasse, inflazione o eventi di mercato.
          </p>
        </div>
      </Card>
    </div>
  );
};

const AddToPortfolioModal = ({ etf, onClose, onAdd }) => {
  const [mode, setMode] = useState('amount'); // amount | shares
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(etf.price.toFixed(2));

  const parsedPrice = parseFloat(price) || etf.price;
  const parsedAmount = parseFloat(amount) || 0;
  const parsedShares = parseFloat(shares) || 0;

  const computedShares = mode === 'amount' ? (parsedAmount / parsedPrice) : parsedShares;
  const computedAmount = mode === 'amount' ? parsedAmount : (parsedShares * parsedPrice);

  const canSubmit = mode === 'amount' ? parsedAmount > 0 : parsedShares > 0;

  const handleAdd = () => {
    onAdd(computedShares, parsedPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,21,40,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Aggiungi al portafoglio</h2>
            <p className="text-xs mt-0.5 truncate" style={{ color: GRAY_600 }}>{etf.ticker} · {etf.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 flex-shrink-0" style={{ color: GRAY_600 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-md" style={{ backgroundColor: GRAY_50 }}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: GRAY_600 }}>Prezzo attuale</span>
              <span className="font-semibold" style={{ color: NAVY }}>€{etf.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: GRAY_600 }}>TER annuo</span>
              <span className="font-semibold" style={{ color: NAVY }}>{etf.ter}%</span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
            {[{ id: 'amount', label: 'Per importo' }, { id: 'shares', label: 'Per quote' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{ backgroundColor: mode === m.id ? 'white' : 'transparent', color: mode === m.id ? NAVY : GRAY_600, boxShadow: mode === m.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'amount' ? (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Importo investito</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: GRAY_600 }}>€</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  className="w-full pl-7 pr-3 py-2.5 rounded-md text-sm focus:outline-none"
                  style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Numero di quote</label>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="10"
                step="0.001"
                className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Prezzo medio di acquisto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: GRAY_600 }}>€</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                className="w-full pl-7 pr-3 py-2.5 rounded-md text-sm focus:outline-none"
                style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: GRAY_400 }}>Preimpostato al prezzo attuale. Modificalo se hai acquistato a un prezzo diverso.</p>
          </div>

          {canSubmit && (
            <div className="p-3 rounded-md" style={{ backgroundColor: '#E8F0FE', border: `1px solid #C5D9F1` }}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: GRAY_600 }}>Quote acquistate</span>
                <span className="font-semibold" style={{ color: NAVY }}>{computedShares.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: GRAY_600 }}>Investimento totale</span>
                <span className="font-semibold" style={{ color: NAVY }}>{fmtFull(computedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
          <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
          <button
            onClick={handleAdd}
            disabled={!canSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm disabled:opacity-40"
            style={{ backgroundColor: NAVY, color: 'white' }}
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
};

const NewPortfolioModal = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('long-term');
  const [horizon, setHorizon] = useState(15);
  const [monthlyPac, setMonthlyPac] = useState(500);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [selectedEtfs, setSelectedEtfs] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('empty');

  const templates = {
    empty: { name: 'Parti da zero', etfs: [] },
    'bogleheads': {
      name: 'Bogleheads 3-Fund',
      etfs: [
        { isin: 'IE00B4L5Y983', weight: 60 },
        { isin: 'IE00BKM4GZ66', weight: 20 },
        { isin: 'IE00B3F81R35', weight: 20 },
      ],
    },
    'all-weather': {
      name: 'All-Weather',
      etfs: [
        { isin: 'IE00B4L5Y983', weight: 30 },
        { isin: 'IE00B1FZS798', weight: 40 },
        { isin: 'IE00B4WXJJ64', weight: 15 },
        { isin: 'IE00B579F325', weight: 10 },
        { isin: 'IE00BDBRDM35', weight: 5 },
      ],
    },
    'growth': {
      name: 'Growth 90/10',
      etfs: [
        { isin: 'IE00B4L5Y983', weight: 70 },
        { isin: 'IE00BKM4GZ66', weight: 20 },
        { isin: 'IE00B3F81R35', weight: 10 },
      ],
    },
  };

  const applyTemplate = (tplId) => {
    setSelectedTemplate(tplId);
    const tpl = templates[tplId];
    if (tplId === 'empty') {
      setSelectedEtfs([]);
      return;
    }
    const etfs = tpl.etfs.map(ref => {
      const full = etfDatabase.find(e => e.isin === ref.isin);
      return full ? { ...full, weight: ref.weight } : null;
    }).filter(Boolean);
    setSelectedEtfs(etfs);
  };

  const objectives = [
    { id: 'pension', label: 'Pensione integrativa', desc: 'Orizzonte molto lungo (20+ anni)', icon: Calendar },
    { id: 'long-term', label: 'Lungo periodo', desc: 'Crescita del capitale 10-20 anni', icon: TrendingUp },
    { id: 'fire', label: 'Indipendenza finanziaria', desc: 'Raggiungere la libertà economica', icon: Target },
    { id: 'home', label: 'Acquisto casa', desc: 'Orizzonte medio 5-10 anni', icon: Home },
    { id: 'other', label: 'Altro obiettivo', desc: 'Obiettivo personalizzato', icon: Briefcase },
  ];

  const toggleEtf = (etf) => {
    setSelectedEtfs(prev => {
      if (prev.find(e => e.isin === etf.isin)) {
        return prev.filter(e => e.isin !== etf.isin);
      }
      return [...prev, { ...etf, weight: 0 }];
    });
  };

  const updateWeight = (isin, weight) => {
    setSelectedEtfs(prev => prev.map(e => e.isin === isin ? { ...e, weight: parseFloat(weight) || 0 } : e));
  };

  const totalWeight = selectedEtfs.reduce((s, e) => s + (e.weight || 0), 0);
  const canProceed = step === 1 ? name.trim().length > 0 : step === 2 ? true : step === 3 ? selectedEtfs.length > 0 && Math.abs(totalWeight - 100) < 0.01 : true;

  const handleFinish = () => {
    onSave({ name, objective, horizon, monthlyPac, riskLevel, etfs: selectedEtfs });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,21,40,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-xl overflow-hidden flex flex-col" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Nuovo portafoglio</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Step {step} di 4 · {['Nome', 'Obiettivo', 'Composizione', 'Riepilogo'][step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" style={{ color: GRAY_600 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1" style={{ backgroundColor: GRAY_100 }}>
          <div className="h-full transition-all" style={{ width: `${(step / 4) * 100}%`, backgroundColor: GREEN }} />
        </div>

        <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Nome del portafoglio *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Il mio portafoglio globale"
                  className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
                  style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
                  autoFocus
                />
                <p className="text-xs mt-1.5" style={{ color: GRAY_400 }}>Un nome descrittivo che riconoscerai facilmente</p>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: NAVY }}>Importa un modello (opzionale)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'empty', label: 'Parti da zero', desc: 'Scegli gli ETF più avanti' },
                    { id: 'bogleheads', label: 'Bogleheads 3-Fund', desc: '60% World + 20% EM + 20% Bond' },
                    { id: 'all-weather', label: 'All-Weather', desc: '30/55/15 con oro e commodities' },
                    { id: 'growth', label: 'Growth 90/10', desc: 'Aggressivo, orizzonte lungo' },
                  ].map(t => {
                    const sel = selectedTemplate === t.id;
                    return (
                      <button key={t.id} onClick={() => applyTemplate(t.id)} className="p-3 rounded-md text-left transition-all"
                        style={{
                          border: `1px solid ${sel ? NAVY : GRAY_200}`,
                          backgroundColor: sel ? '#E8F0FE' : 'white',
                        }}>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-xs" style={{ color: NAVY }}>{t.label}</p>
                          {sel && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: NAVY }} />}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: GRAY_600 }}>{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {selectedEtfs.length > 0 && selectedTemplate !== 'empty' && (
                  <p className="text-xs mt-2" style={{ color: GREEN }}>✓ Modello caricato con {selectedEtfs.length} ETF. Potrai modificarlo allo step 3.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: NAVY }}>Qual è il tuo obiettivo?</label>
                <div className="space-y-2">
                  {objectives.map(o => (
                    <button
                      key={o.id}
                      onClick={() => setObjective(o.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-md text-left transition-all"
                      style={{
                        border: `1px solid ${objective === o.id ? NAVY : GRAY_200}`,
                        backgroundColor: objective === o.id ? '#E8F0FE' : 'white',
                      }}
                    >
                      <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: objective === o.id ? NAVY : GRAY_100 }}>
                        <o.icon className="w-4 h-4" style={{ color: objective === o.id ? 'white' : NAVY }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{o.label}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{o.desc}</p>
                      </div>
                      {objective === o.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: NAVY }}>Orizzonte temporale</label>
                    <span className="text-xs font-semibold" style={{ color: NAVY }}>{horizon} anni</span>
                  </div>
                  <input type="range" min={1} max={40} value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))} className="w-full" style={{ accentColor: NAVY }} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: NAVY }}>PAC mensile</label>
                    <span className="text-xs font-semibold" style={{ color: NAVY }}>€{monthlyPac}</span>
                  </div>
                  <input type="range" min={0} max={2000} step={50} value={monthlyPac} onChange={(e) => setMonthlyPac(parseInt(e.target.value))} className="w-full" style={{ accentColor: NAVY }} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: NAVY }}>Tolleranza al rischio</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'low', label: 'Basso', desc: 'Priorità protezione capitale', color: GREEN },
                    { id: 'medium', label: 'Medio', desc: 'Equilibrio crescita/rischio', color: BLUE },
                    { id: 'high', label: 'Alto', desc: 'Massima crescita, alta volatilità', color: '#B45309' },
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRiskLevel(r.id)}
                      className="p-3 rounded-md text-left transition-all"
                      style={{
                        border: `1px solid ${riskLevel === r.id ? r.color : GRAY_200}`,
                        backgroundColor: riskLevel === r.id ? r.color + '15' : 'white',
                      }}
                    >
                      <p className="font-semibold text-sm mb-1" style={{ color: r.color }}>{r.label}</p>
                      <p className="text-xs" style={{ color: GRAY_600 }}>{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: NAVY }}>Seleziona ETF</label>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {etfDatabase.slice(0, 10).map(e => {
                    const selected = selectedEtfs.find(s => s.isin === e.isin);
                    return (
                      <button
                        key={e.isin}
                        onClick={() => toggleEtf(e)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-all"
                        style={{
                          border: `1px solid ${selected ? NAVY : GRAY_200}`,
                          backgroundColor: selected ? '#E8F0FE' : 'white',
                        }}
                      >
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selected ? NAVY : GRAY_100 }}>
                          {selected ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className="text-[10px] font-semibold" style={{ color: NAVY }}>{e.ticker.slice(0, 3)}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: NAVY }}>{e.ticker}</p>
                          <p className="text-xs truncate" style={{ color: GRAY_600 }}>{e.name}</p>
                        </div>
                        <span className="text-xs font-medium" style={{ color: GRAY_400 }}>TER {e.ter}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedEtfs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: NAVY }}>Allocazione %</label>
                    <span className="text-xs font-semibold" style={{ color: Math.abs(totalWeight - 100) < 0.01 ? GREEN : RED }}>
                      Totale: {totalWeight.toFixed(1)}% {Math.abs(totalWeight - 100) < 0.01 ? '✓' : '(deve essere 100%)'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedEtfs.map(e => (
                      <div key={e.isin} className="flex items-center gap-3 p-2.5 rounded-md" style={{ backgroundColor: GRAY_50 }}>
                        <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
                          <span className="text-[10px] font-semibold text-white">{e.ticker.slice(0, 3)}</span>
                        </div>
                        <span className="font-semibold text-sm flex-1" style={{ color: NAVY }}>{e.ticker}</span>
                        <input
                          type="number"
                          value={e.weight || ''}
                          onChange={(ev) => updateWeight(e.isin, ev.target.value)}
                          placeholder="0"
                          min={0}
                          max={100}
                          className="w-20 px-2 py-1.5 rounded text-sm text-right focus:outline-none"
                          style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, color: NAVY }}
                        />
                        <span className="text-sm" style={{ color: GRAY_600 }}>%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: NAVY }}>Riepilogo</h3>
                <div className="p-4 rounded-md space-y-3" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>Nome</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>Obiettivo</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{objectives.find(o => o.id === objective)?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>Orizzonte</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{horizon} anni</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>PAC mensile</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{fmt(monthlyPac)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>Rischio</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{{ low: 'Basso', medium: 'Medio', high: 'Alto' }[riskLevel]}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: GRAY_600 }}>ETF selezionati</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{selectedEtfs.length}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: NAVY }}>Allocazione</h3>
                <div className="space-y-1.5">
                  {selectedEtfs.map(e => (
                    <div key={e.isin} className="flex items-center gap-2 text-sm">
                      <span className="font-semibold flex-1" style={{ color: NAVY }}>{e.ticker}</span>
                      <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: GRAY_100 }}>
                        <div className="h-full rounded-full" style={{ width: `${e.weight}%`, backgroundColor: NAVY }} />
                      </div>
                      <span className="font-semibold w-12 text-right" style={{ color: NAVY }}>{e.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-md" style={{ backgroundColor: '#E6F4EC', border: `1px solid #86D3A3` }}>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#0F5C2E' }}>
                    Il portafoglio verrà creato e sarà pronto per iniziare a tracciare le tue posizioni. Potrai aggiungere transazioni in qualsiasi momento dalla Dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              <ArrowRight className="w-4 h-4 rotate-180" /> Indietro
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: NAVY, color: 'white' }}
            >
              Avanti <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-medium text-sm"
              style={{ backgroundColor: GREEN, color: 'white' }}
            >
              <CheckCircle2 className="w-4 h-4" /> Crea portafoglio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AddSimulationModal = ({ onClose, onAdd }) => {
  const [preset, setPreset] = useState('bogleheads');
  const [name, setName] = useState('');

  const presets = {
    bogleheads: { name: 'Bogleheads 3-Fund', cagr: 8.1, volatility: 14.0, maxDD: -22.8, sharpe: 0.71, allocation: [
      { name: 'MSCI World', value: 60, color: '#1E5AA0' },
      { name: 'Emerging', value: 20, color: '#6BA3E8' },
      { name: 'Bond', value: 20, color: '#F59E0B' },
    ]},
    'all-weather': { name: 'All-Weather', cagr: 6.8, volatility: 8.2, maxDD: -12.4, sharpe: 0.82, allocation: [
      { name: 'Azioni', value: 30, color: '#1E5AA0' },
      { name: 'Treasury Lungo', value: 40, color: '#0F7B3F' },
      { name: 'Treasury Medio', value: 15, color: '#86EFAC' },
      { name: 'Oro', value: 7.5, color: '#EAB308' },
      { name: 'Commodities', value: 7.5, color: '#F59E0B' },
    ]},
    permanent: { name: 'Permanent Portfolio', cagr: 5.9, volatility: 7.8, maxDD: -8.2, sharpe: 0.74, allocation: [
      { name: 'Azioni', value: 25, color: '#1E5AA0' },
      { name: 'Oro', value: 25, color: '#EAB308' },
      { name: 'Bond Lungo', value: 25, color: '#0F7B3F' },
      { name: 'Cash', value: 25, color: '#86EFAC' },
    ]},
    growth: { name: 'Growth 90/10', cagr: 9.4, volatility: 17.0, maxDD: -31.5, sharpe: 0.68, allocation: [
      { name: 'MSCI World', value: 70, color: '#1E5AA0' },
      { name: 'Emerging', value: 20, color: '#6BA3E8' },
      { name: 'Bond', value: 10, color: '#F59E0B' },
    ]},
  };

  const handleAdd = () => {
    const p = presets[preset];
    onAdd({ ...p, name: name || p.name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6,21,40,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${GRAY_200}` }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: NAVY }}>Aggiungi portafoglio</h2>
            <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Parti da un modello o creane uno da zero</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100" style={{ color: GRAY_600 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Nome (opzionale)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. La mia strategia aggressiva"
              className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none"
              style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Parti da un modello</label>
            <div className="space-y-2">
              {Object.entries(presets).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className="w-full flex items-center gap-3 p-3 rounded-md text-left transition-all"
                  style={{
                    border: `1px solid ${preset === key ? NAVY : GRAY_200}`,
                    backgroundColor: preset === key ? '#E8F0FE' : 'white',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: NAVY }}>{p.name}</p>
                    <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: GRAY_600 }}>
                      <span>CAGR: <strong style={{ color: GREEN }}>+{p.cagr}%</strong></span>
                      <span>·</span>
                      <span>Max DD: <strong style={{ color: RED }}>{p.maxDD}%</strong></span>
                    </div>
                  </div>
                  {preset === key && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
          <Button variant="secondary" onClick={onClose} className="flex-1">Annulla</Button>
          <button
            onClick={handleAdd}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm"
            style={{ backgroundColor: NAVY, color: 'white' }}
          >
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

const SettingsPage = ({ user, onLogout, onStartTour }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profilo', icon: User },
    { id: 'notifications', label: 'Notifiche', icon: Bell },
    { id: 'preferences', label: 'Preferenze', icon: Palette },
    { id: 'security', label: 'Sicurezza', icon: Shield },
    { id: 'billing', label: 'Piano', icon: CreditCard },
    { id: 'data', label: 'Dati', icon: Download },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Impostazioni" description="Gestisci il tuo account, le preferenze e la privacy" />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <Card className="p-3 h-fit lg:sticky lg:top-32">
          <nav className="space-y-0.5">
            {tabs.map(t => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? NAVY : 'transparent',
                    color: active ? 'white' : GRAY_600,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = GRAY_50; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
            <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${GRAY_100}` }}>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium"
                style={{ color: RED }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCEAE8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogIn className="w-4 h-4 rotate-180" />
                Esci
              </button>
            </div>
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4">
          {activeTab === 'profile' && <SettingsProfile user={user} />}
          {activeTab === 'notifications' && <SettingsNotifications />}
          {activeTab === 'preferences' && <SettingsPreferences onStartTour={onStartTour} />}
          {activeTab === 'security' && <SettingsSecurity />}
          {activeTab === 'billing' && <SettingsBilling />}
          {activeTab === 'data' && <SettingsData />}
        </div>
      </div>
    </div>
  );
};

const SettingsRow = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-4" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
    <div className="min-w-0 flex-1">
      <p className="font-medium text-sm" style={{ color: NAVY }}>{label}</p>
      {description && <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
    style={{ backgroundColor: checked ? GREEN : GRAY_200 }}
  >
    <span
      className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
      style={{ transform: checked ? 'translateX(24px)' : 'translateX(4px)' }}
    />
  </button>
);

const SettingsProfile = ({ user }) => {
  const [name, setName] = useState(user?.name || 'Marco Rossi');
  const [email, setEmail] = useState(user?.email || 'marco@demo.com');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Card className="p-5 md:p-6">
      <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Profilo</h2>
      <p className="text-xs mb-6" style={{ color: GRAY_600 }}>Le informazioni visibili agli altri utenti della community</p>

      <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl" style={{ backgroundColor: NAVY }}>
          {name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <button className="px-4 py-2 text-xs font-semibold rounded-md" style={{ backgroundColor: GRAY_100, color: NAVY }}>
            Cambia avatar
          </button>
          <p className="text-xs mt-2" style={{ color: GRAY_400 }}>JPG, PNG max 2MB</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Nome completo</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }} />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: NAVY }}>Bio (opzionale)</label>
          <textarea placeholder="Racconta qualcosa di te alla community…" rows={3} className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none resize-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button onClick={save} className="px-5 py-2.5 rounded-md font-semibold text-sm" style={{ backgroundColor: NAVY, color: 'white' }}>
          Salva modifiche
        </button>
        {saved && <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: GREEN }}><CheckCircle2 className="w-3.5 h-3.5" /> Salvato</span>}
      </div>
    </Card>
  );
};

const SettingsNotifications = () => {
  const [prefs, setPrefs] = useState({
    emailAlerts: true, emailNewsletter: true, emailSummary: false,
    pushAlerts: true, pushComments: true, pushFollows: false,
    dailySummary: false, weeklySummary: true, monthlySummary: true,
  });
  const update = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Email</h2>
        <p className="text-xs mb-2" style={{ color: GRAY_600 }}>Quali email vuoi ricevere</p>
        <SettingsRow label="Alert prezzo" description="Quando i tuoi alert si attivano"><Toggle checked={prefs.emailAlerts} onChange={(v) => update('emailAlerts', v)} /></SettingsRow>
        <SettingsRow label="Newsletter settimanale" description="Sintesi della domenica mattina"><Toggle checked={prefs.emailNewsletter} onChange={(v) => update('emailNewsletter', v)} /></SettingsRow>
        <SettingsRow label="Sintesi mensile portafoglio" description="Report completo ogni primo del mese"><Toggle checked={prefs.emailSummary} onChange={(v) => update('emailSummary', v)} /></SettingsRow>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Push (app mobile)</h2>
        <p className="text-xs mb-2" style={{ color: GRAY_600 }}>Notifiche sul tuo smartphone</p>
        <SettingsRow label="Alert prezzo" description="Trigger in tempo reale"><Toggle checked={prefs.pushAlerts} onChange={(v) => update('pushAlerts', v)} /></SettingsRow>
        <SettingsRow label="Commenti ai tuoi post" description="Quando qualcuno commenta"><Toggle checked={prefs.pushComments} onChange={(v) => update('pushComments', v)} /></SettingsRow>
        <SettingsRow label="Nuovi follower" description="Quando qualcuno ti segue"><Toggle checked={prefs.pushFollows} onChange={(v) => update('pushFollows', v)} /></SettingsRow>
      </Card>
    </div>
  );
};

const SettingsPreferences = ({ onStartTour }) => {
  const [currency, setCurrency] = useState('EUR');
  const [language, setLanguage] = useState('it');
  const [theme, setTheme] = useState('dark');
  const [hideValues, setHideValues] = useState(false);

  return (
    <Card className="p-5 md:p-6">
      <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Preferenze</h2>
      <p className="text-xs mb-2" style={{ color: GRAY_600 }}>Come vuoi usare ETF Tracker</p>

      <SettingsRow label="Valuta principale" description="Visualizzazione valori del portafoglio">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-3 py-1.5 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}>
          <option value="EUR">€ Euro</option>
          <option value="USD">$ Dollaro USA</option>
          <option value="GBP">£ Sterlina</option>
          <option value="CHF">CHF Franco</option>
        </select>
      </SettingsRow>

      <SettingsRow label="Lingua" description="Interfaccia dell'applicazione">
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-1.5 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }}>
          <option value="it">Italiano</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
        </select>
      </SettingsRow>

      <SettingsRow label="Tema" description="Aspetto dell'applicazione">
        <div className="flex gap-1 p-0.5 rounded-md" style={{ backgroundColor: GRAY_100 }}>
          {[{ id: 'light', icon: Sun, label: 'Chiaro' }, { id: 'dark', icon: Moon, label: 'Scuro' }].map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium" style={{ backgroundColor: theme === t.id ? 'white' : 'transparent', color: theme === t.id ? NAVY : GRAY_600, boxShadow: theme === t.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      </SettingsRow>

      <SettingsRow label="Nascondi valori di default" description="Maschera gli importi all'apertura dell'app"><Toggle checked={hideValues} onChange={setHideValues} /></SettingsRow>

      <SettingsRow label="Tour guidato dell'app" description="Rivedi il tour delle sezioni principali">
        <button
          onClick={onStartTour}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold"
          style={{ backgroundColor: '#E8F0FE', color: BLUE }}
        >
          <Eye className="w-3.5 h-3.5" /> Avvia tour
        </button>
      </SettingsRow>
    </Card>
  );
};

const SettingsSecurity = () => {
  const [twoFactor, setTwoFactor] = useState(false);
  const [showPwdChange, setShowPwdChange] = useState(false);
  const [pwdOld, setPwdOld] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);
  const [sessions, setSessions] = useState([
    { id: 1, device: 'iPhone 15', location: 'Milano, IT', current: true, lastActive: 'Ora' },
    { id: 2, device: 'MacBook Pro', location: 'Milano, IT', current: false, lastActive: '2 giorni fa' },
  ]);

  const changePassword = () => {
    if (pwdOld && pwdNew.length >= 6) {
      setPwdSaved(true);
      setTimeout(() => {
        setPwdSaved(false);
        setShowPwdChange(false);
        setPwdOld('');
        setPwdNew('');
      }, 1500);
    }
  };

  const disconnectSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Password e accesso</h2>
        <p className="text-xs mb-2" style={{ color: GRAY_600 }}>Protezione del tuo account</p>
        <SettingsRow label="Password" description="Ultima modifica 45 giorni fa">
          <button onClick={() => setShowPwdChange(!showPwdChange)} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: showPwdChange ? NAVY : GRAY_100, color: showPwdChange ? 'white' : NAVY }}>
            {showPwdChange ? 'Annulla' : 'Cambia'}
          </button>
        </SettingsRow>
        {showPwdChange && (
          <div className="py-4 space-y-3" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
            <input type="password" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} placeholder="Password attuale" className="w-full px-3 py-2 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }} />
            <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="Nuova password (min 6 caratteri)" className="w-full px-3 py-2 rounded-md text-sm focus:outline-none" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}`, color: NAVY }} />
            <div className="flex items-center gap-2">
              <button onClick={changePassword} disabled={!pwdOld || pwdNew.length < 6} className="px-4 py-2 rounded-md text-xs font-semibold disabled:opacity-40" style={{ backgroundColor: NAVY, color: 'white' }}>
                Conferma
              </button>
              {pwdSaved && <span className="text-xs font-medium flex items-center gap-1" style={{ color: GREEN }}><CheckCircle2 className="w-3.5 h-3.5" /> Password aggiornata</span>}
            </div>
          </div>
        )}
        <SettingsRow label="Autenticazione a due fattori (2FA)" description="Livello di sicurezza extra via app authenticator">
          <Toggle checked={twoFactor} onChange={setTwoFactor} />
        </SettingsRow>
        <SettingsRow label="Dispositivi connessi" description={`${sessions.length} dispositivi attualmente attivi`}>
          <span className="text-xs" style={{ color: GRAY_600 }}>Vedi sotto ↓</span>
        </SettingsRow>
      </Card>

      <Card className="p-5 md:p-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: NAVY }}>Sessioni attive</h2>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-md" style={{ border: `1px solid ${GRAY_200}` }}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: GRAY_100 }}>
                <Shield className="w-4 h-4" style={{ color: NAVY }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm" style={{ color: NAVY }}>{s.device}</p>
                  {s.current && <Label variant="success">Dispositivo attuale</Label>}
                </div>
                <p className="text-xs" style={{ color: GRAY_400 }}>{s.location} · {s.lastActive}</p>
              </div>
              {!s.current && (
                <button onClick={() => disconnectSession(s.id)} className="px-3 py-1.5 text-xs font-semibold rounded-md" style={{ color: RED, backgroundColor: '#FCEAE8' }}>Disconnetti</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const SettingsBilling = () => (
  <div className="space-y-4">
    <Card className="p-5 md:p-6" style={{ backgroundColor: NAVY, borderColor: NAVY }}>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label variant="warning">Piano Free</Label>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-1">Stai usando il piano gratuito</h2>
          <p className="text-sm" style={{ color: '#B8C5D9' }}>1 portafoglio · 20 ETF tracciati · alert base</p>
        </div>
        <button className="px-5 py-2.5 rounded-md font-semibold text-sm" style={{ color: NAVY_DARK, backgroundColor: GREEN_LIGHT }}>
          Passa a Pro
        </button>
      </div>
    </Card>

    <Card className="p-5 md:p-6">
      <h2 className="text-base font-semibold mb-4" style={{ color: NAVY }}>Confronta piani</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 rounded-md" style={{ border: `2px solid ${GRAY_200}` }}>
          <h3 className="font-semibold mb-1" style={{ color: NAVY }}>Free</h3>
          <p className="text-2xl font-bold mb-4" style={{ color: NAVY }}>€0<span className="text-xs font-normal" style={{ color: GRAY_600 }}>/mese</span></p>
          <ul className="space-y-2 text-sm">
            {['1 portafoglio', '20 ETF tracciati', 'Alert base (max 5)', 'Manuale completo', 'Community read-only'].map((f, i) => (
              <li key={i} className="flex gap-2" style={{ color: GRAY_600 }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 rounded-md" style={{ border: `2px solid ${NAVY}`, backgroundColor: '#F7F9FC' }}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold" style={{ color: NAVY }}>Pro</h3>
            <Label variant="info">Consigliato</Label>
          </div>
          <p className="text-2xl font-bold mb-4" style={{ color: NAVY }}>€6<span className="text-xs font-normal" style={{ color: GRAY_600 }}>/mese</span></p>
          <ul className="space-y-2 text-sm">
            {['Portafogli illimitati', 'ETF illimitati', 'Alert illimitati', 'Monte Carlo e backtest avanzato', 'Import CSV da broker', 'Community completa', 'Supporto prioritario'].map((f, i) => (
              <li key={i} className="flex gap-2" style={{ color: GRAY_600 }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  </div>
);

const SettingsData = () => (
  <div className="space-y-4">
    <Card className="p-5 md:p-6">
      <h2 className="text-base font-semibold mb-1" style={{ color: NAVY }}>I tuoi dati</h2>
      <p className="text-xs mb-2" style={{ color: GRAY_600 }}>Esporta o elimina i dati del tuo account (GDPR)</p>
      <SettingsRow label="Esporta i tuoi dati" description="File JSON con portafogli, alert, post e impostazioni">
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: GRAY_100, color: NAVY }}>
          <Download className="w-3.5 h-3.5" /> Esporta
        </button>
      </SettingsRow>
      <SettingsRow label="Importa portafoglio da CSV" description="Formato Trade Republic, Degiro, Directa">
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: GRAY_100, color: NAVY }}>
          <Plus className="w-3.5 h-3.5" /> Importa
        </button>
      </SettingsRow>
    </Card>

    <Card className="p-5 md:p-6" style={{ borderColor: '#FCEAE8' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: RED }}>Zona pericolosa</h2>
      <p className="text-xs mb-4" style={{ color: GRAY_600 }}>Azioni irreversibili sul tuo account</p>
      <SettingsRow label="Elimina account" description="Tutti i tuoi dati saranno cancellati permanentemente entro 30 giorni">
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold" style={{ backgroundColor: '#FCEAE8', color: RED }}>
          <Trash2 className="w-3.5 h-3.5" /> Elimina
        </button>
      </SettingsRow>
    </Card>
  </div>
);

// ─────────────────────────────────────────────────────────────
// ONBOARDING — First-time user flow
// ─────────────────────────────────────────────────────────────

const OnboardingFlow = ({ user, onComplete }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    experience: '',
    goals: [],
    horizon: '',
    amount: '',
    currency: 'EUR',
  });

  const steps = [
    { id: 'welcome', title: 'welcome' },
    { id: 'experience', title: 'experience' },
    { id: 'goals', title: 'goals' },
    { id: 'horizon', title: 'horizon' },
    { id: 'amount', title: 'amount' },
    { id: 'ready', title: 'ready' },
  ];

  const progress = ((step + 1) / steps.length) * 100;
  const update = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  const toggleGoal = (g) => {
    setData(prev => ({ ...prev, goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g] }));
  };

  const canAdvance = () => {
    const s = steps[step].id;
    if (s === 'welcome' || s === 'ready') return true;
    if (s === 'experience') return data.experience !== '';
    if (s === 'goals') return data.goals.length > 0;
    if (s === 'horizon') return data.horizon !== '';
    if (s === 'amount') return data.amount !== '';
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: NAVY_DARK, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: GREEN_LIGHT }}>
            <LineIcon className="w-4.5 h-4.5" style={{ color: NAVY_DARK }} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight" style={{ color: GREEN_LIGHT, letterSpacing: '-0.02em' }}>ETF Tracker</span>
        </div>

        {/* Card */}
        <Card className="overflow-hidden">
          {/* Progress bar */}
          <div className="h-1" style={{ backgroundColor: GRAY_100 }}>
            <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: GREEN_LIGHT }} />
          </div>

          <div className="p-6 md:p-8">
            {step > 0 && step < steps.length - 1 && (
              <p className="text-xs font-medium mb-4" style={{ color: GRAY_400 }}>
                Step {step} di {steps.length - 2}
              </p>
            )}

            {/* STEP: Welcome */}
            {steps[step].id === 'welcome' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#E6F4EC' }}>
                  <span className="text-3xl">👋</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Benvenuto, {user?.name?.split(' ')[0] || 'investitore'}!
                </h1>
                <p className="text-sm leading-relaxed mb-6" style={{ color: GRAY_600 }}>
                  Risponderemo insieme a 4 domande rapide per personalizzare ETF Tracker in base ai tuoi obiettivi e alla tua esperienza. Ci metteremo meno di 2 minuti.
                </p>
                <div className="p-4 rounded-md text-left" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: NAVY }}>Cosa ottieni con ETF Tracker</p>
                  <ul className="space-y-1.5 text-xs" style={{ color: GRAY_600 }}>
                    {['Dashboard del tuo portafoglio ETF', 'Backtest, correlazioni e analisi avanzate', '4 portafogli modello preconfigurati', 'Community di investitori e manuale finanziario'].map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* STEP: Experience */}
            {steps[step].id === 'experience' && (
              <>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Qual è la tua esperienza con gli ETF?
                </h2>
                <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Ci aiuta a consigliarti i contenuti giusti.</p>
                <div className="space-y-2">
                  {[
                    { id: 'beginner', label: 'Sono alle prime armi', desc: 'Non ho mai investito in ETF', icon: '🌱' },
                    { id: 'intermediate', label: 'Ho un po\' di esperienza', desc: 'Investo da meno di 3 anni', icon: '🌿' },
                    { id: 'advanced', label: 'Investo regolarmente', desc: 'Ho un portafoglio consolidato', icon: '🌳' },
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => update('experience', o.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all"
                      style={{
                        border: `1px solid ${data.experience === o.id ? NAVY : GRAY_200}`,
                        backgroundColor: data.experience === o.id ? '#E8F0FE' : 'white',
                      }}
                    >
                      <span className="text-2xl">{o.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{o.label}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{o.desc}</p>
                      </div>
                      {data.experience === o.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: NAVY }} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP: Goals */}
            {steps[step].id === 'goals' && (
              <>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Quali sono i tuoi obiettivi?
                </h2>
                <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Puoi selezionarne più di uno.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pension', label: 'Pensione', icon: '🏖️' },
                    { id: 'fire', label: 'Indip. finanziaria', icon: '🔥' },
                    { id: 'home', label: 'Acquisto casa', icon: '🏠' },
                    { id: 'study', label: 'Studi/figli', icon: '🎓' },
                    { id: 'growth', label: 'Crescita capitale', icon: '📈' },
                    { id: 'passive', label: 'Rendita passiva', icon: '💰' },
                  ].map(g => {
                    const sel = data.goals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className="flex items-center gap-3 p-3 rounded-md text-left transition-all"
                        style={{
                          border: `1px solid ${sel ? NAVY : GRAY_200}`,
                          backgroundColor: sel ? '#E8F0FE' : 'white',
                        }}
                      >
                        <span className="text-xl">{g.icon}</span>
                        <span className="font-medium text-sm flex-1" style={{ color: NAVY }}>{g.label}</span>
                        {sel && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP: Horizon */}
            {steps[step].id === 'horizon' && (
              <>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Qual è il tuo orizzonte temporale?
                </h2>
                <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Per quanto tempo pensi di tenere i tuoi investimenti?</p>
                <div className="space-y-2">
                  {[
                    { id: 'short', label: 'Meno di 5 anni', desc: 'Orizzonte breve', color: '#B45309' },
                    { id: 'medium', label: '5-10 anni', desc: 'Orizzonte medio', color: BLUE },
                    { id: 'long', label: '10-20 anni', desc: 'Orizzonte lungo', color: GREEN },
                    { id: 'very-long', label: 'Oltre 20 anni', desc: 'Orizzonte molto lungo', color: GREEN },
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => update('horizon', o.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-md text-left transition-all"
                      style={{
                        border: `1px solid ${data.horizon === o.id ? o.color : GRAY_200}`,
                        backgroundColor: data.horizon === o.id ? o.color + '15' : 'white',
                      }}
                    >
                      <div className="w-1 h-8 rounded-sm" style={{ backgroundColor: o.color }} />
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{o.label}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{o.desc}</p>
                      </div>
                      {data.horizon === o.id && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: o.color }} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP: Amount */}
            {steps[step].id === 'amount' && (
              <>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Quanto prevedi di investire al mese?
                </h2>
                <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Servirà per configurare il tuo PAC predefinito. Puoi cambiarlo in ogni momento.</p>
                <div className="space-y-2">
                  {[
                    { id: '0-100', label: 'Meno di €100', desc: 'Parto piano' },
                    { id: '100-300', label: '€100 – €300', desc: 'PAC regolare' },
                    { id: '300-700', label: '€300 – €700', desc: 'PAC consistente' },
                    { id: '700+', label: 'Oltre €700', desc: 'PAC aggressivo' },
                    { id: 'varies', label: 'Varia nel tempo', desc: 'Non è costante' },
                  ].map(o => (
                    <button
                      key={o.id}
                      onClick={() => update('amount', o.id)}
                      className="w-full flex items-center justify-between p-4 rounded-md text-left transition-all"
                      style={{
                        border: `1px solid ${data.amount === o.id ? NAVY : GRAY_200}`,
                        backgroundColor: data.amount === o.id ? '#E8F0FE' : 'white',
                      }}
                    >
                      <div>
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{o.label}</p>
                        <p className="text-xs" style={{ color: GRAY_600 }}>{o.desc}</p>
                      </div>
                      {data.amount === o.id && <CheckCircle2 className="w-5 h-5" style={{ color: NAVY }} />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* STEP: Ready */}
            {steps[step].id === 'ready' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: '#E6F4EC' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: GREEN }} />
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                  Tutto pronto!
                </h1>
                <p className="text-sm leading-relaxed mb-6" style={{ color: GRAY_600 }}>
                  Abbiamo personalizzato ETF Tracker per te. Ti mostreremo un breve tour dell'app, poi potrai iniziare a esplorare.
                </p>
                <div className="p-4 rounded-md text-left space-y-2" style={{ backgroundColor: GRAY_50, border: `1px solid ${GRAY_200}` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: NAVY }}>Il tuo profilo</p>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: GRAY_600 }}>Esperienza</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{{ beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzato' }[data.experience]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: GRAY_600 }}>Obiettivi</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{data.goals.length} selezionati</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: GRAY_600 }}>Orizzonte</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{{ short: '<5a', medium: '5-10a', long: '10-20a', 'very-long': '>20a' }[data.horizon]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: GRAY_600 }}>PAC mensile</span>
                    <span className="font-semibold" style={{ color: NAVY }}>{data.amount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
            {step > 0 && step < steps.length - 1 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowRight className="w-4 h-4 rotate-180" /> Indietro
              </Button>
            )}
            <button
              onClick={() => onComplete(data)}
              className="text-xs font-medium hover:underline mr-auto self-center"
              style={{ color: GRAY_600 }}
            >
              {step === 0 ? 'Salta tutto' : step === steps.length - 1 ? '' : 'Salta'}
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm disabled:opacity-40"
                style={{ backgroundColor: NAVY, color: 'white' }}
              >
                {step === 0 ? 'Iniziamo' : 'Avanti'} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onComplete(data)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm"
                style={{ backgroundColor: GREEN, color: 'white' }}
              >
                Avvia il tour <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>

        <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Le tue preferenze sono private e non vengono condivise con nessuno.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GUIDED TOUR — Overlay step-by-step
// ─────────────────────────────────────────────────────────────

const GuidedTour = ({ onClose, onNavigate }) => {
  const [step, setStep] = useState(0);

  const tourSteps = [
    {
      page: 'dashboard',
      icon: Home,
      title: 'La tua Dashboard',
      description: 'Qui trovi una sintesi chiara del tuo portafoglio: valore totale, rendimento, andamento nel tempo e le tue posizioni principali.',
      tip: 'Clicca sui timeframe (1M, 3M, 1Y...) per vedere periodi diversi.',
    },
    {
      page: 'search',
      icon: Search,
      title: 'Cerca ETF',
      description: 'Esplora oltre 12 ETF UCITS europei. Filtra per asset class, area, TER, e visualizza schede dettagliate con grafici e performance.',
      tip: 'Cerca per ticker (es. VWCE), ISIN, o nome del fondo.',
    },
    {
      page: 'analytics',
      icon: BarChart3,
      title: 'Analisi professionali',
      description: 'Backtest, Sharpe Ratio, correlazioni, diversificazione, Monte Carlo. Tutto quello che serve per valutare il tuo portafoglio.',
      tip: 'Cambia il range del backtest (1Y, 3Y, 5Y, 10Y) per vedere scenari diversi.',
    },
    {
      page: 'simulations',
      icon: GitCompare,
      title: 'Simulatore PAC',
      description: 'Confronta fino a 5 portafogli contemporaneamente. Vedi quanto potrebbe crescere il tuo PAC nel tempo.',
      tip: 'Muovi gli slider PAC mensile e orizzonte per vedere le proiezioni aggiornarsi.',
    },
    {
      page: 'models',
      icon: Briefcase,
      title: 'Portafogli modello',
      description: 'Quattro strategie classiche (All-Weather, Bogleheads, Permanent, Growth) pronte da studiare e clonare.',
      tip: 'Clicca "Dettagli" su un modello per vedere ETF consigliati e performance storica.',
    },
    {
      page: 'community',
      icon: Users,
      title: 'Community',
      description: 'Confrontati con altri investitori, condividi il tuo portafoglio e leggi le esperienze di chi è più avanti.',
      tip: 'Clicca un post per vedere i commenti e aggiungere il tuo.',
    },
    {
      page: 'academy',
      icon: BookOpen,
      title: 'Impara',
      description: 'Manuale di finanza personale su ETF e costruzione portafoglio, con esempi concreti e quiz di verifica.',
      tip: 'Ogni capitolo ha un quiz per verificare quello che hai imparato.',
    },
    {
      page: 'alerts',
      icon: Bell,
      title: 'Alert prezzo',
      description: 'Ricevi notifiche quando un ETF raggiunge il prezzo che vuoi, utile prima di ogni PAC.',
      tip: 'Crea alert su soglia, calo giornaliero, o ribilanciamento.',
    },
    {
      page: 'settings',
      icon: Settings,
      title: 'Impostazioni',
      description: 'Personalizza notifiche, tema, valuta, e gestisci il tuo account. Puoi anche rivedere questo tour quando vuoi.',
      tip: 'Il tour è sempre richiamabile dalle Preferenze.',
    },
  ];

  const current = tourSteps[step];
  const progress = ((step + 1) / tourSteps.length) * 100;

  const goToStep = (newStep) => {
    setStep(newStep);
    onNavigate(tourSteps[newStep].page);
  };

  const next = () => {
    if (step < tourSteps.length - 1) goToStep(step + 1);
    else onClose();
  };

  const prev = () => {
    if (step > 0) goToStep(step - 1);
  };

  // Set initial page
  React.useEffect(() => {
    onNavigate(current.page);
    // eslint-disable-next-line
  }, []);

  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 pointer-events-auto" style={{ backgroundColor: 'rgba(6,21,40,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      {/* Tour card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md pointer-events-auto">
        <Card className="overflow-hidden" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
          {/* Progress */}
          <div className="h-1" style={{ backgroundColor: GRAY_100 }}>
            <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: GREEN_LIGHT }} />
          </div>

          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold" style={{ color: GRAY_400 }}>
                Step {step + 1} di {tourSteps.length}
              </span>
              <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" style={{ color: GRAY_600 }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: NAVY }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight" style={{ color: NAVY, letterSpacing: '-0.02em' }}>
                {current.title}
              </h2>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: GRAY_600 }}>
              {current.description}
            </p>

            <div className="p-3 rounded-md flex gap-2" style={{ backgroundColor: '#E6F4EC', border: `1px solid #86D3A3` }}>
              <span className="flex-shrink-0">💡</span>
              <p className="text-xs leading-relaxed" style={{ color: '#0F5C2E' }}>
                <strong>Suggerimento:</strong> {current.tip}
              </p>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="px-5 py-3 flex items-center justify-center gap-1" style={{ borderTop: `1px solid ${GRAY_100}` }}>
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? '24px' : '6px',
                  backgroundColor: i === step ? NAVY : GRAY_200,
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${GRAY_200}`, backgroundColor: GRAY_50 }}>
            {step > 0 && (
              <Button variant="secondary" onClick={prev}>
                <ArrowRight className="w-4 h-4 rotate-180" /> Indietro
              </Button>
            )}
            <button onClick={onClose} className="text-xs font-medium hover:underline mr-auto self-center" style={{ color: GRAY_600 }}>
              Salta tour
            </button>
            <button
              onClick={next}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md font-semibold text-sm"
              style={{ backgroundColor: step === tourSteps.length - 1 ? GREEN : NAVY, color: 'white' }}
            >
              {step === tourSteps.length - 1 ? (<>Fine <CheckCircle2 className="w-4 h-4" /></>) : (<>Avanti <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PORTFOLIO CREATED SUCCESS SCREEN
// ─────────────────────────────────────────────────────────────

const PortfolioCreatedScreen = ({ data, onClose }) => {
  const { name, etfsWithShares = [], totalCapital = 0, monthlyPac = 0, horizon = 10 } = data || {};

  // Safety guard
  if (!etfsWithShares || etfsWithShares.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: NAVY_DARK }}>
        <Card className="p-8 max-w-md text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: GREEN }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: NAVY }}>Portafoglio creato</h2>
          <p className="text-sm mb-6" style={{ color: GRAY_600 }}>Tutto pronto. Puoi iniziare ad aggiungere ETF dalla sezione Cerca.</p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-md font-semibold text-sm" style={{ backgroundColor: NAVY, color: 'white' }}>
            Vai al portafoglio
          </button>
        </Card>
      </div>
    );
  }

  // Simulated projection over horizon
  const projection = useMemo(() => {
    const months = (horizon || 10) * 12;
    const annualReturn = 0.07;
    const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
    const points = [];
    const step = Math.max(1, Math.floor(months / 30));
    for (let m = 0; m <= months; m += step) {
      const invested = (totalCapital || 0) + (monthlyPac || 0) * m;
      const fv = (totalCapital || 0) * Math.pow(1 + monthlyRate, m) + (monthlyPac || 0) * (monthlyRate > 0 ? ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) : m);
      points.push({ month: m, year: (m/12).toFixed(1), invested: Math.round(invested), projected: Math.round(fv) });
    }
    return points;
  }, [totalCapital, monthlyPac, horizon]);

  // Mock news relevant to portfolio
  const relevantNews = [
    { headline: 'Fed: tassi invariati, mercati USA in rialzo', source: 'Reuters', time: '2h fa', impact: 'positive' },
    { headline: 'BCE segnala taglio tassi a giugno, Euro Stoxx sale', source: 'Bloomberg', time: '5h fa', impact: 'positive' },
    { headline: 'Inflazione UK sotto attese: pressione su sterlina', source: 'Financial Times', time: '8h fa', impact: 'neutral' },
  ];

  // Allocation pie — robust
  const allocationData = etfsWithShares.filter(e => e && e.etf).map((e, i) => ({
    name: e.etf.ticker || 'ETF',
    value: e.etf.weight || 0,
    color: [NAVY, GREEN, '#B45309', '#6366F1', '#EC4899', '#14B8A6'][i % 6],
  }));

  const totalShares = etfsWithShares.filter(e => e && e.etf).reduce((s, e) => s + (e.shares || 0) * (e.etf.price || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: NAVY_DARK, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: GREEN_LIGHT, letterSpacing: '0.08em' }}>
            <CheckCircle2 className="w-4 h-4" />
            Portafoglio creato
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
            {name || 'Il tuo portafoglio è pronto'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Abbiamo aggiunto {etfsWithShares.length} ETF al tuo portafoglio. Ecco un riepilogo.
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Capitale iniziale</p>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>{fmt(totalShares)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>PAC mensile</p>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>€{monthlyPac}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>Orizzonte</p>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>{horizon} anni</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: GRAY_400, letterSpacing: '0.06em' }}>ETF</p>
            <p className="text-lg font-semibold" style={{ color: NAVY }}>{etfsWithShares.length}</p>
          </Card>
        </div>

        {/* Projection chart */}
        <Card className="p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-base font-semibold" style={{ color: NAVY }}>Proiezione a {horizon} anni</h2>
              <p className="text-xs mt-0.5" style={{ color: GRAY_600 }}>Ipotesi: rendimento 7% annuo costante</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: GRAY_400 }}>Valore atteso</p>
              <p className="text-xl font-semibold" style={{ color: GREEN }}>{fmt(projection[projection.length - 1].projected)}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={projection} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
              <defs>
                <linearGradient id="createdProj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRAY_200} vertical={false} />
              <XAxis dataKey="year" stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${parseFloat(v).toFixed(0)}a`} />
              <YAxis stroke={GRAY_400} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => fmt(v)} labelFormatter={(l) => `Anno ${l}`} />
              <Area type="monotone" dataKey="projected" stroke={GREEN} strokeWidth={2.5} fill="url(#createdProj)" name="Valore proiettato" />
              <Line type="monotone" dataKey="invested" stroke={GRAY_400} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Capitale investito" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Allocation */}
        <Card className="p-5 md:p-6 mb-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: NAVY }}>Composizione</h2>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={1} strokeWidth={0}>
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {etfsWithShares.map((e, i) => (
                <div key={e.etf.isin} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: allocationData[i].color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: NAVY }}>{e.etf.ticker}</p>
                    <p className="text-xs truncate" style={{ color: GRAY_600 }}>{e.etf.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>{e.etf.weight}%</p>
                    <p className="text-xs" style={{ color: GRAY_400 }}>{e.shares.toFixed(2)} quote</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* News impactanti */}
        <Card className="p-5 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4" style={{ color: NAVY }} />
            <h2 className="text-base font-semibold" style={{ color: NAVY }}>Notizie che potrebbero impattare il portafoglio</h2>
          </div>
          <div className="space-y-3">
            {relevantNews.map((n, i) => (
              <div key={i} className="flex gap-3 pb-3" style={{ borderBottom: i < relevantNews.length - 1 ? `1px solid ${GRAY_100}` : 'none' }}>
                <div className="w-1 rounded-sm flex-shrink-0" style={{ backgroundColor: n.impact === 'positive' ? GREEN : n.impact === 'negative' ? RED : GRAY_400 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1" style={{ color: NAVY }}>{n.headline}</p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: GRAY_400 }}>
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{n.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-4" style={{ color: GRAY_400 }}>* Notizie mostrate sono un esempio. Con API news reali collegata verranno filtrate sui ticker del tuo portafoglio.</p>
        </Card>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: GREEN_LIGHT, color: NAVY_DARK }}
        >
          Vai al mio portafoglio <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Il portafoglio è stato salvato. Puoi modificarlo in qualsiasi momento dalla Dashboard.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [user, setUser] = useState({ email: 'marco@demo.com', name: 'Marco Rossi', initials: 'MR' });
  const [page, setPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNewPortfolio, setShowNewPortfolio] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [justCreatedPortfolio, setJustCreatedPortfolio] = useState(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Portfolio state — now EMPTY by default
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [addToPortfolioEtf, setAddToPortfolioEtf] = useState(null);

  const addEtfToPortfolio = (etf, shares, avgPrice) => {
    setPortfolioHoldings(prev => {
      const existing = prev.find(h => h.isin === etf.isin);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.shares * existing.avgPrice + shares * avgPrice;
        return prev.map(h => h.isin === etf.isin ? { ...h, shares: totalShares, avgPrice: totalCost / totalShares } : h);
      }
      return [...prev, { isin: etf.isin, ticker: etf.ticker, name: etf.name, shares, avgPrice, currentPrice: etf.price, asset: etf.asset, region: etf.region }];
    });
    setAddToPortfolioEtf(null);
  };

  const addMultipleEtfsToPortfolio = (etfsWithShares) => {
    setPortfolioHoldings(prev => {
      let result = [...prev];
      etfsWithShares.forEach(({ etf, shares, avgPrice }) => {
        if (shares <= 0) return;
        const existing = result.find(h => h.isin === etf.isin);
        if (existing) {
          const totalShares = existing.shares + shares;
          const totalCost = existing.shares * existing.avgPrice + shares * avgPrice;
          result = result.map(h => h.isin === etf.isin ? { ...h, shares: totalShares, avgPrice: totalCost / totalShares } : h);
        } else {
          result.push({ isin: etf.isin, ticker: etf.ticker, name: etf.name, shares, avgPrice, currentPrice: etf.price, asset: etf.asset, region: etf.region });
        }
      });
      return result;
    });
  };

  const removeEtfFromPortfolio = (isin) => {
    setPortfolioHoldings(prev => prev.filter(h => h.isin !== isin));
  };

  const nav = [
    { id: 'search', label: 'Cerca ETF', icon: Search },
    { id: 'dashboard', label: 'Portafoglio', icon: Wallet },
    { id: 'analytics', label: 'Analisi', icon: BarChart3 },
    { id: 'simulations', label: 'Simulatore PAC', icon: GitCompare },
    { id: 'models', label: 'Modelli', icon: Briefcase },
    { id: 'academy', label: 'Impara', icon: BookOpen },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'alerts', label: 'Alert', icon: Bell },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  const pages = {
    dashboard: <Dashboard holdings={portfolioHoldings} onNewPortfolio={() => setShowNewPortfolio(true)} onGoToSearch={() => setPage('search')} onGoToModels={() => setPage('models')} onGoToImpara={() => setPage('academy')} onGoToAnalytics={() => setPage('analytics')} onGoToSimulations={() => setPage('simulations')} onGoToAlerts={() => setPage('alerts')} onRemove={removeEtfFromPortfolio} />,
    search: <SearchPage onAddToPortfolio={setAddToPortfolioEtf} />,
    analytics: <Analytics holdings={portfolioHoldings} onGoToSearch={() => setPage('search')} />,
    simulations: <Simulations />,
    models: <ModelPortfolios />,
    community: <Community />,
    academy: <Impara />,
    alerts: <AlertsPage />,
    settings: <SettingsPage user={user} onLogout={() => setIsLoggedIn(false)} onStartTour={() => setShowTour(true)} />,
  };

  if (!isLoggedIn) {
    return <AuthPage onLogin={(u, isSignup) => {
      const initials = (u.name || u.email).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
      setUser({ ...u, initials });
      setIsLoggedIn(true);
      if (isSignup) setNeedsOnboarding(true);
    }} />;
  }

  if (needsOnboarding) {
    return <OnboardingFlow user={user} onComplete={(data) => {
      console.log('Onboarding completato:', data);
      setNeedsOnboarding(false);
      setShowTour(true);
    }} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVY_DARK, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { -webkit-font-smoothing: antialiased; }
        input::placeholder { color: rgba(148,163,184,0.6); }
      `}</style>

      {/* TOP BAR — brand centered + account right */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: NAVY_DARK, borderBottom: `1px solid ${NAVY_LIGHT}` }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Spacer left (mobile menu or empty) */}
            <div className="w-9" />

            {/* Logo centered absolutely */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 cursor-pointer" onClick={() => setPage('dashboard')}>
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: GREEN_LIGHT }}>
                <LineIcon className="w-4.5 h-4.5" style={{ color: NAVY_DARK }} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ color: GREEN_LIGHT, letterSpacing: '-0.02em' }}>
                ETF Tracker
              </span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition"
                  style={{ backgroundColor: NAVY_LIGHT, border: `1px solid rgba(255,255,255,0.15)` }}
                >
                  <User className="w-4 h-4 text-white" />
                </button>
                {avatarMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAvatarMenuOpen(false)} />
                    <div className="absolute right-0 top-11 w-56 rounded-md shadow-lg z-40" style={{ backgroundColor: 'white', border: `1px solid ${GRAY_200}` }}>
                      <div className="p-3" style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                        <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>{user.name}</p>
                        <p className="text-xs truncate" style={{ color: GRAY_600 }}>{user.email}</p>
                      </div>
                      <button onClick={() => { setPage('settings'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: NAVY }}>Profilo</button>
                      <button onClick={() => { setPage('settings'); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" style={{ color: NAVY }}>Impostazioni</button>
                      <button onClick={() => { setShowTour(true); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: NAVY }}>
                        <Eye className="w-3.5 h-3.5" /> Avvia tour guidato
                      </button>
                      <button onClick={() => { setNeedsOnboarding(true); setAvatarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" style={{ color: NAVY }}>
                        <Target className="w-3.5 h-3.5" /> Rivedi onboarding
                      </button>
                      <button
                        onClick={() => { setIsLoggedIn(false); setAvatarMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        style={{ color: RED, borderTop: `1px solid ${GRAY_100}` }}
                      >
                        Esci
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* HORIZONTAL NAV BAR — always visible, horizontal scroll on mobile */}
          <MarketTicker />
          <nav className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide" style={{ borderTop: `1px solid ${NAVY_LIGHT}`, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {nav.map(n => {
              const active = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { setPage(n.id); setMobileOpen(false); }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: active ? GREEN_LIGHT : 'transparent',
                    color: active ? NAVY_DARK : 'rgba(255,255,255,0.75)',
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.backgroundColor = NAVY_LIGHT; e.currentTarget.style.color = 'white'; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                >
                  <n.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                  <span className="sm:hidden text-xs">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT — on light background within dark page */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <main>{pages[page]}</main>
      </div>

      {showNewPortfolio && <NewPortfolioModal onClose={() => setShowNewPortfolio(false)} onSave={(data) => {
        // Convert percentage allocation to real shares using initial PAC as seed capital
        const totalCapital = Math.max(data.monthlyPac * 12, 5000);
        const etfsWithShares = data.etfs.map(etf => ({
          etf,
          shares: (totalCapital * (etf.weight / 100)) / etf.price,
          avgPrice: etf.price,
        }));
        addMultipleEtfsToPortfolio(etfsWithShares);
        setShowNewPortfolio(false);
        setJustCreatedPortfolio({ ...data, totalCapital, etfsWithShares });
      }} />}

      {justCreatedPortfolio && <PortfolioCreatedScreen data={justCreatedPortfolio} onClose={() => { setJustCreatedPortfolio(null); setPage('dashboard'); }} />}

      {addToPortfolioEtf && <AddToPortfolioModal etf={addToPortfolioEtf} onClose={() => setAddToPortfolioEtf(null)} onAdd={(shares, avgPrice) => addEtfToPortfolio(addToPortfolioEtf, shares, avgPrice)} />}

      {showTour && <GuidedTour onClose={() => setShowTour(false)} onNavigate={(p) => setPage(p)} />}

      {/* FOOTER */}
      <footer className="mt-12 py-8" style={{ borderTop: `1px solid ${NAVY_LIGHT}` }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <div className="flex items-center gap-4 flex-wrap">
              <span>© 2026 ETF Tracker</span>
              <span>•</span>
              <button className="hover:text-white transition">Termini</button>
              <button className="hover:text-white transition">Privacy</button>
              <button className="hover:text-white transition">Sicurezza</button>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Dati protetti con crittografia AES-256</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
