# RP Betting Site — v3 (hosting-ready)

Front: **Vercel** · Back: **Render** · Cotes: **The Odds API** (gratuit) · Cache quotidien persistant.

## 0) Prérequis
- Node.js 18+
- Clé **The Odds API** (https://theoddsapi.com/)

## 1) Backend (Render)
- Crée un **Web Service** sur Render en pointant `backend/`.
- Build: `npm install` · Start: `node server.js`
- **Env Vars**:
  - `THEODDS_API_KEY` = ta clé The Odds API
  - `DISCORD_WEBHOOK_URL` = (optionnel) ton webhook
  - `CACHE_DIR` = `/data/cache`  (si tu ajoutes un **Disk** monté sur `/data`)
  - `CORS_ORIGIN` = `https://ton-site.vercel.app`  (ton domaine Vercel)
- (Optionnel) **Disks**: Add Disk → Name: cache → Size: 1GB → Mount Path: `/data`
- Test: `https://<ton-backend>.onrender.com/api/health` et `/api/matches-odds`

## 2) Frontend (Vercel)
- Importe `frontend/` sur Vercel.
- **Env Var**: `VITE_API_BASE` = `https://<ton-backend>.onrender.com`
- Deploy → visite `https://<ton-site>.vercel.app`

## 3) Local
```bash
# backend
cd backend && npm i && cp .env.example .env
# édite .env (THEODDS_API_KEY, DISCORD_WEBHOOK_URL, CORS_ORIGIN, CACHE_DIR facultatif)
npm run dev  # http://localhost:3001

# frontend
cd ../frontend && npm i && npm run dev  # http://localhost:5173
```

---

## Endpoints
- `GET /api/matches-odds?date=YYYY-MM-DD` → stock du jour (Europe/Paris), mis en cache dans `CACHE_DIR`.
- `POST /api/submit-bet` → envoie le ticket sur Discord (si webhook configuré).
