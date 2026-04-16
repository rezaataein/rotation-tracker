import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { fetchMultipleHistoricalPrices } from '../lib/yahooFinance';
import { getTodayString } from '../lib/dateUtils';
import { calculateRelativePerformance } from '../lib/calculations';
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
  }, [position.id, position.entry_date, position.entry_stock_price, position.entry_bench_price, position.exit_threshold]);

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

      // Calculate relative performance using shared utility
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
        rightOffset: 5,
        barSpacing: 6,
        fixLeftEdge: true,
        fixRightEdge: true,
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

    // Add relative performance line
    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#2563eb',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => `${price.toFixed(2)}%`,
      },
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
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

    // Default view with scrollable range limited to actual data
    if (data.length > 0) {
      chart.timeScale().setVisibleLogicalRange({
        from: 0,
        to: data.length - 1,
      });
    }

    chartRef.current = chart;

    // Add dynamic price line that follows series value at crosshair position
    let currentPriceLine = null;
    chart.subscribeCrosshairMove((param) => {
      // Remove previous price line
      if (currentPriceLine) {
        lineSeries.removePriceLine(currentPriceLine);
        currentPriceLine = null;
      }

      // Add new price line at series value if hovering
      if (param.time && param.seriesData && param.seriesData.size > 0) {
        const performanceValue = param.seriesData.get(lineSeries);
        if (performanceValue) {
          currentPriceLine = lineSeries.createPriceLine({
            price: performanceValue.value,
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
