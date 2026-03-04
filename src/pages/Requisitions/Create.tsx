import React, { useState, useEffect } from 'react'
import {
  Card, Form, Select, DatePicker, Input, Button, Table, InputNumber,
  Row, Col, Typography, Space, message, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
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

  const handleSubmit = async (values: any) => {
    const validItems = items.filter(i => i.materialId && i.quantity)
    if (!validItems.length) {
      message.error('请至少添加一项申领耗材')
      return
    }
    setLoading(true)
    try {
      await requisitionsApi.create({
        deptId: values.deptId,
        requiredDate: values.requiredDate?.format('YYYY-MM-DD'),
        remark: values.remark,
        items: validItems.map(i => ({
          materialId: i.materialId!,
          quantity: i.quantity!,
          remark: i.remark,
        })),
      })
      message.success('申领单创建成功')
      navigate('/requisitions')
    } catch {} finally { setLoading(false) }
  }

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/requisitions')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>发起耗材申领</Title>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
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
                <DatePicker style={{ width: '100%' }} />
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
                  <Select showSearch style={{ width: '100%' }}
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
                  <InputNumber min={1} style={{ width: '100%' }} value={record.quantity}
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

          <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}
            style={{ width: '100%', margin: '16px 0' }}>
            添加耗材
          </Button>

          <Row justify="end">
            <Space>
              <Button onClick={() => navigate('/requisitions')}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>保存草稿</Button>
            </Space>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
