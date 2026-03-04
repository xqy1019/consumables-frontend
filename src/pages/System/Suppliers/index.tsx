import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Modal, Form, message, Popconfirm,
  Card, Row, Col, Typography, Tag,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { suppliersApi } from '@/api/system'
import type { Supplier } from '@/types'

const { Title } = Typography

export default function SuppliersPage() {
  const [data, setData] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Supplier | null>(null)
  const [form] = Form.useForm()
  const [params, setParams] = useState({ keyword: '', page: 1, size: 10 })

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
      if (editRecord) {
        await suppliersApi.update(editRecord.id, values)
        message.success('更新成功')
      } else {
        await suppliersApi.create(values)
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch {}
  }

  const columns: ColumnsType<Supplier> = [
    { title: '供应商名称', dataIndex: 'supplierName', width: 180 },
    { title: '供应商编码', dataIndex: 'supplierCode', width: 130,
      render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag> },
    { title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true) }} />
          <Popconfirm title="确认删除？"
            onConfirm={() => suppliersApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>供应商管理</Title></Col>
          <Col>
            <Space>
              <Input placeholder="搜索供应商" prefix={<SearchOutlined />}
                value={params.keyword}
                onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
                allowClear style={{ width: 200 }} />
              <Button type="primary" icon={<PlusOutlined />}
                onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
                新增供应商
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>
      <Modal title={editRecord ? '编辑供应商' : '新增供应商'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} destroyOnClose>
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="supplierName" label="供应商名称" rules={[{ required: true }]}><Input /></Form.Item>
          {!editRecord && (
            <Form.Item name="supplierCode" label="供应商编码" rules={[{ required: true }]}>
              <Input placeholder="如：SUP003" />
            </Form.Item>
          )}
          <Form.Item name="contactPerson" label="联系人"><Input /></Form.Item>
          <Form.Item name="phone" label="联系电话"><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
