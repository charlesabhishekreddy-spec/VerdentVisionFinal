# Cloudflare Deployment Checklist (Point-by-Point)

This checklist targets a free-cost baseline using Cloudflare services.

## Point 1: Environment and Secrets

1. Use `.env.production.example` as your source template.
2. Put all secrets in Cloudflare secrets, not in git:
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY` (optional fallback)
   - OAuth client secrets (if used)
3. Keep these production flags:
   - `NODE_ENV=production`
   - `FORCE_HTTPS=true`
   - `TRUST_PROXY=true`
   - `SESSION_COOKIE_SECURE=true`
   - `ALLOW_SOCIAL_PROFILE_ONLY=false`
   - `EXPOSE_RESET_DEBUG_URL=false`
4. Run local preflight:
   - `npm run api:check-config`

## Point 2: Frontend on Cloudflare Pages

1. Build command: `npm run build`
2. Build output directory: `dist`
3. Add Pages environment variables:
   - `VITE_API_BASE_URL=https://<your-api-domain>/api/v1`
   - OAuth IDs as needed
4. Add custom domain and enforce HTTPS.

## Point 3: Backend on Cloudflare Worker (Migration Path)

Current repository backend is Node `http` + filesystem (`server/data`, `server/uploads`).
Cloudflare Worker runtime needs route migration to Worker handlers and D1/R2 storage.

Starter scaffold included:

- `cloudflare/worker/wrangler.toml`
- `cloudflare/worker/src/index.js`

### 3A. Create Cloudflare resources

1. `wrangler login`
2. `wrangler d1 create verdent-vision`
3. `wrangler r2 bucket create verdent-vision-uploads`
4. Copy D1 `database_id` into `cloudflare/worker/wrangler.toml`

### 3B. Configure Worker

1. Set `CORS_ORIGINS` in `wrangler.toml` to your frontend domain.
2. Add secrets:
   - `wrangler secret put GEMINI_API_KEY`
   - `wrangler secret put OPENAI_API_KEY` (optional)
3. Deploy:
   - `cd cloudflare/worker`
   - `wrangler deploy`

### 3C. Health checks

After deploy verify:

1. `GET /healthz` returns `200`.
2. `GET /readyz` returns `200` when D1 and R2 bindings are configured.

## Point 4: Data layer migration

1. Replace JSON database operations in `server/src/database.js` with D1 queries.
2. Replace upload file writes (`server/uploads`) with R2 object writes.
3. Preserve existing API contract (`/api/v1/...`) to avoid frontend breakage.

## Point 5: Rate limiting

Current API uses in-memory rate limiting.

For production multi-instance, enforce rate limiting at edge/gateway:

1. Cloudflare WAF/Rules for request throttling.
2. Keep app-level limits for defense-in-depth.

## Point 6: Launch gate

Only go live when all are true:

1. Frontend domain + API domain are HTTPS-only.
2. `api:check-config` passes with production env.
3. `/healthz` and `/readyz` are green.
4. Secrets rotated and not present in repository history.
5. Auth, diagnosis, planner, admin flows pass smoke tests.
