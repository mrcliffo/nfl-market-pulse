const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for local development
const projectRoot = path.join(__dirname, '..');
app.use('/broadcast', express.static(path.join(projectRoot, 'broadcast')));
app.use('/vote', express.static(path.join(projectRoot, 'vote')));

// Supabase client
const supabaseUrl = 'https://jlpqxasclikfqsreijfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscHF4YXNjbGlrZnFzcmVpamZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MzAwODYsImV4cCI6MjA4MDIwNjA4Nn0.AvtqL1o01Osj4a3faJ71GdfDvLQk_INyX6GKCoCKpQY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to calculate percentages
function withPercentages(yes, no, total) {
  return {
    yes: yes || 0,
    no: no || 0,
    total: total || 0,
    yesPercent: total > 0 ? Math.round((yes / total) * 100) : 0,
    noPercent: total > 0 ? Math.round((no / total) * 100) : 0
  };
}

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { count } = await supabase
      .from('nfl_pulse_votes')
      .select('*', { count: 'exact', head: true });

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      totalVotes: count || 0,
      storage: 'supabase'
    });
  } catch (error) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      totalVotes: 0,
      storage: 'supabase',
      error: error.message
    });
  }
});

// Submit vote
app.post('/api/vote', async (req, res) => {
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

  try {
    // Insert vote into Supabase
    const { data, error } = await supabase
      .from('nfl_pulse_votes')
      .insert({
        token,
        market_id: marketId,
        vote
      })
      .select()
      .single();

    if (error) throw error;

    // Get updated aggregates for this market
    const { data: aggData } = await supabase
      .from('nfl_pulse_vote_aggregates')
      .select('*')
      .eq('market_id', marketId)
      .single();

    const results = withPercentages(
      aggData?.yes_count || 0,
      aggData?.no_count || 0,
      aggData?.total_count || 0
    );

    res.json({
      success: true,
      voteId: data.id,
      results
    });
  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit vote',
      message: error.message
    });
  }
});

// Get results for a market
app.get('/api/results/:marketId', async (req, res) => {
  const { marketId } = req.params;

  try {
    const { data } = await supabase
      .from('nfl_pulse_vote_aggregates')
      .select('*')
      .eq('market_id', marketId)
      .single();

    res.json({
      marketId,
      results: withPercentages(
        data?.yes_count || 0,
        data?.no_count || 0,
        data?.total_count || 0
      )
    });
  } catch (error) {
    res.json({
      marketId,
      results: withPercentages(0, 0, 0)
    });
  }
});

// Get results for a specific voting window
app.get('/api/results/:marketId/window/:token', async (req, res) => {
  const { marketId, token } = req.params;

  try {
    // Get all-time aggregates
    const { data: allTimeData } = await supabase
      .from('nfl_pulse_vote_aggregates')
      .select('*')
      .eq('market_id', marketId)
      .single();

    // Get window-specific aggregates
    const { data: windowData } = await supabase
      .from('nfl_pulse_votes')
      .select('vote')
      .eq('market_id', marketId)
      .eq('token', token);

    const windowYes = windowData?.filter(v => v.vote === 'yes').length || 0;
    const windowNo = windowData?.filter(v => v.vote === 'no').length || 0;
    const windowTotal = windowData?.length || 0;

    res.json({
      marketId,
      token,
      window: withPercentages(windowYes, windowNo, windowTotal),
      allTime: withPercentages(
        allTimeData?.yes_count || 0,
        allTimeData?.no_count || 0,
        allTimeData?.total_count || 0
      )
    });
  } catch (error) {
    res.json({
      marketId,
      token,
      window: withPercentages(0, 0, 0),
      allTime: withPercentages(0, 0, 0)
    });
  }
});

// Get all results
app.get('/api/results', async (req, res) => {
  try {
    const { data: aggregates } = await supabase
      .from('nfl_pulse_vote_aggregates')
      .select('*');

    const { count } = await supabase
      .from('nfl_pulse_votes')
      .select('*', { count: 'exact', head: true });

    const { data: lastVote } = await supabase
      .from('nfl_pulse_votes')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const results = {};
    (aggregates || []).forEach(agg => {
      results[agg.market_id] = withPercentages(
        agg.yes_count,
        agg.no_count,
        agg.total_count
      );
    });

    res.json({
      results,
      totalVotes: count || 0,
      marketsTracked: aggregates?.length || 0,
      lastUpdated: lastVote?.created_at || null
    });
  } catch (error) {
    res.json({
      results: {},
      totalVotes: 0,
      marketsTracked: 0,
      lastUpdated: null,
      error: error.message
    });
  }
});

// Export all data for analysis
app.get('/api/export', async (req, res) => {
  try {
    const { data: votes } = await supabase
      .from('nfl_pulse_votes')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: aggregates } = await supabase
      .from('nfl_pulse_vote_aggregates')
      .select('*');

    const aggregatesObj = {};
    (aggregates || []).forEach(agg => {
      aggregatesObj[agg.market_id] = withPercentages(
        agg.yes_count,
        agg.no_count,
        agg.total_count
      );
    });

    res.json({
      exportedAt: new Date().toISOString(),
      totalVotes: votes?.length || 0,
      votes: votes || [],
      aggregates: aggregatesObj
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to export data',
      message: error.message
    });
  }
});

// Proxy for Polymarket API (to avoid CORS issues)
// Fetches NFL events with embedded markets
app.get('/api/markets', async (req, res) => {
  try {
    // Step 1: Get all active events and filter for NFL-related ones
    const eventsResponse = await fetch('https://gamma-api.polymarket.com/events?active=true&closed=false&limit=200');
    if (!eventsResponse.ok) {
      throw new Error(`Events API error: ${eventsResponse.status}`);
    }
    const allEvents = await eventsResponse.json();

    // Filter for NFL events
    const nflEvents = allEvents.filter(event => {
      const title = (event.title || '').toLowerCase();
      const nflTerms = ['nfl', 'super bowl', 'afc champion', 'nfc champion', 'halftime show'];
      return nflTerms.some(term => title.includes(term));
    });

    // Step 2: Fetch each NFL event individually to get full market data
    const eventSlugs = nflEvents.map(e => e.slug);
    const allMarkets = [];

    // Fetch full event data with markets in parallel
    const eventPromises = eventSlugs.map(async (slug) => {
      try {
        const response = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
        if (response.ok) {
          const events = await response.json();
          if (events[0]?.markets) {
            const evt = events[0];
            // Add event info to each market (including volume for display)
            return evt.markets.map(m => ({
              ...m,
              events: [{
                id: evt.id,
                title: evt.title,
                slug: evt.slug,
                volume: evt.volume,
                liquidity: evt.liquidity
              }]
            }));
          }
        }
        return [];
      } catch {
        return [];
      }
    });

    const marketArrays = await Promise.all(eventPromises);
    marketArrays.forEach(markets => allMarkets.push(...markets));

    // Remove duplicates by market id and filter for active/open
    const uniqueMarkets = [];
    const seenIds = new Set();
    for (const market of allMarkets) {
      if (!seenIds.has(market.id) && market.active && !market.closed) {
        seenIds.add(market.id);
        uniqueMarkets.push(market);
      }
    }

    res.json(uniqueMarkets);
  } catch (error) {
    console.error('Polymarket proxy error:', error.message);
    res.status(502).json({ error: 'Failed to fetch from Polymarket', message: error.message });
  }
});

// Proxy for CLOB price history API (7-day chart data)
app.get('/api/prices/:tokenId', async (req, res) => {
  const { tokenId } = req.params;
  const interval = req.query.interval || '1w';
  const fidelity = req.query.fidelity || '60'; // minutes between data points

  try {
    const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('CLOB price history error:', error.message);
    res.status(502).json({ error: 'Failed to fetch price history', message: error.message });
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
