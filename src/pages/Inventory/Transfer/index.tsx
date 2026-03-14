import React, { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, message, Card,
  Tag, InputNumber, Select, Row, Col,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inventoryExtApi } from '@/api/inventoryExt'
import { inventoryApi } from '@/api/inventory'
import type { TransferVO, Inventory } from '@/types'
import { formatDateTime } from '@/utils/format'

export default function TransferPage() {
  const [data, setData] = useState<TransferVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [selectedInv, setSelectedInv] = useState<Inventory | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await inventoryExtApi.getTransfers(page)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  const fetchInventories = async () => {
    const res = await inventoryApi.getList({ status: 1, size: 100 })
    setInventories(res.records)
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchInventories() }, [])

  const handleCreate = async (values: any) => {
    try {
      await inventoryExtApi.createTransfer({
        inventoryId: values.inventoryId,
        quantity: values.quantity,
        toLocation: values.toLocation,
        remark: values.remark,
      })
      message.success('移库记录已创建')
      setCreateOpen(false)
      form.resetFields()
      setSelectedInv(null)
      fetchData()
      fetchInventories()
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : '操作失败，请重试') }
  }

  const columns: ColumnsType<TransferVO> = [
    { title: '移库单号', dataIndex: 'transferNo', width: 180 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '原库位', dataIndex: 'fromLocation', width: 120 },
    { title: '目标库位', dataIndex: 'toLocation', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color="success">已完成</Tag>,
    },
    { title: '操作人', dataIndex: 'operatorName', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'createTime', width: 160, render: (v) => formatDateTime(v) },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="库存移库"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            form.resetFields(); setSelectedInv(null); setCreateOpen(true)
          }}>新建移库</Button>
        }
      >
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      <Modal title="新建移库" open={createOpen}
        onCancel={() => { setCreateOpen(false); setSelectedInv(null) }} onOk={() => form.submit()}
        width={560} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Form.Item name="inventoryId" label="选择库存记录" rules={[{ required: true }]}
            extra="请选择具体库存批次">
            <Select
              showSearch
              filterOption={(v, o) => (o?.label as string)?.toLowerCase().includes(v.toLowerCase()) ?? false}
              onChange={id => {
                const inv = inventories.find(i => i.id === id)
                setSelectedInv(inv || null)
                if (inv) form.setFieldsValue({ fromLocation: inv.location })
              }}
              options={inventories.map(inv => ({
                value: inv.id,
                label: `${inv.materialName}（${inv.specification || '-'}）批号:${inv.batchNumber || '-'} 库存:${inv.quantity} 库位:${inv.location || '-'}`,
              }))}
            />
          </Form.Item>
          {selectedInv && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="quantity" label={`数量（当前库存：${selectedInv.quantity}）`} rules={[{ required: true }]}>
                  <InputNumber min={1} max={selectedInv.quantity} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="toLocation" label="目标库位" rules={[{ required: true }]}>
                  <Input placeholder="如：B区-02" />
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
