import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Card, Row, Col, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { departmentsApi } from '@/api/system'
import type { Department } from '@/types'

const { Title } = Typography

export default function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([])
  const [flatData, setFlatData] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Department | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tree, flat] = await Promise.all([departmentsApi.getTree(), departmentsApi.getAll()])
      setData(tree)
      setFlatData(flat)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await departmentsApi.update(editRecord.id, values)
        message.success('更新成功')
      } else {
        await departmentsApi.create(values)
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch {}
  }

  const columns: ColumnsType<Department> = [
    { title: '科室名称', dataIndex: 'deptName', width: 180 },
    { title: '科室编码', dataIndex: 'deptCode', width: 130 },
    { title: '层级', dataIndex: 'level', width: 70 },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '操作', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true) }} />
          <Popconfirm title="确认删除？"
            onConfirm={() => departmentsApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>科室管理</Title></Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增科室
            </Button>
          </Col>
        </Row>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          expandable={{ childrenColumnName: 'children' }} pagination={false} />
      </Card>
      <Modal title={editRecord ? '编辑科室' : '新增科室'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} destroyOnClose>
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="deptName" label="科室名称" rules={[{ required: true }]}><Input /></Form.Item>
          {!editRecord && (
            <Form.Item name="deptCode" label="科室编码" rules={[{ required: true }]}>
              <Input placeholder="如：NEIKE_2" />
            </Form.Item>
          )}
          <Form.Item name="parentId" label="上级科室">
            <Select allowClear>
              {flatData.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="level" label="层级" initialValue={2}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
