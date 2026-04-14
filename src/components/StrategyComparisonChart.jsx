import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { fetchMultipleHistoricalPrices } from '../lib/yahooFinance';
import { getTodayString } from '../lib/dateUtils';
import { calculateRelativePerformance } from '../lib/calculations';
import './Chart.css';

export default function StrategyComparisonChart({ strategy, onDataLoaded }) {
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
  }, [strategy.id]);

  const fetchDataAndRenderChart = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = getTodayString();

      // Calculate start date based on lookback period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - strategy.lookback_days);
      const startDateString = startDate.toISOString().split('T')[0];

      // Fetch both stock and benchmark data
      const results = await fetchMultipleHistoricalPrices(
        [strategy.ticker, strategy.benchmark],
        startDateString,
        today
      );

      const stockData = results.find(r => r.symbol === strategy.ticker);
      const benchData = results.find(r => r.symbol === strategy.benchmark);

      if (!stockData || !benchData) {
        throw new Error('Failed to fetch price data');
      }

      // Get current prices
      const currentStockPrice = stockData.meta?.regularMarketPrice;
      const currentBenchPrice = benchData.meta?.regularMarketPrice;

      // Calculate current spread (relative performance)
      let currentSpread = null;
      if (currentStockPrice && currentBenchPrice && stockData.close.length > 0 && benchData.close.length > 0) {
        // Use first price as baseline for relative performance
        const stockStart = stockData.close[0];
        const benchStart = benchData.close[0];

        const stockReturn = ((currentStockPrice - stockStart) / stockStart) * 100;
        const benchReturn = ((currentBenchPrice - benchStart) / benchStart) * 100;
        currentSpread = stockReturn - benchReturn;
      }

      // Pass data to parent
      if (onDataLoaded) {
        onDataLoaded({
          stockPrice: currentStockPrice,
          benchPrice: currentBenchPrice,
          spread: currentSpread
        });
      }

      // Render chart
      renderChart(stockData, benchData, strategy);

      setLoading(false);
    } catch (err) {
      console.error('Chart error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderChart = (stockData, benchData, strategy) => {
    if (!chartContainerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Calculate spread over time using shared utility
    // Use first prices as baseline (lookback period start)
    const stockBaseline = stockData.close[0];
    const benchBaseline = benchData.close[0];

    const spreadData = calculateRelativePerformance(
      stockData,
      benchData,
      stockBaseline,
      benchBaseline
    );

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
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });

    // Add spread line (changes color based on if it's above/below threshold)
    const spreadSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#2563eb', // Blue
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => `${price.toFixed(2)}%`,
      },
    });
    spreadSeries.setData(spreadData);

    // Add entry threshold line (dashed horizontal line)
    const thresholdValue = strategy.entry_threshold * 100;
    const thresholdData = spreadData.map(d => ({
      time: d.time,
      value: thresholdValue
    }));

    const thresholdSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#10b981', // Green
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
