import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { fetchHistoricalPrices } from '../lib/yahooFinance';
import './Chart.css';

export default function RelativePerformanceChart({ position }) {
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

      const today = new Date().toISOString().split('T')[0];
      const entryDate = position.entry_date;

      // Fetch both stock and benchmark data
      const [stockData, benchData] = await Promise.all([
        fetchHistoricalPrices(position.ticker, entryDate, today),
        fetchHistoricalPrices(position.benchmark, entryDate, today)
      ]);

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

    // Align timestamps (use stock data as reference)
    stockData.timestamps.forEach((timestamp, i) => {
      const stockClose = stockData.close[i];
      const benchClose = benchData.close[i];

      // Skip null values
      if (stockClose === null || benchClose === null) return;

      // Calculate returns from entry
      const stockReturn = ((stockClose - entryStockPrice) / entryStockPrice) * 100;
      const benchReturn = ((benchClose - entryBenchPrice) / entryBenchPrice) * 100;

      // Relative performance = stock return - benchmark return
      const spread = stockReturn - benchReturn;

      data.push({
        time: timestamp,
        value: spread
      });
    });

    return data;
  };

  const renderChart = (data, exitThreshold) => {
    if (!chartContainerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
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
    const lineSeries = chart.addLineSeries({
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

    const thresholdSeries = chart.addLineSeries({
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

  if (loading) {
    return (
      <div className="chart-loading">
        <div className="spinner"></div>
        <p>Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-error">
        <p>⚠️ Failed to load chart</p>
        <p className="error-details">{error}</p>
      </div>
    );
  }

  return <div ref={chartContainerRef} className="chart-container" />;
}
