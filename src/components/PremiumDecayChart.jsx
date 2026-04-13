import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import './Chart.css';

export default function PremiumDecayChart({ position }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    renderChart();
    setLoading(false);

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [position.id]);

  const renderChart = () => {
    if (!chartContainerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Create theoretical decay curve from entry to expiration
    const entryTime = new Date(position.entry_date).getTime() / 1000;
    const expiryTime = new Date(position.expiration).getTime() / 1000;
    const now = Date.now() / 1000;

    const data = [];
    const daysCount = Math.ceil((expiryTime - entryTime) / 86400); // 86400 = seconds in a day

    // Generate theoretical exponential decay
    for (let i = 0; i <= daysCount; i++) {
      const timestamp = entryTime + (i * 86400);
      if (timestamp > now + 86400) break; // Don't show future beyond tomorrow

      const daysToExpiry = (expiryTime - timestamp) / 86400;
      const totalDays = (expiryTime - entryTime) / 86400;

      // Exponential decay: value decreases faster as expiration approaches
      const timeRatio = daysToExpiry / totalDays;
      const decayFactor = Math.pow(timeRatio, 0.7); // 0.7 creates realistic option decay curve

      const theoreticalValue = position.entry_premium * decayFactor;

      data.push({
        time: timestamp,
        value: Math.max(0, theoreticalValue) // Can't go negative
      });
    }

    // Create chart
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

    // Add decay curve
    const lineSeries = chart.addLineSeries({
      color: '#a855f7',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    lineSeries.setData(data);

    // Add alert target line (horizontal)
    const targetData = data.map(d => ({
      time: d.time,
      value: position.alert_target
    }));

    const targetSeries = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    targetSeries.setData(targetData);

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
        <p>Loading chart...</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={chartContainerRef} className="chart-container" />
      <p className="chart-disclaimer">
        ⓘ Theoretical decay curve - actual premium may vary based on volatility and underlying price
      </p>
    </div>
  );
}
