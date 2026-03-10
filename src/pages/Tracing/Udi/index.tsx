import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col,
  Tag, DatePicker, Select,
} from 'antd'
import { PlusOutlined, SearchOutlined, QrcodeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { tracingApi } from '@/api/tracing'
import { materialsApi } from '@/api/materials'
import { suppliersApi } from '@/api/system'
import type { UdiVO, Material, Supplier } from '@/types'
import { formatDateTime, formatDate } from '@/utils/format'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  IN_STOCK: { label: '在库', color: 'success' },
  USED: { label: '已使用', color: 'default' },
  DAMAGED: { label: '已报损', color: 'error' },
  EXPIRED: { label: '已过期', color: 'orange' },
}

export default function UdiPage() {
  const [data, setData] = useState<UdiVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanCode, setScanCode] = useState('')
  const [scanResult, setScanResult] = useState<UdiVO | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await tracingApi.getUdiList({ keyword, status: statusFilter, ...page })
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])
  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    suppliersApi.getActive().then(setSuppliers)
  }, [])

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        manufactureDate: values.manufactureDate?.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate?.format('YYYY-MM-DD'),
      }
      await tracingApi.createUdi(payload)
      message.success('UDI 已注册')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch {}
  }

  const handleScan = async () => {
    if (!scanCode.trim()) return
    try {
      const result = await tracingApi.scanUdi(scanCode.trim())
      setScanResult(result)
    } catch {
      setScanResult(null)
      message.error('未找到该 UDI 码')
    }
  }

  const columns: ColumnsType<UdiVO> = [
    { title: 'UDI 码', dataIndex: 'udiCode', width: 200, ellipsis: true },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
    { title: '生产日期', dataIndex: 'manufactureDate', width: 110, render: (v) => formatDate(v) },
    { title: '有效期', dataIndex: 'expiryDate', width: 110, render: (v) => formatDate(v) },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    { title: '注册时间', dataIndex: 'createTime', width: 160, render: (v) => formatDateTime(v) },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="UDI 管理（一物一码）"
        extra={
          <Space>
            <Button icon={<QrcodeOutlined />} onClick={() => { setScanResult(null); setScanCode(''); setScanOpen(true) }}>
              扫码查询
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              form.resetFields(); setCreateOpen(true)
            }}>注册 UDI</Button>
          </Space>
        }
      >
        <Row gutter={8} className="mb-4">
          <Col flex="1">
            <Input placeholder="搜索 UDI 码或耗材名称" prefix={<SearchOutlined />}
              value={keyword} onChange={e => setKeyword(e.target.value)} allowClear
              onClear={() => setKeyword('')} />
          </Col>
          <Col>
            <Select placeholder="状态筛选" value={statusFilter} onChange={setStatusFilter}
              allowClear className="w-[120px]">
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => setPage({ ...page, page: 1 })}>搜索</Button>
          </Col>
        </Row>
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1100 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      {/* 注册 UDI 弹窗 */}
      <Modal title="注册 UDI" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={() => form.submit()}
        width={600} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="udiCode" label="UDI 码" rules={[{ required: true }]}>
                <Input placeholder="扫描或手动输入 UDI 码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="materialId" label="耗材" rules={[{ required: true }]}>
                <Select showSearch filterOption={(v, o) => o?.children?.toString().includes(v) ?? false} placeholder="选择耗材">
                  {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="supplierId" label="供应商">
                <Select allowClear>
                  {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.supplierName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="batchNumber" label="批号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manufactureDate" label="生产日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="有效期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 扫码查询弹窗 */}
      <Modal title="扫码查询" open={scanOpen}
        onCancel={() => setScanOpen(false)} footer={null} destroyOnClose>
        <Row gutter={8} className="mb-4">
          <Col flex="1">
            <Input placeholder="输入或扫描 UDI 码" value={scanCode}
              onChange={e => setScanCode(e.target.value)}
              onPressEnter={handleScan} />
          </Col>
          <Col>
            <Button type="primary" onClick={handleScan}>查询</Button>
          </Col>
        </Row>
        {scanResult && (
          <Card size="small" title="查询结果">
            <p><strong>UDI 码：</strong>{scanResult.udiCode}</p>
            <p><strong>耗材：</strong>{scanResult.materialName}（{scanResult.specification}）</p>
            <p><strong>批号：</strong>{scanResult.batchNumber}</p>
            <p><strong>有效期：</strong>{scanResult.expiryDate}</p>
            <p><strong>供应商：</strong>{scanResult.supplierName}</p>
            <p><strong>状态：</strong><Tag color={STATUS_MAP[scanResult.status]?.color}>{STATUS_MAP[scanResult.status]?.label}</Tag></p>
          </Card>
        )}
      </Modal>
    </div>
  )
}
