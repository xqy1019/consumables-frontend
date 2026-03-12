import React, { useState, useEffect } from 'react'
import {
  Table, Card, Button, Modal, Form, Input, InputNumber, Select, Row, Col,
  Tag, Progress, Statistic, Drawer, List, message, Space, Badge, Descriptions,
} from 'antd'
import { PlusOutlined, WarningOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import request from '@/api/request'
import { departmentsApi } from '@/api/system'
import type { Department } from '@/types'
import { MATERIAL_CATEGORIES } from '@/types'
import { formatDateTime } from '@/utils/format'

interface BudgetPlanVO {
  id: number
  deptId: number
  deptName: string
  year: number
  quarter: number | null
  periodLabel: string
  category: string | null
  budgetAmount: number
  usedAmount: number
  remainingAmount: number
  usageRate: number
  status: string
  remark: string
  createTime: string
}

interface BudgetSummaryVO {
  totalBudget: number
  totalUsed: number
  totalRemaining: number
  overallUsageRate: number
  totalPlans: number
  overBudgetPlans: number
}

interface BudgetExecution {
  id: number
  planId: number
  deptId: number
  requisitionId: number | null
  amount: number
  description: string
  createTime: string
}

const budgetApi = {
  getPlans: (year: number, deptId?: number) =>
    request.get<unknown, BudgetPlanVO[]>('/budget', { params: { year, deptId } }),
  getSummary: (year: number) =>
    request.get<unknown, BudgetSummaryVO>('/budget/summary', { params: { year } }),
  getExecutions: (planId: number) =>
    request.get<unknown, BudgetExecution[]>(`/budget/${planId}/executions`),
  create: (data: any) => request.post<unknown, BudgetPlanVO>('/budget', data),
  update: (id: number, budgetAmount: number, remark?: string) =>
    request.put<unknown, BudgetPlanVO>(`/budget/${id}`, { budgetAmount, remark }),
}

export default function BudgetPage() {
  const [plans, setPlans] = useState<BudgetPlanVO[]>([])
  const [summary, setSummary] = useState<BudgetSummaryVO | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(dayjs().year())
  const [deptFilter, setDeptFilter] = useState<number | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<BudgetPlanVO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<BudgetPlanVO | null>(null)
  const [executions, setExecutions] = useState<BudgetExecution[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, summaryRes] = await Promise.all([
        budgetApi.getPlans(year, deptFilter),
        budgetApi.getSummary(year),
      ])
      setPlans(plansRes)
      setSummary(summaryRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [year, deptFilter])
  useEffect(() => { departmentsApi.getAll().then(setDepartments) }, [])

  const openDetail = async (record: BudgetPlanVO) => {
    setCurrentPlan(record)
    setDetailOpen(true)
    const execs = await budgetApi.getExecutions(record.id)
    setExecutions(execs)
  }

  const openEdit = (record: BudgetPlanVO) => {
    setEditRecord(record)
    editForm.setFieldsValue({ budgetAmount: record.budgetAmount, remark: record.remark })
  }

  const handleCreate = async (values: any) => {
    setSubmitting(true)
    try {
      await budgetApi.create({ ...values, year })
      message.success('预算创建成功')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch (e: any) {
      message.error(e?.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (values: any) => {
    if (!editRecord) return
    setSubmitting(true)
    try {
      await budgetApi.update(editRecord.id, values.budgetAmount, values.remark)
      message.success('预算更新成功')
      setEditRecord(null)
      editForm.resetFields()
      fetchData()
    } catch (e: any) {
      message.error(e?.message || '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getUsageColor = (rate: number) => {
    if (rate >= 100) return '#ff4d4f'
    if (rate >= 80) return '#faad14'
    return '#52c41a'
  }

  const columns: ColumnsType<BudgetPlanVO> = [
    { title: '科室', dataIndex: 'deptName', width: 140 },
    { title: '预算期', dataIndex: 'periodLabel', width: 110 },
    { title: '耗材分类', dataIndex: 'category', width: 120, render: (v) => v || <span style={{ color: '#999' }}>不限</span> },
    {
      title: '预算金额', dataIndex: 'budgetAmount', width: 130,
      render: (v) => <span style={{ fontWeight: 600 }}>¥{v?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: '已使用', dataIndex: 'usedAmount', width: 130,
      render: (v, r) => (
        <span style={{ color: v > r.budgetAmount ? '#ff4d4f' : undefined }}>
          ¥{v?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '剩余', dataIndex: 'remainingAmount', width: 130,
      render: (v) => (
        <span style={{ color: v < 0 ? '#ff4d4f' : '#52c41a', fontWeight: v < 0 ? 600 : undefined }}>
          {v < 0 ? '-' : ''}¥{Math.abs(v)?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          {v < 0 && <Tag color="red" style={{ marginLeft: 4 }}>超支</Tag>}
        </span>
      ),
    },
    {
      title: '使用进度', dataIndex: 'usageRate', width: 160,
      render: (v) => (
        <Space>
          <Progress
            percent={Math.min(v, 100)}
            size="small"
            strokeColor={getUsageColor(v)}
            style={{ width: 100 }}
            format={() => `${v?.toFixed(1)}%`}
          />
          {v >= 100 && <WarningOutlined style={{ color: '#ff4d4f' }} />}
        </Space>
      ),
    },
    {
      title: '操作', width: 130, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => openDetail(record)}>明细</Button>
          <Button size="small" type="link" onClick={() => openEdit(record)}>调整</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 汇总卡片 */}
      {summary && (
        <Row gutter={16} className="mb-4">
          {[
            { title: `${year}年总预算`, value: summary.totalBudget, prefix: '¥', precision: 2 },
            { title: '已使用', value: summary.totalUsed, prefix: '¥', precision: 2 },
            { title: '剩余预算', value: summary.totalRemaining, prefix: '¥', precision: 2 },
            { title: '总体使用率', value: summary.overallUsageRate, suffix: '%', precision: 1 },
          ].map((item, i) => (
            <Col span={6} key={i}>
              <Card bordered={false} className="rounded-xl">
                <Statistic
                  title={item.title}
                  value={item.value}
                  prefix={item.prefix}
                  suffix={item.suffix}
                  precision={item.precision}
                  valueStyle={item.title === '剩余预算' && summary.totalRemaining < 0 ? { color: '#ff4d4f' } : undefined}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
      {summary && summary.overBudgetPlans > 0 && (
        <div className="mb-4">
          <Badge count={summary.overBudgetPlans}>
            <Tag color="error" icon={<WarningOutlined />} style={{ padding: '4px 10px', fontSize: 13 }}>
              有 {summary.overBudgetPlans} 个预算已超支，请及时处理
            </Tag>
          </Badge>
        </div>
      )}

      <Card
        bordered={false}
        className="rounded-xl"
        title="科室预算管理"
        extra={
          <Space>
            <Select value={year} onChange={setYear} className="w-[100px]">
              {[2024, 2025, 2026, 2027].map(y => (
                <Select.Option key={y} value={y}>{y}年</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="按科室筛选"
              allowClear
              value={deptFilter}
              onChange={setDeptFilter}
              className="w-[160px]"
            >
              {departments.filter(d => d.status === 1).map(d => (
                <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateOpen(true) }}>
              新建预算
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={plans}
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          rowClassName={(r) => r.usageRate >= 100 ? 'bg-red-50' : r.usageRate >= 80 ? 'bg-orange-50' : ''}
        />
      </Card>

      {/* 新建预算弹窗 */}
      <Modal
        title={`新建 ${year} 年预算`}
        open={createOpen}
        onCancel={() => { if (!submitting) setCreateOpen(false) }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Form.Item name="deptId" label="科室" rules={[{ required: true }]}>
            <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false}>
              {departments.filter(d => d.status === 1).map(d => (
                <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="quarter" label="预算周期">
            <Select allowClear placeholder="留空表示年度预算">
              <Select.Option value={1}>第一季度（Q1）</Select.Option>
              <Select.Option value={2}>第二季度（Q2）</Select.Option>
              <Select.Option value={3}>第三季度（Q3）</Select.Option>
              <Select.Option value={4}>第四季度（Q4）</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="耗材分类">
            <Select allowClear placeholder="留空表示不限分类">
              {MATERIAL_CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="budgetAmount" label="预算金额（元）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} className="w-full" addonBefore="¥" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="说明预算用途或备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 调整预算弹窗 */}
      <Modal
        title={`调整预算 - ${editRecord?.deptName} ${editRecord?.periodLabel}`}
        open={!!editRecord}
        onCancel={() => { if (!submitting) setEditRecord(null) }}
        onOk={() => editForm.submit()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical" className="pt-2">
          <Form.Item name="budgetAmount" label="新预算金额（元）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} className="w-full" addonBefore="¥" />
          </Form.Item>
          <Form.Item name="remark" label="调整备注">
            <Input.TextArea rows={2} placeholder="说明本次预算调整原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行明细抽屉 */}
      <Drawer
        title={`预算执行明细 - ${currentPlan?.deptName} ${currentPlan?.periodLabel}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={520}
      >
        {currentPlan && (
          <>
            <Descriptions column={2} size="small" bordered className="mb-4">
              <Descriptions.Item label="预算金额">
                ¥{currentPlan.budgetAmount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </Descriptions.Item>
              <Descriptions.Item label="已使用">
                <span style={{ color: currentPlan.usedAmount > currentPlan.budgetAmount ? '#ff4d4f' : undefined }}>
                  ¥{currentPlan.usedAmount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="剩余" span={2}>
                <span style={{ color: currentPlan.remainingAmount < 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                  ¥{currentPlan.remainingAmount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </Descriptions.Item>
            </Descriptions>
            <Progress
              percent={Math.min(currentPlan.usageRate, 100)}
              strokeColor={getUsageColor(currentPlan.usageRate)}
              format={() => `${currentPlan.usageRate?.toFixed(1)}%`}
              className="mb-4"
            />
            <div style={{ fontWeight: 600, marginBottom: 8 }}>消耗记录</div>
            <List
              size="small"
              dataSource={executions}
              locale={{ emptyText: '暂无消耗记录' }}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.description || '申领消耗'}</span>
                      <span style={{ fontWeight: 600, color: '#ff4d4f' }}>
                        -¥{item.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>{formatDateTime(item.createTime)}</div>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}
