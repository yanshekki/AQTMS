# AQTMS Web Frontend (React)

This is the React web app for AQTMS frontend integration (Step 7).

## Setup (when internet available)
```bash
npm create vite@latest . -- --template react-ts
npm install axios react-router-dom @types/node
```

## Key Integrations
- Auth: POST /auth/nonce , POST /auth/login (wallet signature + JWT)
- Orders: GET/POST /orders (protected by JWT)
- Use JWT from login for Authorization: Bearer <token> on protected routes

## Example API Client (src/api/client.ts)
```ts
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3001' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default api;
```

## Pages to implement
- Login (wallet connect + sign)
- Dashboard (portfolio snapshot, positions, kill switch status)
- Orders (list, place market/limit, cancel, view status)
- Signals (from /signals or data sources)
- Risk settings

See backend /orders, /auth, ExecutionService for live trading flow.
Kill Switch / daily loss circuit breaker enforced in ExecutionService.

## Next (full Step 7)
- Add Position/Signal Prisma impls (done in backend)
- PortfolioSnapshot automation (cron or event driven)
- Full e2e tests for OrderController
- React Query / Tanstack for state, WebSocket for live order updates
