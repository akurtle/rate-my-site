# Rate My Site — Agent Context

## Project Summary
Rate My Site is a React + Vite frontend with a Node/Express API and Supabase backend.
Users can upload websites, browse and rate, and view a detail modal with comments.
Auth is Supabase OAuth (Google) via a modal in the UI.
The API uses Supabase for data and Redis for caching.

## Tech Stack
- Frontend: Vite, React, TypeScript, Tailwind (imported), custom CSS
- Backend: Node.js, Express, Supabase client
- Data: Supabase Postgres
- Cache: Redis via `ioredis`

## Repository Layout
- `index.html`
- `src/`
- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/components/`
- `src/lib/`
- `server/`
- `server/src/index.js`
- `server/src/cache.js`
- `server/supabase/schema.sql`
- `server/.env.example`
- `.env.example`

## Frontend Structure
- `src/App.tsx` renders the full page, loads site data from the API, and opens modals.
- `src/components/Header.tsx` renders the navbar with search and auth triggers.
- `src/components/SearchModal.tsx` handles search input in a popup.
- `src/components/AuthModal.tsx` handles Google OAuth sign-in popup.
- `src/components/SiteDetailModal.tsx` renders the site detail modal, carousel, and comments.
- `src/components/UploadPanel.tsx` submits a new site.
- `src/lib/api.ts` wraps backend API requests.
- `src/lib/supabaseClient.ts` initializes Supabase auth client.

## Backend Structure
- `server/src/index.js` defines the Express API and Supabase integration.
- `server/src/cache.js` defines Redis cache helpers.
- `server/supabase/schema.sql` defines Postgres schema and RLS policies.

## API Endpoints
- `GET /health`
- `GET /sites?search=&tag=&sort=recent|top`
- `GET /sites/:id`
- `POST /sites` (auth required)
- `GET /sites/:id/ratings`
- `POST /sites/:id/ratings` (auth required)

## Data Model (Supabase)
- `sites` table for website entries
- `ratings` table for comments and scores
- `favorites` table for saved sites
Schema and RLS policies live in `server/supabase/schema.sql`.

## Environment Variables
Frontend `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

Backend `server/.env`:
- `PORT`
- `CLIENT_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `CACHE_SITES_TTL`
- `CACHE_SITE_TTL`
- `CACHE_RATINGS_TTL`

## Cache Behavior
- List, site, and ratings endpoints cache in Redis with TTL.
- Cache invalidation happens on create site and create rating.
- Responses include `X-Cache: HIT|MISS`.

## UI Notes
- Smooth scroll is enabled globally in `src/index.css`.
- Modals lock background scrolling and hide internal scrollbars.
- The navbar is minimal and opens modals for search and auth.

## Common Commands
Frontend:
1. `npm install`
2. `npm run dev`

Backend:
1. `cd server`
2. `npm install`
3. `npm run dev`

## Known Assumptions
- Supabase tables exist and RLS policies are applied.
- Redis is optional. If `REDIS_URL` is missing, caching is disabled.
