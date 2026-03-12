import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Input, Select, Tag, Modal, Form, message,
  Card, Row, Col, Badge, Descriptions, Drawer,
} from 'antd'
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inventoryApi } from '@/api/inventory'
import type { Inventory } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'

const INSPECTION_STATUS_MAP: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'orange', label: '待验收' },
  PASSED: { color: 'green', label: '验收合格' },
  REJECTED: { color: 'red', label: '验收不合格' },
}

export default function InspectionPage() {
  const [data, setData] = useState<Inventory[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ keyword: '', inspectionStatus: 'PENDING', page: 1, size: 10 })
  const [keyword, setKeyword] = useState('')
  const [inspectOpen, setInspectOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [current, setCurrent] = useState<Inventory | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await inventoryApi.getInspections(params)
      setData(res.records)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [params])

  const handleSearch = () => {
    setParams({ ...params, keyword, page: 1 })
  }

  const openInspect = (record: Inventory) => {
    setCurrent(record)
    form.resetFields()
    setInspectOpen(true)
  }

  const openDetail = (record: Inventory) => {
    setCurrent(record)
    setDetailOpen(true)
  }

  const handleInspect = async (values: { inspectionStatus: string; inspectionRemark?: string }) => {
    if (!current) return
    setSubmitting(true)
    try {
      await inventoryApi.inspect(current.id, values)
      message.success('验收操作成功')
      setInspectOpen(false)
      fetchData()
    } catch (e: any) {
      message.error(e?.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = params.inspectionStatus === 'PENDING' ? total : undefined

  const columns: ColumnsType<Inventory> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 160, ellipsis: true },
    { title: '编码', dataIndex: 'materialCode', width: 110 },
    { title: '规格', dataIndex: 'specification', width: 110 },
    { title: '批号', dataIndex: 'batchNumber', width: 130 },
    { title: '数量', dataIndex: 'quantity', width: 70 },
    { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
    { title: '入库日期', dataIndex: 'receiveDate', width: 110, render: (v) => formatDate(v) },
    { title: '有效期', dataIndex: 'expiryDate', width: 110, render: (v) => formatDate(v) || '-' },
    {
      title: '验收状态', dataIndex: 'inspectionStatus', width: 110,
      render: (v) => {
        const s = INSPECTION_STATUS_MAP[v] ?? { color: 'default', label: v || '未设置' }
        return <Tag color={s.color}>{s.label}</Tag>
      },
    },
    {
      title: '验收备注', dataIndex: 'inspectionRemark', width: 150, ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作', width: 130, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
          {record.inspectionStatus === 'PENDING' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => openInspect(record)}>
              验收
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title={
          <Space>
            入库验收管理
            {pendingCount != null && pendingCount > 0 && (
              <Badge count={pendingCount} style={{ backgroundColor: '#faad14' }} />
            )}
          </Space>
        }
      >
        <Row gutter={8} className="mb-4">
          <Col flex="1">
            <Input
              placeholder="搜索耗材名称或编码"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              onClear={() => { setKeyword(''); setParams({ ...params, keyword: '', page: 1 }) }}
            />
          </Col>
          <Col>
            <Select
              value={params.inspectionStatus || undefined}
              placeholder="验收状态"
              allowClear
              onChange={(v) => setParams({ ...params, inspectionStatus: v ?? '', page: 1 })}
              className="w-[140px]"
            >
              <Select.Option value="PENDING">待验收</Select.Option>
              <Select.Option value="PASSED">验收合格</Select.Option>
              <Select.Option value="REJECTED">验收不合格</Select.Option>
            </Select>
          </Col>
          <Col>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }}
        />
      </Card>

      {/* 验收操作弹窗 */}
      <Modal
        title={`验收 - ${current?.materialName}（批号：${current?.batchNumber}）`}
        open={inspectOpen}
        onCancel={() => { if (!submitting) setInspectOpen(false) }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} onFinish={handleInspect} layout="vertical" className="pt-2">
          <Form.Item
            name="inspectionStatus"
            label="验收结果"
            rules={[{ required: true, message: '请选择验收结果' }]}
          >
            <Select>
              <Select.Option value="PASSED">
                <Space><CheckCircleOutlined style={{ color: '#52c41a' }} />验收合格</Space>
              </Select.Option>
              <Select.Option value="REJECTED">
                <Space><CloseCircleOutlined style={{ color: '#ff4d4f' }} />验收不合格</Space>
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="inspectionRemark" label="验收备注">
            <Input.TextArea rows={3} placeholder="填写验收情况，如：外包装完好，数量相符；或：发现破损，退回供应商" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="验收记录详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={480}
      >
        {current && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="耗材名称">{current.materialName}</Descriptions.Item>
            <Descriptions.Item label="耗材编码">{current.materialCode}</Descriptions.Item>
            <Descriptions.Item label="规格型号">{current.specification || '-'}</Descriptions.Item>
            <Descriptions.Item label="批号">{current.batchNumber}</Descriptions.Item>
            <Descriptions.Item label="数量">{current.quantity} {current.unit}</Descriptions.Item>
            <Descriptions.Item label="库位">{current.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="供应商">{current.supplierName || '-'}</Descriptions.Item>
            <Descriptions.Item label="入库日期">{formatDate(current.receiveDate)}</Descriptions.Item>
            <Descriptions.Item label="生产日期">{formatDate(current.manufactureDate) || '-'}</Descriptions.Item>
            <Descriptions.Item label="有效期">{formatDate(current.expiryDate) || '-'}</Descriptions.Item>
            <Descriptions.Item label="验收状态">
              {(() => {
                const s = INSPECTION_STATUS_MAP[current.inspectionStatus ?? ''] ?? { color: 'default', label: '未设置' }
                return <Tag color={s.color}>{s.label}</Tag>
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="验收备注">{current.inspectionRemark || '-'}</Descriptions.Item>
            <Descriptions.Item label="验收时间">
              {current.inspectTime ? formatDateTime(current.inspectTime) : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
