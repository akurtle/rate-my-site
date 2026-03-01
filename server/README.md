# Rate My Site API

## Setup
- Copy `server/.env.example` to `server/.env`
- Fill in Supabase credentials and `CLIENT_ORIGIN`

## Run
```bash
npm install
npm run dev
```

## Endpoints
- `GET /health`
- `GET /sites?search=&tag=&sort=recent|top`
- `GET /sites/:id`
- `POST /sites` (auth required)
- `GET /sites/:id/ratings`
- `POST /sites/:id/ratings` (auth required)
- `POST /ratings/:id/replies` (auth required)
- `POST /sites/:id/screenshot` (auth required, owner only)
- `POST /sites/:id/screenshots` (auth required, owner only, multipart)
