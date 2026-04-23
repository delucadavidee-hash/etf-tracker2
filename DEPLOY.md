# 🚀 Guida Deploy — Da zero a online in ~2 ore

## Prerequisiti (installa se non li hai)
- Git: https://git-scm.com/downloads
- Node.js 20+: https://nodejs.org
- Python 3.11+: https://python.org
- Account GitHub: https://github.com (gratuito)
- Account Render: https://render.com (gratuito)

---

## FASE 1 — Setup locale (20 min)

### Passo 1 — Entra nella cartella del progetto
```bash
cd etf-tracker
```

### Passo 2 — Testa il backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Apri http://localhost:8000/api/health → deve rispondere `{"status":"ok"}`
Premi CTRL+C per fermare.

### Passo 3 — Testa il frontend
```bash
cd ../frontend
npm install
npm run dev
```
Apri http://localhost:5173 → deve aprirsi l'app.
Premi CTRL+C per fermare.

### Passo 4 — Build di produzione
```bash
npm run build
```
Verifica che sia stata creata la cartella `../backend/static/`

### Passo 5 — Testa build + backend insieme
```bash
cd ../backend
python main.py
```
Apri http://localhost:8000 → deve mostrare l'app compilata.

---

## FASE 2 — GitHub (15 min)

### Passo 6 — Crea repo su GitHub
1. Vai su https://github.com/new
2. Nome: `etf-tracker`
3. Visibilità: **Public** (richiesta da Render gratuito) oppure Private
4. NON aggiungere README (lo abbiamo già)
5. Clicca "Create repository"

### Passo 7 — Inizializza Git e fai push
```bash
# Dalla cartella etf-tracker/
git init
git add .
git commit -m "Initial commit — ETF Tracker v1.0"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/etf-tracker.git
git push -u origin main
```
Sostituisci `TUO_USERNAME` con il tuo username GitHub.

---

## FASE 3 — Render Deploy (20 min)

### Passo 8 — Crea il servizio su Render
1. Vai su https://render.com → Log in → "New +"
2. Scegli **"Web Service"**
3. Collega GitHub → seleziona il repo `etf-tracker`
4. Clicca "Connect"

### Passo 9 — Configura il servizio
Compila questi campi:

| Campo | Valore |
|-------|--------|
| **Name** | `etf-tracker` |
| **Region** | Frankfurt (EU Central) |
| **Branch** | `main` |
| **Root Directory** | *(lascia vuoto)* |
| **Runtime** | `Python 3` |
| **Build Command** | `chmod +x build.sh && ./build.sh` |
| **Start Command** | `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |

### Passo 10 — Piano gratuito
- Scorri in fondo a "Instance Type"
- Seleziona **"Free"**
- Clicca **"Create Web Service"**

### Passo 11 — Aspetta la build
- Render comincia a buildare (2-5 minuti)
- Puoi vedere i log in tempo reale
- Quando vedi "Your service is live" → clicca il link 🎉

---

## FASE 4 — Verifica (5 min)

### Passo 12 — Testa l'app live
1. Apri l'URL fornito da Render (es. `https://etf-tracker.onrender.com`)
2. Testa che l'app si apra
3. Testa che la ricerca ETF funzioni
4. Testa che le sezioni principali siano navigabili

### Passo 13 — Testa le API
```bash
curl https://etf-tracker.onrender.com/api/health
curl "https://etf-tracker.onrender.com/api/etfs?query=SWDA"
```

---

## Aggiornamenti futuri

Ogni volta che vuoi aggiornare l'app:
```bash
# Modifica il codice...
git add .
git commit -m "Descrizione delle modifiche"
git push
```
Render rileva il push e ricrea automaticamente il deploy.

---

## ⚠️ Note importanti sul piano gratuito Render

- Il servizio **si spegne dopo 15 minuti di inattività**
- Al primo accesso dopo lo sleep: attesa di ~30-60 secondi (cold start)
- Per evitare: upgrade a $7/mese (Starter plan) — consigliato quando hai utenti reali
- **Limite**: 750 ore/mese gratis (abbastanza per un'app in sviluppo)

---

## Problemi comuni

### "Build failed" su Render
- Controlla i log → cerca la riga rossa
- Spesso: versione Node.js sbagliata → in Render Environment aggiungi variabile `NODE_VERSION=20`

### L'app si apre ma le API danno 404
- Verifica che `backend/static/` esista nel repo (non deve essere in .gitignore)
- Se hai dimenticato: rimuovi `backend/static/` dal .gitignore, fai build locale, commit e push

### Pagina bianca
- Apri DevTools → Console → cerca errori JS
- Spesso: percorso assets sbagliato → controlla `vite.config.js` il campo `base`

---

## Prossimi passi dopo il deploy

1. **Dominio custom**: In Render → Settings → Custom Domain → aggiungi `tuodominio.com`
2. **HTTPS**: Automatico su Render (certificato Let's Encrypt)
3. **Database**: Aggiungi PostgreSQL da Render → Dashboard → New → PostgreSQL
4. **Variabili d'ambiente**: Render → Environment → aggiungi API keys (Yahoo Finance, Finnhub, SendGrid)
