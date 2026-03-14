import React, { useState, useEffect } from 'react'
import {
  Card, Button, Modal, Form, InputNumber, Select, Row, Col,
  Tag, Progress, Space, message, Popconfirm, Statistic, Badge,
  Table, Drawer, Typography, Empty, Alert, Spin,
} from 'antd'
import {
  PlusOutlined, WarningOutlined, DeleteOutlined, DownloadOutlined,
  ArrowLeftOutlined, FireOutlined, CheckCircleOutlined,
  MedicineBoxOutlined, BulbOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { smallConsumablesApi, exportParLevels, type ParLevelVO, type SaveParLevelRequest, type ParSuggestionVO } from '@/api/smallConsumables'
import { departmentsApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import type { Department, Material } from '@/types'

const { Text, Title } = Typography

// 按科室聚合数据
interface DeptSummary {
  deptId: number
  deptName: string
  items: ParLevelVO[]
  overLimitCount: number
  warningCount: number  // 使用率 ≥80%
  totalItems: number
}

function buildSummaries(data: ParLevelVO[]): DeptSummary[] {
  const map = new Map<number, DeptSummary>()
  data.forEach(item => {
    if (!map.has(item.deptId)) {
      map.set(item.deptId, {
        deptId: item.deptId,
        deptName: item.deptName,
        items: [],
        overLimitCount: 0,
        warningCount: 0,
        totalItems: 0,
      })
    }
    const s = map.get(item.deptId)!
    s.items.push(item)
    s.totalItems++
    if (item.overLimit) s.overLimitCount++
    else if (item.monthUsageRate != null && item.monthUsageRate >= 80) s.warningCount++
  })
  return Array.from(map.values())
}

export default function ParLevelPage() {
  const [data, setData] = useState<ParLevelVO[]>([])
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedDept, setSelectedDept] = useState<DeptSummary | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [suggestionDrawer, setSuggestionDrawer] = useState(false)
  const [suggestions, setSuggestions] = useState<ParSuggestionVO[]>([])
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const res = await smallConsumablesApi.getParLevels()
      setData(res)
      // 刷新时同步更新已选中的科室
      if (selectedDept) {
        const updated = buildSummaries(res).find(s => s.deptId === selectedDept.deptId)
        setSelectedDept(updated ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
    materialsApi.getActive().then(setMaterials).catch(() => {})
  }, [])

  useEffect(() => { load() }, [])

  const loadSuggestions = async () => {
    setSuggestionLoading(true)
    try {
      const res = await smallConsumablesApi.getParSuggestions()
      setSuggestions(res)
      setSuggestionDrawer(true)
    } catch { /* ignore */ } finally {
      setSuggestionLoading(false)
    }
  }

  const handleApplySuggestion = async (s: ParSuggestionVO) => {
    try {
      await smallConsumablesApi.applyParSuggestion({
        deptId: s.deptId, materialId: s.materialId,
        suggestedPar: s.suggestedPar, suggestedMin: s.suggestedMin,
      })
      message.success(`已更新 ${s.deptName}-${s.materialName} 的定数配置`)
      setSuggestions(prev => prev.filter(x => !(x.deptId === s.deptId && x.materialId === s.materialId)))
      load()
    } catch { /* ignore */ }
  }

  const summaries = buildSummaries(data)
  const totalOver = data.filter(d => d.overLimit).length
  const totalWarning = data.filter(d => !d.overLimit && (d.monthUsageRate ?? 0) >= 80).length

  const handleSave = async () => {
    const values = await form.validateFields()
    if (selectedDept) values.deptId = selectedDept.deptId
    await smallConsumablesApi.saveParLevel(values as SaveParLevelRequest)
    message.success('保存成功')
    setModalOpen(false)
    form.resetFields()
    await load()
  }

  const handleDelete = async (id: number) => {
    await smallConsumablesApi.deleteParLevel(id)
    message.success('删除成功')
    await load()
  }

  // 科室详情内的耗材表格列
  const itemColumns: ColumnsType<ParLevelVO> = [
    {
      title: '耗材名称', dataIndex: 'materialName', width: 160,
      render: (v, r) => (
        <div>
          <div>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.materialSpec}</Text>
        </div>
      ),
    },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '定数', dataIndex: 'parQuantity', width: 80,
      render: (v, r) => `${v} ${r.unit}`,
    },
    {
      title: '补货触发', dataIndex: 'minQuantity', width: 90,
      render: (v, r) => (
        <Text type="secondary">&lt; {v} {r.unit}</Text>
      ),
    },
    {
      title: '月度限额', dataIndex: 'monthlyLimit', width: 90,
      render: (v, r) => v ? `${v} ${r.unit}` : <Tag>不限</Tag>,
    },
    {
      title: '本月用量',
      width: 200,
      render: (_, r) => {
        if (r.monthlyLimit == null) {
          return <Text>{r.monthUsed} {r.unit}</Text>
        }
        const pct = Math.min(r.monthUsageRate ?? 0, 100)
        const color = r.overLimit ? '#ff4d4f' : pct >= 80 ? '#faad14' : '#52c41a'
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space>
              <Text style={{ color, fontWeight: 500 }}>
                {r.monthUsed} / {r.monthlyLimit} {r.unit}
              </Text>
              {r.overLimit && <Tag color="red" icon={<WarningOutlined />}>超限</Tag>}
            </Space>
            <Progress
              percent={pct}
              status={r.overLimit ? 'exception' : pct >= 80 ? 'active' : 'success'}
              size="small"
              showInfo={false}
            />
          </Space>
        )
      },
    },
    {
      title: '操作', width: 70,
      render: (_, r) => (
        <Popconfirm title="确认删除该定数配置？" onConfirm={() => handleDelete(r.id)}>
          <Button type="link" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  // ── 科室卡片状态颜色 ──
  const getCardStatus = (s: DeptSummary) => {
    if (s.overLimitCount > 0) return { border: '#ff4d4f', badge: 'error' as const, icon: <FireOutlined style={{ color: '#ff4d4f' }} /> }
    if (s.warningCount > 0) return { border: '#faad14', badge: 'warning' as const, icon: <WarningOutlined style={{ color: '#faad14' }} /> }
    return { border: '#d9d9d9', badge: 'success' as const, icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> }
  }

  // ── 详情视图 ──
  if (selectedDept) {
    return (
      <div style={{ padding: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedDept(null)}>
            返回科室列表
          </Button>
          <Title level={5} style={{ margin: 0 }}>{selectedDept.deptName} · 定数配置</Title>
          {selectedDept.overLimitCount > 0 && (
            <Tag color="red" icon={<FireOutlined />}>{selectedDept.overLimitCount} 项超限额</Tag>
          )}
        </Space>

        {selectedDept.overLimitCount > 0 && (
          <Alert
            type="error"
            showIcon
            message={`本月有 ${selectedDept.overLimitCount} 项耗材超出月度限额，请核查原因`}
            style={{ marginBottom: 16 }}
          />
        )}

        <Card
          extra={
            <Space>
              <Button icon={<DownloadOutlined />} onClick={async () => { await exportParLevels(selectedDept?.deptId) }}>
                导出
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  form.setFieldValue('deptId', selectedDept.deptId)
                  setModalOpen(true)
                }}
              >
                新增耗材定数
              </Button>
            </Space>
          }
        >
          <Table
            rowKey="id"
            columns={itemColumns}
            dataSource={selectedDept.items}
            loading={loading}
            size="small"
            pagination={false}
            rowClassName={r => r.overLimit ? 'ant-table-row-danger' : ''}
          />
          {selectedDept.items.length === 0 && (
            <Empty description="该科室暂无定数配置" style={{ padding: 40 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
                立即添加
              </Button>
            </Empty>
          )}
        </Card>

        {/* 新增弹窗 */}
        <Modal
          title={`新增定数配置 · ${selectedDept.deptName}`}
          open={modalOpen}
          onOk={handleSave}
          onCancel={() => { setModalOpen(false); form.resetFields() }}
          width={480}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="deptId" hidden><InputNumber /></Form.Item>
            <Form.Item name="materialId" label="耗材" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="选择耗材"
                options={materials.map(m => ({
                  value: m.id,
                  label: `${m.materialName}${m.specification ? ` (${m.specification})` : ''}`,
                }))}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="parQuantity" label="定数（标准库存量）" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="科室应保持的库存量" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="minQuantity" label="补货触发线" rules={[{ required: true }]}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="低于此值预警" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="monthlyLimit" label="月度限额（不填则不限）">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    )
  }

  // ── 科室卡片列表视图 ──
  return (
    <div style={{ padding: 24 }}>
      {/* 汇总统计 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已配置科室" value={summaries.length} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="耗材配置总数"
              value={data.length}
              suffix="项"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="本月超限额"
              value={totalOver}
              suffix="项"
              valueStyle={{ color: totalOver > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={totalOver > 0 ? <FireOutlined /> : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="即将达限（≥80%）"
              value={totalWarning}
              suffix="项"
              valueStyle={{ color: totalWarning > 0 ? '#faad14' : '#52c41a' }}
              prefix={totalWarning > 0 ? <WarningOutlined /> : undefined}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          ghost
          icon={<BulbOutlined />}
          loading={suggestionLoading}
          onClick={loadSuggestions}
        >
          智能建议
        </Button>
      </div>

      {/* 科室卡片网格 */}
      <Row gutter={[16, 16]}>
        {summaries.map(s => {
          const { border, badge, icon } = getCardStatus(s)
          return (
            <Col key={s.deptId} xs={24} sm={12} md={8} lg={6}>
              <Badge.Ribbon
                text={s.overLimitCount > 0 ? `${s.overLimitCount}项超限` : s.warningCount > 0 ? `${s.warningCount}项预警` : '正常'}
                color={s.overLimitCount > 0 ? 'red' : s.warningCount > 0 ? 'orange' : 'green'}
              >
                <Card
                  hoverable
                  style={{
                    borderColor: border,
                    borderWidth: s.overLimitCount > 0 || s.warningCount > 0 ? 2 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedDept(s)}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Space>
                      <MedicineBoxOutlined style={{ fontSize: 16, color: '#1677ff' }} />
                      <Text strong style={{ fontSize: 15 }}>{s.deptName}</Text>
                    </Space>

                    <Text type="secondary" style={{ fontSize: 13 }}>
                      已配置 {s.totalItems} 种耗材定数
                    </Text>

                    {/* 各耗材本月使用率迷你预览 */}
                    <div style={{ marginTop: 4 }}>
                      {s.items.slice(0, 3).map(item => (
                        item.monthlyLimit != null ? (
                          <div key={item.id} style={{ marginBottom: 4 }}>
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 11, color: '#666' }}>{item.materialName}</Text>
                              <Text style={{ fontSize: 11, color: item.overLimit ? '#ff4d4f' : '#666' }}>
                                {item.monthUsed}/{item.monthlyLimit}
                              </Text>
                            </Space>
                            <Progress
                              percent={Math.min(item.monthUsageRate ?? 0, 100)}
                              size="small"
                              showInfo={false}
                              status={item.overLimit ? 'exception' : (item.monthUsageRate ?? 0) >= 80 ? 'active' : 'normal'}
                              style={{ margin: 0 }}
                            />
                          </div>
                        ) : null
                      ))}
                      {s.items.filter(i => i.monthlyLimit != null).length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无月度限额配置</Text>
                      )}
                    </div>

                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, marginTop: 4 }}
                      onClick={e => { e.stopPropagation(); setSelectedDept(s) }}
                    >
                      查看 / 编辑 →
                    </Button>
                  </Space>
                </Card>
              </Badge.Ribbon>
            </Col>
          )
        })}

        {/* 新增科室配置卡片 */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card
            hoverable
            style={{ borderStyle: 'dashed', height: '100%', minHeight: 140 }}
            bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 140 }}
            onClick={() => setModalOpen(true)}
          >
            <Space direction="vertical" align="center">
              <PlusOutlined style={{ fontSize: 24, color: '#1677ff' }} />
              <Text type="secondary">为新科室添加定数配置</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {summaries.length === 0 && !loading && (
        <Empty description="暂无定数配置，点击右上角新增" style={{ marginTop: 60 }} />
      )}

      {/* 新增弹窗（从列表页直接新增，需选科室） */}
      <Modal
        title="新增定数配置"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="deptId" label="科室" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择科室"
              options={departments.map(d => ({ value: d.id, label: d.deptName }))}
            />
          </Form.Item>
          <Form.Item name="materialId" label="耗材" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择耗材"
              options={materials.map(m => ({
                value: m.id,
                label: `${m.materialName}${m.specification ? ` (${m.specification})` : ''}`,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parQuantity" label="定数（标准库存量）" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minQuantity" label="补货触发线" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="monthlyLimit" label="月度限额（不填则不限）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 智能建议抽屉 */}
      <Drawer
        title={<><BulbOutlined /> 定数智能调整建议</>}
        open={suggestionDrawer}
        onClose={() => setSuggestionDrawer(false)}
        width={700}
      >
        {suggestions.length === 0 ? (
          <Empty description="当前所有定数配置合理，无需调整" />
        ) : (
          <Table
            dataSource={suggestions}
            rowKey={r => `${r.deptId}_${r.materialId}`}
            pagination={false}
            size="small"
            columns={[
              { title: '科室', dataIndex: 'deptName', width: 80 },
              { title: '耗材', dataIndex: 'materialName', ellipsis: true },
              {
                title: '方向', dataIndex: 'direction', width: 60,
                render: (d: string) => d === 'UP'
                  ? <Tag color="red" icon={<ArrowUpOutlined />}>上调</Tag>
                  : <Tag color="blue" icon={<ArrowDownOutlined />}>下调</Tag>,
              },
              {
                title: '当前→建议', width: 120,
                render: (_: unknown, r: ParSuggestionVO) => (
                  <span>{r.currentPar} → <strong>{r.suggestedPar}</strong></span>
                ),
              },
              {
                title: '月均消耗', dataIndex: 'avgMonthlyUsage', width: 80,
              },
              {
                title: '原因', dataIndex: 'reason', ellipsis: true,
              },
              {
                title: '操作', width: 70,
                render: (_: unknown, r: ParSuggestionVO) => (
                  <Popconfirm title={`确认将定数从${r.currentPar}调整为${r.suggestedPar}？`} onConfirm={() => handleApplySuggestion(r)}>
                    <Button type="link" size="small">应用</Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}
