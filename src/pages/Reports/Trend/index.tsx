import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Typography, Radio, Spin } from 'antd'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import type { ConsumptionTrend } from '@/types'


export default function TrendPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<ConsumptionTrend[]>([])
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)

  const fetchData = async (m: number) => {
    setLoading(true)
    try {
      const res = await reportsApi.getConsumptionTrend(m)
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData(months) }, [months])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }
    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['消耗量'] },
      xAxis: { type: 'category', data: data.map(d => d.month), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '消耗数量' },
      series: [
        {
          name: '消耗量',
          type: 'bar',
          data: data.map(d => d.total),
          itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top' },
        },
      ],
    }
    chartInstance.current.setOption(option)
    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [data])

  useEffect(() => {
    return () => { chartInstance.current?.dispose() }
  }, [])

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="消耗趋势分析"
        extra={
          <Radio.Group value={months} onChange={e => setMonths(e.target.value)}>
            <Radio.Button value={3}>近3月</Radio.Button>
            <Radio.Button value={6}>近6月</Radio.Button>
            <Radio.Button value={12}>近12月</Radio.Button>
          </Radio.Group>
        }
      >
        <Spin spinning={loading}>
          <div ref={chartRef} className="h-[400px]" />
        </Spin>
      </Card>
    </div>
  )
}
