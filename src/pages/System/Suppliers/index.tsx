import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Modal, Form, message, Popconfirm,
  Card, Tag, DatePicker, Row, Col, Tooltip,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { suppliersApi } from '@/api/system'
import type { Supplier } from '@/types'

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
      const payload = {
        ...values,
        licenseExpiry: values.licenseExpiry?.format('YYYY-MM-DD'),
      }
      if (editRecord) {
        await suppliersApi.update(editRecord.id, payload)
        message.success('更新成功')
      } else {
        await suppliersApi.create(payload)
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch {}
  }

  const handleEdit = (record: Supplier) => {
    setEditRecord(record)
    form.setFieldsValue({
      ...record,
      licenseExpiry: record.licenseExpiry ? dayjs(record.licenseExpiry) : null,
    })
    setModalOpen(true)
  }

  const getLicenseTag = (record: Supplier) => {
    if (!record.licenseNo) return <Tag color="default">未填写</Tag>
    if (!record.licenseExpiry) return <Tag color="blue">{record.licenseNo}</Tag>
    const expiry = dayjs(record.licenseExpiry)
    const now = dayjs()
    if (expiry.isBefore(now)) return (
      <Tooltip title={`许可证将于 ${record.licenseExpiry} 已过期`}>
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
    { title: '供应商编码', dataIndex: 'supplierCode', width: 130,
      render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'phone', width: 130 },
    { title: '经营许可证', width: 200, render: (_, r) => getLicenseTag(r) },
    { title: '许可证到期日', dataIndex: 'licenseExpiry', width: 130 },
    { title: '邮箱', dataIndex: 'email', width: 160, ellipsis: true },
    { title: '地址', dataIndex: 'address', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag> },
    { title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？"
            onConfirm={() => suppliersApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ]

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
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增供应商
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>

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
    </div>
  )
}
