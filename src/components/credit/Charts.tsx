import ReactECharts from 'echarts-for-react'

export function GaugeChart({ score }: { score: number }) {
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 5,
      itemStyle: { color: '#C8A45C' },
      progress: {
        show: true,
        width: 20,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#EF4444' },
              { offset: 0.4, color: '#F59E0B' },
              { offset: 0.6, color: '#3B82F6' },
              { offset: 1, color: '#22C55E' },
            ],
          },
        },
      },
      pointer: { show: true, length: '60%', width: 4, itemStyle: { color: '#0F2B46' } },
      axisLine: { lineStyle: { width: 20, color: [[1, '#E2E8F0']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { distance: 20, color: '#94A3B8', fontSize: 11 },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        fontSize: 36,
        fontWeight: 'bold',
        color: '#0F2B46',
        offsetCenter: [0, '60%'],
      },
      data: [{ value: score }],
    }],
  }
  return <ReactECharts option={option} style={{ height: 240 }} />
}

export function TrendChart({ data }: { data: { month: string; score: number }[] }) {
  const option = {
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: data.map((d) => d.month), axisLabel: { color: '#94A3B8', fontSize: 11 }, axisLine: { lineStyle: { color: '#E2E8F0' } } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1F5F9' } } },
    series: [
      {
        type: 'line', data: data.map((d) => d.score), smooth: true,
        lineStyle: { color: '#C8A45C', width: 2 },
        itemStyle: { color: '#C8A45C' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(200,164,92,0.2)' }, { offset: 1, color: 'rgba(200,164,92,0)' }] } },
      },
      {
        type: 'line', data: data.map(() => 60), markLine: { silent: true, symbol: 'none', lineStyle: { color: '#EF4444', type: 'dashed', width: 1 }, data: [{ yAxis: 60, label: { formatter: '及格线', color: '#EF4444', fontSize: 11 } }] },
        lineStyle: { width: 0 }, itemStyle: { opacity: 0 },
      },
    ],
    tooltip: { trigger: 'axis', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
  }
  return <ReactECharts option={option} style={{ height: 260 }} />
}

export function DistributionChart({ data }: { data: { name: string; value: number }[] }) {
  const option = {
    grid: { top: 20, right: 20, bottom: 40, left: 80 },
    xAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1F5F9' } } },
    yAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { color: '#64748B', fontSize: 11 }, axisLine: { lineStyle: { color: '#E2E8F0' } } },
    series: [{
      type: 'bar', data: data.map((d) => d.value),
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#0F2B46' }, { offset: 1, color: '#C8A45C' }] }, borderRadius: [0, 4, 4, 0] },
      barWidth: 20,
    }],
    tooltip: { trigger: 'axis', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
  }
  return <ReactECharts option={option} style={{ height: 260 }} />
}
