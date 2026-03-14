import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Table, Tag, Space, Button, Modal, InputNumber, Select,
  message, Statistic, Alert, Badge, Typography, Popconfirm, Tabs,
  Empty, Progress, Descriptions,
} from 'antd'
import {
  DatabaseOutlined, WarningOutlined, CheckCircleOutlined,
  ArrowLeftOutlined, SyncOutlined, ShoppingCartOutlined,
  FileSearchOutlined, PlusOutlined, MedicineBoxOutlined, BarChartOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, LineChartOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  deptInventoryApi,
  type DeptInventoryVO,
  type DeptInventorySummaryVO,
  type DeptStocktakingVO,
  type DeptConsumptionRankVO,
  type ReplenishmentSuggestionVO,
  type StocktakingInput,
} from '@/api/deptInventory'
import { smallConsumablesApi, type ConsumptionForecastVO } from '@/api/smallConsumables'
import { departmentsApi } from '@/api/system'
import { formatDateTime } from '@/utils/format'
import type { Department } from '@/types'

const { Text } = Typography

export default function DeptInventoryPage() {
  const [summaries, setSummaries] = useState<DeptInventorySummaryVO[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)
  const [selectedDeptName, setSelectedDeptName] = useState('')
  const [inventory, setInventory] = useState<DeptInventoryVO[]>([])
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  // 盘点
  const [stocktaking, setStocktaking] = useState<DeptStocktakingVO | null>(null)
  const [stocktakingInputs, setStocktakingInputs] = useState<Map<number, number>>(new Map())
  const [stocktakingHistory, setStocktakingHistory] = useState<DeptStocktakingVO[]>([])

  // 自动补货
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestionVO[]>([])
  const [replenishLoading, setReplenishLoading] = useState(false)

  // 消耗排名
  const [ranking, setRanking] = useState<DeptConsumptionRankVO[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)

  // 消耗预测
  const [forecastDeptId, setForecastDeptId] = useState<number | null>(null)
  const [forecast, setForecast] = useState<ConsumptionForecastVO[]>([])
  const [forecastLoading, setForecastLoading] = useState(false)

  const loadSummaries = async () => {
    setLoading(true)
    try {
      setSummaries(await deptInventoryApi.getSummary())
    } finally {
      setLoading(false)
    }
  }

  const loadDeptDetail = async (deptId: number) => {
    setLoading(true)
    try {
      const [inv, history] = await Promise.all([
        deptInventoryApi.getDeptInventory(deptId),
        deptInventoryApi.getStocktakingHistory(deptId),
      ])
      setInventory(inv)
      setStocktakingHistory(history)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    setSuggestions(await deptInventoryApi.checkReplenishment())
  }

  const loadRanking = async () => {
    setRankingLoading(true)
    try {
      setRanking(await deptInventoryApi.getConsumptionRanking())
    } catch { /* ignore */ } finally {
      setRankingLoading(false)
    }
  }

  const loadForecast = async (deptId: number) => {
    setForecastLoading(true)
    try {
      setForecast(await smallConsumablesApi.getConsumptionForecast(deptId))
    } catch { /* ignore */ } finally {
      setForecastLoading(false)
    }
  }

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
    loadSummaries()
    loadSuggestions()
    loadRanking()
  }, [])

  useEffect(() => {
    if (selectedDeptId) loadDeptDetail(selectedDeptId)
  }, [selectedDeptId])

  const openDept = (deptId: number, deptName: string) => {
    setSelectedDeptId(deptId)
    setSelectedDeptName(deptName)
  }

  // ── 盘点操作 ──

  const handleCreateStocktaking = async () => {
    if (!selectedDeptId) return
    const st = await deptInventoryApi.createStocktaking(selectedDeptId)
    setStocktaking(st)
    setStocktakingInputs(new Map())
    message.success('盘点单已创建，请输入各耗材实际数量')
  }

  const handleCompleteStocktaking = async () => {
    if (!stocktaking) return
    const inputs: StocktakingInput[] = stocktaking.items.map(item => ({
      materialId: item.materialId,
      actualQuantity: stocktakingInputs.get(item.materialId) ?? item.systemQuantity,
    }))
    const result = await deptInventoryApi.completeStocktaking(stocktaking.id, inputs)
    setStocktaking(null)
    message.success(`盘点完成，本次消耗量：${result.totalConsumption}`)
    loadDeptDetail(selectedDeptId!)
    loadSummaries()
    loadSuggestions()
  }

  // ── 自动补货 ──

  const handleReplenish = async () => {
    setReplenishLoading(true)
    try {
      const result = await deptInventoryApi.executeReplenishment()
      message.success(result.message)
      loadSuggestions()
      loadSummaries()
    } finally {
      setReplenishLoading(false)
    }
  }

  const totalBelowMin = summaries.reduce((s, d) => s + d.belowMinCount, 0)

  // ── 库存表格列 ──
  const invColumns: ColumnsType<DeptInventoryVO> = [
    {
      title: '耗材', dataIndex: 'materialName', width: 160,
      render: (v, r) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.materialSpec}</Text>
        </div>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '当前库存', dataIndex: 'currentQuantity', width: 100,
      render: (v, r) => (
        <Text strong style={{ color: r.belowMin ? '#ff4d4f' : undefined }}>
          {v} {r.unit}
        </Text>
      ),
    },
    {
      title: '定数', dataIndex: 'parQuantity', width: 80,
      render: (v, r) => v != null ? `${v} ${r.unit}` : <Tag>未配</Tag>,
    },
    {
      title: '补货线', dataIndex: 'minQuantity', width: 80,
      render: (v, r) => v != null ? `${v} ${r.unit}` : '-',
    },
    {
      title: '库存状态', width: 120,
      render: (_, r) => {
        if (!r.minQuantity) return <Tag>未设补货线</Tag>
        if (r.belowMin) return <Tag color="red" icon={<WarningOutlined />}>低于补货线</Tag>
        const ratio = r.parQuantity ? (r.currentQuantity / r.parQuantity) * 100 : 100
        return (
          <Progress
            percent={Math.min(ratio, 100)}
            size="small"
            status={ratio < 30 ? 'exception' : ratio < 60 ? 'active' : 'success'}
            format={() => `${Math.round(ratio)}%`}
          />
        )
      },
    },
    {
      title: '上次盘点', dataIndex: 'lastStocktakingAt', width: 140,
      render: v => v ? formatDateTime(v) : <Text type="secondary">未盘点</Text>,
    },
  ]

  // ── 补货建议列 ──
  const suggestionColumns: ColumnsType<ReplenishmentSuggestionVO> = [
    { title: '科室', dataIndex: 'deptName', width: 100 },
    { title: '耗材', dataIndex: 'materialName', width: 140 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '当前库存', dataIndex: 'currentQuantity', width: 100,
      render: (v, r) => <Text type="danger">{v} {r.unit}</Text>,
    },
    {
      title: '补货线', dataIndex: 'minQuantity', width: 100,
      render: (v, r) => `${v} ${r.unit}`,
    },
    {
      title: '建议补货量', dataIndex: 'suggestedQuantity', width: 120,
      render: (v, r) => <Text strong style={{ color: '#1677ff' }}>+{v} {r.unit}</Text>,
    },
  ]

  // ── 科室详情 ──
  if (selectedDeptId) {
    return (
      <div style={{ padding: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedDeptId(null)}>
            返回科室列表
          </Button>
          <Text strong style={{ fontSize: 16 }}>{selectedDeptName} · 二级库存</Text>
          {inventory.filter(i => i.belowMin).length > 0 && (
            <Tag color="red" icon={<WarningOutlined />}>
              {inventory.filter(i => i.belowMin).length} 项低于补货线
            </Tag>
          )}
        </Space>

        <Tabs items={[
          {
            key: 'inventory',
            label: <Space><DatabaseOutlined />当前库存</Space>,
            children: (
              <Card
                extra={
                  <Button
                    type="primary"
                    icon={<FileSearchOutlined />}
                    onClick={handleCreateStocktaking}
                  >
                    发起盘点
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  columns={invColumns}
                  dataSource={inventory}
                  loading={loading}
                  size="small"
                  pagination={false}
                  rowClassName={r => r.belowMin ? 'ant-table-row-danger' : ''}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: <Space><FileSearchOutlined />盘点记录</Space>,
            children: (
              <div>
                {stocktakingHistory.length === 0 ? (
                  <Empty description="暂无盘点记录" />
                ) : stocktakingHistory.map(st => (
                  <Card
                    key={st.id}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={
                      <Space>
                        <Tag color={st.status === 'COMPLETED' ? 'green' : 'processing'}>
                          {st.status === 'COMPLETED' ? '已完成' : '进行中'}
                        </Tag>
                        <span>{formatDateTime(st.createdAt)}</span>
                      </Space>
                    }
                    extra={
                      st.totalConsumption > 0 && (
                        <Text type="danger">本次消耗：{st.totalConsumption}</Text>
                      )
                    }
                  >
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={st.items}
                      columns={[
                        { title: '耗材', dataIndex: 'materialName', width: 140 },
                        { title: '单位', dataIndex: 'unit', width: 60 },
                        { title: '账面数量', dataIndex: 'systemQuantity', width: 100 },
                        {
                          title: '实盘数量', dataIndex: 'actualQuantity', width: 100,
                          render: v => v != null ? v : '-',
                        },
                        {
                          title: '消耗量', dataIndex: 'consumption', width: 100,
                          render: v => {
                            if (v == null) return '-'
                            if (v > 0) return <Text type="warning">{v}</Text>
                            if (v < 0) return <Text type="success">+{Math.abs(v)}（盘盈）</Text>
                            return <Text>0</Text>
                          },
                        },
                      ]}
                    />
                  </Card>
                ))}
              </div>
            ),
          },
        ]} />

        {/* 盘点弹窗 */}
        <Modal
          title="科室盘点 — 输入实际数量"
          open={!!stocktaking}
          onOk={handleCompleteStocktaking}
          onCancel={() => setStocktaking(null)}
          width={600}
          okText="完成盘点（计算消耗）"
        >
          {stocktaking && (
            <>
              <Alert
                type="info"
                showIcon
                message="消耗倒推公式：消耗量 = 账面数量 - 实际盘点数量"
                description="请清点各耗材实际剩余数量并填入，系统将自动计算本期消耗。"
                style={{ marginBottom: 16 }}
              />
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={stocktaking.items}
                columns={[
                  { title: '耗材', dataIndex: 'materialName', width: 140 },
                  { title: '单位', dataIndex: 'unit', width: 60 },
                  {
                    title: '账面数量', dataIndex: 'systemQuantity', width: 100,
                    render: v => <Text strong>{v}</Text>,
                  },
                  {
                    title: '实际数量', width: 140,
                    render: (_, r) => (
                      <InputNumber
                        min={0}
                        defaultValue={r.systemQuantity}
                        style={{ width: '100%' }}
                        onChange={v => {
                          const m = new Map(stocktakingInputs)
                          m.set(r.materialId, v ?? r.systemQuantity)
                          setStocktakingInputs(m)
                        }}
                      />
                    ),
                  },
                  {
                    title: '预计消耗', width: 100,
                    render: (_, r) => {
                      const actual = stocktakingInputs.get(r.materialId) ?? r.systemQuantity
                      const diff = r.systemQuantity - actual
                      if (diff > 0) return <Text type="warning">{diff}</Text>
                      if (diff < 0) return <Text type="success">+{Math.abs(diff)}</Text>
                      return <Text>0</Text>
                    },
                  },
                ]}
              />
            </>
          )}
        </Modal>
      </div>
    )
  }

  // ── 科室列表 + 补货建议 ──
  return (
    <div style={{ padding: 24 }}>
      {/* 统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已配置科室" value={summaries.length} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="低于补货线"
              value={totalBelowMin}
              suffix="项"
              valueStyle={{ color: totalBelowMin > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={totalBelowMin > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待补货科室"
              value={new Set(suggestions.map(s => s.deptId)).size}
              suffix="个"
              valueStyle={{ color: suggestions.length > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待补货耗材" value={suggestions.length} suffix="项" />
          </Card>
        </Col>
      </Row>

      <Tabs items={[
        {
          key: 'depts',
          label: <Space><DatabaseOutlined />科室二级库</Space>,
          children: (
            <Row gutter={[16, 16]}>
              {summaries.map(s => (
                <Col key={s.deptId} xs={24} sm={12} md={8} lg={6}>
                  <Badge.Ribbon
                    text={s.belowMinCount > 0 ? `${s.belowMinCount}项待补` : '充足'}
                    color={s.belowMinCount > 0 ? 'red' : 'green'}
                  >
                    <Card
                      hoverable
                      style={{
                        borderColor: s.belowMinCount > 0 ? '#ff4d4f' : '#d9d9d9',
                        borderWidth: s.belowMinCount > 0 ? 2 : 1,
                      }}
                      onClick={() => openDept(s.deptId, s.deptName)}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <MedicineBoxOutlined style={{ color: '#1677ff' }} />
                          <Text strong>{s.deptName}</Text>
                        </Space>
                        <Text type="secondary">{s.totalItems} 种耗材在库</Text>
                        <Button
                          type="link" size="small" style={{ padding: 0 }}
                          onClick={e => { e.stopPropagation(); openDept(s.deptId, s.deptName) }}
                        >
                          查看库存 / 盘点 →
                        </Button>
                      </Space>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              ))}
              {summaries.length === 0 && !loading && (
                <Col span={24}>
                  <Empty description="暂无科室库存数据，请先配置科室定数并完成申领发放" />
                </Col>
              )}
            </Row>
          ),
        },
        {
          key: 'replenish',
          label: (
            <Space>
              <ShoppingCartOutlined />
              自动补货
              {suggestions.length > 0 && <Badge count={suggestions.length} size="small" />}
            </Space>
          ),
          children: (
            <Card
              title="低库存补货建议"
              extra={
                <Popconfirm
                  title="确认执行自动补货？"
                  description="将为每个科室生成一张申领单草稿"
                  onConfirm={handleReplenish}
                >
                  <Button
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    disabled={suggestions.length === 0}
                    loading={replenishLoading}
                  >
                    一键生成补货申领单
                  </Button>
                </Popconfirm>
              }
            >
              {suggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#52c41a' }}>
                  <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                  <div>所有科室库存充足，无需补货</div>
                </div>
              ) : (
                <>
                  <Alert
                    type="warning"
                    showIcon
                    message={`共 ${suggestions.length} 项耗材低于补货线，涉及 ${new Set(suggestions.map(s => s.deptId)).size} 个科室`}
                    style={{ marginBottom: 12 }}
                  />
                  <Table
                    rowKey={r => `${r.deptId}_${r.materialId}`}
                    columns={suggestionColumns}
                    dataSource={suggestions}
                    size="small"
                    pagination={false}
                  />
                </>
              )}
            </Card>
          ),
        },
        {
          key: 'forecast',
          label: <Space><LineChartOutlined />消耗预测</Space>,
          children: (
            <Card title="科室消耗预测（加权移动平均法）">
              <Space style={{ marginBottom: 16 }}>
                <span>选择科室：</span>
                <Select
                  placeholder="请选择科室"
                  style={{ width: 200 }}
                  value={forecastDeptId}
                  onChange={(v) => { setForecastDeptId(v); if (v) loadForecast(v) }}
                  options={departments.map(d => ({ label: d.deptName, value: d.id }))}
                  allowClear
                  onClear={() => { setForecastDeptId(null); setForecast([]) }}
                />
              </Space>
              {!forecastDeptId ? (
                <Empty description="请选择科室查看消耗预测" />
              ) : (
                <Table
                  rowKey="materialId"
                  dataSource={forecast}
                  loading={forecastLoading}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '耗材名称', dataIndex: 'materialName', width: 160 },
                    { title: '单位', dataIndex: 'unit', width: 60 },
                    {
                      title: '近1月用量', width: 100,
                      render: (_: unknown, r: ConsumptionForecastVO) => r.last3Months?.[0] ?? '-',
                    },
                    {
                      title: '近2月用量', width: 100,
                      render: (_: unknown, r: ConsumptionForecastVO) => r.last3Months?.[1] ?? '-',
                    },
                    {
                      title: '近3月用量', width: 100,
                      render: (_: unknown, r: ConsumptionForecastVO) => r.last3Months?.[2] ?? '-',
                    },
                    {
                      title: '预测下月用量', dataIndex: 'predictedQty', width: 130,
                      render: (v: number) => (
                        <span style={{ fontWeight: 700, color: '#1677ff' }}>{v}</span>
                      ),
                    },
                    {
                      title: '趋势', dataIndex: 'trend', width: 80,
                      render: (v: string) => {
                        if (v === 'UP') return <Tag icon={<ArrowUpOutlined />} color="red">上升</Tag>
                        if (v === 'DOWN') return <Tag icon={<ArrowDownOutlined />} color="green">下降</Tag>
                        return <Tag icon={<MinusOutlined />} color="default">稳定</Tag>
                      },
                    },
                    {
                      title: '置信度', dataIndex: 'confidence', width: 80,
                      render: (v: string) => {
                        if (v === 'HIGH') return <Tag color="green">高</Tag>
                        if (v === 'MEDIUM') return <Tag color="orange">中</Tag>
                        return <Tag color="default">低</Tag>
                      },
                    },
                  ]}
                />
              )}
            </Card>
          ),
        },
        {
          key: 'ranking',
          label: <Space><BarChartOutlined />消耗排名</Space>,
          children: (
            <Card title="科室消耗排名对比" loading={rankingLoading}>
              {ranking.length === 0 ? (
                <Empty description="暂无盘点消耗数据，完成科室盘点后可查看排名" />
              ) : (
                <Table
                  rowKey="deptId"
                  dataSource={ranking}
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '排名', width: 60,
                      render: (_: unknown, __: unknown, i: number) => (
                        <span style={{
                          fontWeight: 700,
                          color: i === 0 ? '#ff4d4f' : i === 1 ? '#fa8c16' : i === 2 ? '#faad14' : undefined,
                        }}>
                          {i + 1}
                        </span>
                      ),
                    },
                    { title: '科室', dataIndex: 'deptName', width: 120 },
                    {
                      title: '总消耗量', dataIndex: 'totalConsumption', width: 100,
                      sorter: (a: DeptConsumptionRankVO, b: DeptConsumptionRankVO) => a.totalConsumption - b.totalConsumption,
                      render: (v: number) => <span style={{ fontWeight: 600 }}>{v.toFixed(0)}</span>,
                    },
                    {
                      title: '盘点次数', dataIndex: 'totalStocktakings', width: 80,
                    },
                    {
                      title: '次均消耗', dataIndex: 'avgConsumption', width: 100,
                      render: (v: number) => v.toFixed(1),
                    },
                    {
                      title: '最近一次消耗', dataIndex: 'lastConsumption', width: 120,
                      render: (v: number) => v.toFixed(0),
                    },
                    {
                      title: '消耗占比', width: 150,
                      render: (_: unknown, r: DeptConsumptionRankVO) => {
                        const total = ranking.reduce((s, x) => s + x.totalConsumption, 0)
                        const pct = total > 0 ? (r.totalConsumption / total) * 100 : 0
                        return <Progress percent={Math.round(pct)} size="small" />
                      },
                    },
                  ]}
                />
              )}
            </Card>
          ),
        },
      ]} />
    </div>
  )
}
