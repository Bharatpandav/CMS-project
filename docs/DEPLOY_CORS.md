# Vercel + Render (CORS)

| Render | Vercel |
|--------|--------|
| `NODE_ENV=production` | `VITE_API_URL=https://YOUR-API.onrender.com` |
| `CLIENT_URL=https://YOUR-APP.vercel.app` | Redeploy after env changes |
| `MONGO_URI`, `JWT_SECRET` | |

Health check: `GET /api/health` on the API URL.

“Failed to fetch” on login → set `CLIENT_URL` to the exact Vercel origin and redeploy the API with CORS middleware enabled.