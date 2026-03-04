import React, { useState, useEffect } from 'react'
import {
  Table, Button, Card, Row, Col, Typography, Tag, Space, Statistic,
  Progress, message, Select,
} from 'antd'
import { RobotOutlined, ThunderboltOutlined, SafetyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { aiApi } from '@/api/ai'
import type { PredictionVO, SafetyStockVO } from '@/types'

const { Title } = Typography

export default function PredictionPage() {
  const [predictions, setPredictions] = useState<PredictionVO[]>([])
  const [safetyStock, setSafetyStock] = useState<SafetyStockVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 20 })
  const [month, setMonth] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'prediction' | 'safety'>('prediction')

  const fetchPredictions = async () => {
    setLoading(true)
    try {
      const res = await aiApi.getPredictions({ month, ...page })
      setPredictions(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  const fetchSafetyStock = async () => {
    const res = await aiApi.getSafetyStock()
    setSafetyStock(res)
  }

  useEffect(() => { fetchPredictions() }, [page, month])
  useEffect(() => { fetchSafetyStock() }, [])

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      const msg = await aiApi.triggerPredict()
      message.success(typeof msg === 'string' ? msg : 'AI 预测已完成')
      fetchPredictions()
    } finally { setTriggering(false) }
  }

  const predColumns: ColumnsType<PredictionVO> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '耗材编码', dataIndex: 'materialCode', width: 120 },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '预测月份', dataIndex: 'predictionMonth', width: 100 },
    { title: '预测用量', dataIndex: 'predictedQuantity', width: 100,
      render: v => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span>,
    },
    {
      title: '置信度', dataIndex: 'confidence', width: 120,
      render: v => <Progress percent={v} size="small" status={v >= 85 ? 'success' : 'normal'} />,
    },
    { title: '实际用量', dataIndex: 'actualQuantity', width: 100,
      render: v => v != null ? v : <Tag>待确认</Tag>,
    },
    {
      title: '误差', width: 100,
      render: (_, r) => {
        if (r.actualQuantity == null || r.predictedQuantity === 0) return '-'
        const err = Math.abs(r.predictedQuantity - r.actualQuantity) / r.predictedQuantity * 100
        return <Tag color={err < 10 ? 'success' : err < 20 ? 'warning' : 'error'}>{err.toFixed(1)}%</Tag>
      },
    },
    { title: '生成时间', dataIndex: 'createTime', width: 160 },
  ]

  const safetyColumns: ColumnsType<SafetyStockVO> = [
    { title: '耗材编码', dataIndex: 'materialCode', width: 130 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '当前库存', dataIndex: 'currentStock', width: 100 },
    { title: '最低库存', dataIndex: 'minStock', width: 100 },
    { title: '最高库存', dataIndex: 'maxStock', width: 100 },
    { title: '缺口数量', dataIndex: 'shortage', width: 100,
      render: v => <span style={{ fontWeight: 600, color: v > 0 ? '#ff4d4f' : '#52c41a' }}>{v}</span>,
    },
    { title: '建议采购量', dataIndex: 'suggestedPurchase', width: 110,
      render: v => v > 0 ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span> : '-',
    },
    {
      title: '状态', width: 100,
      render: (_, r) => {
        if (r.shortage <= 0) return <Tag color="success">正常</Tag>
        if (r.shortage < r.minStock * 0.5) return <Tag color="warning">偏低</Tag>
        return <Tag color="error">严重不足</Tag>
      },
    },
  ]

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>AI 智能预测</Title></Col>
          <Col>
            <Button
              type="primary" icon={<ThunderboltOutlined />}
              loading={triggering} onClick={handleTrigger}
            >
              触发 AI 预测
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="预测记录总数"
              value={total}
              prefix={<RobotOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="安全库存预警数"
              value={safetyStock.filter(s => s.shortage > 0).length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="平均预测置信度"
              value={predictions.length > 0
                ? (predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length).toFixed(1)
                : '--'
              }
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false} style={{ borderRadius: 12 }}
        tabList={[
          { key: 'prediction', tab: <Space><RobotOutlined />需求预测</Space> },
          { key: 'safety', tab: <Space><SafetyOutlined />安全库存分析</Space> },
        ]}
        activeTabKey={activeTab}
        onTabChange={k => setActiveTab(k as any)}
      >
        {activeTab === 'prediction' && (
          <>
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col>
                <Select placeholder="选择月份" value={month} onChange={setMonth} allowClear style={{ width: 140 }}>
                  {months.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                </Select>
              </Col>
            </Row>
            <Table
              rowKey="id" columns={predColumns} dataSource={predictions} loading={loading} scroll={{ x: 900 }}
              pagination={{
                total, current: page.page, pageSize: page.size,
                showSizeChanger: true, showTotal: t => `共 ${t} 条`,
                onChange: (p, s) => setPage({ page: p, size: s }),
              }}
            />
          </>
        )}
        {activeTab === 'safety' && (
          <Table
            rowKey="materialId" columns={safetyColumns} dataSource={safetyStock}
            pagination={false} scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  )
}
