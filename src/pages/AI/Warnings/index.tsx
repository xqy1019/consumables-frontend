import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Card, Row, Col, Tag, Tabs, Badge, Alert, Statistic, Space,
  Select, Button, Tooltip, message,
} from 'antd'
import {
  WarningOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  SyncOutlined, CheckOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { aiApi } from '@/api/ai'
import type { WarningVO } from '@/types'

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  HIGH:   { label: '高危', color: 'error' },
  MEDIUM: { label: '中危', color: 'warning' },
  LOW:    { label: '低危', color: 'default' },
}

const TYPE_MAP: Record<string, string> = {
  EXPIRY:    '即将过期',
  LOW_STOCK: '库存不足',
  SHORTAGE:  '预测短缺',
}

// 自动刷新间隔（秒）
const REFRESH_INTERVAL = 300

export default function WarningsPage() {
  const [warnings, setWarnings]               = useState<WarningVO[]>([])
  const [shortageWarnings, setShortageWarnings] = useState<WarningVO[]>([])
  const [loading, setLoading]                 = useState(false)
  const [countdown, setCountdown]             = useState(REFRESH_INTERVAL)
  const [lastRefresh, setLastRefresh]         = useState<Date>(new Date())
  // 已处理的条目 key 集合（纯前端标记，刷新后重置）
  const [resolved, setResolved]               = useState<Set<string>>(new Set())
  // 筛选条件
  const [filterLevel, setFilterLevel]         = useState<string | undefined>()
  const [filterType, setFilterType]           = useState<string | undefined>()
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const fetchWarnings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [w, s] = await Promise.all([aiApi.getWarnings(), aiApi.getShortageWarnings()])
      setWarnings(w)
      setShortageWarnings(s)
      setLastRefresh(new Date())
      setCountdown(REFRESH_INTERVAL)
      setResolved(new Set())  // 刷新后重置处理标记
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // 首次加载
  useEffect(() => { fetchWarnings() }, [fetchWarnings])

  // 自动刷新倒计时
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          fetchWarnings(true)
          return REFRESH_INTERVAL
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [fetchWarnings])

  const handleResolve = (key: string) => {
    setResolved(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    message.success('已标记为处理中')
  }

  const makeKey = (r: WarningVO, i: number) => `${r.type}-${r.materialId}-${i}`

  // 过滤函数
  const applyFilter = (list: WarningVO[]) => {
    return list.filter(w => {
      if (filterLevel && w.severity !== filterLevel) return false
      if (filterType && w.type !== filterType) return false
      return true
    })
  }

  const highCount = warnings.filter(w => w.severity === 'HIGH').length
  const medCount  = warnings.filter(w => w.severity === 'MEDIUM').length

  // 将已处理条目排到最后
  const sortWithResolved = (list: WarningVO[], prefix: string) =>
    [...list].sort((a, b) => {
      const ka = makeKey(a, list.indexOf(a))
      const kb = makeKey(b, list.indexOf(b))
      return (resolved.has(`${prefix}${ka}`) ? 1 : 0) - (resolved.has(`${prefix}${kb}`) ? 1 : 0)
    })

  const warningColumns = (prefix: string): ColumnsType<WarningVO> => [
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
      render: v => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '阈值', dataIndex: 'threshold', width: 90,
      render: v => <span style={{ color: '#ff4d4f' }}>{v}</span>,
    },
    {
      title: '剩余天数', dataIndex: 'daysLeft', width: 90,
      render: v => v != null
        ? <Tag color={v <= 7 ? 'error' : v <= 30 ? 'warning' : 'default'}>{v}天</Tag>
        : '-',
    },
    {
      title: '操作', width: 90, fixed: 'right',
      render: (_, r, i) => {
        const key = `${prefix}${makeKey(r, i)}`
        return resolved.has(key)
          ? <Tag color="success" icon={<CheckOutlined />}>已处理</Tag>
          : (
            <Tooltip title="标记为已处理（刷新后重置）">
              <Button
                size="small"
                type="text"
                icon={<CheckOutlined />}
                style={{ color: '#10b981' }}
                onClick={() => handleResolve(key)}
              >
                处理
              </Button>
            </Tooltip>
          )
      },
    },
  ]

  /* ── 筛选栏 ── */
  const FilterBar = () => (
    <Row gutter={8} style={{ marginBottom: 12 }}>
      <Col>
        <Select
          placeholder="预警级别"
          value={filterLevel}
          onChange={setFilterLevel}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="HIGH">高危</Select.Option>
          <Select.Option value="MEDIUM">中危</Select.Option>
          <Select.Option value="LOW">低危</Select.Option>
        </Select>
      </Col>
      <Col>
        <Select
          placeholder="预警类型"
          value={filterType}
          onChange={setFilterType}
          allowClear
          style={{ width: 130 }}
        >
          <Select.Option value="EXPIRY">即将过期</Select.Option>
          <Select.Option value="LOW_STOCK">库存不足</Select.Option>
          <Select.Option value="SHORTAGE">预测短缺</Select.Option>
        </Select>
      </Col>
      {(filterLevel || filterType) && (
        <Col>
          <Button size="small" onClick={() => { setFilterLevel(undefined); setFilterType(undefined) }}>
            清除筛选
          </Button>
        </Col>
      )}
    </Row>
  )

  const tabItems = [
    {
      key: 'all',
      label: <Badge count={warnings.length} offset={[8, 0]}>全部预警</Badge>,
      children: (
        <>
          <FilterBar />
          <Table
            rowKey={(r, i) => `all-${makeKey(r, i!)}`}
            columns={warningColumns('all-')}
            dataSource={applyFilter(sortWithResolved(warnings, 'all-'))}
            loading={loading}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条`, showSizeChanger: false }}
            scroll={{ x: 900 }}
            rowClassName={(r, i) => resolved.has(`all-${makeKey(r, i)}`) ? 'opacity-50' : ''}
          />
        </>
      ),
    },
    {
      key: 'shortage',
      label: <Badge count={shortageWarnings.length} offset={[8, 0]} color="orange">短缺预警</Badge>,
      children: (
        <>
          <FilterBar />
          <Table
            rowKey={(r, i) => `shortage-${makeKey(r, i!)}`}
            columns={warningColumns('shortage-')}
            dataSource={applyFilter(sortWithResolved(shortageWarnings, 'shortage-'))}
            loading={loading}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条`, showSizeChanger: false }}
            scroll={{ x: 900 }}
            rowClassName={(r, i) => resolved.has(`shortage-${makeKey(r, i)}`) ? 'opacity-50' : ''}
          />
        </>
      ),
    },
  ]

  /* ── 倒计时格式化 ── */
  const countdownLabel = countdown >= 60
    ? `${Math.floor(countdown / 60)}分${countdown % 60}秒后刷新`
    : `${countdown}秒后自动刷新`

  return (
    <div>
      {highCount > 0 && (
        <Alert
          type="error"
          icon={<ExclamationCircleOutlined />}
          message={`当前有 ${highCount} 条高危预警需要立即处理`}
          showIcon banner
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* ── 统计卡片 ── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="全部预警"
              value={warnings.length}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="高危预警"
              value={highCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="中危预警"
              value={medCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="短缺预警"
              value={shortageWarnings.length}
              valueStyle={{ color: '#ff7a00' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 预警列表 ── */}
      <Card
        bordered={false}
        style={{ borderRadius: 12 }}
        extra={
          <Space size={12}>
            <span style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SyncOutlined spin={loading} style={{ fontSize: 11 }} />
              {countdownLabel}
            </span>
            <span style={{ fontSize: 12, color: '#bbb' }}>
              上次更新：{lastRefresh.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchWarnings()}
              loading={loading}
            >
              立即刷新
            </Button>
          </Space>
        }
      >
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
