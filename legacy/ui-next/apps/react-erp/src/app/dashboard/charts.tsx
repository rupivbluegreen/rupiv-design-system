import { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { rawTokens as tokens } from '@omniappsuiux/design-tokens';

// Charts measure their container before the webfonts finish loading and reflow the page; one resize once fonts settle fixes it.
function useResizeOnFontsReady(chartRef: React.RefObject<ReactECharts | null>) {
  useEffect(() => {
    document.fonts?.ready.then(() => chartRef.current?.getEchartsInstance().resize()); // document.fonts is undefined in jsdom
  }, [chartRef]);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const REVENUE = [1_650_000, 2_050_000, 2_400_000, 3_245_000, 2_900_000, 3_050_000];
const HIGHLIGHT_INDEX = 3; // April — this month's figure, the one the card headlines.

export function RevenueTrendChart() {
  const chartRef = useRef<ReactECharts>(null);
  useResizeOnFontsReady(chartRef);
  const option = {
    grid: { left: 40, right: 12, top: 36, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tokens.color.surface.elevated,
      borderColor: tokens.color.border.subtle,
      textStyle: { color: tokens.color.text.primary, fontFamily: tokens.typography.font.body },
      formatter: (params: Array<{ axisValue: string; value: number }>) =>
        `${params[0]!.axisValue} 2024<br/>₺${params[0]!.value.toLocaleString('en-US')}`,
    },
    xAxis: {
      type: 'category',
      data: MONTHS,
      axisLine: { lineStyle: { color: tokens.color.border.default } },
      axisTick: { show: false },
      axisLabel: { color: tokens.color.text.tertiary, fontFamily: tokens.typography.font.body, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: tokens.color.text.tertiary,
        fontFamily: tokens.typography.font.body,
        fontSize: 11,
        formatter: (value: number) => `${value / 1_000_000}M`,
      },
      splitLine: { lineStyle: { color: tokens.color.border.subtle } },
    },
    series: [
      {
        type: 'bar',
        data: REVENUE.map((value, index) => ({
          value,
          itemStyle: { color: index === HIGHLIGHT_INDEX ? tokens.color.brand[700] : tokens.color.brand[300] },
        })),
        barWidth: '52%',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
    ],
  };
  return <ReactECharts ref={chartRef} option={option} style={{ height: 220 }} notMerge />;
}

const ORDER_DISTRIBUTION = [
  { name: 'Export', value: 45, color: tokens.color.brand[500] },
  { name: 'Domestic', value: 27, color: tokens.color.blue[500] },
  { name: 'Own brand', value: 13, color: tokens.color.orange[500] },
  { name: 'Other', value: 15, color: tokens.color.brand[300] },
];

const TOTAL_ORDERS = 128;

export function OrderDistributionChart() {
  const chartRef = useRef<ReactECharts>(null);
  useResizeOnFontsReady(chartRef);
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: tokens.color.surface.elevated,
      borderColor: tokens.color.border.subtle,
      textStyle: { color: tokens.color.text.primary, fontFamily: tokens.typography.font.body },
      formatter: '{b}: %{c}%',
    },
    series: [
      {
        type: 'pie',
        radius: ['62%', '86%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: ORDER_DISTRIBUTION.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color },
        })),
      },
    ],
  };
  return (
    <div style={{ position: 'relative' }}>
      <ReactECharts ref={chartRef} option={option} style={{ height: 160 }} notMerge />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx-color-text-primary)' }}>{TOTAL_ORDERS}</span>
        <span style={{ fontSize: 11, color: 'var(--tx-color-text-tertiary)' }}>Orders</span>
      </div>
    </div>
  );
}
