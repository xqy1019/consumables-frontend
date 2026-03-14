import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, message, Card, Row, Col,
  Typography, Tag, Drawer, Descriptions, DatePicker, InputNumber,
} from 'antd'
import { PlusOutlined, EyeOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { tracingApi } from '@/api/tracing'
import { departmentsApi } from '@/api/system'
import type { SurgeryVO, BindingVO, Department } from '@/types'
import { Select } from 'antd'
import { formatDateTime } from '@/utils/format'


const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: '待手术', color: 'default' },
  IN_PROGRESS: { label: '手术中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
}

export default function SurgeryPage() {
  const [data, setData] = useState<SurgeryVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 10 })
  const [keyword, setKeyword] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [bindOpen, setBindOpen] = useState(false)
  const [currentSurgery, setCurrentSurgery] = useState<SurgeryVO | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [createForm] = Form.useForm()
  const [bindForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await tracingApi.getSurgeries({ keyword, ...page })
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [page, keyword])
  useEffect(() => { departmentsApi.getAll().then(setDepartments) }, [])

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        ...values,
        surgeryDate: values.surgeryDate?.format('YYYY-MM-DD'),
      }
      await tracingApi.createSurgery(payload)
      message.success('手术记录已创建')
      setCreateOpen(false)
      createForm.resetFields()
      fetchData()
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : '操作失败，请重试') }
  }

  const handleBind = async (values: any) => {
    if (!currentSurgery) return
    try {
      await tracingApi.bindMaterial(currentSurgery.id, values)
      message.success('耗材已绑定')
      setBindOpen(false)
      bindForm.resetFields()
      const detail = await tracingApi.getSurgeryDetail(currentSurgery.id)
      setCurrentSurgery(detail)
    } catch (e: unknown) { message.error(e instanceof Error ? e.message : '操作失败，请重试') }
  }

  const handleViewDetail = async (record: SurgeryVO) => {
    const detail = await tracingApi.getSurgeryDetail(record.id)
    setCurrentSurgery(detail)
    setDetailOpen(true)
  }

  const columns: ColumnsType<SurgeryVO> = [
    { title: '手术单号', dataIndex: 'surgeryNo', width: 180 },
    { title: '患者ID', dataIndex: 'patientId', width: 110 },
    { title: '患者姓名', dataIndex: 'patientName', width: 100 },
    { title: '手术类型', dataIndex: 'surgeryType', width: 120 },
    { title: '手术日期', dataIndex: 'surgeryDate', width: 110, render: (v) => formatDateTime(v) },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '主治医生', dataIndex: 'operatingDoctor', width: 110 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>,
    },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          <Button size="small" icon={<LinkOutlined />} onClick={() => {
            setCurrentSurgery(record)
            bindForm.resetFields()
            setBindOpen(true)
          }}>绑定耗材</Button>
        </Space>
      ),
    },
  ]

  const bindingColumns: ColumnsType<BindingVO> = [
    { title: 'UDI 码', dataIndex: 'udiCode', width: 180, ellipsis: true },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '绑定时间', dataIndex: 'bindTime', width: 160, render: (v) => formatDateTime(v) },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="手术记录管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            createForm.resetFields(); setCreateOpen(true)
          }}>新建手术记录</Button>
        }
      >
        <Row gutter={8} className="mb-4">
          <Col flex="1">
            <Input placeholder="搜索患者姓名/ID 或手术单号" prefix={<SearchOutlined />}
              value={keyword} onChange={e => setKeyword(e.target.value)} allowClear
              onClear={() => setKeyword('')} />
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

      {/* 新建手术记录 */}
      <Modal title="新建手术记录" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={() => createForm.submit()}
        width={600} destroyOnClose>
        <Form form={createForm} onFinish={handleCreate} layout="vertical" className="pt-2">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="patientId" label="患者ID" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="patientName" label="患者姓名" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="surgeryType" label="手术类型">
                <Input placeholder="如：腹腔镜手术" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="surgeryDate" label="手术日期" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deptId" label="科室">
                <Select allowClear>
                  {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.deptName}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="operatingDoctor" label="主治医生">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 手术详情 */}
      <Drawer
        title={`手术详情 - ${currentSurgery?.surgeryNo}`}
        open={detailOpen} onClose={() => setDetailOpen(false)} width={800}
      >
        {currentSurgery && (
          <>
            <Descriptions bordered size="small" column={2} className="mb-4">
              <Descriptions.Item label="手术单号">{currentSurgery.surgeryNo}</Descriptions.Item>
              <Descriptions.Item label="患者">{currentSurgery.patientName}（{currentSurgery.patientId}）</Descriptions.Item>
              <Descriptions.Item label="手术类型">{currentSurgery.surgeryType}</Descriptions.Item>
              <Descriptions.Item label="手术日期">{currentSurgery.surgeryDate}</Descriptions.Item>
              <Descriptions.Item label="科室">{currentSurgery.deptName}</Descriptions.Item>
              <Descriptions.Item label="主治医生">{currentSurgery.operatingDoctor}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentSurgery.status]?.color}>{STATUS_MAP[currentSurgery.status]?.label}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>耗材使用记录</Typography.Title>
            <Table rowKey="id" columns={bindingColumns} dataSource={currentSurgery.bindings || []} pagination={false} />
          </>
        )}
      </Drawer>

      {/* 绑定耗材弹窗 */}
      <Modal title="绑定手术耗材" open={bindOpen}
        onCancel={() => setBindOpen(false)} onOk={() => bindForm.submit()} destroyOnClose>
        <Form form={bindForm} onFinish={handleBind} layout="vertical" className="pt-2">
          <Form.Item name="udiId" label="UDI ID" rules={[{ required: true }]}
            extra="请输入已注册的 UDI 记录 ID">
            <InputNumber className="w-full" />
          </Form.Item>
          <Form.Item name="quantity" label="数量" initialValue={1}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
