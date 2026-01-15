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
- **Data Source:** Polymarket Gamma API (events-based fetching)
- **Storage:** Supabase (persistent vote storage)
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
curl http://localhost:3000/api/results
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/markets` | NFL markets from Polymarket (events-based, filters closed markets) |
| GET | `/api/prices/:tokenId` | 7-day price history from CLOB API |
| POST | `/api/vote` | Submit vote `{token, marketId, vote}` |
| GET | `/api/results/:marketId` | Get market results |
| GET | `/api/results/:marketId/window/:token` | Get window-specific results |
| GET | `/api/results` | All results (used for crowd vote aggregation) |
| GET | `/api/export` | Full data export |

## NFL Market Categories

The API fetches all NFL events from Polymarket (17 categories, 300+ markets):

- Super Bowl Champion 2026
- AFC Champion / NFC Champion
- NFL MVP
- NFL Offensive/Defensive Player of the Year
- NFL Offensive/Defensive Rookie of the Year
- NFL Coach of the Year
- NFL Comeback Player of the Year
- NFL Passing Yards Leader
- NFL Protector of the Year
- NFL Draft 2026: First Overall Pick
- Super Bowl - Winning Conference/Division/State
- Who will perform at Super Bowl halftime show?

## Key Architecture Decisions

1. **Self-contained HTML files** - No build step, easier OBS debugging
2. **Events-based API** - Fetches NFL events first, then extracts markets (more reliable than search)
3. **Market filtering** - Only shows `active=true && closed=false` markets (eliminates teams/resolved markets)
4. **Event grouping** - Markets grouped by Polymarket event ID with `groupItemTitle` for display
5. **Client-side duplicate prevention** - localStorage tracks votes (GDPR compliant)
6. **Expandable categories** - Vote page shows top 5 per category with "+X more" to expand
7. **Real crowd data** - Sentiment gaps use actual vote data from Supabase, no simulated data

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
  heroRotationInterval: 30,   // Hero market rotation (seconds)
  dataRefreshInterval: 60,    // Data refresh (seconds)
};
```

## Refresh Intervals

| Component | Interval | Description |
|-----------|----------|-------------|
| Hero Market | 30 sec | Rotates through top 10 markets by volume |
| Secondary Markets | 15 sec | Cycles through grouped events (3 at a time) |
| Editorial Card | 20 sec | Rotates through themes + different markets |
| Vote Stats | 5 sec | Updates total vote count |
| Countdown | 60 sec | Updates Super Bowl countdown |
| Data Refresh | 60 sec | Fetches fresh market data + crowd votes from API |

## Broadcast Page Features

### Hero Section
- Top 10 markets by volume, rotating every 30 seconds
- 7-day price sparkline from CLOB API
- 24h volume display

### Secondary Markets
- Row of 3 grouped event cards, rotating every 15 seconds
- Shows event title, top outcomes with prices, total staked

### Editorial Card
Rotating editorial content (20 seconds) with 3 themes, each rotating through multiple qualifying markets:

- **Big Movers:** Markets with >2% daily price change (top 10 by change size)
  - Animated bar showing price movement from old to new value
  - 20 editorial copy variations

- **Debate Fuel:** Markets within 15% of 50/50 (top 8 by volume)
  - Split bar showing YES/NO percentages
  - 20 editorial copy variations

- **Sentiment Gaps:** Markets where fan votes differ from market price (real data only)
  - Shows market price vs crowd vote percentage
  - Only displays when real vote data exists (no simulated data)
  - 20 editorial copy variations

### 24H Biggest Movers Sidebar
- Top 5 markets by absolute price change
- **FLIP animation** for position changes (items slide smoothly when rankings change)
- Green glow for items moving up, red fade for items moving down

### Live Ticker
- All NFL grouped events with top 3 outcomes each
- Continuous scroll animation

## Vote System

- Each market is a YES/NO prediction question
- Crowd percentage = % of voters who voted YES on that specific market
- Votes aggregate across all devices (stored in Supabase)
- Client-side localStorage prevents duplicate votes from same device

## Development Notes

- **OBS Setup:** Add Browser Source at 1920x1080 pointing to `/broadcast`
- **QR Codes:** Generated via qrcode.js CDN library
- **Mock Data:** Falls back to mock NFL markets if API fails
- **Vote App URL:** `/vote/{market-slug}?t={token}` - slug from URL path, token from query
- **Supabase Tables:** `nfl_pulse_votes` (raw votes), `nfl_pulse_vote_aggregates` (view)
- **Volume Formatting:** Uses K/M suffixes ($1.5M, $250K, $500)

## Workflow: Making Changes

1. Edit the relevant HTML file (broadcast or vote)
2. Test locally with `npm run dev`
3. Commit and push to GitHub
4. Deploy with `vercel --prod --yes`
5. Hard refresh browser to bypass cache (Cmd+Shift+R)
