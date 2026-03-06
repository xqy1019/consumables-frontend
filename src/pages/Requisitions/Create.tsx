import React, { useState, useEffect } from 'react'
import {
  Card, Form, Select, DatePicker, Input, Button, Table, InputNumber,
  Row, Col, Typography, Space, message, Divider, Modal,
  Descriptions, Tag,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ArrowLeftOutlined,
  SendOutlined, SaveOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { requisitionsApi } from '@/api/requisitions'
import { departmentsApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import type { Material, Department } from '@/types'

const { Title } = Typography

export default function CreateRequisition() {
  const [form] = Form.useForm()
  const [items, setItems] = useState<{ materialId?: number; quantity?: number; remark?: string; key: number }[]>([
    { key: Date.now() }
  ])
  const [materials, setMaterials] = useState<Material[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    departmentsApi.getAll().then(setDepartments)
  }, [])

  const addItem = () => setItems([...items, { key: Date.now() }])
  const removeItem = (key: number) => setItems(items.filter(i => i.key !== key))
  const updateItem = (key: number, field: string, value: any) => {
    setItems(items.map(i => i.key === key ? { ...i, [field]: value } : i))
  }

  const getValidItems = () => items.filter(i => i.materialId && i.quantity)

  const buildPayload = (values: any) => ({
    deptId: values.deptId,
    requiredDate: values.requiredDate?.format('YYYY-MM-DD'),
    remark: values.remark,
    items: getValidItems().map(i => ({
      materialId: i.materialId!,
      quantity: i.quantity!,
      remark: i.remark,
    })),
  })

  // 保存草稿（不确认，直接保存 DRAFT）
  const handleSaveDraft = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    if (!getValidItems().length) { message.error('请至少添加一项申领耗材'); return }
    setLoading(true)
    try {
      await requisitionsApi.create(buildPayload(values))
      message.success('草稿已保存')
      navigate('/requisitions')
    } catch {} finally { setLoading(false) }
  }

  // 提交申领：先校验 → 弹确认框
  const handleSubmitClick = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    if (!getValidItems().length) { message.error('请至少添加一项申领耗材'); return }
    setPendingValues(values)
    setConfirmOpen(true)
  }

  // 确认弹框中点"确认提交"
  const handleConfirmSubmit = async () => {
    if (!pendingValues) return
    setLoading(true)
    setConfirmOpen(false)
    try {
      const created = await requisitionsApi.create(buildPayload(pendingValues))
      await requisitionsApi.submit(created.id)
      message.success('申领单已提交，等待审批')
      navigate('/requisitions')
    } catch {} finally { setLoading(false) }
  }

  const validItems = getValidItems()
  const selectedDeptName = departments.find(d => d.id === form.getFieldValue('deptId'))?.deptName
  const totalQty = validItems.reduce((sum, i) => sum + (i.quantity || 0), 0)

  return (
    <div>
      <Card bordered={false} className="rounded-xl mb-4">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/requisitions')}>返回</Button>
          <Title level={4} className="!m-0">发起耗材申领</Title>
        </Space>
      </Card>

      <Card bordered={false} className="rounded-xl">
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item name="deptId" label="申领科室" rules={[{ required: true }]}>
                <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false}>
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="requiredDate" label="需求日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="remark" label="备注说明">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider>申领明细</Divider>

          <Table
            rowKey="key"
            dataSource={items}
            pagination={false}
            columns={[
              {
                title: '耗材', width: 280,
                render: (_, record) => (
                  <Select showSearch className="w-full"
                    value={record.materialId}
                    placeholder="选择耗材"
                    onChange={(v) => updateItem(record.key, 'materialId', v)}
                    filterOption={(v, o) => o?.children?.toString().toLowerCase().includes(v.toLowerCase()) ?? false}>
                    {materials.map(m => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.materialName}（{m.specification}）库存:{m.currentStock}
                      </Select.Option>
                    ))}
                  </Select>
                ),
              },
              {
                title: '申领数量', width: 130,
                render: (_, record) => (
                  <InputNumber min={1} className="w-full" value={record.quantity}
                    onChange={(v) => updateItem(record.key, 'quantity', v)} />
                ),
              },
              {
                title: '备注',
                render: (_, record) => (
                  <Input value={record.remark} placeholder="选填"
                    onChange={(e) => updateItem(record.key, 'remark', e.target.value)} />
                ),
              },
              {
                title: '操作', width: 80,
                render: (_, record) => (
                  <Button danger size="small" icon={<DeleteOutlined />}
                    onClick={() => removeItem(record.key)}
                    disabled={items.length === 1} />
                ),
              },
            ]}
          />

          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} className="w-full my-4">
            添加耗材
          </Button>

          <Row justify="end">
            <Space>
              <Button onClick={() => navigate('/requisitions')}>取消</Button>
              <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
                保存草稿
              </Button>
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmitClick} loading={loading}>
                提交申领
              </Button>
            </Space>
          </Row>
        </Form>
      </Card>

      {/* 提交确认弹框 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            确认提交申领单？
          </Space>
        }
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onOk={handleConfirmSubmit}
        okText="确认提交"
        cancelText="取消"
        okButtonProps={{ type: 'primary', icon: <SendOutlined /> }}
        confirmLoading={loading}
      >
        <p style={{ color: '#888', marginBottom: 16 }}>
          提交后将进入审批流程，提交前请确认明细无误。
        </p>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="申领科室">
            {selectedDeptName || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="耗材品种">
            {validItems.length} 种
          </Descriptions.Item>
          <Descriptions.Item label="申领总量">
            {totalQty} 件
          </Descriptions.Item>
          <Descriptions.Item label="耗材明细">
            <Space wrap size={4}>
              {validItems.map(i => {
                const mat = materials.find(m => m.id === i.materialId)
                return mat ? (
                  <Tag key={i.key} color="blue">
                    {mat.materialName} × {i.quantity}
                  </Tag>
                ) : null
              })}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  )
}
