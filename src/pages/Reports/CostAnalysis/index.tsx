import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Radio, Spin, Statistic, Button, Alert } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import { aiApi } from '@/api/ai'
import type { CostAnalysis } from '@/types'


export default function CostAnalysisPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<CostAnalysis[]>([])
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiAnalyze = async () => {
    if (data.length === 0) return
    setAiLoading(true)
    try {
      const summary = data.map(d =>
        `${d.month}: 消耗成本¥${d.consumptionCost?.toFixed(0) ?? 0}, 采购成本¥${d.purchaseCost?.toFixed(0) ?? 0}`
      ).join('\n')
      const result = await aiApi.analyzeReport('成本分析', summary)
      setAiAnalysis(result || '暂时无法获取 AI 解读，请稍后再试。')
    } catch {
      setAiAnalysis('AI 解读请求失败，请检查网络后重试。')
    } finally {
      setAiLoading(false)
    }
  }

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
      <Card
        bordered={false}
        className="rounded-xl mb-4"
        title="成本分析"
        extra={
          <Radio.Group value={months} onChange={e => setMonths(e.target.value)}>
            <Radio.Button value={3}>近3月</Radio.Button>
            <Radio.Button value={6}>近6月</Radio.Button>
            <Radio.Button value={12}>近12月</Radio.Button>
          </Radio.Group>
        }
      />
      <Row gutter={16} className="mb-4">
        <Col span={12}>
          <Card bordered={false} className="rounded-xl">
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
          <Card bordered={false} className="rounded-xl">
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
      <Card
        bordered={false}
        className="rounded-xl"
        extra={
          <Button icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiAnalyze}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none' }}>
            AI 智能解读
          </Button>
        }
      >
        <Spin spinning={loading}>
          <div ref={chartRef} className="h-[400px]" />
        </Spin>
        {aiAnalysis && (
          <Alert
            type="info"
            icon={<RobotOutlined />}
            showIcon
            style={{ marginTop: 16, borderRadius: 8, background: '#f5f0ff', borderColor: '#c4b5fd' }}
            message={<span style={{ fontWeight: 600, color: '#7c3aed' }}>Claude AI 解读</span>}
            description={<div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.8, marginTop: 4 }}>{aiAnalysis}</div>}
          />
        )}
      </Card>
    </div>
  )
}
