import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Tag, List, Space, Typography, Spin, Badge } from 'antd'
import {
  MedicineBoxOutlined, DatabaseOutlined, WarningOutlined,
  FileTextOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { reportsApi } from '@/api/system'
import type { DashboardData } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const { Title, Text } = Typography

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { realName } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    reportsApi.getDashboard().then(setData).finally(() => setLoading(false))
  }, [])

  const statCards = [
    {
      title: '耗材品种', value: data?.totalMaterials ?? 0,
      icon: <MedicineBoxOutlined style={{ color: '#6366f1', fontSize: 28 }} />,
      color: '#ede9fe', suffix: '种',
    },
    {
      title: '库存批次', value: data?.totalInventoryItems ?? 0,
      icon: <DatabaseOutlined style={{ color: '#0ea5e9', fontSize: 28 }} />,
      color: '#e0f2fe', suffix: '批',
    },
    {
      title: '待审批申领', value: data?.pendingRequisitions ?? 0,
      icon: <FileTextOutlined style={{ color: '#f59e0b', fontSize: 28 }} />,
      color: '#fef3c7', suffix: '单',
    },
    {
      title: '预警提醒', value: (data?.expiringAlerts ?? 0) + (data?.lowStockAlerts ?? 0),
      icon: <WarningOutlined style={{ color: '#ef4444', fontSize: 28 }} />,
      color: '#fee2e2', suffix: '条',
    },
  ]

  // 趋势图表配置（使用真实数据）
  const trendData = data?.weeklyTrend ?? []
  const chartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['入库数量', '出库数量'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: trendData.map(p => p.date.slice(5)), // 显示 MM-DD
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '入库数量', type: 'line', smooth: true,
        data: trendData.map(p => p.inbound),
        itemStyle: { color: '#6366f1' },
        areaStyle: { color: 'rgba(99,102,241,0.08)' },
      },
      {
        name: '出库数量', type: 'bar',
        data: trendData.map(p => p.outbound),
        itemStyle: { color: '#0ea5e9' },
      },
    ],
  }

  // 分类分布饼图（使用真实数据）
  const categoryData = data?.categoryDistribution ?? []
  const COLORS = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899']
  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}种 ({d}%)' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      type: 'pie', radius: ['40%', '68%'],
      data: categoryData.map((d, i) => ({
        value: d.value,
        name: d.name,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
      label: { show: false },
    }],
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>欢迎回来，{realName} 👋</Title>
        <Text type="secondary">这是今天的系统概览</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Statistic
                  title={<Text type="secondary">{card.title}</Text>}
                  value={card.value}
                  suffix={card.suffix}
                  valueStyle={{ fontSize: 28, fontWeight: 'bold' }}
                />
                <div style={{ width: 56, height: 56, borderRadius: 12, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="近7天耗材流动趋势" bordered={false} style={{ borderRadius: 12 }}>
            {trendData.length > 0
              ? <ReactECharts option={chartOption} style={{ height: 280 }} />
              : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无流水数据</div>
            }
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="耗材分类分布" bordered={false} style={{ borderRadius: 12 }}>
            {categoryData.length > 0
              ? <ReactECharts option={pieOption} style={{ height: 280 }} />
              : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无分类数据</div>
            }
          </Card>
        </Col>
      </Row>

      {/* 预警 + 近期活动 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><WarningOutlined style={{ color: '#ef4444' }} />预警提醒</Space>}
            bordered={false} style={{ borderRadius: 12 }}
          >
            <List size="small" dataSource={[
              { text: `${data?.expiringAlerts ?? 0} 批库存将在30天内过期`, type: 'error' },
              { text: `${data?.lowStockAlerts ?? 0} 种耗材低于最低库存`, type: 'warning' },
              { text: `${data?.pendingRequisitions ?? 0} 条申领单待审批`, type: 'processing' },
            ]} renderItem={(item) => (
              <List.Item>
                <Badge status={item.type as any} text={item.text} />
              </List.Item>
            )} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ClockCircleOutlined />最近操作</Space>}
            bordered={false} style={{ borderRadius: 12 }}
          >
            <List size="small" dataSource={data?.recentActivities ?? []} renderItem={(item) => (
              <List.Item extra={<Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>}>
                <Space direction="vertical" size={0}>
                  <Text>{item.description}</Text>
                  {item.operator && <Text type="secondary" style={{ fontSize: 12 }}>操作人：{item.operator}</Text>}
                </Space>
              </List.Item>
            )} locale={{ emptyText: '暂无近期活动' }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
