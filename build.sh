#!/usr/bin/env bash
set -e

echo "=== [1/3] Python dependencies ==="
pip install -r backend/requirements.txt

echo "=== [2/3] Node dependencies ==="
cd frontend && npm install

echo "=== [3/3] Build React → backend/static ==="
npm run build
cd ..

echo "=== Done $(date) ==="
