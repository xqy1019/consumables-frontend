import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Card, Button, Modal, Form, Input, Select, Row, Col,
  Tag, Space, message, Popconfirm, Tabs, DatePicker, InputNumber,
  Typography, Divider, Alert, Tooltip, Statistic, theme,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined, PlusCircleOutlined,
  MinusCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined, BarChartOutlined,
  FileTextOutlined, TeamOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { smallConsumablesApi, type TemplateVO, type SaveTemplateRequest, type ConsumptionSummaryVO } from '@/api/smallConsumables'
import { departmentsApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import type { Department, Material } from '@/types'

const { Text } = Typography

const CATEGORIES = ['护理操作', '手术辅助', '检查操作', '其他']

// 哪些耗材适合放入操作级消耗包的说明
const OPERATION_LEVEL_TIP = `操作级耗材：每次操作必然独立消耗的耗材，如注射器、导尿管、引流管等一次性器具，以及伤口换药纱布。
班次级耗材（不建议放入消耗包）：口罩、手术帽、隔离衣等防护物品，护士一个班次使用一套，应通过"科室定数配置"按班次领用。
手套：是否每次操作更换，各医院感控规范不同，请根据本院制度决定是否纳入消耗包。`

export default function ProceduresPage() {
  const [templates, setTemplates] = useState<TemplateVO[]>([])
  const [consumptionSummary, setConsumptionSummary] = useState<ConsumptionSummaryVO[]>([])
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateVO | null>(null)
  const [templateForm] = Form.useForm()

  const [summaryFilter, setSummaryFilter] = useState<{ deptId?: number; yearMonth?: string }>({
    yearMonth: dayjs().format('YYYY-MM'),
  })
  const { token } = theme.useToken()

  const loadTemplates = async () => {
    setLoading(true)
    try { setTemplates(await smallConsumablesApi.getTemplates()) } finally { setLoading(false) }
  }

  const loadConsumptionSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await smallConsumablesApi.getConsumptionSummary(summaryFilter)
      setConsumptionSummary(res)
    } catch {
      setConsumptionSummary([])
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
    materialsApi.getActive().then(setMaterials).catch(() => {})
    loadTemplates()
  }, [])

  useEffect(() => { loadConsumptionSummary() }, [summaryFilter])

  const handleSaveTemplate = async () => {
    const values = await templateForm.validateFields()
    if (editingTemplate) {
      await smallConsumablesApi.updateTemplate(editingTemplate.id, values as SaveTemplateRequest)
      message.success('更新成功')
    } else {
      await smallConsumablesApi.createTemplate(values as SaveTemplateRequest)
      message.success('创建成功')
    }
    setTemplateModalOpen(false)
    setEditingTemplate(null)
    templateForm.resetFields()
    loadTemplates()
  }

  const handleDeleteTemplate = async (id: number) => {
    await smallConsumablesApi.deleteTemplate(id)
    message.success('删除成功')
    loadTemplates()
  }

  const openEdit = (t: TemplateVO) => {
    setEditingTemplate(t)
    templateForm.setFieldsValue({
      name: t.name, category: t.category, description: t.description,
      items: t.items.map(i => ({ materialId: i.materialId, quantity: i.quantity, note: i.note })),
    })
    setTemplateModalOpen(true)
  }

  // ── 消耗统计计算（基于 consumptionSummary） ──
  const materialConsumedMap = useMemo(() => {
    const map = new Map<number, { name: string; unit: string; total: number }>()
    consumptionSummary.forEach(r => {
      if (!map.has(r.materialId)) map.set(r.materialId, { name: r.materialName, unit: r.unit, total: 0 })
      map.get(r.materialId)!.total += r.estimatedConsumption
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [consumptionSummary])

  const deptUsageMap = useMemo(() => {
    const map = new Map<number, { name: string; totalConsumption: number; materialCount: number; stocktakingCount: number }>()
    consumptionSummary.forEach(r => {
      if (!map.has(r.deptId)) map.set(r.deptId, { name: r.deptName, totalConsumption: 0, materialCount: 0, stocktakingCount: 0 })
      const d = map.get(r.deptId)!
      d.totalConsumption += r.estimatedConsumption
      d.materialCount++
      if (r.source === '盘点修正') d.stocktakingCount++
    })
    return Array.from(map.values()).sort((a, b) => b.totalConsumption - a.totalConsumption)
  }, [consumptionSummary])

  const materialBarOption = useMemo(() => {
    const top = materialConsumedMap.slice(0, 8)
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 8,
        formatter: (params: any[]) => {
          const idx = top.length - 1 - (params[0]?.dataIndex ?? 0)
          const d = top[idx]
          return d ? `<b>${d.name}</b><br/>消耗量：${d.total} ${d.unit}` : ''
        },
      },
      grid: { left: 8, right: 60, top: 12, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 11, color: token.colorTextSecondary },
        splitLine: { lineStyle: { type: 'dashed', color: token.colorBorderSecondary } },
        axisLine: { show: false }, axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        data: top.map(d => d.name).reverse(),
        axisLabel: { fontSize: 11, color: token.colorTextSecondary },
        axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: top.map(d => ({
          value: d.total,
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#91caff' }, { offset: 1, color: '#4096ff' }] },
            borderRadius: [0, 4, 4, 0],
          },
        })).reverse(),
        label: { show: true, position: 'right', formatter: '{c}', fontSize: 11, color: token.colorTextSecondary },
        barMaxWidth: 22,
      }],
    }
  }, [materialConsumedMap, token])

  // 判断消耗包是否包含争议耗材（手套），用于显示校准提示
  const hasControversialItems = (t: TemplateVO) =>
    t.items?.some(i => i.materialName?.includes('手套'))

  const templateColumns: ColumnsType<TemplateVO> = [
    {
      title: '消耗包名称', dataIndex: 'name', width: 140,
      render: (v, r) => (
        <Space>
          <span>{v}</span>
          {hasControversialItems(r) && (
            <Tooltip title="该消耗包含手套，请确认本院感控规范中是否要求每次操作更换手套">
              <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '类别', dataIndex: 'category', width: 100,
      render: v => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '操作级耗材',
      width: 320,
      render: (_, r) => (
        <Space size={4} wrap>
          {r.items?.length > 0
            ? r.items.map(i => (
                <Tag key={i.id} color={i.materialName?.includes('手套') ? 'orange' : 'green'}>
                  {i.materialName} ×{i.quantity}{i.unit}
                  {i.materialName?.includes('手套') && (
                    <Tooltip title="手套用量请根据本院感控规范确认">
                      <InfoCircleOutlined style={{ marginLeft: 3 }} />
                    </Tooltip>
                  )}
                </Tag>
              ))
            : <Text type="secondary">暂无耗材，请编辑添加</Text>
          }
        </Space>
      ),
    },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '操作', width: 120,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteTemplate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const summaryColumns: ColumnsType<ConsumptionSummaryVO> = [
    { title: '科室', dataIndex: 'deptName', width: 100 },
    { title: '耗材名称', dataIndex: 'materialName', width: 140 },
    { title: '规格', dataIndex: 'specification', width: 120, ellipsis: true },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '申领量', dataIndex: 'requisitionQuantity', width: 90, align: 'right',
      render: v => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '盘点消耗', dataIndex: 'stocktakingConsumption', width: 90, align: 'right',
      render: v => v != null ? v : <Text type="secondary">-</Text>,
    },
    {
      title: '最终消耗', dataIndex: 'estimatedConsumption', width: 100, align: 'right',
      sorter: (a, b) => a.estimatedConsumption - b.estimatedConsumption,
      defaultSortOrder: 'descend',
      render: v => (
        <Text strong style={{ color: '#4096ff', fontSize: 14 }}>{v}</Text>
      ),
    },
    {
      title: '数据来源', dataIndex: 'source', width: 100,
      filters: [
        { text: '申领推算', value: '申领推算' },
        { text: '盘点修正', value: '盘点修正' },
      ],
      onFilter: (value, record) => record.source === value,
      render: v => (
        <Tag color={v === '盘点修正' ? 'green' : 'blue'}>{v}</Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Tabs
        items={[
          {
            key: 'templates',
            label: '消耗包配置',
            children: (
              <>
                {/* 重要说明 */}
                <Alert
                  type="warning"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                  style={{ marginBottom: 16 }}
                  message="上线前必须校准"
                  description={
                    <div>
                      <p style={{ margin: '4px 0' }}>
                        以下消耗包为<strong>参考模板</strong>，用量仅供参考，
                        <strong>请护士长或感控科根据本院规范逐一核对并修改后再投入使用</strong>。
                      </p>
                      <p style={{ margin: '4px 0', color: '#666' }}>
                        消耗包只记录<strong>操作级耗材</strong>（每次操作必然消耗的）。
                        口罩、手术帽等班次级防护用品请通过「科室定数配置」按班次管理，无需放入消耗包。
                        手套是否每次更换，请根据本院感控规范决定（<span style={{ color: '#fa8c16' }}>橙色标注</span>表示含手套，需确认）。
                      </p>
                    </div>
                  }
                />

                <Card
                  title={
                    <Space>
                      <span>诊疗消耗包</span>
                      <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                        {templates.filter(hasControversialItems).length} 个含手套，待确认
                      </Tag>
                    </Space>
                  }
                  extra={
                    <Button type="primary" icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingTemplate(null)
                        templateForm.resetFields()
                        setTemplateModalOpen(true)
                      }}>
                      新建消耗包
                    </Button>
                  }
                >
                  <Table
                    rowKey="id"
                    columns={templateColumns}
                    dataSource={templates}
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 15 }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'consumption',
            label: '科室消耗总览',
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="数据自动生成，无需人工录入"
                  description="消耗数据由系统根据申领发放记录自动生成，月末盘点后自动修正。无需人工录入。"
                />
                <Card
                  title="科室消耗总览"
                  extra={
                    <Space>
                      <Select
                        placeholder="筛选科室"
                        allowClear
                        style={{ width: 140 }}
                        options={departments.map(d => ({ value: d.id, label: d.deptName }))}
                        onChange={v => setSummaryFilter(f => ({ ...f, deptId: v }))}
                      />
                      <DatePicker
                        picker="month"
                        placeholder="选择月份"
                        defaultValue={dayjs()}
                        onChange={v => setSummaryFilter(f => ({ ...f, yearMonth: v?.format('YYYY-MM') }))}
                      />
                    </Space>
                  }
                >
                  <Table
                    rowKey={(r) => `${r.deptId}-${r.materialId}`}
                    columns={summaryColumns}
                    dataSource={consumptionSummary}
                    loading={summaryLoading}
                    size="small"
                    pagination={{ pageSize: 20 }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'stats',
            label: <Space><BarChartOutlined />消耗统计</Space>,
            children: (
              <div>
                {/* 汇总 KPI */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#f0f9ff', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><FileTextOutlined style={{ color: '#0ea5e9' }} /><span>耗材种类</span></Space>}
                        value={materialConsumedMap.length}
                        suffix="种"
                        valueStyle={{ color: '#0ea5e9' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#f0fdf4', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><CheckCircleOutlined style={{ color: '#22c55e' }} /><span>总消耗量</span></Space>}
                        value={consumptionSummary.reduce((s, r) => s + r.estimatedConsumption, 0)}
                        valueStyle={{ color: '#22c55e' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#fff7ed', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><TeamOutlined style={{ color: '#f59e0b' }} /><span>涉及科室</span></Space>}
                        value={deptUsageMap.length}
                        suffix="个"
                        valueStyle={{ color: '#f59e0b' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#fdf4ff', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><CheckCircleOutlined style={{ color: '#a855f7' }} /><span>盘点修正占比</span></Space>}
                        value={consumptionSummary.length > 0
                          ? Math.round(consumptionSummary.filter(r => r.source === '盘点修正').length / consumptionSummary.length * 100)
                          : 0}
                        suffix="%"
                        valueStyle={{ color: '#a855f7' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  {/* 耗材消耗排名图表 */}
                  <Col xs={24} lg={14}>
                    <Card
                      title={<Space><BarChartOutlined style={{ color: '#4096ff' }} /><span>耗材消耗量排名</span></Space>}
                      size="small"
                      bordered={false}
                      style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                      {materialConsumedMap.length > 0 ? (
                        <ReactECharts option={materialBarOption} style={{ height: 260 }} />
                      ) : (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextQuaternary }}>
                          暂无消耗数据
                        </div>
                      )}
                    </Card>
                  </Col>

                  {/* 耗材消耗排名表格 */}
                  <Col xs={24} lg={10}>
                    <Card
                      title={<Space><CheckCircleOutlined style={{ color: '#22c55e' }} /><span>耗材消耗排名</span></Space>}
                      size="small"
                      bordered={false}
                      style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                      <Table
                        rowKey="name"
                        size="small"
                        pagination={false}
                        scroll={{ y: 218 }}
                        dataSource={materialConsumedMap.slice(0, 10)}
                        columns={[
                          {
                            title: '排名', width: 50,
                            render: (_, __, i) => (
                              <span style={{ fontWeight: 700, color: i < 3 ? '#ff4d4f' : token.colorTextSecondary }}>
                                {i + 1}
                              </span>
                            ),
                          },
                          { title: '耗材名称', dataIndex: 'name', ellipsis: true },
                          {
                            title: '合计用量', dataIndex: 'total', width: 90, align: 'right' as const,
                            render: (v, r) => (
                              <Text strong style={{ color: '#4096ff' }}>{v} {r.unit}</Text>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 科室用耗分布 */}
                {deptUsageMap.length > 0 && (
                  <Card
                    title={<Space><TeamOutlined style={{ color: '#f59e0b' }} /><span>科室用耗分布</span></Space>}
                    size="small"
                    bordered={false}
                    style={{ marginTop: 16, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  >
                    <Table
                      rowKey="name"
                      size="small"
                      pagination={false}
                      dataSource={deptUsageMap}
                      columns={[
                        { title: '科室', dataIndex: 'name', width: 120 },
                        {
                          title: '耗材种类', dataIndex: 'materialCount', width: 100,
                          render: v => <Tag color="blue">{v} 种</Tag>,
                        },
                        {
                          title: '总消耗量', dataIndex: 'totalConsumption', width: 120,
                          sorter: (a, b) => a.totalConsumption - b.totalConsumption,
                          defaultSortOrder: 'descend',
                          render: v => <Text strong style={{ color: '#f59e0b' }}>{v}</Text>,
                        },
                        {
                          title: '盘点修正条数', dataIndex: 'stocktakingCount', width: 120,
                          render: v => v > 0 ? <Tag color="green">{v} 条</Tag> : <Text type="secondary">0</Text>,
                        },
                      ]}
                    />
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 新建/编辑消耗包弹窗 */}
      <Modal
        title={editingTemplate ? '编辑消耗包' : '新建消耗包'}
        open={templateModalOpen}
        onOk={handleSaveTemplate}
        onCancel={() => {
          setTemplateModalOpen(false)
          setEditingTemplate(null)
          templateForm.resetFields()
        }}
        width={700}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Tooltip title={OPERATION_LEVEL_TIP}>
              <span>
                只填写<strong>操作级耗材</strong>（每次操作必然独立消耗的），
                班次级防护品请勿放入 <InfoCircleOutlined />
              </span>
            </Tooltip>
          }
        />
        <Form form={templateForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="消耗包名称" rules={[{ required: true }]}>
                <Input placeholder="如：换药（小）、留置导尿" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="类别" rules={[{ required: true }]}>
                <Select
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  placeholder="选择类别"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="说明（可注明适用范围或感控依据）">
            <Input.TextArea rows={2} placeholder="如：按本院感控规范2024版，换药操作手套一用一换" />
          </Form.Item>
          <Divider>
            <Space>
              <span>操作级耗材明细</span>
              <Text type="secondary" style={{ fontSize: 12 }}>每次执行该操作的标准消耗量</Text>
            </Space>
          </Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row key={key} gutter={8} align="middle">
                    <Col span={11}>
                      <Form.Item
                        {...rest}
                        name={[name, 'materialId']}
                        rules={[{ required: true, message: '请选择耗材' }]}
                      >
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
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...rest}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '请填写' }]}
                      >
                        <InputNumber
                          min={0.1}
                          step={0.5}
                          style={{ width: '100%' }}
                          placeholder="用量"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...rest} name={[name, 'note']}>
                        <Input placeholder="备注（如：按感控规范）" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusCircleOutlined />}
                  onClick={() => add()}
                >
                  添加耗材
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}
