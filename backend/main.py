"""
ETF Tracker — FastAPI Backend con yfinance
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import time, threading, logging, math, random

logger = logging.getLogger(__name__)

try:
    import yfinance as yf
    YF_AVAILABLE = True
except ImportError:
    YF_AVAILABLE = False

# ─── Yahoo Finance symbol mapping ───
YF_SYMBOLS = {
    "IE00B4L5Y983": "SWDA.L", "IE00BK5BQT80": "VWCE.AS",
    "IE00BKM4GZ66": "EIMI.L", "IE00B3F81R35": "AGGH.L",
    "IE00B579F325": "SGLD.L", "IE00B5BMR087": "CSSPX.L",
    "LU0290358497": "XEON.L", "IE00B3XXRP09": "VUSA.L",
    "IE00BFMXXD54": "VUAA.AS", "IE00BK1PV551": "VWRL.AS",
    "IE00BD0NCM55": "VSML.AS", "IE00BMW42181": "EQQQ.L",
    "IE00BKWQ0G16": "USPY.AS", "LU0274211480": "XMME.L",
    "LU1437018838": "AEEM.L",  "IE00BJLP1Y77": "EWRD.L",
}

STATIC_ETF_DB = [
    {"isin": "IE00B4L5Y983", "ticker": "SWDA", "yf_symbol": "SWDA.L", "name": "iShares Core MSCI World UCITS ETF", "issuer": "iShares", "asset": "Azionario", "region": "Globale Sviluppati", "ter": 0.20, "aum": 82400, "price": 92.45, "chg1d": 0.42, "chg1y": 14.80, "chg5y": 72.30, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica l'MSCI World con circa 1.500 aziende in 23 paesi sviluppati. Uno degli ETF più grandi e liquidi per investitori europei. TER 0.20%, domicilio irlandese con trattato fiscale USA al 15% sui dividendi."},
    {"isin": "IE00BK5BQT80", "ticker": "VWCE", "yf_symbol": "VWCE.AS", "name": "Vanguard FTSE All-World UCITS ETF Acc", "issuer": "Vanguard", "asset": "Azionario", "region": "Globale", "ter": 0.22, "aum": 18900, "price": 118.22, "chg1d": 0.38, "chg1y": 17.70, "chg5y": 68.40, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica il FTSE All-World Index con oltre 4.000 azioni in paesi sviluppati ed emergenti. Copre circa il 98% della capitalizzazione mondiale. Versione ad accumulazione automatica."},
    {"isin": "IE00BKM4GZ66", "ticker": "EIMI", "yf_symbol": "EIMI.L", "name": "iShares Core MSCI EM IMI UCITS ETF", "issuer": "iShares", "asset": "Azionario", "region": "Emergenti", "ter": 0.18, "aum": 21300, "price": 32.18, "chg1d": -0.24, "chg1y": 9.40, "chg5y": 28.60, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 4, "currency": "USD", "description": "Replica il MSCI Emerging Markets IMI con circa 2.600 aziende in paesi come Cina, India, Brasile, Taiwan e Corea del Sud. Uno dei più completi sugli emergenti per investitori UCITS."},
    {"isin": "IE00B3F81R35", "ticker": "AGGH", "yf_symbol": "AGGH.L", "name": "iShares Core Global Aggregate Bond UCITS ETF", "issuer": "iShares", "asset": "Obbligazionario", "region": "Globale", "ter": 0.10, "aum": 5800, "price": 48.32, "chg1d": 0.08, "chg1y": -2.50, "chg5y": -8.20, "replication": "Campionamento", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 4, "currency": "USD", "description": "Replica il Bloomberg Global Aggregate Bond Index (hedged EUR) con oltre 10.000 obbligazioni governative e societarie investment grade. Copertura valutaria in euro inclusa."},
    {"isin": "IE00B579F325", "ticker": "SGLD", "yf_symbol": "SGLD.L", "name": "Invesco Physical Gold ETC", "issuer": "Invesco", "asset": "Commodities", "region": "Globale", "ter": 0.12, "aum": 16400, "price": 195.40, "chg1d": 0.92, "chg1y": 29.50, "chg5y": 82.10, "replication": "Fisica", "distribution": "N/A", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "ETC a replica fisica che investe in oro fisico custodito in caveau sicuri. Ogni quota rappresenta una quantità specifica di oro. Non è un fondo UCITS ma un certificato (ETC)."},
    {"isin": "IE00B5BMR087", "ticker": "CSSPX", "yf_symbol": "CSSPX.L", "name": "iShares Core S&P 500 UCITS ETF (Acc)", "issuer": "iShares", "asset": "Azionario", "region": "USA", "ter": 0.07, "aum": 97200, "price": 548.30, "chg1d": 0.55, "chg1y": 18.20, "chg5y": 94.50, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica il S&P 500 Index delle 500 maggiori società USA. Con 97+ miliardi di AUM è uno degli ETF più grandi al mondo. Domicilio irlandese: ritenuta 15% sui dividendi USA invece del 30%."},
    {"isin": "LU0290358497", "ticker": "XEON", "yf_symbol": "XEON.L", "name": "Xtrackers II EUR Overnight Rate Swap UCITS ETF", "issuer": "Xtrackers", "asset": "Monetario", "region": "Eurozona", "ter": 0.10, "aum": 15200, "price": 137.50, "chg1d": 0.01, "chg1y": 3.80, "chg5y": 9.20, "replication": "Sintetica", "distribution": "Accumulazione", "domicile": "Lussemburgo", "rating": 4, "currency": "EUR", "description": "Replica il tasso overnight €STR tramite swap. Usato come parcheggio liquidità a breve termine. Rende circa quanto il tasso BCE meno il TER. Rischio quasi nullo ma rendimento modesto."},
    {"isin": "IE00B3XXRP09", "ticker": "VUSA", "yf_symbol": "VUSA.L", "name": "Vanguard S&P 500 UCITS ETF (Dist)", "issuer": "Vanguard", "asset": "Azionario", "region": "USA", "ter": 0.07, "aum": 52400, "price": 88.90, "chg1d": 0.56, "chg1y": 17.80, "chg5y": 93.40, "replication": "Fisica", "distribution": "Distribuzione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica il S&P 500. Versione a distribuzione trimestrale dei dividendi. Stessa struttura di VUAA ma con pagamento cash. Ideale per chi è in fase di rendita o desidera cash flow regolare."},
    {"isin": "IE00BFMXXD54", "ticker": "VUAA", "yf_symbol": "VUAA.AS", "name": "Vanguard S&P 500 UCITS ETF (Acc)", "issuer": "Vanguard", "asset": "Azionario", "region": "USA", "ter": 0.07, "aum": 48100, "price": 95.20, "chg1d": 0.55, "chg1y": 18.10, "chg5y": 94.20, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica il S&P 500. Versione ad accumulazione: reinveste automaticamente i dividendi. Più efficiente fiscalmente di VUSA per chi è in fase di accumulo a lungo termine."},
    {"isin": "IE00BK1PV551", "ticker": "VWRL", "yf_symbol": "VWRL.AS", "name": "Vanguard FTSE All-World UCITS ETF (Dist)", "issuer": "Vanguard", "asset": "Azionario", "region": "Globale", "ter": 0.22, "aum": 12400, "price": 112.80, "chg1d": 0.37, "chg1y": 17.50, "chg5y": 67.90, "replication": "Fisica", "distribution": "Distribuzione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Versione a distribuzione di VWCE. Stesso indice FTSE All-World (4.000+ azioni globali) ma paga dividendi trimestrali. Per chi desidera cash flow regolare dal portafoglio globale."},
    {"isin": "IE00BD0NCM55", "ticker": "SEMI", "yf_symbol": "VSML.AS", "name": "VanEck Semiconductor UCITS ETF", "issuer": "VanEck", "asset": "Azionario Settoriale", "region": "Globale", "ter": 0.35, "aum": 3200, "price": 42.80, "chg1d": 1.62, "chg1y": 42.40, "chg5y": 182.40, "replication": "Fisica", "distribution": "Accumulazione", "domicile": "Irlanda", "rating": 4, "currency": "USD", "description": "Replica il MVIS US Listed Semiconductor 25 Index: le 25 maggiori aziende di semiconduttori (NVIDIA, TSMC, ASML, Broadcom). Alta concentrazione e volatilità elevata. Solo per investitori consapevoli del rischio settoriale."},
    {"isin": "IE00BMW42181", "ticker": "EQQQ", "yf_symbol": "EQQQ.L", "name": "Invesco EQQQ NASDAQ-100 UCITS ETF (Dist)", "issuer": "Invesco", "asset": "Azionario", "region": "USA Tech", "ter": 0.30, "aum": 7800, "price": 440.20, "chg1d": 0.72, "chg1y": 24.80, "chg5y": 142.60, "replication": "Fisica", "distribution": "Distribuzione", "domicile": "Irlanda", "rating": 5, "currency": "USD", "description": "Replica il NASDAQ-100: le 100 maggiori società non-finanziarie del NASDAQ. Altamente concentrato su tech (Apple, Microsoft, NVIDIA, Meta, Amazon). Alta crescita storica ma anche alta volatilità."},
]

# ─── Cache in-memory ───
_cache: dict = {}
_cache_lock = threading.Lock()
CACHE_TTL = 60
CACHE_TTL_INFO = 3600
CACHE_TTL_HIST = 300

def cache_get(key):
    with _cache_lock:
        e = _cache.get(key)
        if e and time.time() < e["exp"]:
            return e["data"]
    return None

def cache_set(key, data, ttl=CACHE_TTL):
    with _cache_lock:
        _cache[key] = {"data": data, "exp": time.time() + ttl}

# ─── yfinance helpers ───
def get_quote(yf_sym: str) -> dict:
    cached = cache_get(f"q:{yf_sym}")
    if cached: return cached
    if not YF_AVAILABLE: return {}
    try:
        fi = yf.Ticker(yf_sym).fast_info
        price = float(fi.last_price or 0)
        prev = float(fi.previous_close or price)
        res = {
            "price": round(price, 4),
            "prev_close": round(prev, 4),
            "chg1d": round((price/prev - 1)*100, 2) if prev else 0,
            "day_high": round(float(fi.day_high or 0), 4),
            "day_low": round(float(fi.day_low or 0), 4),
            "volume": int(fi.three_month_average_volume or 0),
            "currency": fi.currency or "USD",
        }
        cache_set(f"q:{yf_sym}", res, CACHE_TTL)
        return res
    except Exception as ex:
        logger.warning(f"quote {yf_sym}: {ex}")
        return {}

def get_info(yf_sym: str) -> dict:
    cached = cache_get(f"i:{yf_sym}")
    if cached: return cached
    if not YF_AVAILABLE: return {}
    try:
        info = yf.Ticker(yf_sym).info
        res = {
            "description": info.get("longBusinessSummary", ""),
            "category": info.get("category", ""),
            "expense_ratio": round((info.get("annualReportExpenseRatio") or 0)*100, 4),
            "yield_pct": round((info.get("yield") or 0)*100, 2),
            "ytd_return": round((info.get("ytdReturn") or 0)*100, 2),
            "three_year_return": round((info.get("threeYearAverageReturn") or 0)*100, 2),
            "five_year_return": round((info.get("fiveYearAverageReturn") or 0)*100, 2),
            "inception_date": str(info.get("fundInceptionDate", "")),
            "beta_3year": info.get("beta3Year"),
            "holdings_count": info.get("totalHoldings", 0),
            "top_holdings": info.get("holdings", [])[:10],
            "sector_weights": info.get("sectorWeightings", []),
            "country_weights": info.get("countryWeightings", []),
        }
        cache_set(f"i:{yf_sym}", res, CACHE_TTL_INFO)
        return res
    except Exception as ex:
        logger.warning(f"info {yf_sym}: {ex}")
        return {}

def get_history(yf_sym: str, period="1y", interval="1d") -> list:
    cached = cache_get(f"h:{yf_sym}:{period}:{interval}")
    if cached: return cached
    if not YF_AVAILABLE: return []
    try:
        hist = yf.Ticker(yf_sym).history(period=period, interval=interval)
        res = [{"date": d.strftime("%Y-%m-%d"), "open": round(float(r.Open),4),
                "high": round(float(r.High),4), "low": round(float(r.Low),4),
                "close": round(float(r.Close),4), "volume": int(r.Volume)}
               for d, r in hist.iterrows()]
        cache_set(f"h:{yf_sym}:{period}:{interval}", res, CACHE_TTL_HIST)
        return res
    except Exception as ex:
        logger.warning(f"history {yf_sym}: {ex}")
        return []

def synth_history(etf: dict, period: str) -> list:
    """Synthetic fallback history when yfinance is unavailable."""
    n = {"1d":24,"5d":5,"1mo":22,"3mo":65,"6mo":130,"1y":252,"2y":504,"5y":1260,"max":1260}.get(period,252)
    price = etf["price"] * (1 - etf.get("chg1y",8)/100)
    ret = etf.get("chg1y",8)/100/n
    result = []
    for i in range(n):
        price *= (1 + ret + 0.008*math.sin(i/15) + random.gauss(0,0.007))
        result.append({"date": f"T-{n-i}", "close": round(price,4),
                       "open": round(price*0.998,4), "high": round(price*1.004,4),
                       "low": round(price*0.996,4), "volume": random.randint(50000,1500000)})
    return result

# ─── App ───
app = FastAPI(title="ETF Tracker API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STATIC_DIR = Path(__file__).parent / "static"

@app.get("/api/health")
def health():
    return {"status":"ok","version":"2.0.0","yfinance":YF_AVAILABLE,"etf_count":len(STATIC_ETF_DB),"cache":len(_cache)}

@app.get("/api/etfs")
def list_etfs(
    query:str=Query(""), asset:str=Query(""), region:str=Query(""),
    distribution:str=Query(""), replication:str=Query(""),
    domicile:str=Query(""), issuer:str=Query(""),
    max_ter:float=Query(1.0), min_aum:float=Query(0), sort_by:str=Query("aum"),
    live:bool=Query(False),
):
    res = STATIC_ETF_DB.copy()
    if query:
        q = query.lower()
        res = [e for e in res if q in e["ticker"].lower() or q in e["name"].lower()
               or q in e["isin"].lower() or q in e["issuer"].lower()]
    for field, val, default in [
        ("asset",asset,"Tutti"),("region",region,"Tutte"),
        ("distribution",distribution,"Tutte"),("replication",replication,"Tutte"),
        ("domicile",domicile,"Tutti"),("issuer",issuer,"Tutti"),
    ]:
        if val and val != default:
            res = [e for e in res if e.get(field)==val]
    res = [e for e in res if e["ter"]<=max_ter and e["aum"]>=min_aum]
    sk = {"aum": lambda e:-e["aum"],"ter":lambda e:e["ter"],
          "chg1y":lambda e:-e["chg1y"],"chg5y":lambda e:-e["chg5y"]}
    res.sort(key=sk.get(sort_by, lambda e:-e["aum"]))
    if live:
        enriched = []
        for e in res:
            ec = {**e}
            if e.get("yf_symbol"):
                q = get_quote(e["yf_symbol"])
                if q:
                    ec.update(q); ec["live"]=True
            enriched.append(ec)
        return enriched
    return res

@app.get("/api/search")
def search(q:str=Query(...,min_length=1)):
    ql = q.lower()
    results = [e for e in STATIC_ETF_DB if ql in e["ticker"].lower()
               or ql in e["name"].lower() or ql in e["isin"].lower() or ql in e["issuer"].lower()]
    results.sort(key=lambda e:(0 if e["ticker"].lower()==ql else 1,-e["aum"]))
    return results[:10]

@app.get("/api/etfs/{ticker}/quote")
def get_etf_quote(ticker:str):
    etf = next((e for e in STATIC_ETF_DB if e["ticker"]==ticker.upper()), None)
    if not etf: raise HTTPException(404, f"ETF {ticker} not found")
    q = get_quote(etf.get("yf_symbol","")) if etf.get("yf_symbol") else {}
    return {**etf, **q, "live": bool(q)}

@app.get("/api/etfs/{ticker}/info")
def get_etf_info(ticker:str):
    etf = next((e for e in STATIC_ETF_DB if e["ticker"]==ticker.upper()), None)
    if not etf: raise HTTPException(404, f"ETF {ticker} not found")
    result = {**etf}
    if etf.get("yf_symbol"):
        info = get_info(etf["yf_symbol"])
        if info:
            if info.get("description"): result["description"] = info["description"]
            result.update({k:v for k,v in info.items() if v})
            result["live_info"] = True
    return result

@app.get("/api/etfs/{ticker}/history")
def get_etf_history(ticker:str, period:str=Query("1y"), interval:str=Query("1d")):
    etf = next((e for e in STATIC_ETF_DB if e["ticker"]==ticker.upper()), None)
    if not etf: raise HTTPException(404, f"ETF {ticker} not found")
    yf_sym = etf.get("yf_symbol","")
    hist = get_history(yf_sym, period, interval) if yf_sym else []
    live = bool(hist)
    if not hist: hist = synth_history(etf, period)
    return {"ticker":ticker,"yf_symbol":yf_sym,"period":period,"interval":interval,"data":hist,"live":live}

@app.get("/api/market/summary")
def market_summary():
    indices = [
        {"name":"S&P 500","ticker":"^GSPC","value":5308.15,"chg1d":0.65},
        {"name":"MSCI World","ticker":"URTH","value":188.42,"chg1d":0.58},
        {"name":"Euro Stoxx 50","ticker":"^STOXX50E","value":5024.30,"chg1d":0.42},
        {"name":"NASDAQ 100","ticker":"^NDX","value":18722.80,"chg1d":0.88},
    ]
    if YF_AVAILABLE:
        for idx in indices:
            q = get_quote(idx["ticker"])
            if q: idx.update({"value":q["price"],"chg1d":q["chg1d"],"live":True})
    return {"indices":indices,"timestamp":int(time.time())}

@app.get("/api/news")
def get_news(tickers:str=""):
    news = [
        {"headline":"Fed mantiene tassi invariati: mercati USA in rialzo","source":"Reuters","time":"2h fa","impact":"positive","tickers":["CSSPX","SWDA","VWCE","VUAA"]},
        {"headline":"BCE segnala possibile taglio tassi a giugno","source":"Bloomberg","time":"5h fa","impact":"positive","tickers":["EUNK","CEU","EUNA","VWCE"]},
        {"headline":"Inflazione Cina sotto attese: pressione su emergenti","source":"Financial Times","time":"8h fa","impact":"negative","tickers":["EIMI","XMME","AEEM"]},
        {"headline":"Nvidia supera le stime: semiconduttori in rally del 4%","source":"CNBC","time":"12h fa","impact":"positive","tickers":["SEMI","CNDX","EQQQ"]},
        {"headline":"Treasury USA 10Y: rendimento scende sotto 4.3%","source":"WSJ","time":"1g fa","impact":"positive","tickers":["IBTM","IDTL","AGGH"]},
        {"headline":"Petrolio ai minimi da 3 mesi: OPEC+ estende taglio","source":"Reuters","time":"1g fa","impact":"neutral","tickers":["SGLD","SWDA"]},
    ]
    if tickers:
        req = {t.upper().strip() for t in tickers.split(",")}
        return [n for n in news if any(t in n["tickers"] for t in req)]
    return news

if STATIC_DIR.exists():
    if (STATIC_DIR/"assets").exists():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR/"assets"), name="assets")
    @app.get("/{full_path:path}")
    async def spa(full_path:str):
        idx = STATIC_DIR/"index.html"
        return FileResponse(idx) if idx.exists() else JSONResponse({"error":"Frontend non compilato"},status_code=503)
else:
    @app.get("/")
    def root():
        return {"msg":"Backend OK","docs":"/docs","yfinance":YF_AVAILABLE}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app",host="0.0.0.0",port=8000,reload=True)
