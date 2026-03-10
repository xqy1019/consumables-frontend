import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col,
  Tag, Drawer, Descriptions, InputNumber, DatePicker, Select,
} from 'antd'
import { PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined, SendOutlined, InboxOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { purchaseApi } from '@/api/purchase'
import { materialsApi } from '@/api/materials'
import { departmentsApi, suppliersApi } from '@/api/system'
import type { RequisitionVO, PurchaseRequisitionItemVO, Material, Department, Supplier } from '@/types'
import { formatDateTime, formatDate } from '@/utils/format'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审批', color: 'processing' },
  APPROVED: { label: '已审批', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  RECEIVED: { label: '已收货', color: 'cyan' },
}

export default function PurchaseRequisitionPage() {
  const [data, setData] = useState<RequisitionVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<RequisitionVO | null>(null)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receiveLoading, setReceiveLoading] = useState(false)
  const [receiveRecord, setReceiveRecord] = useState<RequisitionVO | null>(null)
  const [receiveItems, setReceiveItems] = useState<any[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await purchaseApi.getRequisitions({ keyword, status: statusFilter, ...page })
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])
  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    departmentsApi.getAll().then(setDepartments)
    suppliersApi.getActive().then(setSuppliers)
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        requiredDate: values.requiredDate?.format('YYYY-MM-DD'),
        items: values.items || [],
      }
      await purchaseApi.createRequisition(payload)
      message.success('请购单已创建')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch {}
  }

  const handleSubmit = async (id: number) => {
    try {
      await purchaseApi.submitRequisition(id)
      message.success('已提交审批')
      fetchData()
    } catch {}
  }

  const handleApprove = async (id: number) => {
    try {
      await purchaseApi.approveRequisition(id, '审核通过')
      message.success('已审批通过')
      fetchData()
    } catch {}
  }

  const handleReject = async (id: number) => {
    try {
      await purchaseApi.rejectRequisition(id, '驳回')
      message.success('已驳回')
      fetchData()
    } catch {}
  }

  const handleViewDetail = async (record: RequisitionVO) => {
    const detail = await purchaseApi.getRequisitionDetail(record.id)
    setCurrentRecord(detail)
    setDetailOpen(true)
  }

  const handleOpenReceive = async (record: RequisitionVO) => {
    const detail = await purchaseApi.getRequisitionDetail(record.id)
    setReceiveRecord(detail)
    setReceiveItems((detail.items || []).map((item: PurchaseRequisitionItemVO) => ({
      materialId: item.materialId,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      batchNumber: '',
      supplierId: null,
      location: '',
      expiryDate: null,
    })))
    setReceiveOpen(true)
  }

  const handleReceiveGoods = async () => {
    setReceiveLoading(true)
    try {
      const items = receiveItems.map(item => ({
        materialId: item.materialId,
        quantity: item.quantity,
        batchNumber: item.batchNumber || undefined,
        supplierId: item.supplierId || undefined,
        location: item.location || undefined,
        expiryDate: item.expiryDate ? dayjs(item.expiryDate).format('YYYY-MM-DD') : undefined,
      }))
      await purchaseApi.receiveGoods(receiveRecord!.id, items)
      message.success('收货入库成功，库存已更新')
      setReceiveOpen(false)
      fetchData()
    } catch {
    } finally {
      setReceiveLoading(false)
    }
  }

  const columns: ColumnsType<RequisitionVO> = [
    { title: '请购单号', dataIndex: 'reqNo', width: 180 },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '需求日期', dataIndex: 'requiredDate', width: 110, render: (v) => formatDate(v) },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 160, render: (v) => formatDateTime(v) },
    {
      title: '操作', width: 260, fixed: 'right',
      render: (_, record) => (
        <Space size={4} wrap={false}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.status === 'DRAFT' && (
            <Button size="small" type="primary" icon={<SendOutlined />}
              onClick={() => Modal.confirm({ title: '确认提交审批？', onOk: () => handleSubmit(record.id) })}>
              提交
            </Button>
          )}
          {record.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}>通过</Button>
              <Button size="small" danger icon={<CloseOutlined />}
                onClick={() => handleReject(record.id)}>驳回</Button>
            </>
          )}
          {record.status === 'APPROVED' && (
            <Button size="small" type="primary" icon={<InboxOutlined />}
              style={{ background: '#13c2c2', borderColor: '#13c2c2' }}
              onClick={() => handleOpenReceive(record)}>收货入库</Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<PurchaseRequisitionItemVO> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '申购数量', dataIndex: 'quantity', width: 100 },
    { title: '预估单价', dataIndex: 'estimatedPrice', width: 100, render: v => v ? `¥${v}` : '-' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="请购单管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            form.resetFields(); setCreateOpen(true)
          }}>新建请购单</Button>
        }
      >
        <Row gutter={8} className="mb-4">
          <Col flex="1">
            <Input placeholder="搜索请购单号" value={keyword}
              onChange={e => setKeyword(e.target.value)} allowClear
              onClear={() => setKeyword('')} />
          </Col>
          <Col>
            <Select placeholder="状态筛选" value={statusFilter} onChange={setStatusFilter}
              allowClear className="w-[120px]">
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button type="primary" onClick={() => setPage({ ...page, page: 1 })}>搜索</Button>
          </Col>
        </Row>
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1100 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      {/* 创建请购单 */}
      <Modal title="新建请购单" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={() => form.submit()}
        width={800} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deptId" label="申购科室">
                <Select allowClear>
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="requiredDate" label="需求日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Row justify="space-between" align="middle" className="mb-2">
                  <Col><span className="font-semibold">申购明细</span></Col>
                  <Col><Button size="small" type="dashed" onClick={() => add()}>添加耗材</Button></Col>
                </Row>
                {fields.map(field => (
                  <Row key={field.key} gutter={8} align="top">
                    <Col flex="2">
                      <Form.Item name={[field.name, 'materialId']} rules={[{ required: true, message: '请选择耗材' }]}>
                        <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false} placeholder="选择耗材">
                          {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col flex="1">
                      <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
                        <InputNumber min={1} placeholder="数量" className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col flex="1">
                      <Form.Item name={[field.name, 'estimatedPrice']}>
                        <InputNumber min={0} placeholder="预估单价" className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Button danger size="small" onClick={() => remove(field.name)} className="mt-1">删除</Button>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={`请购单详情 - ${currentRecord?.reqNo}`}
        open={detailOpen} onClose={() => setDetailOpen(false)} width={700}
      >
        {currentRecord && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="请购单号">{currentRecord.reqNo}</Descriptions.Item>
              <Descriptions.Item label="科室">{currentRecord.deptName}</Descriptions.Item>
              <Descriptions.Item label="需求日期">{currentRecord.requiredDate}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentRecord.status]?.color}>{STATUS_MAP[currentRecord.status]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{currentRecord.remark}</Descriptions.Item>
            </Descriptions>
            <Table rowKey="id" columns={itemColumns} dataSource={currentRecord.items || []} pagination={false} />
          </>
        )}
      </Drawer>

      {/* 收货入库 Drawer */}
      <Drawer
        title={<Space><InboxOutlined style={{ color: '#13c2c2' }} />收货入库 — {receiveRecord?.reqNo}</Space>}
        open={receiveOpen} onClose={() => setReceiveOpen(false)} width={860}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setReceiveOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" loading={receiveLoading} onClick={handleReceiveGoods}
              style={{ background: '#13c2c2', borderColor: '#13c2c2' }}>
              确认收货入库
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
          请核对并补充每行耗材的批号、有效期等收货信息后提交，系统将自动增加对应库存。
        </div>
        <Table
          rowKey="materialId"
          dataSource={receiveItems}
          pagination={false}
          size="small"
          columns={[
            { title: '耗材名称', dataIndex: 'materialName', width: 140 },
            { title: '规格', dataIndex: 'specification', width: 100 },
            { title: '单位', dataIndex: 'unit', width: 60 },
            {
              title: '收货数量', dataIndex: 'quantity', width: 100,
              render: (v, _, idx) => (
                <InputNumber min={1} value={v} style={{ width: '100%' }}
                  onChange={val => {
                    const arr = [...receiveItems]
                    arr[idx].quantity = val
                    setReceiveItems(arr)
                  }} />
              ),
            },
            {
              title: '批号', dataIndex: 'batchNumber', width: 130,
              render: (v, _, idx) => (
                <Input value={v} placeholder="选填" style={{ width: '100%' }}
                  onChange={e => {
                    const arr = [...receiveItems]
                    arr[idx].batchNumber = e.target.value
                    setReceiveItems(arr)
                  }} />
              ),
            },
            {
              title: '有效期', dataIndex: 'expiryDate', width: 140,
              render: (v, _, idx) => (
                <DatePicker value={v ? dayjs(v) : null} style={{ width: '100%' }}
                  onChange={date => {
                    const arr = [...receiveItems]
                    arr[idx].expiryDate = date ? date.format('YYYY-MM-DD') : null
                    setReceiveItems(arr)
                  }} />
              ),
            },
            {
              title: '供应商', dataIndex: 'supplierId', width: 140,
              render: (v, _, idx) => (
                <Select value={v} allowClear placeholder="选填" style={{ width: '100%' }}
                  onChange={val => {
                    const arr = [...receiveItems]
                    arr[idx].supplierId = val
                    setReceiveItems(arr)
                  }}>
                  {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.supplierName}</Select.Option>)}
                </Select>
              ),
            },
            {
              title: '库位', dataIndex: 'location', width: 100,
              render: (v, _, idx) => (
                <Input value={v} placeholder="选填"
                  onChange={e => {
                    const arr = [...receiveItems]
                    arr[idx].location = e.target.value
                    setReceiveItems(arr)
                  }} />
              ),
            },
          ]}
        />
      </Drawer>
    </div>
  )
}
