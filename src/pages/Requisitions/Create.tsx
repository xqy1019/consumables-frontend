import React, { useState, useEffect } from 'react'
import {
  Card, Form, Select, DatePicker, Input, Button, Table, InputNumber,
  Row, Col, Typography, Space, message, Divider, Modal,
  Descriptions, Tag, Badge, Checkbox,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ArrowLeftOutlined,
  SendOutlined, SaveOutlined, ExclamationCircleOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { requisitionsApi } from '@/api/requisitions'
import { departmentsApi, usersApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import { aiApi } from '@/api/ai'
import { useAuth } from '@/hooks/useAuth'
import type { Material, Department, RequisitionRecommendation } from '@/types'

const { Title } = Typography

type ItemRow = { materialId?: number; quantity?: number; remark?: string; key: number }

function mergeItems(prev: ItemRow[], newItems: ItemRow[]): ItemRow[] {
  const result = [...prev]
  for (const ni of newItems) {
    const existing = result.find(r => r.materialId === ni.materialId)
    if (existing) {
      existing.quantity = ni.quantity
      existing.remark = ni.remark
    } else {
      result.push(ni)
    }
  }
  // 移除空行（如果合并后有真实内容）
  const hasContent = result.some(r => r.materialId)
  return hasContent ? result.filter(r => r.materialId || result.length === 1) : result
}

const URGENCY_CONFIG = {
  HIGH: { color: 'red', label: '紧急' },
  MEDIUM: { color: 'orange', label: '一般' },
  LOW: { color: 'green', label: '低' },
}

export default function CreateRequisition() {
  const [form] = Form.useForm()
  const [items, setItems] = useState<ItemRow[]>([{ key: Date.now() }])
  const [materials, setMaterials] = useState<Material[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<any>(null)

  // AI 推荐状态
  const [recModalOpen, setRecModalOpen] = useState(false)
  const [recLoading, setRecLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RequisitionRecommendation[]>([])
  const [selectedRecs, setSelectedRecs] = useState<number[]>([])
  const [editedQtys, setEditedQtys] = useState<Record<number, number>>({})

  const navigate = useNavigate()
  const { userId } = useAuth()

  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    departmentsApi.getAll().then(setDepartments)
    // 根据当前登录用户的科室自动填充申领科室
    if (userId) {
      usersApi.getById(userId).then(user => {
        if (user.deptId) {
          form.setFieldValue('deptId', user.deptId)
        }
      }).catch(() => {/* 静默忽略，用户手动选择 */})
    }
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

  // AI 智能推荐
  const handleAiRecommend = async () => {
    const deptId = form.getFieldValue('deptId')
    if (!deptId) {
      message.warning('请先选择申领科室')
      return
    }
    setRecLoading(true)
    try {
      const data = await aiApi.getRequisitionRecommendations(deptId)
      if (!data || data.length === 0) {
        message.info('暂无推荐数据，该科室近6个月无出库记录')
        return
      }
      setRecommendations(data)
      setSelectedRecs(data.map(r => r.materialId))
      setEditedQtys(Object.fromEntries(data.map(r => [r.materialId, r.recommendedQuantity])))
      setRecModalOpen(true)
    } catch {
      message.error('AI 推荐获取失败，请稍后重试')
    } finally {
      setRecLoading(false)
    }
  }

  // 一键导入推荐
  const handleImportRecommendations = () => {
    const newItems: ItemRow[] = recommendations
      .filter(r => selectedRecs.includes(r.materialId))
      .map(r => ({
        key: Date.now() + r.materialId,
        materialId: r.materialId,
        quantity: editedQtys[r.materialId] ?? r.recommendedQuantity,
        remark: `AI推荐：${r.reason}`,
      }))

    if (newItems.length === 0) {
      message.warning('请至少勾选一项')
      return
    }

    setItems(prev => mergeItems(prev, newItems))
    setRecModalOpen(false)
    message.success(`已导入 ${newItems.length} 项推荐耗材`)
  }

  // 保存草稿
  const handleSaveDraft = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    if (!getValidItems().length) { message.error('请至少添加一项申领耗材'); return }
    setLoading(true)
    try {
      await requisitionsApi.create(buildPayload(values))
      message.success('草稿已保存')
      navigate('/requisitions')
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') } finally { setLoading(false) }
  }

  // 提交申领
  const handleSubmitClick = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    if (!getValidItems().length) { message.error('请至少添加一项申领耗材'); return }
    setPendingValues(values)
    setConfirmOpen(true)
  }

  const handleConfirmSubmit = async () => {
    if (!pendingValues) return
    setLoading(true)
    setConfirmOpen(false)
    try {
      const created = await requisitionsApi.create(buildPayload(pendingValues))
      await requisitionsApi.submit(created.id)
      message.success('申领单已提交，等待审批')
      navigate('/requisitions')
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') } finally { setLoading(false) }
  }

  const validItems = getValidItems()
  const selectedDeptName = departments.find(d => d.id === form.getFieldValue('deptId'))?.deptName
  const totalQty = validItems.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const deptId = Form.useWatch('deptId', form)

  return (
    <div>
      <Card bordered={false} className="rounded-xl mb-4">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/requisitions')}>返回</Button>
          <Title level={4} className="!m-0">发起耗材申领</Title>
        </Space>
      </Card>

      <Card
        bordered={false}
        className="rounded-xl"
        extra={
          <Button
            icon={<RobotOutlined />}
            loading={recLoading}
            onClick={handleAiRecommend}
            disabled={!deptId}
            style={{
              background: deptId ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : undefined,
              color: deptId ? '#fff' : undefined,
              border: 'none',
            }}
          >
            AI 智能推荐
          </Button>
        }
      >
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

      {/* AI 智能推荐 Modal */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#7c3aed' }} />
            <span>AI 智能申领推荐</span>
            <Tag color="purple">基于近6月历史消耗 + AI预测</Tag>
          </Space>
        }
        open={recModalOpen}
        onCancel={() => setRecModalOpen(false)}
        width={820}
        footer={
          <Space>
            <Button onClick={() => setRecModalOpen(false)}>取消</Button>
            <Button
              type="primary"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none' }}
              icon={<PlusOutlined />}
              onClick={handleImportRecommendations}
              disabled={selectedRecs.length === 0}
            >
              一键导入已选（{selectedRecs.length}）项
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
          以下为 AI 根据科室历史消耗和库存预测生成的推荐申领清单，您可勾选并调整数量后导入。
        </div>
        <Table
          rowKey="materialId"
          dataSource={recommendations}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
          columns={[
            {
              title: '',
              width: 40,
              render: (_, record) => (
                <Checkbox
                  checked={selectedRecs.includes(record.materialId)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedRecs(prev => [...prev, record.materialId])
                    } else {
                      setSelectedRecs(prev => prev.filter(id => id !== record.materialId))
                    }
                  }}
                />
              ),
            },
            {
              title: '耗材名称',
              dataIndex: 'materialName',
              width: 160,
              render: (name, record) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{record.specification}</div>
                </div>
              ),
            },
            {
              title: '当前库存',
              dataIndex: 'currentStock',
              width: 80,
              align: 'center' as const,
              render: (v, record) => (
                <span style={{ color: v < record.predictedConsumption * 0.3 ? '#f5222d' : undefined }}>
                  {v}
                </span>
              ),
            },
            {
              title: '预测消耗',
              dataIndex: 'predictedConsumption',
              width: 80,
              align: 'center' as const,
            },
            {
              title: '推荐数量',
              width: 110,
              render: (_, record) => (
                <InputNumber
                  min={1}
                  size="small"
                  value={editedQtys[record.materialId] ?? record.recommendedQuantity}
                  onChange={v => setEditedQtys(prev => ({ ...prev, [record.materialId]: v ?? 1 }))}
                  style={{ width: 90 }}
                />
              ),
            },
            {
              title: '紧迫程度',
              dataIndex: 'urgency',
              width: 80,
              align: 'center' as const,
              render: (urgency: 'HIGH' | 'MEDIUM' | 'LOW') => {
                const cfg = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.LOW
                return <Badge color={cfg.color} text={<span style={{ color: cfg.color }}>{cfg.label}</span>} />
              },
            },
            {
              title: '推荐理由',
              dataIndex: 'reason',
              render: (reason) => <span style={{ color: '#555', fontSize: 12 }}>{reason}</span>,
            },
          ]}
        />
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button
            size="small"
            type="link"
            onClick={() => setSelectedRecs(recommendations.map(r => r.materialId))}
          >
            全选
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => setSelectedRecs([])}
          >
            取消全选
          </Button>
        </div>
      </Modal>
    </div>
  )
}
