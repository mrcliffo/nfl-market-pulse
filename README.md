# NFL Market Pulse

A live streaming dashboard for NFL prediction markets from Polymarket, with an interactive companion voting app for viewer engagement.

## Overview

**NFL Market Pulse** consists of two main components:

1. **Broadcast Page** (`/broadcast`) - A 1920x1080 dashboard designed to be captured via OBS and streamed to YouTube 24/7
2. **Companion Voting App** (`/vote`) - A mobile-friendly web app accessed via QR code from the stream

Plus supporting infrastructure:
- **Backend API** (`/api`) - Vote storage and aggregation
- **Vercel Deployment** - Ready for serverless deployment

## Quick Start

### Local Development

```bash
# Install dependencies
cd nfl-market-pulse
npm install

# Start the API server
npm run dev
# Server runs on http://localhost:3000

# Open broadcast page
open broadcast/index.html
# Or serve it: npx serve .

# Open vote page (for testing)
open vote/index.html
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# After deployment, update URLs in:
# - broadcast/index.html (CONFIG.voteAppUrl, CONFIG.apiUrl)
# - vote/index.html (CONFIG.apiUrl)

# Redeploy with updated URLs
vercel --prod
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     YouTube Stream (OBS)                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Broadcast Page (1920x1080)                      │ │
│  │  ┌───────────────────────────┐  ┌────────────────────────┐  │ │
│  │  │   Hero Market + Odds      │  │  24H Movers           │  │ │
│  │  │   (Rotates every 90s)     │  │  QR Code → Vote App   │  │ │
│  │  └───────────────────────────┘  └────────────────────────┘  │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │              Scrolling Ticker                          │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                                    ▲
         │ QR Code                            │ Vote Results
         ▼                                    │
┌─────────────────┐      ┌─────────────────────────────────────────┐
│  Viewer Phone   │─────▶│              Backend API                 │
│  (Vote App)     │◀─────│  POST /api/vote                         │
└─────────────────┘      │  GET  /api/results/:marketId            │
         │               └─────────────────────────────────────────┘
         │                         ▲
         │                         │ Market Data
         ▼                         │
┌─────────────────────────────────────────────────────────────────┐
│                     Polymarket Gamma API                         │
│             https://gamma-api.polymarket.com                     │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with stats |
| POST | `/api/vote` | Submit a vote |
| GET | `/api/results/:marketId` | Get results for a market |
| GET | `/api/results/:marketId/window/:token` | Get window + all-time results |
| GET | `/api/results` | Get all results |
| GET | `/api/export` | Export all data for analysis |

### Vote Payload

```json
{
  "token": "w_abc123_1234567890",
  "marketId": "super-bowl-lx-winner",
  "vote": "yes"
}
```

## Configuration

### Broadcast Page (`broadcast/index.html`)

```javascript
const CONFIG = {
  voteAppUrl: 'https://your-domain.vercel.app/vote',
  apiUrl: 'https://your-domain.vercel.app/api',
  windowDuration: 180,           // 3 min voting windows
  heroRotationInterval: 90,      // 90 sec hero rotation
  dataRefreshInterval: 60,       // 60 sec data refresh
  superBowlDate: new Date('2026-02-08T18:30:00-05:00'),
  nflTerms: [/* 32 NFL teams + league terms */]
};
```

### Vote App (`vote/index.html`)

```javascript
const CONFIG = {
  apiUrl: 'https://your-domain.vercel.app/api',
  voterIdKey: 'nfl_pulse_voter_id',
  votedMarketsKey: 'nfl_pulse_voted_markets'
};
```

## OBS Setup

1. Add **Browser Source** to your scene
2. Set URL to your deployed broadcast page: `https://your-domain.vercel.app/broadcast`
3. Set dimensions: **1920 x 1080**
4. Enable **Shutdown source when not visible**
5. Enable **Refresh browser when scene becomes active**

## GDPR Compliance

The voting system is designed for GDPR compliance:

- **No personal data stored on server** - only vote choice and timestamp
- **Voter ID stays in localStorage** - never sent to server
- **Duplicate prevention is client-side** - can be bypassed via incognito/other device
- **No cookies** - all tracking uses localStorage
- **Footer disclaimer** - "Vote privately, no data stored"

## Data Sources

### Polymarket Gamma API

Public API, no authentication required:

```
GET https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100
```

Markets are filtered client-side using NFL team names and league terms.

### Mock Data Fallback

If the API is unavailable or returns no NFL markets, the app falls back to mock data including:
- Super Bowl LX Winner
- AFC Championship Winner
- NFC Championship Winner
- Super Bowl MVP
- Team-specific markets

## File Structure

```
nfl-market-pulse/
├── api/
│   └── server.js          # Express backend (Vercel serverless)
├── broadcast/
│   └── index.html         # 16:9 OBS broadcast page (self-contained)
├── vote/
│   └── index.html         # Mobile voting app (self-contained)
├── package.json
├── vercel.json
└── README.md
```

## Testing Checklist

### Before Deployment
- [ ] Broadcast page loads at 1920x1080
- [ ] Markets fetch from Polymarket API
- [ ] Fallback to mock data works
- [ ] Hero market rotates every 90 seconds
- [ ] QR code generates correctly
- [ ] Vote app loads market from URL
- [ ] Vote submission works
- [ ] Duplicate vote blocked (same browser)
- [ ] Results display correctly

### After Deployment
- [ ] Update URLs in both HTML files
- [ ] Redeploy
- [ ] Test QR codes end-to-end
- [ ] Test in OBS browser source
- [ ] Test mobile voting flow
- [ ] Verify API endpoints work

## Future Enhancements

- Persistent database (Supabase/PostgreSQL)
- Real-time vote updates via WebSocket
- Historical accuracy tracking
- Multiple simultaneous markets
- Social sharing of results
- Admin dashboard

## License

MIT
