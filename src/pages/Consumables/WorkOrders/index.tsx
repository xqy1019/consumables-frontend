import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Table, Tag, Button, Space, Modal, Form, Input, Select,
  Statistic, Row, Col, Badge, Descriptions, Timeline, message, Popconfirm,
} from 'antd'
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, CommentOutlined, ExclamationCircleOutlined, DownloadOutlined,
  TeamOutlined, StopOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { TableRowSelection } from 'antd/es/table/interface'
import {
  anomalyWorkOrderApi, exportWorkOrders,
  type WorkOrderVO, type WorkOrderStatsVO, type CreateWorkOrderInput,
} from '@/api/anomalyWorkOrder'
import { departmentsApi, usersApi } from '@/api/system'
import { materialsApi } from '@/api/materials'
import type { Department, Material, User } from '@/types'
import dayjs from 'dayjs'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  OPEN: { text: '待处理', color: 'red' },
  IN_PROGRESS: { text: '处理中', color: 'blue' },
  RESOLVED: { text: '已解决', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
}

const PRIORITY_MAP: Record<string, { text: string; color: string }> = {
  HIGH: { text: '高', color: 'red' },
  NORMAL: { text: '中', color: 'blue' },
  LOW: { text: '低', color: 'default' },
}

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [stats, setStats] = useState<WorkOrderStatsVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<WorkOrderVO | null>(null)
  const [createVisible, setCreateVisible] = useState(false)
  const [resolveVisible, setResolveVisible] = useState(false)
  const [resolveId, setResolveId] = useState<number | null>(null)
  const [resolution, setResolution] = useState('')
  const [comment, setComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [deptFilter, setDeptFilter] = useState<number | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchAssignVisible, setBatchAssignVisible] = useState(false)
  const [batchAssigneeId, setBatchAssigneeId] = useState<string>('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [createForm] = Form.useForm()

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
    materialsApi.getActive().then(setMaterials).catch(() => {})
    usersApi.getList({ page: 1, size: 100 }).then(res => setUsers(res.records)).catch(() => {})
  }, [])

  const fetchData = useCallback(async (p = page, s = pageSize) => {
    setLoading(true)
    try {
      const params: { page: number; size: number; deptId?: number; priority?: string; status?: string } = { page: p, size: s }
      if (deptFilter) params.deptId = deptFilter
      if (priorityFilter) params.priority = priorityFilter
      if (statusFilter) params.status = statusFilter
      const [pageData, statsData] = await Promise.all([
        anomalyWorkOrderApi.getAll(params),
        anomalyWorkOrderApi.getStats(),
      ])
      setOrders(pageData.records)
      setTotal(pageData.total)
      setStats(statsData)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page, pageSize, deptFilter, priorityFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const showDetail = async (id: number) => {
    try {
      const data = await anomalyWorkOrderApi.getById(id)
      setCurrentOrder(data)
      setDetailVisible(true)
    } catch { /* ignore */ }
  }

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields() as CreateWorkOrderInput
      await anomalyWorkOrderApi.create(values)
      message.success('工单创建成功')
      setCreateVisible(false)
      createForm.resetFields()
      fetchData()
    } catch { /* ignore */ }
  }

  const handleResolve = async () => {
    if (!resolveId || !resolution.trim()) return
    try {
      await anomalyWorkOrderApi.resolve(resolveId, resolution)
      message.success('工单已解决')
      setResolveVisible(false)
      setResolution('')
      setResolveId(null)
      fetchData()
      if (currentOrder?.id === resolveId) {
        const updated = await anomalyWorkOrderApi.getById(resolveId)
        setCurrentOrder(updated)
      }
    } catch { /* ignore */ }
  }

  const handleClose = async (id: number) => {
    try {
      await anomalyWorkOrderApi.close(id)
      message.success('工单已关闭')
      fetchData()
      if (currentOrder?.id === id) {
        const updated = await anomalyWorkOrderApi.getById(id)
        setCurrentOrder(updated)
      }
    } catch { /* ignore */ }
  }

  const handleAddComment = async () => {
    if (!currentOrder || !comment.trim()) return
    setCommentLoading(true)
    try {
      await anomalyWorkOrderApi.addComment(currentOrder.id, comment)
      const updated = await anomalyWorkOrderApi.getById(currentOrder.id)
      setCurrentOrder(updated)
      setComment('')
      message.success('评论已添加')
    } catch { /* ignore */ } finally {
      setCommentLoading(false)
    }
  }

  const handleBatchAssign = async () => {
    const id = Number(batchAssigneeId)
    if (!id || isNaN(id)) {
      message.error('请输入有效的用户ID')
      return
    }
    try {
      const count = await anomalyWorkOrderApi.batchAssign(selectedRowKeys.map(Number), id)
      message.success(`成功分配 ${count} 个工单`)
      setBatchAssignVisible(false)
      setBatchAssigneeId('')
      setSelectedRowKeys([])
      fetchData()
    } catch { /* ignore */ }
  }

  const handleBatchClose = async () => {
    try {
      const count = await anomalyWorkOrderApi.batchClose(selectedRowKeys.map(Number))
      message.success(`成功关闭 ${count} 个工单（仅已解决状态的工单会被关闭）`)
      setSelectedRowKeys([])
      fetchData()
    } catch { /* ignore */ }
  }

  const rowSelection: TableRowSelection<WorkOrderVO> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  }

  const columns: ColumnsType<WorkOrderVO> = [
    {
      title: 'ID', dataIndex: 'id', width: 60,
      render: (id: number) => `#${id}`,
    },
    {
      title: '科室', dataIndex: 'deptName', width: 100,
    },
    {
      title: '耗材', dataIndex: 'materialName', ellipsis: true,
    },
    {
      title: '异常类型', dataIndex: 'anomalyType', width: 90,
      render: (t: string) => (
        <Tag color={t === 'DANGER' ? 'red' : 'orange'}>{t === 'DANGER' ? '严重' : '警告'}</Tag>
      ),
    },
    {
      title: '偏差率', dataIndex: 'deviationRate', width: 80,
      render: (v: number) => v ? `${(v * 100).toFixed(0)}%` : '-',
    },
    {
      title: '优先级', dataIndex: 'priority', width: 70,
      render: (p: string) => {
        const info = PRIORITY_MAP[p] || { text: p, color: 'default' }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => {
        const info = STATUS_MAP[s] || { text: s, color: 'default' }
        return <Tag color={info.color}>{info.text}</Tag>
      },
    },
    {
      title: '负责人', dataIndex: 'assignedToName', width: 80,
      render: (v: string | null) => v || <span style={{ color: '#999' }}>未分配</span>,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_: unknown, record: WorkOrderVO) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => showDetail(record.id)}>详情</Button>
          {record.status === 'OPEN' || record.status === 'IN_PROGRESS' ? (
            <Button type="link" size="small" onClick={() => {
              setResolveId(record.id)
              setResolveVisible(true)
            }}>解决</Button>
          ) : null}
          {record.status === 'RESOLVED' ? (
            <Popconfirm title="确认关闭此工单？" onConfirm={() => handleClose(record.id)}>
              <Button type="link" size="small">关闭</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px 0' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => { setStatusFilter(undefined); setPage(1) }}
            style={!statusFilter ? { borderColor: '#1890ff' } : undefined}>
            <Statistic title="全部工单" value={stats?.total || 0} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => { setStatusFilter('OPEN'); setPage(1) }}
            style={statusFilter === 'OPEN' ? { borderColor: '#ff4d4f' } : undefined}>
            <Statistic title="待处理" value={stats?.open || 0}
              valueStyle={{ color: (stats?.open || 0) > 0 ? '#ff4d4f' : undefined }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => { setStatusFilter('IN_PROGRESS'); setPage(1) }}
            style={statusFilter === 'IN_PROGRESS' ? { borderColor: '#1890ff' } : undefined}>
            <Statistic title="处理中" value={stats?.inProgress || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable onClick={() => { setStatusFilter('RESOLVED'); setPage(1) }}
            style={statusFilter === 'RESOLVED' ? { borderColor: '#52c41a' } : undefined}>
            <Statistic title="已解决" value={stats?.resolved || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" hoverable onClick={() => { setStatusFilter('CLOSED'); setPage(1) }}
            style={statusFilter === 'CLOSED' ? { borderColor: '#999' } : undefined}>
            <Statistic title="已关闭" value={stats?.closed || 0} />
          </Card>
        </Col>
      </Row>

      {/* 工单列表 */}
      <Card
        title={<><ExclamationCircleOutlined /> 异常处理工单{statusFilter ? ` - ${STATUS_MAP[statusFilter]?.text}` : ''}</>}
        extra={
          <Space>
            <Select
              placeholder="科室筛选"
              allowClear
              style={{ width: 140 }}
              value={deptFilter}
              onChange={(v) => { setDeptFilter(v); setPage(1) }}
              showSearch
              optionFilterProp="label"
              options={departments.map(d => ({ value: d.id, label: d.deptName }))}
            />
            <Select
              placeholder="优先级筛选"
              allowClear
              style={{ width: 120 }}
              value={priorityFilter}
              onChange={(v) => { setPriorityFilter(v); setPage(1) }}
              options={[
                { value: 'HIGH', label: '高' },
                { value: 'NORMAL', label: '中' },
                { value: 'LOW', label: '低' },
              ]}
            />
            <Button
              icon={<TeamOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={() => setBatchAssignVisible(true)}
            >
              批量分配
            </Button>
            <Popconfirm
              title={`确认批量关闭选中的 ${selectedRowKeys.length} 个工单？（仅已解决状态会被关闭）`}
              onConfirm={handleBatchClose}
              disabled={selectedRowKeys.length === 0}
            >
              <Button
                icon={<StopOutlined />}
                disabled={selectedRowKeys.length === 0}
              >
                批量关闭
              </Button>
            </Popconfirm>
            <Button icon={<DownloadOutlined />} onClick={async () => { await exportWorkOrders() }}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
              创建工单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          scroll={{ x: 1000 }}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: true, showTotal: t => `共 ${t} 条`,
            onChange: (p, s) => { setPage(p); setPageSize(s) },
          }}
        />
      </Card>

      {/* 创建工单 */}
      <Modal
        title="创建异常工单"
        open={createVisible}
        onOk={handleCreate}
        onCancel={() => { setCreateVisible(false); createForm.resetFields() }}
        width={500}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="deptId" label="科室" rules={[{ required: true, message: '请选择科室' }]}>
            <Select
              placeholder="请选择科室"
              showSearch
              optionFilterProp="label"
              options={departments.map(d => ({ value: d.id, label: d.deptName }))}
            />
          </Form.Item>
          <Form.Item name="materialId" label="耗材" rules={[{ required: true, message: '请选择耗材' }]}>
            <Select
              placeholder="请选择耗材"
              showSearch
              optionFilterProp="label"
              options={materials.map(m => ({ value: m.id, label: `${m.materialName} (${m.specification})` }))}
            />
          </Form.Item>
          <Form.Item name="anomalyType" label="异常类型" rules={[{ required: true }]}>
            <Select options={[
              { value: 'DANGER', label: '严重异常' },
              { value: 'WARNING', label: '预警' },
            ]} />
          </Form.Item>
          <Form.Item name="deviationRate" label="偏差率">
            <Input type="number" step="0.01" placeholder="例如 0.5 表示 50%" />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select defaultValue="NORMAL" options={[
              { value: 'HIGH', label: '高' },
              { value: 'NORMAL', label: '中' },
              { value: 'LOW', label: '低' },
            ]} />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="描述异常情况" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 解决工单 */}
      <Modal
        title="解决工单"
        open={resolveVisible}
        onOk={handleResolve}
        onCancel={() => { setResolveVisible(false); setResolution(''); setResolveId(null) }}
      >
        <Input.TextArea
          rows={4}
          value={resolution}
          onChange={e => setResolution(e.target.value)}
          placeholder="请输入解决方案..."
        />
      </Modal>

      {/* 工单详情 */}
      <Modal
        title={<>工单详情 #{currentOrder?.id}</>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentOrder && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="科室">{currentOrder.deptName}</Descriptions.Item>
              <Descriptions.Item label="耗材">{currentOrder.materialName}</Descriptions.Item>
              <Descriptions.Item label="异常类型">
                <Tag color={currentOrder.anomalyType === 'DANGER' ? 'red' : 'orange'}>
                  {currentOrder.anomalyType === 'DANGER' ? '严重' : '警告'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="偏差率">
                {currentOrder.deviationRate ? `${(currentOrder.deviationRate * 100).toFixed(0)}%` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={PRIORITY_MAP[currentOrder.priority]?.color}>
                  {PRIORITY_MAP[currentOrder.priority]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[currentOrder.status]?.color}>
                  {STATUS_MAP[currentOrder.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{currentOrder.createdByName}</Descriptions.Item>
              <Descriptions.Item label="负责人">{currentOrder.assignedToName || '未分配'}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>
                {dayjs(currentOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>{currentOrder.description}</Descriptions.Item>
              {currentOrder.resolution && (
                <Descriptions.Item label="解决方案" span={2}>
                  <Badge status="success" text={currentOrder.resolution} />
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 评论时间线 */}
            <Card size="small" title={<><CommentOutlined /> 处理记录</>} style={{ marginBottom: 16 }}>
              {currentOrder.comments && currentOrder.comments.length > 0 ? (
                <Timeline
                  items={currentOrder.comments.map(c => ({
                    color: 'blue',
                    children: (
                      <div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          <UserOutlined /> {c.userName} · {dayjs(c.createdAt).format('MM-DD HH:mm')}
                        </div>
                        <div style={{ marginTop: 4 }}>{c.content}</div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>暂无处理记录</div>
              )}
              {currentOrder.status !== 'CLOSED' && (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="添加处理记录..."
                    onPressEnter={handleAddComment}
                  />
                  <Button type="primary" loading={commentLoading} onClick={handleAddComment}>
                    提交
                  </Button>
                </Space.Compact>
              )}
            </Card>

            {/* 操作按钮 */}
            {(currentOrder.status === 'OPEN' || currentOrder.status === 'IN_PROGRESS') && (
              <Space>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => {
                  setResolveId(currentOrder.id)
                  setResolveVisible(true)
                }}>标记解决</Button>
              </Space>
            )}
            {currentOrder.status === 'RESOLVED' && (
              <Popconfirm title="确认关闭此工单？" onConfirm={() => handleClose(currentOrder.id)}>
                <Button icon={<CloseCircleOutlined />}>关闭工单</Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Modal>

      {/* 批量分配弹窗 */}
      <Modal
        title={`批量分配工单（已选 ${selectedRowKeys.length} 个）`}
        open={batchAssignVisible}
        onOk={handleBatchAssign}
        onCancel={() => { setBatchAssignVisible(false); setBatchAssigneeId('') }}
      >
        <Select
          value={batchAssigneeId || undefined}
          onChange={(v: string) => setBatchAssigneeId(String(v))}
          placeholder="请选择负责人"
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          options={users.map(u => ({ value: String(u.id), label: `${u.realName} (${u.username})` }))}
        />
      </Modal>
    </div>
  )
}
