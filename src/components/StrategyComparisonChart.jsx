import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { fetchMultipleHistoricalPrices } from '../lib/yahooFinance';
import { getTodayString, tradingDaysToCalendarDays } from '../lib/dateUtils';
import { calculateRelativePerformance } from '../lib/calculations';
import { getCurrentPrice } from '../lib/priceUtils';
import { createSmartTimeFormatter, createSmartTickFormatter } from '../lib/chartFormatters';
import './Chart.css';

// Trim raw Yahoo Finance result to the last n valid (non-null) trading days
function sliceToLastNTradingDays(data, n) {
  const pairs = [];
  for (let i = 0; i < data.timestamps.length; i++) {
    if (data.close[i] != null) {
      pairs.push({ t: data.timestamps[i], c: data.close[i] });
    }
  }
  const sliced = pairs.length > n ? pairs.slice(-n) : pairs;
  return {
    ...data,
    timestamps: sliced.map(p => p.t),
    close: sliced.map(p => p.c),
  };
}

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
  }, [strategy.id, strategy.lookback_days, strategy.entry_threshold]);

  const fetchDataAndRenderChart = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = getTodayString();

      // lookback_days is TRADING days — fetch 2x calendar days as safe buffer
      const calendarBuffer = tradingDaysToCalendarDays(strategy.lookback_days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - calendarBuffer);
      const startDateString = startDate.toISOString().split('T')[0];

      // Fetch both stock and benchmark data
      const results = await fetchMultipleHistoricalPrices(
        [strategy.ticker, strategy.benchmark],
        startDateString,
        today
      );

      const rawStockData = results.find(r => r.symbol === strategy.ticker);
      const rawBenchData = results.find(r => r.symbol === strategy.benchmark);

      if (!rawStockData || !rawBenchData) {
        throw new Error('Failed to fetch price data');
      }

      // Trim to exactly the last lookback_days trading days so chart and
      // baseline both reflect the correct period (not the oversized calendar buffer)
      const stockData = sliceToLastNTradingDays(rawStockData, strategy.lookback_days);
      const benchData = sliceToLastNTradingDays(rawBenchData, strategy.lookback_days);

      // Get current prices from raw meta (includes extended hours)
      const currentStockPrice = getCurrentPrice(rawStockData.meta);
      const currentBenchPrice = getCurrentPrice(rawBenchData.meta);

      // Calculate current spread using the correct lookback baseline (close[0] of trimmed data)
      let currentSpread = null;
      if (currentStockPrice && currentBenchPrice && stockData.close.length > 0 && benchData.close.length > 0) {
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

      // Render chart with trimmed data (shows exactly the lookback period)
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
        rightOffset: 5,
        barSpacing: 6,
        fixLeftEdge: true,
        fixRightEdge: true,
        shiftVisibleRangeOnNewBar: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(37, 99, 235, 0.5)',
          style: 0,
          labelBackgroundColor: '#2563eb',
        },
        horzLine: {
          visible: false, // Hide default horizontal line
        },
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
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    spreadSeries.setData(spreadData);

    // Apply smart time formatters based on data range
    const timeFormatter = createSmartTimeFormatter(spreadData);
    const tickFormatter = createSmartTickFormatter(spreadData);

    chart.applyOptions({
      localization: {
        timeFormatter: timeFormatter,
      },
      timeScale: {
        tickMarkFormatter: tickFormatter,
      },
    });

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

    chartRef.current = chart;

    // Add dynamic price line that follows series value at crosshair position
    let currentPriceLine = null;
    chart.subscribeCrosshairMove((param) => {
      // Remove previous price line
      if (currentPriceLine) {
        spreadSeries.removePriceLine(currentPriceLine);
        currentPriceLine = null;
      }

      // Add new price line at series value if hovering
      if (param.time && param.seriesData && param.seriesData.size > 0) {
        const spreadValue = param.seriesData.get(spreadSeries);
        if (spreadValue) {
          currentPriceLine = spreadSeries.createPriceLine({
            price: spreadValue.value,
            color: '#a855f7',
            lineWidth: 1,
            lineStyle: 0,
            axisLabelVisible: true,
            title: '',
            axisLabelColor: '#a855f7',
            axisLabelTextColor: '#ffffff',
          });
        }
      }
    });

    // Set visible logical range to limit scrolling to actual data
    if (spreadData.length > 0) {
      // Restrict scrollable range to actual data boundaries
      chart.timeScale().setVisibleLogicalRange({
        from: 0,
        to: spreadData.length - 1,
      });
    }

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
