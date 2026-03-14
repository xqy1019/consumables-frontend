import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Radio, Spin, Statistic, Button, Space } from 'antd'
import { RobotOutlined, DownloadOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi, exportCostAnalysis } from '@/api/reports'
import { aiApi } from '@/api/ai'
import type { CostAnalysis } from '@/types'
import AiAnalysisPanel from '@/components/AiAnalysisPanel'


export default function CostAnalysisPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<CostAnalysis[]>([])
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const buildSummary = (d: CostAnalysis[], m: number) => {
    if (d.length === 0) return ''
    const totalC = d.reduce((s, x) => s + (x.consumptionCost ?? 0), 0)
    const totalP = d.reduce((s, x) => s + (x.purchaseCost ?? 0), 0)
    const diff = totalP - totalC
    const last = d[d.length - 1]
    const prev = d[d.length - 2]
    const cMom = prev && prev.consumptionCost
      ? `${(((last.consumptionCost - prev.consumptionCost) / prev.consumptionCost) * 100).toFixed(1)}%`
      : '无'
    const pMom = prev && prev.purchaseCost
      ? `${(((last.purchaseCost - prev.purchaseCost) / prev.purchaseCost) * 100).toFixed(1)}%`
      : '无'
    const detail = d.map(x =>
      `${x.month}: 消耗¥${(x.consumptionCost ?? 0).toFixed(0)}，采购¥${(x.purchaseCost ?? 0).toFixed(0)}`
    ).join('\n')
    return [
      `统计周期：近${m}个月`,
      `消耗总成本：¥${totalC.toFixed(0)}，采购总成本：¥${totalP.toFixed(0)}`,
      `采购与消耗差额：¥${Math.abs(diff).toFixed(0)}（${diff > 0 ? '采购超出消耗，存在库存积压风险' : '消耗超出采购，库存在持续下降'}）`,
      `最新月环比 - 消耗成本：${cMom}，采购成本：${pMom}`,
      `月度明细：\n${detail}`,
    ].join('\n')
  }

  const handleAiAnalyze = async () => {
    if (data.length === 0) return
    setAiLoading(true)
    try {
      const result = await aiApi.analyzeReport('成本分析', buildSummary(data, months))
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

  useEffect(() => {
    setAiAnalysis(null)
    fetchData(months)
  }, [months])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }
    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['消耗成本', '采购成本'] },
      xAxis: { type: 'category', data: data.map(d => d.month), axisLabel: { rotate: 30 } },
      yAxis: {
        type: 'value', name: '金额（元）',
        axisLabel: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` },
      },
      series: [
        {
          name: '消耗成本', type: 'line', smooth: true,
          data: data.map(d => d.consumptionCost),
          itemStyle: { color: '#1677ff' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: '采购成本', type: 'line', smooth: true,
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

  const totalConsumption = data.reduce((s, d) => s + (d.consumptionCost ?? 0), 0)
  const totalPurchase = data.reduce((s, d) => s + (d.purchaseCost ?? 0), 0)

  return (
    <div>
      {/* 顶部：标题 + 时间筛选 + AI 按钮 */}
      <Card
        bordered={false}
        className="rounded-xl mb-4"
        title="成本分析"
        extra={
          <Space>
            <Radio.Group value={months} onChange={e => setMonths(e.target.value)}>
              <Radio.Button value={3}>近3月</Radio.Button>
              <Radio.Button value={6}>近6月</Radio.Button>
              <Radio.Button value={12}>近12月</Radio.Button>
            </Radio.Group>
            <Button
              icon={<DownloadOutlined />}
              onClick={async () => { await exportCostAnalysis(months) }}
            >
              导出 Excel
            </Button>
            <Button
              icon={<RobotOutlined />}
              loading={aiLoading}
              onClick={handleAiAnalyze}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none' }}
            >
              AI 解读
            </Button>
          </Space>
        }
      />

      {/* 汇总统计卡 */}
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

      {/* 图表 */}
      <Card bordered={false} className="rounded-xl">
        <Spin spinning={loading}>
          <div ref={chartRef} className="h-[400px]" />
        </Spin>
      </Card>

      {/* AI 解读面板 */}
      {aiAnalysis && (
        <AiAnalysisPanel
          text={aiAnalysis}
          refreshing={aiLoading}
          onRefresh={handleAiAnalyze}
          onClose={() => setAiAnalysis(null)}
        />
      )}
    </div>
  )
}
