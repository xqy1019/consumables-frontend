import React, { useState, useEffect } from 'react'
import {
  Table, Button, Modal, Form, Input, message, Card, Row, Col,
  Typography, Tag, InputNumber, Select,
} from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inventoryExtApi } from '@/api/inventoryExt'
import { inventoryApi } from '@/api/inventory'
import type { DamageVO, Inventory } from '@/types'

const { Title } = Typography

export default function DamagePage() {
  const [data, setData] = useState<DamageVO[]>([])
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
      const res = await inventoryExtApi.getDamages(page)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  const fetchInventories = async () => {
    const res = await inventoryApi.getList({ status: 1, size: 200 })
    setInventories(res.records)
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchInventories() }, [])

  const handleCreate = async (values: any) => {
    try {
      await inventoryExtApi.createDamage({
        inventoryId: values.inventoryId,
        quantity: values.quantity,
        damageReason: values.damageReason,
        remark: values.remark,
      })
      message.success('报损记录已提交')
      setCreateOpen(false)
      form.resetFields()
      setSelectedInv(null)
      fetchData()
      fetchInventories()
    } catch {}
  }

  const columns: ColumnsType<DamageVO> = [
    { title: '报损单号', dataIndex: 'damageNo', width: 180 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    { title: '报损数量', dataIndex: 'quantity', width: 90 },
    { title: '报损原因', dataIndex: 'damageReason', width: 160, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: () => <Tag color="success">已确认</Tag>,
    },
    { title: '操作人', dataIndex: 'operatorName', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'createTime', width: 160 },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>库存报损</Title></Col>
          <Col>
            <Button type="primary" danger icon={<WarningOutlined />} onClick={() => {
              form.resetFields(); setSelectedInv(null); setCreateOpen(true)
            }}>申请报损</Button>
          </Col>
        </Row>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      <Modal title="申请报损" open={createOpen}
        onCancel={() => { setCreateOpen(false); setSelectedInv(null) }} onOk={() => form.submit()}
        width={560} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="inventoryId" label="选择库存记录" rules={[{ required: true }]}
            extra="请选择需要报损的具体批次">
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
          {selectedInv && (
            <Form.Item name="quantity" label={`报损数量（当前库存：${selectedInv.quantity}）`} rules={[{ required: true }]}>
              <InputNumber min={1} max={selectedInv.quantity} style={{ width: '100%' }} />
            </Form.Item>
          )}
          <Form.Item name="damageReason" label="报损原因" rules={[{ required: true }]}>
            <Input placeholder="如：过期/破损/污染/变质" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
