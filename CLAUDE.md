# NFL Market Pulse

Live NFL prediction market streaming dashboard with interactive voting, designed for YouTube streaming via OBS.

## Project Structure

```
nfl-market-pulse/
├── api/
│   └── server.js          # Express API (votes, results, Polymarket proxy)
├── broadcast/
│   └── index.html         # 1920x1080 OBS streaming dashboard (self-contained)
├── vote/
│   └── index.html         # Mobile voting app (self-contained)
├── package.json
├── vercel.json            # Vercel deployment config
└── README.md
```

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no build step, self-contained files)
- **Backend:** Express.js on Vercel serverless
- **Data Source:** Polymarket Gamma API (proxied through `/api/markets`)
- **Storage:** In-memory (resets on redeploy)
- **Deployment:** Vercel

## Common Commands

```bash
# Install dependencies
npm install

# Run locally (API + static files)
npm run dev
# Server: http://localhost:3000
# Broadcast: http://localhost:3000/broadcast/
# Vote: http://localhost:3000/vote/

# Deploy to Vercel
vercel --prod --yes

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/markets
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/markets` | Polymarket proxy (avoids CORS) |
| POST | `/api/vote` | Submit vote `{token, marketId, vote}` |
| GET | `/api/results/:marketId` | Get market results |
| GET | `/api/results` | All results |
| GET | `/api/export` | Full data export |

## Key Architecture Decisions

1. **Self-contained HTML files** - No build step, easier OBS debugging
2. **Polymarket proxy** - `/api/markets` proxies requests to avoid browser CORS
3. **Client-side duplicate prevention** - localStorage tracks votes (GDPR compliant)
4. **Binary markets** - Most NFL markets are Yes/No, not multi-outcome

## Production URLs

- **Broadcast:** https://nfl-market-pulse.vercel.app/broadcast
- **Vote:** https://nfl-market-pulse.vercel.app/vote
- **API:** https://nfl-market-pulse.vercel.app/api

## Configuration

Both HTML files have a `CONFIG` object at the top of the `<script>` section:

```javascript
const CONFIG = {
  voteAppUrl: 'https://nfl-market-pulse.vercel.app/vote',
  apiUrl: 'https://nfl-market-pulse.vercel.app/api',
  windowDuration: 180,        // Voting window (seconds)
  heroRotationInterval: 90,   // Hero market rotation (seconds)
  dataRefreshInterval: 60,    // Data refresh (seconds)
  nflTerms: [...]             // NFL team/league filter terms
};
```

## Development Notes

- **OBS Setup:** Add Browser Source at 1920x1080 pointing to `/broadcast`
- **QR Codes:** Generated via qrcode.js CDN library
- **Mock Data:** Falls back to mock NFL markets if API fails
- **Vote App URL:** `/vote/{market-slug}?t={token}` - slug from URL path, token from query

## Workflow: Making Changes

1. Edit the relevant HTML file (broadcast or vote)
2. Test locally with `npm run dev`
3. Commit and push to GitHub
4. Deploy with `vercel --prod --yes`
5. Hard refresh browser to bypass cache
