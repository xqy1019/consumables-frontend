import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Card, Button, Modal, Form, Input, Select, Row, Col,
  Tag, Space, message, Popconfirm, Tabs, DatePicker, InputNumber,
  Typography, Divider, Alert, Tooltip, Statistic, theme,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined, PlusCircleOutlined,
  MinusCircleOutlined, PlayCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined, BarChartOutlined,
  FileTextOutlined, TeamOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { smallConsumablesApi, type TemplateVO, type RecordVO, type SaveTemplateRequest, type RecordRequest } from '@/api/smallConsumables'
import { departmentsApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import type { Department, Material } from '@/types'
import { formatDateTime } from '@/utils/format'

const { Text } = Typography

const CATEGORIES = ['护理操作', '手术辅助', '检查操作', '其他']

// 哪些耗材适合放入操作级消耗包的说明
const OPERATION_LEVEL_TIP = `操作级耗材：每次操作必然独立消耗的耗材，如注射器、导尿管、引流管等一次性器具，以及伤口换药纱布。
班次级耗材（不建议放入消耗包）：口罩、手术帽、隔离衣等防护物品，护士一个班次使用一套，应通过"科室定数配置"按班次领用。
手套：是否每次操作更换，各医院感控规范不同，请根据本院制度决定是否纳入消耗包。`

export default function ProceduresPage() {
  const [templates, setTemplates] = useState<TemplateVO[]>([])
  const [records, setRecords] = useState<RecordVO[]>([])
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateVO | null>(null)
  const [templateForm] = Form.useForm()

  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [recordForm] = Form.useForm()
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateVO | null>(null)

  const [recordFilter, setRecordFilter] = useState<{ deptId?: number; yearMonth?: string }>({})
  const { token } = theme.useToken()

  const loadTemplates = async () => {
    setLoading(true)
    try { setTemplates(await smallConsumablesApi.getTemplates()) } finally { setLoading(false) }
  }

  const loadRecords = async () => {
    const res = await smallConsumablesApi.getRecords(recordFilter)
    setRecords(res)
  }

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
    materialsApi.getActive().then(setMaterials).catch(() => {})
    loadTemplates()
  }, [])

  useEffect(() => { loadRecords() }, [recordFilter])

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

  const openRecord = (t: TemplateVO) => {
    setSelectedTemplate(t)
    recordForm.setFieldsValue({ templateId: t.id, quantity: 1, performedAt: dayjs() })
    setRecordModalOpen(true)
  }

  const handleAddRecord = async () => {
    const values = await recordForm.validateFields()
    const req: RecordRequest = {
      ...values,
      performedAt: values.performedAt?.format('YYYY-MM-DDTHH:mm:ss'),
    }
    await smallConsumablesApi.addRecord(req)
    message.success('操作记录已保存')
    setRecordModalOpen(false)
    recordForm.resetFields()
    loadRecords()
  }

  // ── 消耗统计计算 ──
  const templateUsageMap = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalOps: number }>()
    records.forEach(r => {
      const key = r.templateName
      if (!map.has(key)) map.set(key, { name: key, count: 0, totalOps: 0 })
      const d = map.get(key)!
      d.count++
      d.totalOps += r.quantity
    })
    return Array.from(map.values()).sort((a, b) => b.totalOps - a.totalOps)
  }, [records])

  const deptUsageMap = useMemo(() => {
    const map = new Map<string, { name: string; recordCount: number; totalOps: number; templateSet: Set<string> }>()
    records.forEach(r => {
      if (!map.has(r.deptName)) map.set(r.deptName, { name: r.deptName, recordCount: 0, totalOps: 0, templateSet: new Set() })
      const d = map.get(r.deptName)!
      d.recordCount++
      d.totalOps += r.quantity
      d.templateSet.add(r.templateName)
    })
    return Array.from(map.values()).sort((a, b) => b.totalOps - a.totalOps)
  }, [records])

  const materialConsumedMap = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; total: number }>()
    records.forEach(r => {
      r.consumedItems?.forEach(item => {
        const key = item.materialName
        if (!map.has(key)) map.set(key, { name: key, unit: item.unit, total: 0 })
        map.get(key)!.total += item.totalQuantity
      })
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [records])

  const templateBarOption = useMemo(() => {
    const top = templateUsageMap.slice(0, 8)
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 8,
        formatter: (params: any[]) => {
          const idx = top.length - 1 - (params[0]?.dataIndex ?? 0)
          const d = top[idx]
          return d ? `<b>${d.name}</b><br/>执行次数：${d.totalOps} 次<br/>记录条数：${d.count} 条` : ''
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
          value: d.totalOps,
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#91caff' }, { offset: 1, color: '#4096ff' }] },
            borderRadius: [0, 4, 4, 0],
          },
        })).reverse(),
        label: { show: true, position: 'right', formatter: '{c} 次', fontSize: 11, color: token.colorTextSecondary },
        barMaxWidth: 22,
      }],
    }
  }, [templateUsageMap, token])

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
      title: '操作', width: 200,
      render: (_, r) => (
        <Space>
          <Button type="primary" size="small" icon={<PlayCircleOutlined />}
            onClick={() => openRecord(r)}>记录操作</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDeleteTemplate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const recordColumns: ColumnsType<RecordVO> = [
    { title: '科室', dataIndex: 'deptName', width: 100 },
    { title: '操作类型', dataIndex: 'templateName', width: 120 },
    {
      title: '执行次数', dataIndex: 'quantity', width: 80,
      render: v => <Tag color="blue">×{v}</Tag>,
    },
    {
      title: '本次消耗', width: 280,
      render: (_, r) => (
        <Space size={4} wrap>
          {r.consumedItems?.map(i => (
            <Tag key={i.materialId}>{i.materialName} {i.totalQuantity}{i.unit}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作时间', dataIndex: 'performedAt', width: 160,
      render: v => formatDateTime(v),
    },
    { title: '患者信息', dataIndex: 'patientInfo', width: 100, ellipsis: true },
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
            key: 'records',
            label: '操作记录',
            children: (
              <Card
                title="诊疗操作记录"
                extra={
                  <Space>
                    <Select
                      placeholder="筛选科室"
                      allowClear
                      style={{ width: 140 }}
                      options={departments.map(d => ({ value: d.id, label: d.deptName }))}
                      onChange={v => setRecordFilter(f => ({ ...f, deptId: v }))}
                    />
                    <DatePicker
                      picker="month"
                      placeholder="筛选月份"
                      onChange={v => setRecordFilter(f => ({ ...f, yearMonth: v?.format('YYYY-MM') }))}
                    />
                  </Space>
                }
              >
                <Table
                  rowKey="id"
                  columns={recordColumns}
                  dataSource={records}
                  size="small"
                  pagination={{ pageSize: 20 }}
                />
              </Card>
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
                        title={<Space size={4}><FileTextOutlined style={{ color: '#0ea5e9' }} /><span>记录总条数</span></Space>}
                        value={records.length}
                        suffix="条"
                        valueStyle={{ color: '#0ea5e9' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#f0fdf4', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><PlayCircleOutlined style={{ color: '#22c55e' }} /><span>执行总次数</span></Space>}
                        value={records.reduce((s, r) => s + r.quantity, 0)}
                        suffix="次"
                        valueStyle={{ color: '#22c55e' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#fff7ed', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><TeamOutlined style={{ color: '#f59e0b' }} /><span>参与科室</span></Space>}
                        value={deptUsageMap.length}
                        suffix="个"
                        valueStyle={{ color: '#f59e0b' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" bordered={false} style={{ background: '#fdf4ff', borderRadius: 8 }}>
                      <Statistic
                        title={<Space size={4}><CheckCircleOutlined style={{ color: '#a855f7' }} /><span>消耗耗材种类</span></Space>}
                        value={materialConsumedMap.length}
                        suffix="种"
                        valueStyle={{ color: '#a855f7' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  {/* 消耗包使用频率 */}
                  <Col xs={24} lg={14}>
                    <Card
                      title={<Space><BarChartOutlined style={{ color: '#4096ff' }} /><span>各消耗包执行频次</span></Space>}
                      size="small"
                      bordered={false}
                      style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    >
                      {templateUsageMap.length > 0 ? (
                        <ReactECharts option={templateBarOption} style={{ height: 260 }} />
                      ) : (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextQuaternary }}>
                          暂无操作记录
                        </div>
                      )}
                    </Card>
                  </Col>

                  {/* 耗材消耗排名 */}
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
                          title: '记录条数', dataIndex: 'recordCount', width: 100,
                          render: v => <Tag color="blue">×{v}</Tag>,
                        },
                        {
                          title: '累计执行次数', dataIndex: 'totalOps', width: 120,
                          sorter: (a, b) => a.totalOps - b.totalOps,
                          defaultSortOrder: 'descend',
                          render: v => <Text strong style={{ color: '#f59e0b' }}>{v} 次</Text>,
                        },
                        {
                          title: '使用消耗包种类', dataIndex: 'templateSet', width: 120,
                          render: s => <Tag color="purple">{s.size} 种</Tag>,
                        },
                        {
                          title: '主要操作类型',
                          render: (_, r) => (
                            <Space size={4} wrap>
                              {Array.from((r as any).templateSet as Set<string>).slice(0, 4).map(t => (
                                <Tag key={t} color="default">{t}</Tag>
                              ))}
                            </Space>
                          ),
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

      {/* 记录操作弹窗 */}
      <Modal
        title={`记录操作：${selectedTemplate?.name}`}
        open={recordModalOpen}
        onOk={handleAddRecord}
        onCancel={() => {
          setRecordModalOpen(false)
          recordForm.resetFields()
        }}
        width={500}
      >
        {selectedTemplate && (
          <Alert
            type="success"
            style={{ marginBottom: 16 }}
            message="本次操作预计消耗"
            description={
              <Space wrap>
                {selectedTemplate.items?.map(i => (
                  <Tag key={i.id} color="green">
                    {i.materialName} ×{i.quantity} {i.unit}
                  </Tag>
                ))}
                {selectedTemplate.items?.length === 0 && (
                  <Text type="secondary">该消耗包暂无配置耗材</Text>
                )}
              </Space>
            }
          />
        )}
        <Form form={recordForm} layout="vertical">
          <Form.Item name="templateId" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deptId" label="执行科室" rules={[{ required: true }]}>
                <Select
                  options={departments.map(d => ({ value: d.id, label: d.deptName }))}
                  placeholder="选择科室"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="执行次数" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="performedAt" label="操作时间" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientInfo" label="患者信息（选填）">
                <Input placeholder="床号或姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
