# Supabase Edge Functions

Edge functions deployed to Supabase Cloud for backend API operations.

## Functions

### `fetch-quotes`

Fetches stock quotes, historical prices, and options data from Yahoo Finance.

**Endpoint:** `https://YOUR_PROJECT_ID.supabase.co/functions/v1/fetch-quotes`

**Request:**
```json
{
  "symbols": ["AAPL", "MSFT"],
  "fetchPrices": false,
  "fetchOptions": false,
  "expirationDate": "2024-12-20",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "interval": "1d"
}
```

**Modes:**
- **Validation only** (default): Check if tickers exist
- **Historical prices** (`fetchPrices: true`): OHLCV data with date range
- **Options data** (`fetchOptions: true`): Calls, puts, strikes, expirations
  - Optional: `expirationDate` (YYYY-MM-DD) - Filter to specific expiration date only

**Extended Hours Data:**
When `interval` is intraday (`1m`, `5m`, `15m`, `30m`, `60m`), the response includes:
- `includePrePost: true` parameter automatically added
- `preMarketPrice` / `preMarketTime` (4:00 AM - 9:30 AM ET)
- `postMarketPrice` / `postMarketTime` (4:00 PM - 8:00 PM ET)
- Use `getCurrentPrice()` helper (from `src/lib/priceUtils.js`) to prioritize extended hours over regular market

**Response:**
```json
{
  "quoteResponse": {
    "result": [
      {
        "symbol": "AAPL",
        "timestamps": [...],
        "close": [...],
        "meta": {
          "regularMarketPrice": 150.25,
          "regularMarketTime": 1776377773,
          "preMarketPrice": null,
          "preMarketTime": null,
          "postMarketPrice": 148.50,
          "postMarketTime": 1776391200
        }
      }
    ]
  },
  "valid": ["AAPL", "MSFT"],
  "invalid": []
}
```

## Deployment

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Project linked: `supabase link --project-ref YOUR_PROJECT_ID`

**Deploy:**
```bash
# Deploy single function
supabase functions deploy fetch-quotes

# Deploy all functions
supabase functions deploy
```

**Local Development:**
```bash
# Serve locally (requires Docker)
supabase functions serve fetch-quotes

# Test locally
curl -i --location --request POST 'http://localhost:54321/functions/v1/fetch-quotes' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"symbols":["AAPL"]}'
```

## Configuration

**JWT Verification:**
Currently **DISABLED** due to Supabase ES256 token verification bug.

See: https://github.com/supabase/supabase/issues/42810

When fixed:
1. Enable "Verify JWT" in Supabase Dashboard
2. Edge Functions → fetch-quotes → Settings
3. Update `.dev/PENDING_ISSUES.md` to mark as resolved

## Notes

- Uses Yahoo Finance public API (no API key required)
- Cookie/crumb authentication for options data
- CORS enabled for all origins (public data)
- Deployed to Supabase Cloud (not in GitHub Actions)
