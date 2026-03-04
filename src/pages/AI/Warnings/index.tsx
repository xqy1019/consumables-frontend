import React, { useState, useEffect } from 'react'
import {
  Table, Card, Row, Col, Tag, Tabs, Badge, Alert, Statistic, Space,
} from 'antd'
import {
  WarningOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { aiApi } from '@/api/ai'
import type { WarningVO } from '@/types'


const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  HIGH: { label: '高危', color: 'error' },
  MEDIUM: { label: '中危', color: 'warning' },
  LOW: { label: '低危', color: 'default' },
}

const TYPE_MAP: Record<string, string> = {
  EXPIRY: '即将过期',
  LOW_STOCK: '库存不足',
  SHORTAGE: '预测短缺',
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<WarningVO[]>([])
  const [shortageWarnings, setShortageWarnings] = useState<WarningVO[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWarnings = async () => {
    setLoading(true)
    try {
      const [w, s] = await Promise.all([aiApi.getWarnings(), aiApi.getShortageWarnings()])
      setWarnings(w)
      setShortageWarnings(s)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchWarnings() }, [])

  const highCount = warnings.filter(w => w.severity === 'HIGH').length
  const medCount = warnings.filter(w => w.severity === 'MEDIUM').length

  const warningColumns: ColumnsType<WarningVO> = [
    {
      title: '预警级别', dataIndex: 'severity', width: 90,
      render: v => <Tag color={LEVEL_MAP[v]?.color}>{LEVEL_MAP[v]?.label || v}</Tag>,
    },
    {
      title: '预警类型', dataIndex: 'type', width: 100,
      render: v => <Tag>{TYPE_MAP[v] || v}</Tag>,
    },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '耗材编码', dataIndex: 'materialCode', width: 130 },
    { title: '预警信息', dataIndex: 'message', ellipsis: true },
    {
      title: '当前值', dataIndex: 'currentValue', width: 90,
      render: v => <span className="font-semibold">{v}</span>,
    },
    {
      title: '阈值', dataIndex: 'threshold', width: 90,
      render: v => <span className="text-[#ff4d4f]">{v}</span>,
    },
    {
      title: '剩余天数', dataIndex: 'daysLeft', width: 90,
      render: v => v != null ? <Tag color={v <= 7 ? 'error' : v <= 30 ? 'warning' : 'default'}>{v}天</Tag> : '-',
    },
  ]

  const tabItems = [
    {
      key: 'all',
      label: <Badge count={warnings.length} offset={[8, 0]}>全部预警</Badge>,
      children: (
        <Table rowKey={(r, i) => `${r.type}-${r.materialId}-${i}`} columns={warningColumns}
          dataSource={warnings} loading={loading} pagination={false} scroll={{ x: 800 }} />
      ),
    },
    {
      key: 'shortage',
      label: <Badge count={shortageWarnings.length} offset={[8, 0]} color="orange">短缺预警</Badge>,
      children: (
        <Table rowKey={(r, i) => `shortage-${r.materialId}-${i}`} columns={warningColumns}
          dataSource={shortageWarnings} loading={loading} pagination={false} scroll={{ x: 800 }} />
      ),
    },
  ]

  return (
    <div>

      {highCount > 0 && (
        <Alert
          type="error"
          icon={<ExclamationCircleOutlined />}
          message={`当前有 ${highCount} 条高危预警需要立即处理`}
          showIcon banner className="mb-4 rounded-lg"
        />
      )}

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card bordered={false} className="rounded-xl">
            <Statistic
              title="全部预警"
              value={warnings.length}
              prefix={<WarningOutlined className="text-[#faad14]" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="rounded-xl">
            <Statistic
              title="高危预警"
              value={highCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="rounded-xl">
            <Statistic
              title="中危预警"
              value={medCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="rounded-xl">
            <Statistic
              title="短缺预警"
              value={shortageWarnings.length}
              valueStyle={{ color: '#ff7a00' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="rounded-xl">
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
