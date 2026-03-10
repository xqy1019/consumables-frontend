import React, { useState, useEffect, useRef } from 'react'
import { Card, Radio, Spin, Button, Space } from 'antd'
import { RobotOutlined, DownloadOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi, getExportConsumptionTrendUrl } from '@/api/reports'
import { aiApi } from '@/api/ai'
import type { ConsumptionTrend } from '@/types'
import AiAnalysisPanel from '@/components/AiAnalysisPanel'


export default function TrendPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<ConsumptionTrend[]>([])
  const [months, setMonths] = useState(6)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const buildSummary = (d: ConsumptionTrend[], m: number) => {
    if (d.length === 0) return ''
    const total = d.reduce((s, x) => s + x.total, 0)
    const avg = Math.round(total / d.length)
    const maxItem = d.reduce((a, b) => b.total > a.total ? b : a)
    const minItem = d.reduce((a, b) => b.total < a.total ? b : a)
    const last = d[d.length - 1]
    const prev = d[d.length - 2]
    const mom = prev
      ? `${(((last.total - prev.total) / prev.total) * 100).toFixed(1)}%`
      : '无'
    const detail = d.map(x => `${x.month}: ${x.total}件`).join('，')
    return [
      `统计周期：近${m}个月`,
      `总消耗量：${total}件，月均：${avg}件`,
      `峰值月份：${maxItem.month}（${maxItem.total}件），谷值月份：${minItem.month}（${minItem.total}件）`,
      `最新月环比变化：${mom}`,
      `月度明细：${detail}`,
    ].join('\n')
  }

  const handleAiAnalyze = async () => {
    if (data.length === 0) return
    setAiLoading(true)
    try {
      const result = await aiApi.analyzeReport('消耗趋势', buildSummary(data, months))
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
      const res = await reportsApi.getConsumptionTrend(m)
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
          <Space>
            <Radio.Group value={months} onChange={e => setMonths(e.target.value)}>
              <Radio.Button value={3}>近3月</Radio.Button>
              <Radio.Button value={6}>近6月</Radio.Button>
              <Radio.Button value={12}>近12月</Radio.Button>
            </Radio.Group>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => window.open(getExportConsumptionTrendUrl(months))}
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
      >
        <Spin spinning={loading}>
          <div ref={chartRef} className="h-[400px]" />
        </Spin>
      </Card>

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
