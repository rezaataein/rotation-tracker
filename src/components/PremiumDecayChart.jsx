import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import { supabase } from '../lib/supabase';
import { createSmartTimeFormatter, createSmartTickFormatter } from '../lib/chartFormatters';
import './Chart.css';

export default function PremiumDecayChart({ position }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    fetchAndRenderChart();

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [position.id, position.alert_target]);

  const fetchAndRenderChart = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch historical price snapshots for this position
      const { data: snapshots, error: fetchError } = await supabase
        .from('option_price_snapshots')
        .select('timestamp, bid, ask, last_price')
        .eq('position_id', position.id)
        .order('timestamp', { ascending: true });

      if (fetchError) throw fetchError;

      if (!snapshots || snapshots.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);

      // Wait for container to be ready
      let attempts = 0;
      const maxAttempts = 10;

      const tryRender = () => {
        if (chartContainerRef.current) {
          renderChart(snapshots);
          setLoading(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(tryRender, 50);
        } else {
          throw new Error('Chart container not ready');
        }
      };

      tryRender();

    } catch (err) {
      console.error('Error fetching option snapshots:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderChart = (snapshots) => {
    if (!chartContainerRef.current) return;

    // Remove existing chart
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Convert snapshots to chart data (use mid price: (bid + ask) / 2)
    const data = snapshots.map(snapshot => ({
      time: Math.floor(new Date(snapshot.timestamp).getTime() / 1000),
      value: snapshot.last_price || ((snapshot.bid + snapshot.ask) / 2)
    }));

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

    // Add decay curve
    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    lineSeries.setData(data);

    // Apply smart time formatters based on data range
    const timeFormatter = createSmartTimeFormatter(data);
    const tickFormatter = createSmartTickFormatter(data);

    chart.applyOptions({
      localization: {
        timeFormatter: timeFormatter,
      },
      timeScale: {
        tickMarkFormatter: tickFormatter,
      },
    });

    // Add alert target line (horizontal)
    const targetData = data.map(d => ({
      time: d.time,
      value: position.alert_target
    }));

    // Add alert target line only if we have data
    if (data.length > 0) {
      const targetSeries = chart.addSeries(LightweightCharts.LineSeries, {
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
    }

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
        const premiumValue = param.seriesData.get(lineSeries);
        if (premiumValue) {
          currentPriceLine = lineSeries.createPriceLine({
            price: premiumValue.value,
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
          <p>Loading chart...</p>
        </div>
      )}
      {error && (
        <div className="chart-error" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
          <p>⚠️ Failed to load chart</p>
          <p className="error-details">{error}</p>
        </div>
      )}
      {!loading && !error && !hasData && (
        <div className="chart-error" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#f9fafb', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>📊 No price history yet</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>Price data will appear once monitoring begins</p>
        </div>
      )}
      <div ref={chartContainerRef} className="chart-container" />
      {hasData && (
        <p className="chart-disclaimer">
          ⓘ Historical premium data - collected by automated monitoring
        </p>
      )}
    </div>
  );
}
