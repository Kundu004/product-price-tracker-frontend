# Product Price Tracker — Frontend

Minimal Vite + React dashboard for the Product Price Tracker backend.
Single-page tab layout, no router, no component library — plain
CSS-in-JS inline styles.

**Live site:** https://product-price-tracker-frontend-one.vercel.app
**Backend API:** https://product-price-tracker-f.onrender.com

## Stack

- Vite
- React 18
- Plain `fetch` (`src/api.js`) — no data-fetching library

## Local setup

```bash
git clone <this-repo-url>
cd frontend
npm install
cp .env.example .env.local   # fill in VITE_API_URL, see below
npm run dev                   # starts on http://localhost:5173
```

## Environment variables

| Variable        | Description                                                                                   |
|------------------|-------------------------------------------------------------------------------------------------|
| `VITE_API_URL`   | Base URL of the deployed backend, no trailing slash (e.g. `https://product-price-tracker-f.onrender.com`). Falls back to `http://localhost:4000` if unset, so local dev works against a locally running backend with no `.env.local` at all. |

Vite only bakes `VITE_*` env vars in at **build time** — when deploying to
Vercel, `VITE_API_URL` must be set in the project's Environment Variables
*before* the first deploy, not added afterward and expected to apply
retroactively.

## Structure

```
src/
  main.jsx    - entry point
  api.js      - fetch wrapper + typed API calls to the backend
  App.jsx     - all UI: Dashboard tab (tracked products, expandable
                history/log tabs per product, Untrack, Export CSV) and
                Search & Track tab (search → pick → choose option → track)
```

## Deployment (Vercel)

- Framework preset: Vite (auto-detected)
- Build command: `vite build` (default)
- Output directory: `dist` (default)
- Set `VITE_API_URL` in Environment Variables before deploying.

## Backend CORS

The backend only allows requests from a single origin, set via its own
`FRONTEND_URL` env var. After deploying this frontend to Vercel, the
backend's `FRONTEND_URL` must be updated to match this app's exact
production URL, or every request will fail CORS.
