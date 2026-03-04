import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col,
  Typography, Tag, Drawer, InputNumber,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { dictApi } from '@/api/dict'
import type { DictType, DictItem } from '@/types'

const { Title } = Typography

export default function DictPage() {
  const [types, setTypes] = useState<DictType[]>([])
  const [typeTotal, setTypeTotal] = useState(0)
  const [typeLoading, setTypeLoading] = useState(false)
  const [typePage, setTypePage] = useState({ page: 1, size: 10 })
  const [keyword, setKeyword] = useState('')
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editType, setEditType] = useState<DictType | null>(null)
  const [typeForm] = Form.useForm()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentType, setCurrentType] = useState<DictType | null>(null)
  const [items, setItems] = useState<DictItem[]>([])
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<DictItem | null>(null)
  const [itemForm] = Form.useForm()

  const fetchTypes = async () => {
    setTypeLoading(true)
    try {
      const res = await dictApi.getTypes({ keyword: keyword || undefined, ...typePage })
      setTypes(res.records)
      setTypeTotal(res.total)
    } finally { setTypeLoading(false) }
  }

  useEffect(() => { fetchTypes() }, [typePage, keyword])

  const fetchItems = async (dictId: number) => {
    const res = await dictApi.getItems(dictId)
    setItems(res)
  }

  const handleTypeSubmit = async (values: any) => {
    try {
      if (editType) {
        await dictApi.updateType(editType.id, { dictName: values.dictName, remark: values.remark })
        message.success('更新成功')
      } else {
        await dictApi.createType({ dictCode: values.dictCode, dictName: values.dictName, remark: values.remark })
        message.success('创建成功')
      }
      setTypeModalOpen(false)
      typeForm.resetFields()
      setEditType(null)
      fetchTypes()
    } catch {}
  }

  const handleDeleteType = (id: number) => {
    Modal.confirm({
      title: '确认删除该字典？同时将删除所有字典项',
      onOk: async () => {
        try {
          await dictApi.deleteType(id)
          message.success('删除成功')
          fetchTypes()
        } catch {}
      },
    })
  }

  const handleItemSubmit = async (values: any) => {
    try {
      if (editItem) {
        await dictApi.updateItem(editItem.id, {
          itemLabel: values.itemLabel,
          itemValue: values.itemValue,
          sortOrder: values.sortOrder,
          remark: values.remark,
        })
        message.success('更新成功')
      } else {
        await dictApi.createItem({
          dictId: currentType!.id,
          itemLabel: values.itemLabel,
          itemValue: values.itemValue,
          sortOrder: values.sortOrder ?? 0,
          remark: values.remark,
        })
        message.success('创建成功')
      }
      setItemModalOpen(false)
      itemForm.resetFields()
      setEditItem(null)
      if (currentType) fetchItems(currentType.id)
    } catch {}
  }

  const handleDeleteItem = (id: number) => {
    Modal.confirm({
      title: '确认删除该字典项？',
      onOk: async () => {
        try {
          await dictApi.deleteItem(id)
          message.success('删除成功')
          if (currentType) fetchItems(currentType.id)
        } catch {}
      },
    })
  }

  const typeColumns: ColumnsType<DictType> = [
    { title: '字典编码', dataIndex: 'dictCode', width: 180 },
    { title: '字典名称', dataIndex: 'dictName', width: 200 },
    { title: '描述', dataIndex: 'remark', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>,
    },
    { title: '创建时间', dataIndex: 'createTime', width: 160, render: v => v?.replace('T', ' ')?.slice(0, 16) },
    {
      title: '操作', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<UnorderedListOutlined />} onClick={() => {
            setCurrentType(record)
            fetchItems(record.id)
            setDrawerOpen(true)
          }}>字典项</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditType(record)
            typeForm.setFieldsValue(record)
            setTypeModalOpen(true)
          }}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDeleteType(record.id)}>删除</Button>
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<DictItem> = [
    { title: '标签（显示名）', dataIndex: 'itemLabel', width: 160 },
    { title: '值（存储值）', dataIndex: 'itemValue', width: 160 },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: v => <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '启用' : '禁用'}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 130,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditItem(record)
            itemForm.setFieldsValue(record)
            setItemModalOpen(true)
          }}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />}
            onClick={() => handleDeleteItem(record.id)}>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col><Title level={4} style={{ margin: 0 }}>字典管理</Title></Col>
          <Col>
            <Space>
              <Input.Search
                placeholder="搜索字典名称/编码"
                allowClear
                onSearch={v => { setKeyword(v); setTypePage({ page: 1, size: 10 }) }}
                style={{ width: 220 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setEditType(null); typeForm.resetFields(); setTypeModalOpen(true)
              }}>新建字典</Button>
            </Space>
          </Col>
        </Row>
      </Card>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          rowKey="id" columns={typeColumns} dataSource={types}
          loading={typeLoading} scroll={{ x: 800 }}
          pagination={{
            total: typeTotal, current: typePage.page, pageSize: typePage.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (page, size) => setTypePage({ page, size }),
          }}
        />
      </Card>

      {/* 字典类型弹窗 */}
      <Modal
        title={editType ? '编辑字典' : '新建字典'} open={typeModalOpen}
        onCancel={() => { setTypeModalOpen(false); setEditType(null) }}
        onOk={() => typeForm.submit()} destroyOnClose
      >
        <Form form={typeForm} onFinish={handleTypeSubmit} layout="vertical" style={{ paddingTop: 8 }}>
          {!editType && (
            <Form.Item name="dictCode" label="字典编码" rules={[{ required: true, message: '请输入字典编码' }]}
              extra="建议小写英文+下划线，如 material_type">
              <Input placeholder="如：material_type" />
            </Form.Item>
          )}
          <Form.Item name="dictName" label="字典名称" rules={[{ required: true, message: '请输入字典名称' }]}>
            <Input placeholder="如：耗材类型" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 字典项抽屉 */}
      <Drawer
        title={`字典项管理 - ${currentType?.dictName}（${currentType?.dictCode}）`}
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        width={680}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditItem(null); itemForm.resetFields(); setItemModalOpen(true)
          }}>添加字典项</Button>
        }
      >
        <Table
          rowKey="id" columns={itemColumns} dataSource={items}
          pagination={false} size="small"
        />
      </Drawer>

      {/* 字典项弹窗 */}
      <Modal
        title={editItem ? '编辑字典项' : '添加字典项'} open={itemModalOpen}
        onCancel={() => { setItemModalOpen(false); setEditItem(null) }}
        onOk={() => itemForm.submit()} destroyOnClose
      >
        <Form form={itemForm} onFinish={handleItemSubmit} layout="vertical" style={{ paddingTop: 8 }}>
          <Form.Item name="itemLabel" label="标签（显示名）" rules={[{ required: true }]}>
            <Input placeholder="如：注射类" />
          </Form.Item>
          <Form.Item name="itemValue" label="值（存储值）" rules={[{ required: true }]}>
            <Input placeholder="如：injection（建议与标签一致或用英文）" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
