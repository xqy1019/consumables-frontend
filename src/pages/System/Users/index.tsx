import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Tag, Modal, Form, Select,
  message, Popconfirm, Card, Switch,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { usersApi, rolesApi, departmentsApi } from '@/api/system'
import type { User, Role, Department } from '@/types'
import { formatDateTime } from '@/utils/format'

export default function UsersPage() {
  const [data, setData] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [form] = Form.useForm()
  const [params, setParams] = useState({ keyword: '', page: 1, size: 10 })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await usersApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [params])
  useEffect(() => {
    rolesApi.getAll().then(setRoles)
    departmentsApi.getAll().then(setDepartments)
  }, [])

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await usersApi.update(editRecord.id, { ...values, roleIds: values.roleIds })
        message.success('更新成功')
      } else {
        await usersApi.create({ ...values, roleIds: values.roleIds })
        message.success('创建成功')
      }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleEdit = (record: User) => {
    setEditRecord(record)
    form.setFieldsValue({ ...record, roleIds: record.roles?.map(r => r.id) })
    setModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    await usersApi.delete(id)
    message.success('删除成功')
    fetchData()
  }

  const handleStatusChange = async (id: number, checked: boolean) => {
    await usersApi.updateStatus(id, checked ? 1 : 0)
    fetchData()
  }

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '姓名', dataIndex: 'realName', width: 100 },
    { title: '所属科室', dataIndex: 'deptName', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    { title: '手机', dataIndex: 'phone', width: 130 },
    { title: '角色', dataIndex: 'roles', width: 200,
      render: (roles: Role[]) => roles?.map(r => <Tag key={r.id} color="blue">{r.roleName}</Tag>) },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v, record) => (
        <Switch checked={v === 1} size="small"
          onChange={(checked) => handleStatusChange(record.id, checked)} />
      ) },
    { title: '创建时间', dataIndex: 'createTime', width: 160,
      render: (v) => formatDateTime(v) },
    { title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
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
        title="用户管理"
        extra={
          <Space>
            <Input placeholder="搜索用户名/姓名" prefix={<SearchOutlined />}
              value={params.keyword}
              onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
              allowClear className="w-[200px]" />
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增用户
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>

      <Modal title={editRecord ? '编辑用户' : '新增用户'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()} destroyOnClose>
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="pt-2">
          {!editRecord && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="realName" label="姓名"><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="phone" label="手机"><Input /></Form.Item>
          <Form.Item name="deptId" label="所属科室">
            <Select allowClear>
              {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" allowClear>
              {roles.map(r => <Select.Option key={r.id} value={r.id}>{r.roleName}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
