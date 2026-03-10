import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table, Card, Row, Col, Tag, Tabs, Badge, Alert, Statistic, Space,
  Select, Button, Tooltip, message, Spin,
} from 'antd'
import {
  WarningOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  SyncOutlined, CheckOutlined, ReloadOutlined, MedicineBoxOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { aiApi } from '@/api/ai'
import type { WarningVO, ExpiryDisposalVO, AnomalyVO } from '@/types'
import { formatDate } from '@/utils/format'

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

// 临期处置建议配置
const ADVICE_CONFIG: Record<string, { label: string; color: string }> = {
  ACCELERATE: { label: '加速使用', color: 'processing' },
  TRANSFER:   { label: '跨科调拨', color: 'purple' },
  RETURN:     { label: '联系退货', color: 'warning' },
  DAMAGE:     { label: '办理报损', color: 'error' },
}

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
  // 临期处置
  const [expiryDisposal, setExpiryDisposal]   = useState<ExpiryDisposalVO[]>([])
  const [disposalLoading, setDisposalLoading] = useState(false)
  const [disposalLoaded, setDisposalLoaded]   = useState(false)
  // 消耗异常
  const [anomalies, setAnomalies]             = useState<AnomalyVO[]>([])
  const [anomalyLoading, setAnomalyLoading]   = useState(false)
  const [anomalyLoaded, setAnomalyLoaded]     = useState(false)
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

  const fetchDisposal = useCallback(async () => {
    if (disposalLoaded) return
    setDisposalLoading(true)
    try {
      const data = await aiApi.getExpiryDisposal()
      setExpiryDisposal(data)
      setDisposalLoaded(true)
    } catch { message.warning('临期处置数据加载失败') }
    finally { setDisposalLoading(false) }
  }, [disposalLoaded])

  const fetchAnomalies = useCallback(async () => {
    if (anomalyLoaded) return
    setAnomalyLoading(true)
    try {
      const data = await aiApi.getAnomalyDetection()
      setAnomalies(data)
      setAnomalyLoaded(true)
    } catch { message.warning('消耗异常数据加载失败') }
    finally { setAnomalyLoading(false) }
  }, [anomalyLoaded])

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

  const disposalColumns: ColumnsType<ExpiryDisposalVO> = [
    {
      title: '耗材名称', dataIndex: 'materialName', width: 150, ellipsis: true,
    },
    { title: '耗材编码', dataIndex: 'materialCode', width: 120 },
    { title: '批次号', dataIndex: 'batchNumber', width: 120 },
    {
      title: '库存量', dataIndex: 'quantity', width: 80,
      render: v => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '到期时间', dataIndex: 'expiryDate', width: 110,
      render: (v) => formatDate(v),
    },
    {
      title: '剩余天数', dataIndex: 'daysLeft', width: 90,
      render: v => (
        <Tag color={v <= 7 ? 'error' : v <= 14 ? 'warning' : 'default'}>{v}天</Tag>
      ),
    },
    {
      title: '风险数量', dataIndex: 'riskQuantity', width: 90,
      render: v => <span style={{ color: '#ef4444', fontWeight: 600 }}>{v}</span>,
    },
    {
      title: '处置建议', dataIndex: 'advice', width: 100,
      render: v => {
        const cfg = ADVICE_CONFIG[v] ?? { label: v, color: 'default' }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: 'AI 分析', dataIndex: 'reason', ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v}</span>,
    },
  ]

  const anomalyColumns: ColumnsType<AnomalyVO> = [
    {
      title: '严重程度', dataIndex: 'severity', width: 90,
      render: v => <Tag color={v === 'HIGH' ? 'error' : 'warning'}>{v === 'HIGH' ? '高危' : '中危'}</Tag>,
    },
    { title: '科室', dataIndex: 'deptName', width: 110 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150, ellipsis: true },
    { title: '异常日期', dataIndex: 'anomalyDate', width: 110, render: (v) => formatDate(v) },
    {
      title: '当日消耗', dataIndex: 'anomalyQuantity', width: 90,
      render: v => <span style={{ fontWeight: 600, color: '#ef4444' }}>{v}</span>,
    },
    {
      title: '日均消耗', dataIndex: 'avgDailyConsumption', width: 90,
      render: v => <span style={{ color: '#999' }}>{v}</span>,
    },
    {
      title: '异常倍数', dataIndex: 'anomalyRatio', width: 90,
      render: v => <Tag color="orange">×{v}</Tag>,
    },
    {
      title: 'AI 分析', dataIndex: 'reason', ellipsis: true,
      render: v => <span style={{ fontSize: 12 }}>{v}</span>,
    },
  ]

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
    {
      key: 'expiry',
      label: (
        <Badge count={expiryDisposal.length} offset={[8, 0]} color="purple">临期处置</Badge>
      ),
      children: disposalLoading
        ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="AI 分析中..." /></div>
        : (
          <Table
            rowKey="inventoryId"
            columns={disposalColumns}
            dataSource={expiryDisposal}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条`, showSizeChanger: false }}
            scroll={{ x: 960 }}
          />
        ),
    },
    {
      key: 'anomaly',
      label: (
        <Badge count={anomalies.length} offset={[8, 0]} color="cyan">消耗异常</Badge>
      ),
      children: anomalyLoading
        ? <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="AI 分析中..." /></div>
        : (
          <Table
            rowKey={(r, i) => `anomaly-${r.materialId}-${r.deptId}-${i}`}
            columns={anomalyColumns}
            dataSource={anomalies}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条`, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
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
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="全部预警"
              value={warnings.length}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="高危预警"
              value={highCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="中危预警"
              value={medCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="短缺预警"
              value={shortageWarnings.length}
              valueStyle={{ color: '#ff7a00' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="临期风险"
              value={expiryDisposal.length}
              valueStyle={{ color: '#9333ea' }}
              prefix={<MedicineBoxOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="消耗异常"
              value={anomalies.length}
              valueStyle={{ color: '#0ea5e9' }}
              prefix={<ThunderboltOutlined />}
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
        <Tabs
          items={tabItems}
          onChange={key => {
            if (key === 'expiry') fetchDisposal()
            if (key === 'anomaly') fetchAnomalies()
          }}
        />
      </Card>
    </div>
  )
}
