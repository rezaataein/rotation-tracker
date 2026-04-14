/**
 * Supabase Edge Function: fetch-quotes
 *
 * Fetches stock quotes, historical prices, and options data from Yahoo Finance
 *
 * Supports:
 * - Ticker validation (check if symbol exists)
 * - Historical price data (OHLCV)
 * - Options chains (calls, puts, expirations)
 *
 * Note: JWT verification is currently disabled due to Supabase ES256 token bug
 * See: https://github.com/supabase/supabase/issues/42810
 */

Deno.serve(async (req) => {
  const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    const { symbols, fetchPrices = false, fetchOptions = false, startDate, endDate, interval = '1d' } = await req.json();

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'symbols array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const getCookie = async () => {
      try {
        const response = await fetch('https://fc.yahoo.com', {
          headers: { 'User-Agent': USER_AGENT }
        });

        const setCookieHeader = response.headers.get('set-cookie');
        if (!setCookieHeader) return null;

        const match = setCookieHeader.match(/A3=([^;]+)/);
        return match ? `A3=${match[1]}` : null;
      } catch (error) {
        console.error('Error getting cookie:', error);
        return null;
      }
    };

    const getCrumb = async (cookie) => {
      try {
        const response = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
          headers: {
            'User-Agent': USER_AGENT,
            'Cookie': cookie
          }
        });

        if (!response.ok) return null;
        return await response.text();
      } catch (error) {
        console.error('Error getting crumb:', error);
        return null;
      }
    };

    let cookie = null;
    let crumb = null;
    if (fetchOptions) {
      cookie = await getCookie();
      if (cookie) {
        crumb = await getCrumb(cookie);
      }
      if (!cookie || !crumb) {
        return new Response(
          JSON.stringify({ error: 'Failed to authenticate with Yahoo Finance for options data' }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    const fetchPromises = symbols.map(async (symbol) => {
      try {
        if (fetchOptions) {
          const yahooUrl = `https://query2.finance.yahoo.com/v7/finance/options/${symbol}?crumb=${crumb}`;

          const response = await fetch(yahooUrl, {
            headers: {
              'User-Agent': USER_AGENT,
              'Cookie': cookie
            }
          });

          if (!response.ok) {
            return { symbol, valid: false, data: null };
          }

          const data = await response.json();

          const optionChain = data.optionChain?.result?.[0];
          const isValid = optionChain !== null && optionChain !== undefined;

          if (!isValid) {
            return { symbol, valid: false, data: null };
          }

          const quote = optionChain.quote || {};
          const options = optionChain.options?.[0] || {};

          return {
            symbol,
            valid: true,
            data: {
              quote: {
                symbol: quote.symbol,
                regularMarketPrice: quote.regularMarketPrice,
                currency: quote.currency,
                exchangeName: quote.fullExchangeName || quote.exchangeName
              },
              expirationDates: optionChain.expirationDates || [],
              strikes: optionChain.strikes || [],
              calls: options.calls || [],
              puts: options.puts || []
            }
          };
        }

        if (fetchPrices) {
          let yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`;

          // Parse dates as UTC and convert to Unix timestamps
          const period1 = Math.floor(Date.parse(startDate + 'T00:00:00Z') / 1000);
          const period2 = Math.floor(Date.parse(endDate + 'T23:59:59Z') / 1000);
          yahooUrl += `?period1=${period1}&period2=${period2}&interval=${interval}`;

          const response = await fetch(yahooUrl, {
            headers: { 'User-Agent': USER_AGENT }
          });

          if (!response.ok) {
            return { symbol, valid: false, data: null };
          }

          const data = await response.json();
          const isValid = data.chart?.result !== null && !data.chart?.error;

          if (!isValid) {
            return { symbol, valid: false, data: null };
          }

          const result = data.chart.result[0];
          return {
            symbol,
            valid: true,
            data: {
              timestamps: result.timestamp || [],
              open: result.indicators?.quote?.[0]?.open || [],
              high: result.indicators?.quote?.[0]?.high || [],
              low: result.indicators?.quote?.[0]?.low || [],
              close: result.indicators?.quote?.[0]?.close || [],
              volume: result.indicators?.quote?.[0]?.volume || [],
              meta: {
                currency: result.meta?.currency,
                symbol: result.meta?.symbol,
                exchangeName: result.meta?.exchangeName,
                regularMarketPrice: result.meta?.regularMarketPrice
              }
            }
          };
        }

        const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`;

        const response = await fetch(yahooUrl, {
          headers: { 'User-Agent': USER_AGENT }
        });

        if (!response.ok) {
          return { symbol, valid: false, data: null };
        }

        const data = await response.json();
        const isValid = data.chart?.result !== null && !data.chart?.error;

        return { symbol, valid: isValid, data: null };

      } catch (error) {
        return { symbol, valid: false, data: null };
      }
    });

    const results = await Promise.all(fetchPromises);

    const valid = results.filter(r => r.valid).map(r => r.symbol);
    const invalid = results.filter(r => !r.valid).map(r => r.symbol);

    if (fetchOptions) {
      return new Response(
        JSON.stringify({
          optionsResponse: {
            result: results
              .filter(r => r.valid)
              .map(r => ({ symbol: r.symbol, ...r.data }))
          },
          valid,
          invalid
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const quoteResponse = {
      result: results
        .filter(r => r.valid)
        .map(r => fetchPrices ? { symbol: r.symbol, ...r.data } : { symbol: r.symbol })
    };

    return new Response(
      JSON.stringify({
        quoteResponse,
        valid,
        invalid
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
