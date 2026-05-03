// ── TradingView Chart (Lightweight Charts v5) ──

import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from 'lightweight-charts';
import { useThemeMode } from '@/app/Providers';
import type { ChartConfig, ChartCandle } from '../lib/types';

interface Props extends ChartConfig {
  data?: ChartCandle[]; // Pre-loaded data
  onTimeframeChange?: (tf: ChartConfig['timeframe']) => void;
}

export function TradingViewChart({
  symbol: _symbol,
  timeframe: _timeframe,
  height = 500,
  showVolume = true,
  markers = [],
  data,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0f172a' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#64748b',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
        horzLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
      },
      crosshair: {
        mode: 0, // normal crosshair
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
    });

    // Add markers plugin
    if (markers.length > 0) {
      const mp = createSeriesMarkers(candleSeries, []);
      mp.setMarkers(
        markers.map((m) => ({
          time: m.time as Time,
          position: m.position,
          color: m.color,
          shape: m.shape,
          text: m.text,
          size: m.size ?? 2,
        })),
      );
      markersPluginRef.current = mp;
    }

    // Add volume series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // overlay on left
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    // Load data if provided
    if (data && data.length > 0) {
      const candleData: CandlestickData[] = data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candleSeries.setData(candleData);

      if (showVolume) {
        const volumeData: HistogramData[] = data
          .filter((d) => d.volume !== undefined)
          .map((d) => ({
            time: d.time as Time,
            value: d.volume!,
            color:
              d.close >= d.open
                ? 'rgba(34, 197, 94, 0.3)'
                : 'rgba(239, 68, 68, 0.3)',
          }));
        volumeSeriesRef.current?.setData(volumeData);
      }

      chart.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      markersPluginRef.current?.detach();
      chart.remove();
    };
  }, [isDark, height, data, markers, showVolume]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height }} />
    </div>
  );
}
