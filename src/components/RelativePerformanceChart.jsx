import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { fetchMultipleHistoricalPrices } from '../lib/yahooFinance';
import { getTodayString } from '../lib/dateUtils';
import './Chart.css';

export default function RelativePerformanceChart({ position, onPricesLoaded }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDataAndRenderChart();

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [position.id]);

  const fetchDataAndRenderChart = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = getTodayString();
      const entryDate = position.entry_date;

      // Fetch both stock and benchmark data in a single API call
      const results = await fetchMultipleHistoricalPrices(
        [position.ticker, position.benchmark],
        entryDate,
        today
      );

      // results[0] = stock, results[1] = benchmark
      const stockData = results.find(r => r.symbol === position.ticker);
      const benchData = results.find(r => r.symbol === position.benchmark);

      if (!stockData || !benchData) {
        throw new Error('Failed to fetch price data');
      }

      // Pass current prices to parent if callback provided
      if (onPricesLoaded) {
        const currentStockPrice = stockData.meta?.regularMarketPrice;
        const currentBenchPrice = benchData.meta?.regularMarketPrice;
        if (currentStockPrice && currentBenchPrice) {
          onPricesLoaded(currentStockPrice, currentBenchPrice);
        }
      }

      // Calculate relative performance
      const relativePerformance = calculateRelativePerformance(
        stockData,
        benchData,
        position.entry_stock_price,
        position.entry_bench_price
      );

      // Render chart
      renderChart(relativePerformance, position.exit_threshold);

      setLoading(false);
    } catch (err) {
      console.error('Chart error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const calculateRelativePerformance = (stockData, benchData, entryStockPrice, entryBenchPrice) => {
    const data = [];

    // Ensure both arrays have same length (use minimum)
    const minLength = Math.min(stockData.timestamps.length, benchData.timestamps.length);

    for (let i = 0; i < minLength; i++) {
      const timestamp = stockData.timestamps[i];
      const stockClose = stockData.close[i];
      const benchClose = benchData.close[i];

      // Skip invalid values (null, undefined, NaN)
      if (!isValidNumber(stockClose) || !isValidNumber(benchClose)) continue;

      // Calculate returns from entry
      const stockReturn = ((stockClose - entryStockPrice) / entryStockPrice) * 100;
      const benchReturn = ((benchClose - entryBenchPrice) / entryBenchPrice) * 100;

      // Relative performance = stock return - benchmark return
      const spread = stockReturn - benchReturn;

      // Verify spread is valid before adding
      if (!isValidNumber(spread)) continue;

      data.push({
        time: timestamp,
        value: spread
      });
    }

    return data;
  };

  const isValidNumber = (value) => {
    return value != null && !isNaN(value) && isFinite(value);
  };

  // Helper to validate number values in calculations

  const renderChart = (data, exitThreshold) => {
    if (!chartContainerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create new chart
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
      },
    });

    // Add relative performance line
    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#2563eb',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => `${price.toFixed(2)}%`,
      },
    });

    lineSeries.setData(data);

    // Add exit threshold line (horizontal)
    const thresholdValue = exitThreshold * 100;
    const thresholdData = data.map(d => ({
      time: d.time,
      value: thresholdValue
    }));

    const thresholdSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceFormat: {
        type: 'custom',
        formatter: (price) => `${price.toFixed(2)}%`,
      },
    });

    thresholdSeries.setData(thresholdData);

    // Fit content
    chart.timeScale().fitContent();

    chartRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store cleanup function
    chartRef.current.cleanup = () => {
      window.removeEventListener('resize', handleResize);
    };
  };

  return (
    <div style={{ position: 'relative' }}>
      {loading && (
        <div className="chart-loading" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 10 }}>
          <div className="spinner"></div>
          <p>Loading chart data...</p>
        </div>
      )}
      {error && (
        <div className="chart-error" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <p>⚠️ Failed to load chart</p>
          <p className="error-details">{error}</p>
        </div>
      )}
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
}
