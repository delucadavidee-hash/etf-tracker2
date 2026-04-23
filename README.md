# ETF Tracker 📈

Applicazione web per tracciare portafogli ETF UCITS, con manuale integrato, simulatore PAC Monte Carlo, confronto ETF e report email.

## Stack

- **Frontend**: React 18 + Recharts + Lucide Icons (Vite)
- **Backend**: Python FastAPI
- **Hosting**: Render.com

---

## Sviluppo locale

### 1. Backend (terminale 1)
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### 2. Frontend (terminale 2)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173 (con proxy API verso :8000)
```

---

## Deploy su Render

Vedi `DEPLOY.md` per la guida passo-passo completa.

---

## API Endpoints

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/etfs` | Lista ETF con filtri |
| GET | `/api/etfs/{isin}` | Dettaglio singolo ETF |
| GET | `/api/news?tickers=SWDA,VWCE` | News filtrate per ticker |
| GET | `/api/portfolio/history?period=1Y` | Storico portafoglio |

---

## Roadmap backend

- [ ] Autenticazione utenti (JWT)
- [ ] Database PostgreSQL (portafogli, transazioni)
- [ ] Integrazione Yahoo Finance (prezzi live)
- [ ] Integrazione Finnhub News (notizie reali)
- [ ] Invio report email (SendGrid)
- [ ] Alert triggers (background jobs con APScheduler)
