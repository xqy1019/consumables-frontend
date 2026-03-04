import React, { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, message, Card, Row, Col,
  Typography, Tag, InputNumber, Select, DatePicker,
} from 'antd'
import { PlusOutlined, RollbackOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inventoryExtApi } from '@/api/inventoryExt'
import { inventoryApi } from '@/api/inventory'
import { departmentsApi } from '@/api/system'
import type { BorrowingVO, Inventory, Department } from '@/types'

const { Title } = Typography

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  BORROWED: { label: '借用中', color: 'processing' },
  RETURNED: { label: '已归还', color: 'success' },
  OVERDUE: { label: '已逾期', color: 'error' },
}

export default function BorrowingPage() {
  const [data, setData] = useState<BorrowingVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedInv, setSelectedInv] = useState<Inventory | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await inventoryExtApi.getBorrowings(page)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  const fetchInventories = async () => {
    const res = await inventoryApi.getList({ status: 1, size: 200 })
    setInventories(res.records)
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => {
    fetchInventories()
    departmentsApi.getAll().then(setDepartments)
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        inventoryId: values.inventoryId,
        quantity: values.quantity,
        deptId: values.deptId,
        borrowerName: values.borrowerName,
        expectedReturnDate: values.expectedReturnDate?.format('YYYY-MM-DD'),
        remark: values.remark,
      }
      await inventoryExtApi.createBorrowing(payload)
      message.success('借用记录已创建')
      setCreateOpen(false)
      form.resetFields()
      setSelectedInv(null)
      fetchData()
      fetchInventories()
    } catch {}
  }

  const handleReturn = async (id: number) => {
    try {
      await inventoryExtApi.returnBorrowing(id)
      message.success('已登记归还，库存已恢复')
      fetchData()
    } catch {}
  }

  const columns: ColumnsType<BorrowingVO> = [
    { title: '借用单号', dataIndex: 'borrowingNo', width: 180 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '借用科室', dataIndex: 'deptName', width: 120 },
    { title: '借用人', dataIndex: 'borrowerName', width: 100 },
    { title: '借用日期', dataIndex: 'borrowingDate', width: 160 },
    { title: '预计归还', dataIndex: 'expectedReturnDate', width: 110 },
    { title: '实际归还', dataIndex: 'actualReturnDate', width: 110, render: v => v || '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => record.status === 'BORROWED' ? (
        <Button size="small" icon={<RollbackOutlined />}
          onClick={() => Modal.confirm({
            title: '确认归还？库存将恢复相应数量',
            onOk: () => handleReturn(record.id),
          })}>归还</Button>
      ) : null,
    },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>耗材借用</Title></Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              form.resetFields(); setSelectedInv(null); setCreateOpen(true)
            }}>新建借用</Button>
          </Col>
        </Row>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1200 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      <Modal title="新建借用申请" open={createOpen}
        onCancel={() => { setCreateOpen(false); setSelectedInv(null) }} onOk={() => form.submit()}
        width={580} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="inventoryId" label="选择库存记录" rules={[{ required: true }]}
            extra="请选择具体库存批次">
            <Select
              showSearch
              filterOption={(v, o) => (o?.label as string)?.toLowerCase().includes(v.toLowerCase()) ?? false}
              onChange={id => setSelectedInv(inventories.find(i => i.id === id) || null)}
              options={inventories.map(inv => ({
                value: inv.id,
                label: `${inv.materialName}（${inv.specification || '-'}）批号:${inv.batchNumber || '-'} 库存:${inv.quantity}`,
              }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label={`借用数量${selectedInv ? `（库存：${selectedInv.quantity}）` : ''}`} rules={[{ required: true }]}>
                <InputNumber min={1} max={selectedInv?.quantity} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="borrowerName" label="借用人" rules={[{ required: true }]}>
                <Input placeholder="借用人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deptId" label="借用科室">
                <Select allowClear>
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedReturnDate" label="预计归还日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
