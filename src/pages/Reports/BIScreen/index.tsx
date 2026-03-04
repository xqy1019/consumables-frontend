import React, { useState, useEffect, useRef } from 'react'
import {
  Row, Col, Card, Statistic, Typography, Tag, Table, Spin, Space, Progress,
} from 'antd'
import {
  DashboardOutlined, WarningOutlined, ShoppingCartOutlined, DatabaseOutlined,
  RobotOutlined, ReloadOutlined,
} from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import type { BiDashboard } from '@/types'

const { Title } = Typography

export default function BIScreenPage() {
  const trendChartRef = useRef<HTMLDivElement>(null)
  const categoryChartRef = useRef<HTMLDivElement>(null)
  const purchaseTrendRef = useRef<HTMLDivElement>(null)
  const trendChart = useRef<echarts.ECharts | null>(null)
  const categoryChart = useRef<echarts.ECharts | null>(null)
  const purchaseChart = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<BiDashboard | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await reportsApi.getBiDashboard()
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!data) return

    // 消耗趋势图
    if (trendChartRef.current) {
      if (!trendChart.current) trendChart.current = echarts.init(trendChartRef.current)
      trendChart.current.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['入库', '出库'], top: 0 },
        xAxis: { type: 'category', data: data.consumptionTrend.map(d => d.date), axisLabel: { rotate: 30, fontSize: 11 } },
        yAxis: { type: 'value' },
        series: [
          { name: '入库', type: 'bar', stack: 'total', data: data.consumptionTrend.map(d => d.inbound), itemStyle: { color: '#52c41a' } },
          { name: '出库', type: 'bar', stack: 'total', data: data.consumptionTrend.map(d => d.outbound), itemStyle: { color: '#1677ff' } },
        ],
      })
    }

    // 分类分布图
    if (categoryChartRef.current) {
      if (!categoryChart.current) categoryChart.current = echarts.init(categoryChartRef.current)
      categoryChart.current.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', right: 10, type: 'scroll' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: data.categoryDistribution.map(d => ({ name: d.name, value: d.value })),
        }],
      })
    }

    // 采购趋势图
    if (purchaseTrendRef.current) {
      if (!purchaseChart.current) purchaseChart.current = echarts.init(purchaseTrendRef.current)
      purchaseChart.current.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: data.purchaseTrend.map(d => d.month) },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${(v / 1000).toFixed(0)}k` } },
        series: [{
          type: 'line', smooth: true,
          data: data.purchaseTrend.map(d => d.purchaseCost),
          itemStyle: { color: '#722ed1' },
          areaStyle: { opacity: 0.15 },
        }],
      })
    }

    const handleResize = () => {
      trendChart.current?.resize()
      categoryChart.current?.resize()
      purchaseChart.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [data])

  useEffect(() => {
    return () => {
      trendChart.current?.dispose()
      categoryChart.current?.dispose()
      purchaseChart.current?.dispose()
    }
  }, [])

  const deptColumns = [
    {
      title: '排名', dataIndex: 'rank', width: 50,
      render: (v: number) => <span style={{ fontWeight: v <= 3 ? 700 : 400 }}>#{v}</span>,
    },
    { title: '科室', dataIndex: 'deptName', render: (v: string, r: any) => v || `科室${r.deptId}` },
    { title: '消耗量', dataIndex: 'totalQuantity' },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <DashboardOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <Title level={4} style={{ margin: 0 }}>BI 智能大屏</Title>
            </Space>
          </Col>
          <Col>
            <ReloadOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={fetchData} spin={loading} />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {/* 核心指标 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {[
            { title: '库存总价值', value: data?.totalInventoryValue, prefix: '¥', color: '#1677ff', icon: <DatabaseOutlined /> },
            { title: '库存品种数', value: data?.totalInventoryItems, color: '#52c41a', icon: <DatabaseOutlined /> },
            { title: '即将过期', value: data?.expiringCount, color: '#fa8c16', icon: <WarningOutlined />, suffix: '批' },
            { title: '库存不足', value: data?.lowStockCount, color: '#ff4d4f', icon: <WarningOutlined />, suffix: '种' },
            { title: '待执行采购', value: data?.pendingPurchase, color: '#722ed1', icon: <ShoppingCartOutlined />, suffix: '单' },
          ].map((item, i) => (
            <Col span={24 / 5} key={i}>
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Statistic
                  title={item.title}
                  value={item.value ?? '--'}
                  prefix={item.prefix}
                  suffix={item.suffix}
                  valueStyle={{ color: item.color, fontSize: 24 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* AI 预测准确率 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card bordered={false} style={{ borderRadius: 12, height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <RobotOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                  <span style={{ fontWeight: 600 }}>AI 预测准确率</span>
                </Space>
                <Progress
                  type="circle"
                  percent={parseFloat(String(data?.predictionAccuracy || 0))}
                  format={v => `${v}%`}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  style={{ display: 'flex', justifyContent: 'center' }}
                />
              </Space>
            </Card>
          </Col>
          <Col span={18}>
            <Card bordered={false} style={{ borderRadius: 12 }} title="近7天出入库趋势">
              <div ref={trendChartRef} style={{ height: 200 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Card bordered={false} style={{ borderRadius: 12 }} title="耗材分类分布">
              <div ref={categoryChartRef} style={{ height: 260 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} style={{ borderRadius: 12 }} title="科室消耗排名（近30天）">
              <Table
                rowKey={r => `${(r as any).deptId}`}
                columns={deptColumns}
                dataSource={data?.deptRanking?.slice(0, 8) || []}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} style={{ borderRadius: 12 }} title="近6月采购成本趋势">
              <div ref={purchaseTrendRef} style={{ height: 260 }} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
