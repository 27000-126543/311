import ReactECharts from 'echarts-for-react'

export function TrendLineChart({ data }: { data: { month: string; count: number; amount: number }[] }) {
  const option = {
    tooltip: { trigger: 'axis', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
    legend: { data: ['交易量', '成交金额(万)'], top: 0, textStyle: { color: '#94A3B8', fontSize: 11 } },
    grid: { top: 40, right: 60, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: data.map((d) => d.month), axisLabel: { color: '#94A3B8', fontSize: 11 }, axisLine: { lineStyle: { color: '#E2E8F0' } } },
    yAxis: [
      { type: 'value', name: '交易量', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1F5F9' } }, nameTextStyle: { color: '#94A3B8', fontSize: 11 } },
      { type: 'value', name: '金额(万)', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { show: false }, nameTextStyle: { color: '#94A3B8', fontSize: 11 } },
    ],
    series: [
      { name: '交易量', type: 'line', data: data.map((d) => d.count), smooth: true, lineStyle: { color: '#C8A45C', width: 2 }, itemStyle: { color: '#C8A45C' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(200,164,92,0.15)' }, { offset: 1, color: 'rgba(200,164,92,0)' }] } } },
      { name: '成交金额(万)', type: 'line', yAxisIndex: 1, data: data.map((d) => d.amount), smooth: true, lineStyle: { color: '#0F2B46', width: 2 }, itemStyle: { color: '#0F2B46' } },
    ],
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}

export function IndustryPieChart({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#0F2B46', '#C8A45C', '#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6']
  const option = {
    tooltip: { trigger: 'item', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#64748B', fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
      data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      label: { show: false },
      emphasis: { label: { show: true, fontWeight: 'bold' } },
    }],
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}

export function IndustryBarChart({ data }: { data: { name: string; avg: number }[] }) {
  const option = {
    tooltip: { trigger: 'axis', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
    grid: { top: 20, right: 20, bottom: 40, left: 60 },
    xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { color: '#94A3B8', fontSize: 11, rotate: 20 }, axisLine: { lineStyle: { color: '#E2E8F0' } } },
    yAxis: { type: 'value', name: '平均金额(万)', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1F5F9' } }, nameTextStyle: { color: '#94A3B8', fontSize: 11 } },
    series: [{
      type: 'bar', data: data.map((d) => d.avg),
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#C8A45C' }, { offset: 1, color: '#0F2B46' }] }, borderRadius: [4, 4, 0, 0] },
      barWidth: 30,
    }],
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}

export function RegionBarChart({ data }: { data: { name: string; count: number; amount: number }[] }) {
  const option = {
    tooltip: { trigger: 'axis', backgroundColor: '#0F2B46', borderColor: '#0F2B46', textStyle: { color: '#fff', fontSize: 12 } },
    legend: { data: ['交易量', '成交金额(万)'], top: 0, textStyle: { color: '#94A3B8', fontSize: 11 } },
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { color: '#94A3B8', fontSize: 11 }, axisLine: { lineStyle: { color: '#E2E8F0' } } },
    yAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1F5F9' } } },
    series: [
      { name: '交易量', type: 'bar', data: data.map((d) => d.count), itemStyle: { color: '#0F2B46', borderRadius: [4, 4, 0, 0] }, barWidth: 20 },
      { name: '成交金额(万)', type: 'bar', data: data.map((d) => d.amount), itemStyle: { color: '#C8A45C', borderRadius: [4, 4, 0, 0] }, barWidth: 20 },
    ],
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}
