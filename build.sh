#!/usr/bin/env bash
set -e

echo "=== [1/3] Installo dipendenze Python ==="
pip install -r backend/requirements.txt

echo "=== [2/3] Installo Node.js ==="
cd frontend
npm install

echo "=== [3/3] Build React → backend/static ==="
npm run build

cd ..
echo "=== Build completato — $(date) ==="
ls -la backend/static/ 2>/dev/null && echo "Static files presenti" || echo "ATTENZIONE: static non trovato"
