import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Select, Tag, Modal, Form,
  InputNumber, message, Popconfirm, Card, Row, Col,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { materialsApi } from '@/api/materials'
import { suppliersApi } from '@/api/system'
import type { Material, Supplier } from '@/types'
import { MATERIAL_CATEGORIES } from '@/types'

export default function MaterialsPage() {
  const [data, setData] = useState<Material[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Material | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form] = Form.useForm()
  const [params, setParams] = useState({ keyword: '', category: '', status: 1, page: 1, size: 10 })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await materialsApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [params])
  useEffect(() => { suppliersApi.getActive().then(setSuppliers) }, [])

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await materialsApi.update(editRecord.id, values)
        message.success('更新成功')
      } else {
        await materialsApi.create(values)
        message.success('创建成功')
      }
      setModalOpen(false)
      form.resetFields()
      setEditRecord(null)
      fetchData()
    } catch {}
  }

  const handleEdit = (record: Material) => {
    setEditRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await materialsApi.delete(id)
    message.success('删除成功')
    fetchData()
  }

  const columns: ColumnsType<Material> = [
    { title: '耗材编码', dataIndex: 'materialCode', width: 120, fixed: 'left' },
    { title: '耗材名称', dataIndex: 'materialName', width: 160 },
    { title: '分类', dataIndex: 'category', width: 100,
      render: (v) => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '供应商', dataIndex: 'supplierName', width: 140 },
    { title: '标准价格', dataIndex: 'standardPrice', width: 100,
      render: (v) => v != null ? `¥${v.toFixed(2)}` : '-' },
    { title: '当前库存', dataIndex: 'currentStock', width: 100,
      render: (v, record) => (
        <Tag color={v < (record.minStock || 0) ? 'red' : 'green'}>{v}</Tag>
      ) },
    { title: '最低库存', dataIndex: 'minStock', width: 90 },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag> },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="耗材字典"
        extra={
          <Space>
            <Input placeholder="搜索耗材名称/编码" prefix={<SearchOutlined />}
              value={params.keyword}
              onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
              className="w-[220px]" allowClear />
            <Select placeholder="耗材分类" value={params.category || undefined}
              onChange={(v) => setParams({ ...params, category: v || '', page: 1 })}
              allowClear className="w-[140px]">
              {MATERIAL_CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增耗材
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }}
        />
      </Card>

      <Modal
        title={editRecord ? '编辑耗材' : '新增耗材'}
        open={modalOpen} onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} width={640} destroyOnClose
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="materialCode" label="耗材编码" rules={[{ required: true }]}>
                <Input disabled={!!editRecord} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="materialName" label="耗材名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="耗材分类">
                <Select allowClear>
                  {MATERIAL_CATEGORIES.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="specification" label="规格型号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="计量单位">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="standardPrice" label="标准价格(元)">
                <InputNumber min={0} precision={2} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="supplierId" label="主供应商">
                <Select allowClear>
                  {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.supplierName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="最低库存" initialValue={0}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxStock" label="最高库存" initialValue={1000}>
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="leadTime" label="采购周期(天)" initialValue={7}>
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
