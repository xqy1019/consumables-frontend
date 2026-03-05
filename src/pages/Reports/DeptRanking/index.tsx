import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Radio, Table, Spin, Button, Alert, Space } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import { aiApi } from '@/api/ai'
import type { DeptRanking } from '@/types'
import type { ColumnsType } from 'antd/es/table'


export default function DeptRankingPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<DeptRanking[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiAnalyze = async () => {
    if (data.length === 0) return
    setAiLoading(true)
    try {
      const summary = data.slice(0, 10).map((d, i) =>
        `第${i + 1}名 ${d.deptName || '未知科室'}: 消耗${d.totalQuantity}件，金额¥${(d.totalAmount || 0).toFixed(0)}`
      ).join('\n')
      const result = await aiApi.analyzeReport(`科室消耗排名（近${days}天）`, summary)
      setAiAnalysis(result || '暂时无法获取 AI 解读，请稍后再试。')
    } catch {
      setAiAnalysis('AI 解读请求失败，请检查网络后重试。')
    } finally {
      setAiLoading(false)
    }
  }

  const fetchData = async (d: number) => {
    setLoading(true)
    try {
      const res = await reportsApi.getDeptRanking(d)
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData(days) }, [days])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }
    const top10 = data.slice(0, 10)
    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '消耗数量' },
      yAxis: {
        type: 'category',
        data: top10.map(d => d.deptName || `科室${d.deptId}`).reverse(),
      },
      series: [
        {
          type: 'bar',
          data: top10.map(d => d.totalQuantity).reverse(),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#ff4d4f', '#ff7a45', '#ffa940', '#ffd666', '#95de64', '#5cdbd3', '#69c0ff', '#85a5ff', '#b37feb', '#ff85c2']
              return colors[params.dataIndex % colors.length]
            },
            borderRadius: [0, 4, 4, 0],
          },
          label: { show: true, position: 'right' },
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

  const columns: ColumnsType<DeptRanking> = [
    { title: '排名', dataIndex: 'rank', width: 60,
      render: (v: number) => v <= 3 ? <span className="font-bold" style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][v - 1] }}>#{v}</span> : `#${v}` },
    { title: '科室名称', dataIndex: 'deptName', render: (v, r) => v || `科室${r.deptId}` },
    { title: '消耗数量', dataIndex: 'totalQuantity',
      render: (v: number) => <span className="font-semibold">{v}</span> },
    { title: '消耗金额', dataIndex: 'totalAmount',
      render: v => `¥${(v || 0).toLocaleString()}` },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl mb-4"
        title="科室消耗排名"
        extra={
          <Space>
            <Radio.Group value={days} onChange={e => setDays(e.target.value)}>
              <Radio.Button value={7}>近7天</Radio.Button>
              <Radio.Button value={30}>近30天</Radio.Button>
              <Radio.Button value={90}>近90天</Radio.Button>
            </Radio.Group>
            <Button icon={<RobotOutlined />} loading={aiLoading} onClick={handleAiAnalyze}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none' }}>
              AI 解读
            </Button>
          </Space>
        }
      />
      <Row gutter={16}>
        <Col span={14}>
          <Card bordered={false} className="rounded-xl">
            <Spin spinning={loading}>
              <div ref={chartRef} className="h-[400px]" />
            </Spin>
          </Card>
        </Col>
        <Col span={10}>
          <Card bordered={false} className="rounded-xl">
            <Table
              rowKey={r => `${r.deptId}`}
              columns={columns} dataSource={data} loading={loading}
              pagination={false} size="small"
            />
          </Card>
        </Col>
      </Row>
      {aiAnalysis && (
        <Alert
          type="info" icon={<RobotOutlined />} showIcon
          style={{ marginTop: 16, borderRadius: 8, background: '#f5f0ff', borderColor: '#c4b5fd' }}
          message={<span style={{ fontWeight: 600, color: '#7c3aed' }}>Claude AI 解读</span>}
          description={<div style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.8, marginTop: 4 }}>{aiAnalysis}</div>}
        />
      )}
    </div>
  )
}
