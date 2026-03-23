# Decision Engine – Railway Deployment

Deploy the decision engine (BKT-based question selection service) to Railway.

## Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. MongoDB (same as LMS backend – Railway plugin or MongoDB Atlas)
3. LMS backend URL for `DECISION_ENGINE_URL` in the backend

## Deployment Steps

### 1. Connect Repository

1. Railway Dashboard → **New Project**
2. **Deploy from GitHub repo** → select the `decision-engine` directory or monorepo root
3. If using a monorepo, set **Root Directory** to `decision-engine`

### 2. Environment Variables

In Railway → Project → **Variables**:

**Required:**
```
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=lmsDB
```

**Optional:**
```
PORT=4000
NODE_ENV=production
```

Use the same `MONGODB_URI` and `MONGODB_DB_NAME` as the LMS backend so both services share the same database (students, skills, etc.).

### 3. Deploy

Railway will:

- Run `npm install`
- Run `npm run build` (TypeScript → `dist/`)
- Run `npm start` → `node dist/server.js`

### 4. Configure LMS Backend

Set the decision engine URL in the LMS backend (Railway Variables or `.env`):

```
DECISION_ENGINE_URL=https://your-decision-engine.railway.app
```

### 5. Verify

```bash
curl https://your-decision-engine.railway.app/health
```

Expected:

```json
{ "status": "ok" }
```

## API Endpoints

- `GET /health` – Health check
- `POST /next-question` – Get next question decision (body: `{ studentId, studentProfile? }`)
- `POST /update` – Update BKT after answer (body: `{ studentId, skillId, correct, questionId? }`)

## Troubleshooting

### 502 Bad Gateway

1. **Build** – Confirm `npm run build` succeeds and `dist/` exists
2. **Port** – App listens on `PORT` (Railway sets this)
3. **MongoDB** – Ensure `MONGODB_URI` is set and reachable from Railway

### Spec files not found

The decision engine bundles Biology and Physics spec JSON in `data/`. These are deployed with the app. If you see “ENOENT” for spec files, verify `data/` is in the repo and not ignored.

### Root Directory (monorepo)

If the decision engine lives in a monorepo, set Railway **Root Directory** to `decision-engine` so builds and start commands run in the correct folder.
