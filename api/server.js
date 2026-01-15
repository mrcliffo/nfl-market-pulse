const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for local development
const projectRoot = path.join(__dirname, '..');
app.use('/broadcast', express.static(path.join(projectRoot, 'broadcast')));
app.use('/vote', express.static(path.join(projectRoot, 'vote')));

// In-memory storage (resets on redeploy)
const storage = {
  votes: [], // Array of { id, token, marketId, vote, timestamp }
  aggregates: new Map(), // marketId -> { yes, no, total }
  windowAggregates: new Map() // `${marketId}:${token}` -> { yes, no, total }
};

// Helper to generate vote ID
function generateVoteId() {
  return 'vote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper to get or create aggregate
function getAggregate(marketId) {
  if (!storage.aggregates.has(marketId)) {
    storage.aggregates.set(marketId, { yes: 0, no: 0, total: 0 });
  }
  return storage.aggregates.get(marketId);
}

// Helper to get or create window aggregate
function getWindowAggregate(marketId, token) {
  const key = `${marketId}:${token}`;
  if (!storage.windowAggregates.has(key)) {
    storage.windowAggregates.set(key, { yes: 0, no: 0, total: 0 });
  }
  return storage.windowAggregates.get(key);
}

// Helper to calculate percentages
function withPercentages(aggregate) {
  const { yes, no, total } = aggregate;
  return {
    yes,
    no,
    total,
    yesPercent: total > 0 ? Math.round((yes / total) * 100) : 0,
    noPercent: total > 0 ? Math.round((no / total) * 100) : 0
  };
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    totalVotes: storage.votes.length,
    marketsTracked: storage.aggregates.size
  });
});

// Submit vote
app.post('/api/vote', (req, res) => {
  const { token, marketId, vote } = req.body;

  // Validate input
  if (!token || !marketId || !vote) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: token, marketId, vote'
    });
  }

  if (vote !== 'yes' && vote !== 'no') {
    return res.status(400).json({
      success: false,
      error: 'Vote must be "yes" or "no"'
    });
  }

  // Create vote record
  const voteRecord = {
    id: generateVoteId(),
    token,
    marketId,
    vote,
    timestamp: new Date().toISOString()
  };

  // Store vote
  storage.votes.push(voteRecord);

  // Update all-time aggregate
  const aggregate = getAggregate(marketId);
  aggregate[vote]++;
  aggregate.total++;

  // Update window aggregate
  const windowAggregate = getWindowAggregate(marketId, token);
  windowAggregate[vote]++;
  windowAggregate.total++;

  res.json({
    success: true,
    voteId: voteRecord.id,
    results: withPercentages(aggregate)
  });
});

// Get results for a market
app.get('/api/results/:marketId', (req, res) => {
  const { marketId } = req.params;
  const aggregate = getAggregate(marketId);

  res.json({
    marketId,
    results: withPercentages(aggregate)
  });
});

// Get results for a specific voting window
app.get('/api/results/:marketId/window/:token', (req, res) => {
  const { marketId, token } = req.params;
  const aggregate = getAggregate(marketId);
  const windowAggregate = getWindowAggregate(marketId, token);

  res.json({
    marketId,
    token,
    window: withPercentages(windowAggregate),
    allTime: withPercentages(aggregate)
  });
});

// Get all results
app.get('/api/results', (req, res) => {
  const results = {};
  storage.aggregates.forEach((aggregate, marketId) => {
    results[marketId] = withPercentages(aggregate);
  });

  res.json({
    results,
    totalVotes: storage.votes.length,
    marketsTracked: storage.aggregates.size,
    lastUpdated: storage.votes.length > 0
      ? storage.votes[storage.votes.length - 1].timestamp
      : null
  });
});

// Export all data for analysis
app.get('/api/export', (req, res) => {
  const aggregatesObj = {};
  storage.aggregates.forEach((value, key) => {
    aggregatesObj[key] = withPercentages(value);
  });

  const windowAggregatesObj = {};
  storage.windowAggregates.forEach((value, key) => {
    windowAggregatesObj[key] = withPercentages(value);
  });

  res.json({
    exportedAt: new Date().toISOString(),
    totalVotes: storage.votes.length,
    votes: storage.votes,
    aggregates: aggregatesObj,
    windowAggregates: windowAggregatesObj
  });
});

// Proxy for Polymarket API (to avoid CORS issues)
app.get('/api/markets', async (req, res) => {
  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100');
    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Polymarket proxy error:', error.message);
    res.status(502).json({ error: 'Failed to fetch from Polymarket', message: error.message });
  }
});

// Handle OPTIONS for CORS preflight
app.options('*', cors());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (for local development)
const PORT = process.env.PORT || 3000;

// Only start listening if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`NFL Market Pulse API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

// Export for Vercel serverless
module.exports = app;
