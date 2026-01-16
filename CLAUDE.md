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
| Editorial Card | 10 sec | Rotates through 8 themes + different markets |
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
Rotating editorial content (10 seconds) with 8 themes, each rotating through multiple qualifying markets:

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

- **Longshot Watch:** Markets priced under 15% that are gaining momentum
  - Shows current odds and potential payout multiplier
  - Only displays when longshots have positive price movement
  - 20 editorial copy variations

- **Crowd Favorites:** Markets where audience voted decisively (85%+ one way)
  - Shows crowd conviction percentage
  - Only displays when real vote data shows strong consensus
  - 20 editorial copy variations

- **Volume Surge:** Markets with high 24h volume relative to total (>8% ratio)
  - Shows 24h volume and percentage of total
  - Only displays when meaningful volume activity detected
  - 20 editorial copy variations

- **Fading Fast:** Markets with significant negative price changes (>2% drop)
  - Animated bar showing price decline from old to new value
  - Red-themed visual treatment
  - 20 editorial copy variations

- **Most Engaged:** Markets getting the most audience votes
  - Shows crowd vote vs market price
  - Only displays when vote data exists
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

## OBS + YouTube Streaming Setup

### OBS Browser Source Setup

1. Add new **Browser Source**
2. Configure:
   - **URL:** `https://nfl-market-pulse.vercel.app/broadcast`
   - **Width:** `1920`
   - **Height:** `1080`
   - **FPS:** `30`

### OBS Output Settings

Go to **Settings → Output**:

| Setting | Value |
|---------|-------|
| Output Mode | Simple |
| Video Bitrate | `6000 Kbps` (recommended for 1080p) |
| Encoder | Hardware (NVENC/AMD) if available, otherwise x264 |
| Audio Bitrate | `128 Kbps` (or lower since no audio needed) |

### OBS Video Settings

Go to **Settings → Video**:

| Setting | Value |
|---------|-------|
| Base Resolution | `1920x1080` |
| Output Resolution | `1920x1080` |
| FPS | `30` |

### OBS Audio Settings (Disable All)

Go to **Settings → Audio** and set all to **Disabled**:
- Desktop Audio → Disabled
- Desktop Audio 2 → Disabled
- Mic/Auxiliary Audio → Disabled
- Mic/Auxiliary Audio 2 → Disabled

### YouTube Studio Setup

1. Go to `youtube.com/livestreaming`
2. Select **Streaming Software** mode
3. Configure stream settings:
   - **Title:** `🔴 LIVE NFL Odds & Predictions | Super Bowl 2026 Market Tracker`
   - **Category:** Sports
   - **Visibility:** Public
   - **Enable DVR:** On (allows viewers to rewind)
4. Copy the **Stream Key**

### OBS Stream Settings

Go to **Settings → Stream**:

| Setting | Value |
|---------|-------|
| Service | `YouTube - RTMPS` |
| Server | `Primary YouTube ingest server` |
| Stream Key | Paste from YouTube Studio |

### Going Live

1. In OBS, click **Start Streaming**
2. In YouTube Studio, wait for preview to appear
3. Click **GO LIVE**

### YouTube 12-Hour Limit

YouTube automatically ends streams after 12 hours. For 24/7 streaming:
- Restart stream manually before 12 hours
- Or use an auto-restart script with obs-websocket
- Share `youtube.com/@YourChannel/live` as it always redirects to current stream

### Recommended YouTube Description

```
🏈 LIVE 24/7 NFL Prediction Market Dashboard

Track real-time Super Bowl LX odds, MVP predictions, and NFL futures powered by Polymarket data.

📊 What you'll see:
• Live Super Bowl champion odds
• AFC & NFC Championship probabilities
• MVP, Rookie of the Year & award markets
• 24-hour biggest movers
• Fan sentiment vs market odds

🗳️ VOTE on predictions: https://nfl-market-pulse.vercel.app/vote

🔄 Data refreshes every 60 seconds from Polymarket

#NFL #SuperBowl #NFLPlayoffs #SuperBowlLX #NFLOdds #SportsBetting #Polymarket
```
