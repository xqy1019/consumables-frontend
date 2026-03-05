import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Popconfirm,
  Card, Tag, Drawer, Checkbox, Divider, Typography, Row, Col
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { rolesApi } from '@/api/system'
import type { Role, Permission } from '@/types'
import { usePermission } from '@/hooks/usePermission'

const { Text } = Typography

export default function RolesPage() {
  const [data, setData] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Role | null>(null)
  const [form] = Form.useForm()

  // 权限分配抽屉
  const [permDrawerOpen, setPermDrawerOpen] = useState(false)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [checkedIds, setCheckedIds] = useState<number[]>([])
  const [permSaving, setPermSaving] = useState(false)

  const { can } = usePermission()
  const canEdit = can('role:edit')

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

  // 打开权限分配抽屉
  const openPermDrawer = async (role: Role) => {
    setPermRole(role)
    setPermDrawerOpen(true)
    try {
      const perms = await rolesApi.getAllPermissions()
      setAllPermissions(perms)
      setCheckedIds((role.permissions ?? []).map(p => p.id))
    } catch {}
  }

  const handleSavePermissions = async () => {
    if (!permRole) return
    setPermSaving(true)
    try {
      const updated = await rolesApi.assignPermissions(permRole.id, checkedIds)
      message.success('权限保存成功')
      setPermDrawerOpen(false)
      // 更新本地数据
      setData(prev => prev.map(r => r.id === updated.id ? updated : r))
    } catch {} finally {
      setPermSaving(false)
    }
  }

  // 按 type 分组
  const menuPerms = allPermissions.filter(p => p.type === 'menu')
  const actionPerms = allPermissions.filter(p => p.type === 'action')

  const columns: ColumnsType<Role> = [
    { title: '角色名称', dataIndex: 'roleName', width: 140 },
    {
      title: '角色编码', dataIndex: 'roleCode', width: 160,
      render: (v) => <Tag color="blue">{v}</Tag>
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '已分配权限', dataIndex: 'permissions', width: 260,
      render: (perms: Permission[]) => {
        if (!perms?.length) return <Text type="secondary">未分配</Text>
        return (
          <Space size={4} wrap>
            {perms.slice(0, 4).map(p => (
              <Tag key={p.id} color={p.type === 'menu' ? 'geekblue' : 'orange'} style={{ margin: 0 }}>
                {p.permissionName}
              </Tag>
            ))}
            {perms.length > 4 && <Tag color="default">+{perms.length - 4}</Tag>}
          </Space>
        )
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v) => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>
    },
    { title: '创建时间', dataIndex: 'createTime', width: 160, render: (v) => v?.slice(0, 16) },
    {
      title: '操作', width: 140,
      render: (_, record) => (
        <Space>
          <Button
            size="small" icon={<SafetyOutlined />} title="分配权限"
            onClick={() => openPermDrawer(record)}
          />
          {canEdit && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              <Popconfirm
                title="确认删除该角色？"
                onConfirm={() => rolesApi.delete(record.id).then(() => { message.success('删除成功'); fetchData() })}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="角色管理"
        extra={
          canEdit && (
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true) }}>
              新增角色
            </Button>
          )
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} />
      </Card>

      {/* 新增/编辑角色 Modal */}
      <Modal
        title={editRecord ? '编辑角色' : '新增角色'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields() }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" className="pt-2">
          <Form.Item name="roleName" label="角色名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editRecord && (
            <Form.Item name="roleCode" label="角色编码" rules={[{ required: true }]}
              extra="建议全大写字母，如：NURSE_MANAGER">
              <Input placeholder="如：NURSE_MANAGER" />
            </Form.Item>
          )}
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限分配抽屉 */}
      <Drawer
        title={`分配权限 — ${permRole?.roleName}`}
        open={permDrawerOpen}
        onClose={() => setPermDrawerOpen(false)}
        width={480}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setPermDrawerOpen(false)} style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary" loading={permSaving} onClick={handleSavePermissions}>
              保存权限
            </Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <Button size="small" onClick={() => setCheckedIds(allPermissions.map(p => p.id))}>全选</Button>
          <Button size="small" style={{ marginLeft: 8 }} onClick={() => setCheckedIds([])}>清空</Button>
        </div>

        <Divider orientation="left" orientationMargin={0}>
          <Text strong>菜单权限</Text>
        </Divider>
        <Row gutter={[8, 8]}>
          {menuPerms.map(p => (
            <Col span={12} key={p.id}>
              <Checkbox
                checked={checkedIds.includes(p.id)}
                onChange={e => {
                  setCheckedIds(prev =>
                    e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                  )
                }}
              >
                <span>{p.permissionName}</span>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>{p.permissionCode}</Text>
              </Checkbox>
            </Col>
          ))}
        </Row>

        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 20 }}>
          <Text strong>操作权限</Text>
        </Divider>
        <Row gutter={[8, 8]}>
          {actionPerms.map(p => (
            <Col span={12} key={p.id}>
              <Checkbox
                checked={checkedIds.includes(p.id)}
                onChange={e => {
                  setCheckedIds(prev =>
                    e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                  )
                }}
              >
                <span>{p.permissionName}</span>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>{p.permissionCode}</Text>
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Drawer>
    </div>
  )
}
