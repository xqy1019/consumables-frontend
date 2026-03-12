import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col, Tag, Drawer, Descriptions, InputNumber, DatePicker, Select,
  Alert, List,
} from 'antd'
import { PlusOutlined, EyeOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { purchaseApi } from '@/api/purchase'
import { materialsApi } from '@/api/materials'
import { suppliersApi } from '@/api/system'
import { aiApi } from '@/api/ai'
import type { PriceCheckResult, SupplierRecommendVO } from '@/api/ai'
import type { InquiryVO, InquiryItemVO, Material, Supplier } from '@/types'
import { formatDateTime, formatDate } from '@/utils/format'


const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  SENT: { label: '已发送', color: 'processing' },
  CONFIRMED: { label: '已确认', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

export default function InquiryPage() {
  const [data, setData] = useState<InquiryVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<InquiryVO | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form] = Form.useForm()
  const [priceWarnings, setPriceWarnings] = useState<PriceCheckResult[]>([])
  const [supplierModalVisible, setSupplierModalVisible] = useState(false)
  const [supplierRecommends, setSupplierRecommends] = useState<SupplierRecommendVO[]>([])
  const [loadingSupplier, setLoadingSupplier] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await purchaseApi.getInquiries(page)
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
        validDate: values.validDate?.format('YYYY-MM-DD'),
        items: values.items || [],
      }
      await purchaseApi.createInquiry(payload)
      message.success('询价单已创建')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleConfirm = async (id: number) => {
    try {
      await purchaseApi.confirmInquiry(id)
      message.success('已确认询价')
      fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleViewDetail = async (record: InquiryVO) => {
    const detail = await purchaseApi.getInquiryDetail(record.id)
    setCurrentRecord(detail)
    setDetailOpen(true)
  }

  const handleConfirmWithPriceCheck = async (id: number) => {
    try {
      const detail = await purchaseApi.getInquiryDetail(id)
      const items = detail.items || []
      const priceItems = items
        .filter((item: InquiryItemVO) => item.quotedPrice)
        .map((item: InquiryItemVO) => ({
          materialId: item.materialId,
          materialName: item.materialName,
          currentPrice: item.quotedPrice,
          quantity: item.quantity,
        }))

      if (priceItems.length > 0) {
        try {
          const results = await aiApi.checkPurchasePrice(priceItems)
          const warnings = results.filter(r => r.status === 'ABNORMAL_HIGH')
          if (warnings.length > 0) {
            setPriceWarnings(warnings)
          }
        } catch (e) {
          console.error('价格检测失败', e)
        }
      }
    } catch (e) {
      console.error('获取询价详情失败', e)
    }
    handleConfirm(id)
  }

  const handleSupplierRecommend = async (materialId: number) => {
    setLoadingSupplier(true)
    try {
      const recommends = await aiApi.getSupplierRecommend(materialId, 100)
      setSupplierRecommends(recommends)
      setSupplierModalVisible(true)
    } catch (e) {
      message.error('获取供应商推荐失败')
    } finally {
      setLoadingSupplier(false)
    }
  }

  const columns: ColumnsType<InquiryVO> = [
    { title: '询价单号', dataIndex: 'inquiryNo', width: 180 },
    { title: '供应商', dataIndex: 'supplierName', width: 150 },
    { title: '报价有效期', dataIndex: 'validDate', width: 110, render: (v) => formatDate(v) },
    { title: '总金额', dataIndex: 'totalAmount', width: 100, render: v => v ? `¥${v.toLocaleString()}` : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'createTime', width: 160, render: (v) => formatDateTime(v) },
    {
      title: '操作', width: 140, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          {record.status === 'SENT' && (
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => handleConfirmWithPriceCheck(record.id)}>确认</Button>
          )}
        </Space>
      ),
    },
  ]

  const itemColumns: ColumnsType<InquiryItemVO> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 80 },
    { title: '询价数量', dataIndex: 'quantity', width: 100 },
    { title: '报价单价', dataIndex: 'quotedPrice', width: 100, render: v => v ? `¥${v}` : '-' },
    { title: '交货周期(天)', dataIndex: 'deliveryDays', width: 110 },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="询价单管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            form.resetFields(); setCreateOpen(true)
          }}>新建询价</Button>
        }
      >
        {priceWarnings.length > 0 && (
          <Alert
            type="warning"
            message="价格异常提醒"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {priceWarnings.map(w => (
                  <li key={w.materialId}>
                    {w.materialName}：{w.reason}
                  </li>
                ))}
              </ul>
            }
            showIcon
            closable
            onClose={() => setPriceWarnings([])}
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      <Modal title="新建询价单" open={createOpen}
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
              <Form.Item name="validDate" label="报价有效期">
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
                  <Col><span className="font-semibold">询价明细</span></Col>
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
                      <Form.Item name={[field.name, 'quotedPrice']}>
                        <InputNumber min={0} placeholder="报价" className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col>
                      <Button
                        size="small"
                        icon={<RobotOutlined />}
                        loading={loadingSupplier}
                        onClick={() => {
                          const materialId = form.getFieldValue(['items', field.name, 'materialId'])
                          if (materialId) handleSupplierRecommend(materialId)
                          else message.warning('请先选择耗材')
                        }}
                        className="mt-1"
                      >AI推荐</Button>
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

      <Drawer
        title={`询价单详情 - ${currentRecord?.inquiryNo}`}
        open={detailOpen} onClose={() => setDetailOpen(false)} width={700}
      >
        {currentRecord && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="询价单号">{currentRecord.inquiryNo}</Descriptions.Item>
              <Descriptions.Item label="供应商">{currentRecord.supplierName}</Descriptions.Item>
              <Descriptions.Item label="报价有效期">{currentRecord.validDate}</Descriptions.Item>
              <Descriptions.Item label="总金额">¥{currentRecord.totalAmount?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentRecord.status]?.color}>{STATUS_MAP[currentRecord.status]?.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Table rowKey="id" columns={itemColumns} dataSource={currentRecord.items || []} pagination={false} />
          </>
        )}
      </Drawer>

      <Modal
        title="AI供应商推荐"
        open={supplierModalVisible}
        onCancel={() => setSupplierModalVisible(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={supplierRecommends}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="link" key="select" onClick={() => {
                  form.setFieldValue('supplierId', item.supplierId)
                  setSupplierModalVisible(false)
                  message.success(`已选择供应商: ${item.supplierName || item.supplierId}`)
                }}>选择</Button>
              ]}
            >
              <List.Item.Meta
                title={`${item.supplierName || `供应商ID: ${item.supplierId}`}  评分: ${item.score}分`}
                description={`推荐理由：${item.reason} | 均价：¥${item.avgPrice} | 质量合格率：${(item.qualityRate || 0).toFixed(1)}%`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  )
}
