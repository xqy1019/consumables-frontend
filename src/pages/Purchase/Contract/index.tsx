import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col, Tag, Drawer, Descriptions, InputNumber, DatePicker, Select, Alert,
} from 'antd'
import { PlusOutlined, EyeOutlined, PlayCircleOutlined, BulbOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { purchaseApi } from '@/api/purchase'
import { materialsApi } from '@/api/materials'
import { suppliersApi } from '@/api/system'
import type { ContractVO, ContractItemVO, AutoSuggestionVO, Material, Supplier } from '@/types'
import { formatDate } from '@/utils/format'


const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  ACTIVE: { label: '执行中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

export default function ContractPage() {
  const [data, setData] = useState<ContractVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<ContractVO | null>(null)
  const [suggestions, setSuggestions] = useState<AutoSuggestionVO[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await purchaseApi.getContracts(page)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    suppliersApi.getActive().then(setSuppliers)
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        contractDate: values.contractDate?.format('YYYY-MM-DD'),
        deliveryDate: values.deliveryDate?.format('YYYY-MM-DD'),
        items: values.items || [],
      }
      await purchaseApi.createContract(payload)
      message.success('合同已创建')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch {}
  }

  const handleExecute = async (id: number) => {
    try {
      await purchaseApi.executeContract(id)
      message.success('合同已执行入库')
      fetchData()
    } catch {}
  }

  const handleViewDetail = async (record: ContractVO) => {
    const detail = await purchaseApi.getContractDetail(record.id)
    setCurrentRecord(detail)
    setDetailOpen(true)
  }

  const loadSuggestions = async () => {
    const res = await purchaseApi.getAutoSuggestions()
    setSuggestions(res)
    setSuggestOpen(true)
  }

  const columns: ColumnsType<ContractVO> = [
    { title: '合同编号', dataIndex: 'contractNo', width: 180 },
    { title: '供应商', dataIndex: 'supplierName', width: 150 },
    { title: '合同日期', dataIndex: 'contractDate', width: 110, render: (v) => formatDate(v) },
    { title: '交货日期', dataIndex: 'deliveryDate', width: 110, render: (v) => formatDate(v) },
    { title: '总金额', dataIndex: 'totalAmount', width: 110, render: v => `¥${(v || 0).toLocaleString()}` },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.status === 'ACTIVE' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />}
              onClick={() => Modal.confirm({
                title: '确认执行合同并入库？',
                onOk: () => handleExecute(record.id),
              })}>执行入库</Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<ContractItemVO> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '单价', dataIndex: 'unitPrice', width: 90, render: v => `¥${v}` },
    { title: '小计', dataIndex: 'totalPrice', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
  ]

  const suggestColumns: ColumnsType<AutoSuggestionVO> = [
    { title: '耗材编码', dataIndex: 'materialCode', width: 130 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '供应商', dataIndex: 'supplierName', width: 130 },
    { title: '当前库存', dataIndex: 'currentStock', width: 90 },
    { title: '最低库存', dataIndex: 'minStock', width: 90 },
    { title: '最高库存', dataIndex: 'maxStock', width: 90 },
    { title: '建议采购量', dataIndex: 'suggestedQuantity', width: 100,
      render: v => <span className="font-semibold text-[#1677ff]">{v}</span> },
    { title: '预估金额', dataIndex: 'estimatedCost', width: 100, render: v => `¥${(v || 0).toLocaleString()}` },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="采购合同管理"
        extra={
          <Space>
            <Button icon={<BulbOutlined />} onClick={loadSuggestions}>自动补货建议</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              form.resetFields(); setCreateOpen(true)
            }}>新建合同</Button>
          </Space>
        }
      >
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1100 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      {/* 新建合同 */}
      <Modal title="新建采购合同" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={() => form.submit()}
        width={800} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierId" label="供应商" rules={[{ required: true }]}>
                <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false}>
                  {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.supplierName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contractDate" label="合同日期" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deliveryDate" label="交货日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Row justify="space-between" align="middle" className="mb-2">
                  <Col><span className="font-semibold">合同明细</span></Col>
                  <Col><Button size="small" type="dashed" onClick={() => add()}>添加耗材</Button></Col>
                </Row>
                {fields.map(field => (
                  <Row key={field.key} gutter={8} align="top">
                    <Col flex="2">
                      <Form.Item name={[field.name, 'materialId']} rules={[{ required: true }]}>
                        <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false} placeholder="选择耗材">
                          {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col flex="1">
                      <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
                        <InputNumber min={1} placeholder="数量" className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col flex="1">
                      <Form.Item name={[field.name, 'unitPrice']} rules={[{ required: true }]}>
                        <InputNumber min={0} placeholder="单价" className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Button danger size="small" onClick={() => remove(field.name)} className="mt-1">删除</Button>
                    </Col>
                  </Row>
                ))}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 合同详情 */}
      <Drawer
        title={`合同详情 - ${currentRecord?.contractNo}`}
        open={detailOpen} onClose={() => setDetailOpen(false)} width={700}
      >
        {currentRecord && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="合同编号">{currentRecord.contractNo}</Descriptions.Item>
              <Descriptions.Item label="供应商">{currentRecord.supplierName}</Descriptions.Item>
              <Descriptions.Item label="合同日期">{currentRecord.contractDate}</Descriptions.Item>
              <Descriptions.Item label="交货日期">{currentRecord.deliveryDate}</Descriptions.Item>
              <Descriptions.Item label="总金额">¥{(currentRecord.totalAmount || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentRecord.status]?.color}>{STATUS_MAP[currentRecord.status]?.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Table rowKey="id" columns={itemColumns} dataSource={currentRecord.items || []} pagination={false} />
          </>
        )}
      </Drawer>

      {/* 自动补货建议 */}
      <Modal
        title={<Space><BulbOutlined />自动补货建议</Space>}
        open={suggestOpen} onCancel={() => setSuggestOpen(false)} footer={null} width={900}
      >
        {suggestions.length === 0 ? (
          <Alert type="success" message="当前库存充足，无需补货" showIcon />
        ) : (
          <>
            <Alert type="warning" message={`发现 ${suggestions.length} 种耗材需要补货`} showIcon className="mb-3" />
            <Table rowKey="materialId" columns={suggestColumns} dataSource={suggestions} pagination={false} scroll={{ x: 800 }} />
          </>
        )}
      </Modal>
    </div>
  )
}
