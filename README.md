# Rate My Site

Rate My Site is a community platform to upload websites, collect ratings, and gather constructive feedback.
It ships with a modern React UI, Supabase auth + database, an Express API, Redis caching, and automatic screenshots.

**Highlights**
- Upload sites, browse, and rate.
- Google OAuth via Supabase.
- Detail view with carousel + comments + replies.
- Redis caching with cache headers.
- Optional automatic screenshots stored in Supabase Storage.

**Tech Stack**
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express
- Auth & DB: Supabase Postgres
- Cache: Redis (optional)
- Screenshots: Playwright (optional)

**Repository Layout**
- `src/` Frontend app
- `server/` Express API + Supabase integration
- `server/supabase/schema.sql` Database schema + RLS policies
- `docker-compose.yml` Containerized setup (web + api + redis)

## Quick Start (Local)

**1) Frontend env**
Create `.env` in the repo root:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:4000
```

**2) Backend env**
Create `server/.env`:
```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=redis://localhost:6379
CACHE_SITES_TTL=60
CACHE_SITE_TTL=120
CACHE_RATINGS_TTL=30
SCREENSHOT_BUCKET=site-screenshots
```

**3) Install and run**
```bash
npm install
npm run dev
```
```bash
cd server
npm install
npm run dev
```

**4) Database schema**
Run `server/supabase/schema.sql` in Supabase SQL Editor.

**5) Supabase Storage**
Create a bucket named `site-screenshots` (public read) if you want screenshots.

**6) Screenshots (optional)**
```bash
cd server
npx playwright install
```

## Docker (One Command)

Create `.env` (root) and `server/.env` first, then:
```bash
docker compose up --build
```
Frontend runs on `http://localhost:5173` and API on `http://localhost:4000`.

## API Endpoints

- `GET /health`
- `GET /sites?search=&tag=&sort=recent|top`
- `GET /sites/:id`
- `POST /sites` (auth required)
- `GET /sites/:id/ratings`
- `POST /sites/:id/ratings` (auth required)
- `POST /ratings/:id/replies` (auth required)
- `POST /sites/:id/screenshot` (auth required, owner only)

## Caching

Redis caching is enabled when `REDIS_URL` is set.
Responses include `X-Cache: HIT` or `MISS`.

Estimated DB load reduction is roughly the cache hit rate (e.g., 70% hit rate ≈ 70% fewer DB reads).

## Common Issues

**500 on `/sites`**
Most likely missing columns from schema updates. Run:
```sql
alter table public.sites add column if not exists screenshot_url text;
alter table public.sites add column if not exists screenshot_status text default 'pending';
alter table public.sites add column if not exists screenshot_updated_at timestamptz;
```

**Redis connection error**
Make sure Redis is running or remove `REDIS_URL` to disable caching.

**Upload returns 400**
URL must be valid (https:// is auto‑added), and description must be 10+ chars.

## License
Private project. Add a license if you plan to open source.
