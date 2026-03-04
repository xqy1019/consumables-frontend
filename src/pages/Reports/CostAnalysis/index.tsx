import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Typography, Radio, Spin, Statistic } from 'antd'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import type { CostAnalysis } from '@/types'

const { Title } = Typography

export default function CostAnalysisPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<CostAnalysis[]>([])
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)

  const fetchData = async (m: number) => {
    setLoading(true)
    try {
      const res = await reportsApi.getCostAnalysis(m)
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
      legend: { data: ['消耗成本', '采购成本'] },
      xAxis: { type: 'category', data: data.map(d => d.month), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '金额（元）', axisLabel: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` } },
      series: [
        {
          name: '消耗成本',
          type: 'line',
          smooth: true,
          data: data.map(d => d.consumptionCost),
          itemStyle: { color: '#1677ff' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: '采购成本',
          type: 'line',
          smooth: true,
          data: data.map(d => d.purchaseCost),
          itemStyle: { color: '#52c41a' },
          areaStyle: { opacity: 0.1 },
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

  const totalConsumption = data.reduce((s, d) => s + d.consumptionCost, 0)
  const totalPurchase = data.reduce((s, d) => s + d.purchaseCost, 0)

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>成本分析</Title></Col>
          <Col>
            <Radio.Group value={months} onChange={e => setMonths(e.target.value)}>
              <Radio.Button value={3}>近3月</Radio.Button>
              <Radio.Button value={6}>近6月</Radio.Button>
              <Radio.Button value={12}>近12月</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={`近${months}月消耗总成本`}
              value={totalConsumption}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={`近${months}月采购总成本`}
              value={totalPurchase}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Spin spinning={loading}>
          <div ref={chartRef} style={{ height: 400 }} />
        </Spin>
      </Card>
    </div>
  )
}
