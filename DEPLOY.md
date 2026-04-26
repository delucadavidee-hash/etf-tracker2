# Deploy su Render — Guida aggiornata

## Impostazioni corrette su Render

| Campo | Valore |
|-------|--------|
| **Name** | `etf-tracker` |
| **Region** | Frankfurt (EU Central) |
| **Branch** | `main` |
| **Root Directory** | *(lascia VUOTO)* |
| **Runtime** | `Python 3` |
| **Build Command** | `chmod +x build.sh && ./build.sh` |
| **Start Command** | `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

## Struttura attesa dal repo

```
etf-tracker/          ← ROOT (Render parte da qui)
├── package.json      ← necessario per Render (chiama npm in frontend/)
├── build.sh          ← installa Python + Node, compila React
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── static/       ← generato dal build, NON nel repo
└── frontend/
    ├── package.json  ← dipendenze React
    └── src/
```

## Sequenza di deploy

1. Push su GitHub
2. Render rileva il push
3. Esegue `build.sh`:
   - `pip install -r backend/requirements.txt`
   - `cd frontend && npm install && npm run build`
   - React compilato → `backend/static/`
4. Avvia `uvicorn main:app` che serve sia le API che i file statici

## Variabili d'ambiente da aggiungere su Render

In Render → Environment → Add Environment Variable:

| Chiave | Valore |
|--------|--------|
| `PYTHON_VERSION` | `3.11.0` |
| `NODE_VERSION` | `20` |

## Problemi comuni

### "Couldn't find a package.json file"
→ Assicurati che `Root Directory` sia **vuoto** (non `frontend`) e che `package.json` esista nella radice del repo.

### Build fallisce su npm
→ Aggiungi la variabile d'ambiente `NODE_VERSION=20` in Render → Environment.

### Static files non trovati
→ Verifica che `vite.config.js` abbia `outDir: '../backend/static'`. La cartella `backend/static/` viene creata dal build e non deve stare nel `.gitignore`.

### Cold start lento (~30-60s)
→ Normale sul piano Free di Render. Il servizio si spegne dopo 15 min di inattività. Upgrade a $7/mese per avere always-on.
