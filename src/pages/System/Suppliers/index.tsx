import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Modal, Form, message, Popconfirm,
  Card, Tag, DatePicker, Row, Col, Tooltip, Drawer, List,
  InputNumber, Select, Descriptions, Progress, Badge,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, StarOutlined, BarChartOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { suppliersApi } from '@/api/system'
import request from '@/api/request'
import type { Supplier } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'

interface PerformanceVO {
  id: number
  supplierId: number
  supplierName: string
  evalYear: number
  evalQuarter: number
  periodLabel: string
  priceScore: number
  qualityScore: number
  deliveryScore: number
  serviceScore: number
  totalScore: number
  grade: string
  qualityRate: number
  deliveryRate: number
  remark: string
  createTime: string
}

const performanceApi = {
  getHistory: (id: number) =>
    request.get<unknown, PerformanceVO[]>(`/suppliers/${id}/performance`),
  evaluate: (data: any) =>
    request.post<unknown, PerformanceVO>('/suppliers/performance/evaluate', data),
  getRankings: (year: number, quarter: number) =>
    request.get<unknown, PerformanceVO[]>('/suppliers/performance/rankings', { params: { year, quarter } }),
}

const GRADE_COLOR: Record<string, string> = { A: '#52c41a', B: '#1677ff', C: '#faad14', D: '#ff4d4f' }

export default function SuppliersPage() {
  const [data, setData] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Supplier | null>(null)
  const [form] = Form.useForm()
  const [params, setParams] = useState({ keyword: '', page: 1, size: 10 })
  // 绩效相关
  const [perfDrawerOpen, setPerfDrawerOpen] = useState(false)
  const [perfSupplier, setPerfSupplier] = useState<Supplier | null>(null)
  const [perfHistory, setPerfHistory] = useState<PerformanceVO[]>([])
  const [evalOpen, setEvalOpen] = useState(false)
  const [evalForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  // 季度排名弹窗
  const [rankingOpen, setRankingOpen] = useState(false)
  const [rankings, setRankings] = useState<PerformanceVO[]>([])
  const [rankYear, setRankYear] = useState(dayjs().year())
  const [rankQuarter, setRankQuarter] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await suppliersApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [params])

  const handleSubmit = async (values: any) => {
    try {
      const payload = { ...values, licenseExpiry: values.licenseExpiry?.format('YYYY-MM-DD') }
      if (editRecord) {
        await suppliersApi.update(editRecord.id, payload)
        message.success('更新成功')
      } else {
        await suppliersApi.create(payload)
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleEdit = (record: Supplier) => {
    setEditRecord(record)
    form.setFieldsValue({ ...record, licenseExpiry: record.licenseExpiry ? dayjs(record.licenseExpiry) : null })
    setModalOpen(true)
  }

  const openPerfDrawer = async (record: Supplier) => {
    setPerfSupplier(record)
    setPerfDrawerOpen(true)
    const history = await performanceApi.getHistory(record.id)
    setPerfHistory(history)
  }

  const openRankings = async () => {
    setRankingOpen(true)
    const res = await performanceApi.getRankings(rankYear, rankQuarter)
    setRankings(res)
  }

  const handleEvaluate = async (values: any) => {
    if (!perfSupplier) return
    setSubmitting(true)
    try {
      await performanceApi.evaluate({
        supplierId: perfSupplier.id,
        evalYear: values.evalYear,
        evalQuarter: values.evalQuarter,
        deliveryRate: values.deliveryRate,
        serviceScore: values.serviceScore,
        remark: values.remark,
      })
      message.success('评价成功')
      setEvalOpen(false)
      evalForm.resetFields()
      const history = await performanceApi.getHistory(perfSupplier.id)
      setPerfHistory(history)
    } catch (e: any) {
      message.error(e?.message || '评价失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getLicenseTag = (record: Supplier) => {
    if (!record.licenseNo) return <Tag color="default">未填写</Tag>
    if (!record.licenseExpiry) return <Tag color="blue">{record.licenseNo}</Tag>
    const expiry = dayjs(record.licenseExpiry)
    const now = dayjs()
    if (expiry.isBefore(now)) return (
      <Tooltip title={`许可证已于 ${record.licenseExpiry} 过期`}>
        <Tag color="red" icon={<WarningOutlined />}>{record.licenseNo} 已过期</Tag>
      </Tooltip>
    )
    if (expiry.diff(now, 'day') <= 60) return (
      <Tooltip title={`许可证将于 ${record.licenseExpiry} 到期`}>
        <Tag color="orange" icon={<WarningOutlined />}>{record.licenseNo} 即将到期</Tag>
      </Tooltip>
    )
    return <Tag color="green">{record.licenseNo}</Tag>
  }

  const columns: ColumnsType<Supplier> = [
    { title: '供应商名称', dataIndex: 'supplierName', width: 180 },
    { title: '供应商编码', dataIndex: 'supplierCode', width: 130, render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '经营许可证', width: 200, render: (_, r) => getLicenseTag(r) },
    { title: '许可证到期日', dataIndex: 'licenseExpiry', width: 130, render: (v) => formatDate(v) },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag> },
    { title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => openPerfDrawer(record)}>绩效</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？"
            onConfirm={() => suppliersApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ]

  const latestPerf = perfHistory[0]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="供应商管理"
        extra={
          <Space>
            <Input placeholder="搜索供应商" prefix={<SearchOutlined />}
              value={params.keyword}
              onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
              allowClear className="w-[200px]" />
            <Button icon={<StarOutlined />} onClick={openRankings}>季度排名</Button>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增供应商
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>

      {/* 编辑弹窗 */}
      <Modal title={editRecord ? '编辑供应商' : '新增供应商'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} width={600} destroyOnClose>
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierName" label="供应商名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            {!editRecord && (
              <Col span={12}>
                <Form.Item name="supplierCode" label="供应商编码" rules={[{ required: true }]}>
                  <Input placeholder="如：SUP003" />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱"><Input /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label="地址"><Input.TextArea rows={2} /></Form.Item>
            </Col>
            <Col span={24}>
              <div style={{ fontWeight: 600, color: '#1677ff', marginBottom: 8 }}>经营许可证信息</div>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseNo" label="经营许可证号">
                <Input placeholder="如：粤食药监械经营许可证..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseExpiry" label="许可证到期日">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 绩效详情抽屉 */}
      <Drawer
        title={`供应商绩效 - ${perfSupplier?.supplierName}`}
        open={perfDrawerOpen}
        onClose={() => setPerfDrawerOpen(false)}
        width={560}
        extra={
          <Button type="primary" icon={<StarOutlined />}
            onClick={() => { evalForm.resetFields(); setEvalOpen(true) }}>
            新增评价
          </Button>
        }
      >
        {/* 最新评分概览 */}
        {latestPerf && (
          <Card size="small" className="mb-4" bordered>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>最新评价：{latestPerf.periodLabel}</span>
              <span style={{
                fontSize: 28, fontWeight: 700,
                color: GRADE_COLOR[latestPerf.grade] ?? '#666',
              }}>
                {latestPerf.grade}级
              </span>
            </div>
            <Row gutter={8}>
              {[
                { label: '综合得分', value: latestPerf.totalScore, color: GRADE_COLOR[latestPerf.grade] },
                { label: '质量合格率', value: latestPerf.qualityScore, color: '#1677ff' },
                { label: '价格竞争力', value: latestPerf.priceScore, color: '#722ed1' },
                { label: '交货及时率', value: latestPerf.deliveryScore, color: '#13c2c2' },
              ].map(item => (
                <Col span={12} key={item.label} className="mb-2">
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{item.label}</div>
                  <Progress
                    percent={Number(item.value)}
                    size="small"
                    strokeColor={item.color}
                    format={(p) => `${p?.toFixed(1)}`}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {/* 历史评价列表 */}
        <div style={{ fontWeight: 600, marginBottom: 8 }}>历史评价记录</div>
        <List
          dataSource={perfHistory}
          locale={{ emptyText: '暂无评价记录，点击右上角"新增评价"开始' }}
          renderItem={(item) => (
            <List.Item>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{item.periodLabel}</span>
                  <Space>
                    <span style={{ fontSize: 20, fontWeight: 700, color: GRADE_COLOR[item.grade] }}>
                      {item.grade}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{Number(item.totalScore).toFixed(1)}分</span>
                  </Space>
                </div>
                <Row gutter={8}>
                  <Col span={6}><Tag color="blue">质量 {Number(item.qualityScore).toFixed(0)}</Tag></Col>
                  <Col span={6}><Tag color="purple">价格 {Number(item.priceScore).toFixed(0)}</Tag></Col>
                  <Col span={6}><Tag color="cyan">交期 {Number(item.deliveryScore).toFixed(0)}</Tag></Col>
                  <Col span={6}><Tag>服务 {Number(item.serviceScore).toFixed(0)}</Tag></Col>
                </Row>
                {item.remark && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.remark}</div>}
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{item.createTime?.substring(0, 10)}</div>
              </div>
            </List.Item>
          )}
        />
      </Drawer>

      {/* 新增评价弹窗 */}
      <Modal
        title={`供应商评价 - ${perfSupplier?.supplierName}`}
        open={evalOpen}
        onCancel={() => { if (!submitting) setEvalOpen(false) }}
        onOk={() => evalForm.submit()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={evalForm} onFinish={handleEvaluate} layout="vertical" className="pt-2"
          initialValues={{ evalYear: dayjs().year(), evalQuarter: Math.ceil((dayjs().month() + 1) / 3) }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="evalYear" label="评价年份" rules={[{ required: true }]}>
                <Select>
                  {[2024, 2025, 2026].map(y => <Select.Option key={y} value={y}>{y}年</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="evalQuarter" label="评价季度" rules={[{ required: true }]}>
                <Select>
                  {[1, 2, 3, 4].map(q => <Select.Option key={q} value={q}>Q{q}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="deliveryRate" label="交货及时率（%）"
            tooltip="该季度内合同约定日期内到货的批次占比"
            rules={[{ required: true, message: '请填写交货及时率' }]}>
            <InputNumber min={0} max={100} precision={1} className="w-full" addonAfter="%" />
          </Form.Item>
          <Form.Item name="serviceScore" label="服务评分（0-100）"
            tooltip="综合评价供应商服务响应、售后处理等情况">
            <InputNumber min={0} max={100} precision={0} className="w-full" />
          </Form.Item>
          <Form.Item name="remark" label="评价说明">
            <Input.TextArea rows={3} placeholder="填写本季度综合评价说明..." />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#666', background: '#f5f5f5', padding: '8px 12px', borderRadius: 6 }}>
            质量合格率得分将自动从入库验收记录计算（权重40%），价格竞争力默认80分（权重25%）
          </div>
        </Form>
      </Modal>

      {/* 季度排名弹窗 */}
      <Modal
        title="供应商季度绩效排名"
        open={rankingOpen}
        onCancel={() => setRankingOpen(false)}
        footer={null}
        width={700}
      >
        <Space className="mb-4">
          <Select value={rankYear} onChange={(v) => setRankYear(v)} className="w-[100px]">
            {[2024, 2025, 2026].map(y => <Select.Option key={y} value={y}>{y}年</Select.Option>)}
          </Select>
          <Select value={rankQuarter} onChange={(v) => setRankQuarter(v)} className="w-[80px]">
            {[1, 2, 3, 4].map(q => <Select.Option key={q} value={q}>Q{q}</Select.Option>)}
          </Select>
          <Button type="primary" onClick={async () => {
            const res = await performanceApi.getRankings(rankYear, rankQuarter)
            setRankings(res)
          }}>查询</Button>
        </Space>
        <Table
          rowKey="id"
          size="small"
          dataSource={rankings}
          pagination={false}
          columns={[
            { title: '排名', width: 60, render: (_, __, idx) => idx + 1 },
            { title: '供应商', dataIndex: 'supplierName', width: 180 },
            {
              title: '综合评分', dataIndex: 'totalScore', width: 100,
              render: (v, r) => (
                <span style={{ fontWeight: 700, color: GRADE_COLOR[r.grade] }}>
                  {Number(v).toFixed(1)} ({r.grade})
                </span>
              ),
            },
            { title: '质量', dataIndex: 'qualityScore', width: 80, render: (v) => `${Number(v).toFixed(0)}` },
            { title: '价格', dataIndex: 'priceScore', width: 80, render: (v) => `${Number(v).toFixed(0)}` },
            { title: '交期', dataIndex: 'deliveryScore', width: 80, render: (v) => `${Number(v).toFixed(0)}` },
            { title: '服务', dataIndex: 'serviceScore', width: 80, render: (v) => `${Number(v).toFixed(0)}` },
          ]}
        />
      </Modal>
    </div>
  )
}
