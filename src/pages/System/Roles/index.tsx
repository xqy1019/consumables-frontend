import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Card, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { rolesApi } from '@/api/system'
import type { Role } from '@/types'

export default function RolesPage() {
  const [data, setData] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Role | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try { setData(await rolesApi.getAll()) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await rolesApi.update(editRecord.id, values)
        message.success('更新成功')
      } else {
        await rolesApi.create(values)
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch {}
  }

  const handleEdit = (record: Role) => {
    setEditRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const columns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'roleName', width: 160 },
    { title: '角色编码', dataIndex: 'roleCode', width: 160,
      render: (v) => <Tag color="blue">{v}</Tag> },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'createTime', width: 160,
      render: (v) => v?.slice(0, 16) },
    { title: '操作', width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => rolesApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}>
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
        title="角色管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
            新增角色
          </Button>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} />
      </Card>
      <Modal title={editRecord ? '编辑角色' : '新增角色'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} destroyOnClose>
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="pt-2">
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true }]}><Input /></Form.Item>
          {!editRecord && (
            <Form.Item name="roleCode" label="角色编码" rules={[{ required: true }]}>
              <Input placeholder="如：NURSE_MANAGER" />
            </Form.Item>
          )}
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
