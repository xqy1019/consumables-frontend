import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Tag, Card, Modal, Form, Input, Select,
  message, Drawer, Descriptions, Divider, Popconfirm, Row, Col, InputNumber,
} from 'antd'
import { PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { returnRequestsApi, type ReturnVO } from '@/api/returnRequests'
import { materialsApi } from '@/api/materials'
import { departmentsApi } from '@/api/system'
import type { Material, Department } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { formatDateTime } from '@/utils/format'

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'gold', APPROVED: 'blue', COMPLETED: 'green', REJECTED: 'red',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: '待审批', APPROVED: '已审批', COMPLETED: '已完成', REJECTED: '已驳回',
}

export default function ReturnPage() {
  const [data, setData] = useState<ReturnVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ status: '', page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<ReturnVO | null>(null)
  const [approveOpen, setApproveOpen] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [form] = Form.useForm()
  const [approveForm] = Form.useForm()
  const { roles } = useSelector((state: RootState) => state.auth)
  // 退料审批和入库由库管员负责，护士长只能申请
  const canApprove = roles.includes('ADMIN') || roles.includes('WAREHOUSE_KEEPER')
  const canComplete = roles.includes('ADMIN') || roles.includes('WAREHOUSE_KEEPER')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await returnRequestsApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [params])
  useEffect(() => {
    materialsApi.getActive().then(setMaterials)
    departmentsApi.getAll().then(setDepartments)
  }, [])

  const handleCreate = async (values: any) => {
    try {
      await returnRequestsApi.create({ ...values, items: values.items || [] })
      message.success('退料申请创建成功')
      setCreateOpen(false); form.resetFields(); fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleApprove = async (values: any) => {
    if (!currentId) return
    try {
      await returnRequestsApi.approve(currentId, { approved: values.approved === 'yes', remark: values.remark })
      message.success('审批完成')
      setApproveOpen(false); approveForm.resetFields(); fetchData()
      if (detail?.id === currentId) {
        const d = await returnRequestsApi.getById(currentId)
        setDetail(d)
      }
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const handleComplete = async (id: number) => {
    await returnRequestsApi.complete(id)
    message.success('退料已完成入库')
    fetchData()
  }

  const openDetail = async (id: number) => {
    const d = await returnRequestsApi.getById(id)
    setDetail(d)
    setDetailOpen(true)
  }

  const columns: ColumnsType<ReturnVO> = [
    { title: '退料单号', dataIndex: 'returnNo', width: 160, fixed: 'left' },
    { title: '申请科室', dataIndex: 'deptName', width: 130 },
    { title: '申请人', dataIndex: 'createdByName', width: 100 },
    { title: '申请时间', dataIndex: 'createTime', width: 160,
      render: (v) => formatDateTime(v) },
    {
      title: '退料耗材', width: 260,
      render: (_, r) => {
        if (!r.items?.length) return <span style={{ color: '#bbb' }}>-</span>
        const show = r.items.slice(0, 2)
        const extra = r.items.length - 2
        return (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {show.map(item => (
              <Tag key={item.id} style={{ margin: 0 }}>
                {item.materialName} ×{item.quantity}
              </Tag>
            ))}
            {extra > 0 && <Tag color="default" style={{ margin: 0 }}>+{extra} 种</Tag>}
          </span>
        )
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>,
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 220, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>详情</Button>
          {canApprove && record.status === 'PENDING' && (
            <Button size="small" type="primary"
              onClick={() => { setCurrentId(record.id); setApproveOpen(true) }}>
              审批
            </Button>
          )}
          {canComplete && record.status === 'APPROVED' && (
            <Popconfirm title="确认退料完成入库？" onConfirm={() => handleComplete(record.id)}>
              <Button size="small" type="primary" icon={<CheckOutlined />}>完成入库</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        title="退料申请"
        extra={
          <Space>
            <Select placeholder="状态筛选" value={params.status || undefined}
              onChange={(v) => setParams({ ...params, status: v || '', page: 1 })}
              allowClear className="w-[120px]">
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              申请退料
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>

      {/* 新建退料申请 */}
      <Modal title="申请退料" open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => form.submit()} width={700} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deptId" label="申请科室" rules={[{ required: true }]}>
                <Select placeholder="选择科室">
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remark" label="退料原因">
                <Input placeholder="如：多领、库存过剩、近效期等" />
              </Form.Item>
            </Col>
          </Row>
          <Divider>退料明细</Divider>
          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row gutter={12} key={key} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Form.Item {...rest} name={[name, 'materialId']} rules={[{ required: true, message: '请选择耗材' }]} noStyle>
                        <Select placeholder="选择耗材" style={{ width: '100%' }}>
                          {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item {...rest} name={[name, 'batchNumber']} noStyle>
                        <Input placeholder="批号（可选）" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: '数量必填' }]} noStyle>
                        <InputNumber min={1} placeholder="数量" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button danger size="small" onClick={() => remove(name)}>删除</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} style={{ marginTop: 8 }}>+ 添加耗材</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 审批弹窗 */}
      <Modal title="审批退料申请" open={approveOpen}
        onCancel={() => { setApproveOpen(false); approveForm.resetFields() }}
        onOk={() => approveForm.submit()} destroyOnClose>
        <Form form={approveForm} onFinish={handleApprove} layout="vertical">
          <Form.Item name="approved" label="审批结果" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="yes">
                <CheckOutlined style={{ color: 'green' }} /> 批准退料
              </Select.Option>
              <Select.Option value="no">
                <CloseOutlined style={{ color: 'red' }} /> 驳回申请
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="审批意见">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer title="退料详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={640}>
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="退料单号">{detail.returnNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="申请科室">{detail.deptName}</Descriptions.Item>
              <Descriptions.Item label="申请人">{detail.createdByName}</Descriptions.Item>
              <Descriptions.Item label="审批人">{detail.approvedByName || '-'}</Descriptions.Item>
              <Descriptions.Item label="审批时间">
                {formatDateTime(detail.approvedTime) || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
            </Descriptions>
            <Divider>退料明细</Divider>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.items}
              columns={[
                { title: '耗材名称', dataIndex: 'materialName', width: 160 },
                { title: '规格', dataIndex: 'specification', width: 100 },
                { title: '单位', dataIndex: 'unit', width: 70 },
                { title: '批号', dataIndex: 'batchNumber', width: 130 },
                { title: '数量', dataIndex: 'quantity', width: 80 },
                { title: '备注', dataIndex: 'remark', ellipsis: true },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}
