import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, InputNumber, Select,
  DatePicker, message, Card, Row, Col, Tag, Tabs, Badge, Input, Alert, Tooltip,
} from 'antd'
import { PlusOutlined, DownloadOutlined, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { inventoryApi } from '@/api/inventory'
import { materialsApi } from '@/api/materials'
import { suppliersApi, departmentsApi } from '@/api/system'
import type { Inventory, Material, Supplier, Department } from '@/types'
import { formatDate } from '@/utils/format'

export default function InventoryPage() {
  const [data, setData] = useState<Inventory[]>([])
  const [alerts, setAlerts] = useState<Inventory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [inboundOpen, setInboundOpen] = useState(false)
  const [outboundOpen, setOutboundOpen] = useState(false)
  const [outboundRecord, setOutboundRecord] = useState<Inventory | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [params, setParams] = useState({ page: 1, size: 10, status: 1, keyword: '' })
  const [keyword, setKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inboundForm] = Form.useForm()
  const [outboundForm] = Form.useForm()
  const [fefoBatches, setFefoBatches] = useState<Inventory[]>([])
  const [fefoLoading, setFefoLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  const fetchAlerts = async () => {
    const res = await inventoryApi.getAlerts()
    setAlerts(res)
  }

  useEffect(() => { fetchData() }, [params])
  useEffect(() => {
    fetchAlerts()
    materialsApi.getActive().then(setMaterials)
    suppliersApi.getActive().then(setSuppliers)
    departmentsApi.getAll().then(setDepartments)
  }, [])

  const handleSearch = () => {
    setParams({ ...params, keyword, page: 1 })
  }

  const handleInbound = async (values: any) => {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        manufactureDate: values.manufactureDate?.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
        receiveDate: values.receiveDate?.format('YYYY-MM-DD'),
      }
      await inventoryApi.inbound(payload)
      message.success('入库成功')
      setInboundOpen(false)
      inboundForm.resetFields()
      fetchData()
      fetchAlerts()
    } catch (e: any) {
      message.error(e?.message || '入库失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOutbound = async (values: any) => {
    if (!outboundRecord) return
    setSubmitting(true)
    try {
      await inventoryApi.outbound({ inventoryId: outboundRecord.id, ...values })
      message.success('出库成功')
      setOutboundOpen(false)
      outboundForm.resetFields()
      setFefoBatches([])
      fetchData()
    } catch (e: any) {
      message.error(e?.message || '出库失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const openOutbound = async (record: Inventory) => {
    setOutboundRecord(record)
    outboundForm.resetFields()
    setOutboundOpen(true)
    // 加载该耗材的 FEFO 批次建议
    if (record.materialId) {
      setFefoLoading(true)
      try {
        const batches = await inventoryApi.getBatchSuggestion(record.materialId)
        setFefoBatches(batches)
      } finally {
        setFefoLoading(false)
      }
    }
  }

  const columns: ColumnsType<Inventory> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150, fixed: 'left' },
    { title: '编码', dataIndex: 'materialCode', width: 110 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    {
      title: '数量', dataIndex: 'quantity', width: 80,
      render: (v, r) => <Tag color={r.lowStock ? 'red' : v < 20 ? 'orange' : 'green'}>{v}</Tag>,
    },
    { title: '库位', dataIndex: 'location', width: 100 },
    {
      title: '有效期', dataIndex: 'expiryDate', width: 120,
      render: (v, r) => v ? <Tag color={r.expiring ? 'red' : 'default'}>{formatDate(v)}</Tag> : '-',
    },
    { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
    { title: '入库日期', dataIndex: 'receiveDate', width: 110, render: (v) => formatDate(v) },
    {
      title: '验收状态', dataIndex: 'inspectionStatus', width: 100,
      render: (v) => {
        if (!v || v === 'PASSED') return <Tag color="green">验收合格</Tag>
        if (v === 'PENDING') return <Tag color="orange">待验收</Tag>
        return <Tag color="red">验收不合格</Tag>
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '在库' : '已出库'}</Tag>,
    },
    {
      title: '操作', width: 80, fixed: 'right',
      render: (_, record) => record.status === 1 && record.quantity > 0 ? (
        <Button size="small" icon={<DownloadOutlined />} onClick={() => openOutbound(record)}>
          出库
        </Button>
      ) : null,
    },
  ]

  const alertColumns: ColumnsType<Inventory> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 160 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    {
      title: '有效期', dataIndex: 'expiryDate', width: 120,
      render: (v, r) => v ? <Tag color={r.expiring ? 'red' : 'orange'}>{formatDate(v)}</Tag> : '-',
    },
    {
      title: '预警类型', width: 120,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {r.expiring && <Tag color="red">即将过期</Tag>}
          {r.lowStock && <Tag color="orange">库存不足</Tag>}
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'list',
      label: '库存列表',
      children: (
        <>
          <Row gutter={8} className="mb-4">
            <Col flex="1">
              <Input
                placeholder="搜索耗材名称或编码"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                onClear={() => { setKeyword(''); setParams({ ...params, keyword: '', page: 1 }) }}
              />
            </Col>
            <Col>
              <Select
                placeholder="状态筛选"
                value={params.status}
                onChange={v => setParams({ ...params, status: v, page: 1 })}
                className="w-[120px]"
              >
                <Select.Option value={1}>在库</Select.Option>
                <Select.Option value={0}>已出库</Select.Option>
              </Select>
            </Col>
            <Col>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
            </Col>
          </Row>
          <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
            scroll={{ x: 1100 }}
            pagination={{
              total, current: params.page, pageSize: params.size,
              showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
              onChange: (page, size) => setParams({ ...params, page, size }),
            }} />
        </>
      ),
    },
    {
      key: 'alerts',
      label: <Badge count={alerts.length} offset={[8, 0]}>预警列表</Badge>,
      children: (
        <Table rowKey="id" columns={alertColumns} dataSource={alerts} pagination={false} />
      ),
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="库存管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { inboundForm.resetFields(); setInboundOpen(true) }}>
            耗材入库
          </Button>
        }
      >
        <Tabs items={tabItems} />
      </Card>

      {/* 入库弹窗 */}
      <Modal title="耗材入库" open={inboundOpen}
        onCancel={() => { if (!submitting) setInboundOpen(false) }}
        onOk={() => inboundForm.submit()}
        confirmLoading={submitting}
        width={600} destroyOnClose>
        <Form form={inboundForm} onFinish={handleInbound} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="materialId" label="耗材" rules={[{ required: true }]}>
                <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false} placeholder="选择耗材">
                  {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}（{m.specification}）</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="入库数量" rules={[{ required: true }]}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchNumber" label="批号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="库位">
                <Input placeholder="如：A区-01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="supplierId" label="供应商">
                <Select allowClear>
                  {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.supplierName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receiveDate" label="入库日期">
                <DatePicker className="w-full" defaultValue={dayjs()} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manufactureDate" label="生产日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="有效期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="inspectionStatus" label="验收结果" initialValue="PASSED">
                <Select>
                  <Select.Option value="PASSED">验收合格</Select.Option>
                  <Select.Option value="PENDING">待验收</Select.Option>
                  <Select.Option value="REJECTED">验收不合格</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="inspectionRemark" label="验收备注">
                <Input placeholder="填写验收情况说明" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 出库弹窗 */}
      <Modal title={`出库 - ${outboundRecord?.materialName}`} open={outboundOpen}
        onCancel={() => { if (!submitting) { setOutboundOpen(false); setFefoBatches([]) } }}
        onOk={() => outboundForm.submit()}
        confirmLoading={submitting}
        destroyOnClose width={520}>
        <Form form={outboundForm} onFinish={handleOutbound} layout="vertical" className="pt-2">
          {/* FEFO 批次信息提示 */}
          {fefoBatches.length > 0 && (() => {
            const earliest = fefoBatches[0]
            const isCurrentEarliest = earliest.id === outboundRecord?.id
            return (
              <Alert
                type={isCurrentEarliest ? 'success' : 'warning'}
                style={{ marginBottom: 12 }}
                message={
                  isCurrentEarliest
                    ? '此批次为最近效期，符合 FEFO 原则'
                    : `建议优先出库：批号 ${earliest.batchNumber}，有效期 ${formatDate(earliest.expiryDate) || '未知'}（剩余 ${earliest.quantity} 件）`
                }
                icon={<InfoCircleOutlined />}
                showIcon
              />
            )
          })()}
          <Form.Item name="quantity" label={`出库数量（当前批次库存：${outboundRecord?.quantity}）`}
            rules={[{ required: true }, { type: 'number', max: outboundRecord?.quantity, message: '超出库存' }]}>
            <InputNumber min={1} max={outboundRecord?.quantity} className="w-full" />
          </Form.Item>
          <Form.Item name="deptId" label="领用科室">
            <Select allowClear>
              {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
