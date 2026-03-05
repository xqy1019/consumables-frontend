/**
 * AI 补货快速采购 Drawer
 * 根据安全库存缺口数据预填采购申请，一键提交到采购请购单
 */
import React, { useState, useEffect } from 'react'
import {
  Drawer, Table, InputNumber, Button, Input, Space,
  Typography, Tag, Tooltip, message, Empty, DatePicker, Row, Col,
} from 'antd'
import { ShoppingCartOutlined, InfoCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { purchaseApi } from '@/api/purchase'
import type { SafetyStockVO } from '@/types'

const { Text } = Typography

interface EditableItem extends SafetyStockVO {
  purchaseQty: number   // 用户可调整的采购数量
}

interface Props {
  open: boolean
  onClose: () => void
  /** shortage > 0 的安全库存条目 */
  items: SafetyStockVO[]
  onSuccess?: () => void
}

export default function PurchaseDrawer({ open, onClose, items, onSuccess }: Props) {
  const [rows, setRows]             = useState<EditableItem[]>([])
  const [remark, setRemark]         = useState('')
  const [requiredDate, setRequiredDate] = useState<Dayjs | null>(dayjs().add(7, 'day'))
  const [submitting, setSubmitting] = useState(false)

  // 每次打开时重置数据
  useEffect(() => {
    if (open) {
      setRows(items.map(item => ({ ...item, purchaseQty: item.suggestedPurchase || item.shortage })))
      setRemark('')
      setRequiredDate(dayjs().add(7, 'day'))
    }
  }, [open, items])

  const updateQty = (materialId: number, qty: number) => {
    setRows(prev => prev.map(r => r.materialId === materialId ? { ...r, purchaseQty: qty } : r))
  }

  const removeRow = (materialId: number) => {
    setRows(prev => prev.filter(r => r.materialId !== materialId))
  }

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.purchaseQty > 0)
    if (!validRows.length) {
      message.warning('请至少保留一条有效采购项')
      return
    }
    if (!requiredDate) {
      message.warning('请选择需求日期')
      return
    }
    setSubmitting(true)
    try {
      const req = await purchaseApi.createRequisition({
        remark: remark || 'AI 智能补货建议自动生成',
        requiredDate: requiredDate ? requiredDate.format('YYYY-MM-DD') : undefined,
        items: validRows.map(r => ({
          materialId: r.materialId,
          quantity: r.purchaseQty,
          remark: `缺口 ${r.shortage}，当前库存 ${r.currentStock}`,
        })),
      })
      // 同时提交审批
      await purchaseApi.submitRequisition(req.id)
      message.success(`采购申请 ${req.reqNo} 已创建并提交审批`)
      onSuccess?.()
      onClose()
    } catch {
      message.error('创建采购申请失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const totalQty = rows.reduce((s, r) => s + (r.purchaseQty || 0), 0)

  const columns: ColumnsType<EditableItem> = [
    {
      title: '耗材名称', dataIndex: 'materialName', width: 140, ellipsis: true,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{r.materialCode}</div>
        </div>
      ),
    },
    {
      title: (
        <Space size={3}>
          库存状态
          <Tooltip title="当前库存 / 最低安全库存"><InfoCircleOutlined style={{ fontSize: 11, color: '#bbb' }} /></Tooltip>
        </Space>
      ),
      width: 120,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <span style={{ color: '#333' }}>{r.currentStock}</span>
          <span style={{ color: '#bbb', margin: '0 3px' }}>/</span>
          <span style={{ color: '#f59e0b' }}>{r.minStock}</span>
          <div>
            <Tag color="error" style={{ fontSize: 10, marginTop: 2 }}>缺口 {r.shortage}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'AI 建议量', dataIndex: 'suggestedPurchase', width: 90,
      render: v => <Text style={{ color: '#6366f1', fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: '采购数量', width: 120,
      render: (_, r) => (
        <InputNumber
          min={1}
          value={r.purchaseQty}
          onChange={v => updateQty(r.materialId, v || 1)}
          style={{ width: 100 }}
          size="small"
        />
      ),
    },
    {
      title: '', width: 40, fixed: 'right',
      render: (_, r) => (
        <Button
          type="text" size="small" danger
          icon={<DeleteOutlined />}
          onClick={() => removeRow(r.materialId)}
        />
      ),
    },
  ]

  return (
    <Drawer
      title={
        <Space>
          <ShoppingCartOutlined style={{ color: '#f59e0b' }} />
          <span>AI 补货快速采购</span>
          <Tag color="orange" style={{ borderRadius: 20, fontSize: 11 }}>共 {rows.length} 项</Tag>
        </Space>
      }
      width={620}
      open={open}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            合计采购数量：<Text strong style={{ color: '#6366f1' }}>{totalQty}</Text>
          </Text>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              loading={submitting}
              disabled={rows.length === 0}
              onClick={handleSubmit}
            >
              创建采购申请并提交
            </Button>
          </Space>
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty description="暂无补货项目" />
      ) : (
        <>
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e',
          }}>
            💡 以下为 AI 根据安全库存缺口自动生成的补货清单，您可调整数量或删除不需要的项目后一键提交采购申请。
          </div>

          <Table
            rowKey="materialId"
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 520 }}
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                需求日期 <span style={{ color: '#ff4d4f' }}>*</span>
              </div>
              <DatePicker
                value={requiredDate}
                onChange={setRequiredDate}
                disabledDate={d => d.isBefore(dayjs(), 'day')}
                format="YYYY-MM-DD"
                placeholder="请选择需求日期"
                style={{ width: '100%' }}
                status={!requiredDate ? 'error' : undefined}
              />
              {!requiredDate && (
                <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 3 }}>请选择需求日期</div>
              )}
            </Col>
            <Col span={12}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>备注</div>
              <Input
                placeholder="选填，默认：AI 智能补货建议自动生成"
                value={remark}
                onChange={e => setRemark(e.target.value)}
                maxLength={200}
              />
            </Col>
          </Row>
        </>
      )}
    </Drawer>
  )
}
