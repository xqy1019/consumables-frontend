import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col,
  Tag, Drawer, InputNumber, Descriptions,
} from 'antd'
import { PlusOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { inventoryExtApi } from '@/api/inventoryExt'
import type { StocktakingVO } from '@/types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: '盘点中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
}

export default function StocktakingPage() {
  const [data, setData] = useState<StocktakingVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<StocktakingVO | null>(null)
  // 本地暂存每个盘点项的实际数量
  const [localActual, setLocalActual] = useState<Record<number, number>>({})
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await inventoryExtApi.getStocktakings(page)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page])

  const handleCreate = async (values: any) => {
    try {
      await inventoryExtApi.createStocktaking({ location: values.location, remark: values.remark })
      message.success('盘点单已创建，系统已自动加载在库耗材')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch {}
  }

  const handleViewDetail = async (record: StocktakingVO) => {
    const detail = await inventoryExtApi.getStocktakingDetail(record.id)
    setCurrentRecord(detail)
    // 初始化本地实际数量
    const initLocal: Record<number, number> = {}
    detail.items?.forEach(item => {
      initLocal[item.id] = item.actualQuantity ?? item.bookQuantity
    })
    setLocalActual(initLocal)
    setDetailOpen(true)
  }

  const handleComplete = async () => {
    if (!currentRecord) return
    try {
      const items = (currentRecord.items || []).map(item => ({
        id: item.id,
        actualQuantity: localActual[item.id] ?? item.bookQuantity,
      }))
      await inventoryExtApi.completeStocktaking(currentRecord.id, items)
      message.success('盘点已完成，库存数量已更新')
      fetchData()
      setDetailOpen(false)
    } catch {}
  }

  const columns: ColumnsType<StocktakingVO> = [
    { title: '盘点单号', dataIndex: 'stocktakingNo', width: 180 },
    { title: '库位', dataIndex: 'location', width: 120, render: v => v || '全库' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    { title: '操作人', dataIndex: 'createdByName', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '时间', dataIndex: 'createTime', width: 160 },
    {
      title: '操作', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>查看</Button>
          {record.status !== 'COMPLETED' && (
            <Button size="small" type="primary" icon={<CheckOutlined />}
              onClick={() => {
                handleViewDetail(record).then(() => {})
              }}>录入</Button>
          )}
        </Space>
      ),
    },
  ]

  // 盘点明细表格列
  const itemCols = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 110 },
    { title: '批号', dataIndex: 'batchNumber', width: 120 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    { title: '账面数量', dataIndex: 'bookQuantity', width: 90,
      render: (v: number, r: any) => r.systemQuantity ?? v },
    {
      title: '实际数量', width: 120,
      render: (_: any, record: any) => currentRecord?.status !== 'COMPLETED' ? (
        <InputNumber
          min={0} size="small" className="w-[80px]"
          value={localActual[record.id] ?? record.systemQuantity ?? 0}
          onChange={v => setLocalActual(prev => ({ ...prev, [record.id]: v ?? 0 }))}
        />
      ) : <span>{localActual[record.id] ?? record.actualQuantity}</span>,
    },
    {
      title: '差异', width: 80,
      render: (_: any, record: any) => {
        const actual = localActual[record.id] ?? record.actualQuantity ?? record.systemQuantity ?? 0
        const book = record.systemQuantity ?? 0
        const diff = actual - book
        return <Tag color={diff > 0 ? 'blue' : diff < 0 ? 'red' : 'green'}>{diff > 0 ? `+${diff}` : diff}</Tag>
      },
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="库存盘点"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            form.resetFields(); setCreateOpen(true)
          }}>新建盘点</Button>
        }
      >
        <Table
          rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 900 }}
          pagination={{
            total, current: page.page, pageSize: page.size,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => setPage({ page: p, size: s }),
          }}
        />
      </Card>

      <Modal title="新建盘点单" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Form.Item name="location" label="盘点库位" extra="留空则盘点全部在库耗材">
            <Input placeholder="如：A区（留空=全库）" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`盘点详情 - ${currentRecord?.stocktakingNo}`}
        open={detailOpen} onClose={() => setDetailOpen(false)}
        width={820}
        extra={
          currentRecord?.status !== 'COMPLETED' ? (
            <Button type="primary" icon={<CheckOutlined />}
              onClick={() => Modal.confirm({
                title: '确认完成盘点？完成后将更新库存数量',
                onOk: handleComplete,
              })}>
              完成盘点
            </Button>
          ) : null
        }
      >
        {currentRecord && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="盘点单号">{currentRecord.stocktakingNo}</Descriptions.Item>
              <Descriptions.Item label="库位">{currentRecord.location || '全库'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentRecord.status]?.color}>{STATUS_MAP[currentRecord.status]?.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="备注">{currentRecord.remark}</Descriptions.Item>
            </Descriptions>
            <Table
              rowKey="id" columns={itemCols}
              dataSource={currentRecord.items || []}
              pagination={false} scroll={{ x: 700 }} size="small"
            />
          </>
        )}
      </Drawer>
    </div>
  )
}
