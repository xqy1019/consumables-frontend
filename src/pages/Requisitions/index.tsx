import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Select, Tag, Card, Popconfirm,
  message, Tabs, Badge, Alert, Modal, Input,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, CheckCircleOutlined,
  BellOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { requisitionsApi } from '@/api/requisitions'
import type { Requisition } from '@/types'
import { REQUISITION_STATUS } from '@/types'
import { formatDateTime, formatDate } from '@/utils/format'

// 耗材明细摘要：前 2 种 + 超出显示 +N
function MaterialSummary({ items }: { items?: Requisition['items'] }) {
  if (!items?.length) return <span style={{ color: '#bbb' }}>-</span>
  const show = items.slice(0, 2)
  const extra = items.length - 2
  return (
    <Space wrap size={4}>
      {show.map(item => (
        <Tag key={item.id} style={{ margin: 0 }}>
          {item.materialName} ×{item.quantity}
        </Tag>
      ))}
      {extra > 0 && (
        <Tag color="default" style={{ margin: 0 }}>+{extra} 种</Tag>
      )}
    </Space>
  )
}

export default function RequisitionsPage() {
  const [data, setData] = useState<Requisition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [dispatchedCount, setDispatchedCount] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [signModalOpen, setSignModalOpen] = useState(false)
  const [signTarget, setSignTarget] = useState<Requisition | null>(null)
  const [signRemark, setSignRemark] = useState('')
  const [signLoading, setSignLoading] = useState(false)
  const navigate = useNavigate()

  const { roles, userId } = useSelector((state: RootState) => state.auth)
  const isAdmin = roles.includes('ADMIN')
  const isKeeper = roles.includes('WAREHOUSE_KEEPER')
  const isDirector = roles.includes('DEPT_DIRECTOR')
  const isNurse = roles.includes('HEAD_NURSE')
  const canApprove = isAdmin || isDirector
  const canSign = isAdmin || isNurse

  // 初始化默认 tab
  useEffect(() => {
    if (canApprove) setActiveTab('pending')
    else if (isKeeper) setActiveTab('approved')
    else if (isNurse) setActiveTab('toSign')  // 护士长默认看待签收
    else setActiveTab('all')
  }, [roles])

  // 获取各状态徽标数量
  useEffect(() => {
    if (canApprove) {
      requisitionsApi.getList({ status: 'PENDING', page: 1, size: 1 })
        .then(res => setPendingCount(res.total)).catch(() => {})
    }
    if (isAdmin || isKeeper) {
      requisitionsApi.getList({ status: 'APPROVED', page: 1, size: 1 })
        .then(res => setApprovedCount(res.total)).catch(() => {})
    }
    if (canSign) {
      requisitionsApi.getList({ status: 'DISPATCHED', page: 1, size: 1 })
        .then(res => setDispatchedCount(res.total)).catch(() => {})
    }
  }, [roles])

  const refreshBadges = () => {
    if (canApprove) {
      requisitionsApi.getList({ status: 'PENDING', page: 1, size: 1 })
        .then(r => setPendingCount(r.total)).catch(() => {})
    }
    if (isAdmin || isKeeper) {
      requisitionsApi.getList({ status: 'APPROVED', page: 1, size: 1 })
        .then(r => setApprovedCount(r.total)).catch(() => {})
    }
    if (canSign) {
      requisitionsApi.getList({ status: 'DISPATCHED', page: 1, size: 1 })
        .then(r => setDispatchedCount(r.total)).catch(() => {})
    }
  }

  const fetchData = async (tab = activeTab, status = statusFilter, pg = page, sz = pageSize) => {
    if (!tab) return
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: pg, size: sz }
      if (tab === 'pending') {
        params.status = 'PENDING'
      } else if (tab === 'approved') {
        params.status = 'APPROVED'
      } else if (tab === 'toSign') {
        params.status = 'DISPATCHED'
      } else if (tab === 'mine') {
        if (userId) params.createdBy = userId
        if (status) params.status = status
      } else {
        if (status) params.status = status
      }
      const res = await requisitionsApi.getList(params)
      setData(res.records)
      setTotal(res.total)
      refreshBadges()
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (activeTab) fetchData(activeTab, statusFilter, page, pageSize)
  }, [activeTab, statusFilter, page, pageSize])

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    setStatusFilter('')
    setPage(1)
  }

  const handleSubmit = async (id: number) => {
    await requisitionsApi.submit(id)
    message.success('提交成功')
    fetchData()
  }

  const openSignModal = (record: Requisition) => {
    setSignTarget(record)
    setSignRemark('')
    setSignModalOpen(true)
  }

  const handleSign = async () => {
    if (!signTarget) return
    setSignLoading(true)
    try {
      await requisitionsApi.sign(signTarget.id, { remark: signRemark || undefined })
      message.success('签收成功')
      setSignModalOpen(false)
      setSignTarget(null)
      fetchData()
    } catch {
      // 错误由拦截器处理
    } finally {
      setSignLoading(false)
    }
  }

  const columns: ColumnsType<Requisition> = [
    { title: '申领单号', dataIndex: 'requisitionNo', width: 155, fixed: 'left' },
    { title: '申领科室', dataIndex: 'deptName', width: 100 },
    { title: '申领人', dataIndex: 'createdByName', width: 90 },
    {
      title: '耗材明细', width: 260,
      render: (_, r) => <MaterialSummary items={r.items} />,
    },
    { title: '申领时间', dataIndex: 'requisitionDate', width: 145,
      render: (v) => formatDateTime(v) },
    { title: '需求日期', dataIndex: 'requiredDate', width: 100, render: (v) => formatDate(v) },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v) => {
        const s = REQUISITION_STATUS[v]
        return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{v}</Tag>
      },
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/requisitions/${record.id}`)}>
            详情
          </Button>
          {record.status === 'DRAFT' && (
            <Popconfirm title="确认提交审批？" onConfirm={() => handleSubmit(record.id)}>
              <Button size="small" type="primary">提交</Button>
            </Popconfirm>
          )}
          {record.status === 'DISPATCHED' && canSign && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => openSignModal(record)}
            >
              签收
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // 全部/我的申领 Tab 的状态筛选
  const statusSelect = (
    <Select placeholder="按状态筛选" value={statusFilter || undefined}
      onChange={(v) => { setStatusFilter(v || ''); setPage(1) }}
      allowClear style={{ width: 130 }}>
      {Object.entries(REQUISITION_STATUS).map(([k, v]) => (
        <Select.Option key={k} value={k}>{v.label}</Select.Option>
      ))}
    </Select>
  )

  const table = (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      scroll={{ x: 1100 }}
      pagination={{
        total, current: page, pageSize,
        showSizeChanger: true,
        showTotal: (t) => `共 ${t} 条`,
        onChange: (pg, sz) => { setPage(pg); setPageSize(sz) },
      }}
    />
  )

  // 待签收提醒横幅（护士长 / 管理员看到）
  const signBanner = canSign && dispatchedCount > 0 && activeTab !== 'toSign' ? (
    <Alert
      type="info"
      showIcon
      icon={<BellOutlined />}
      style={{ marginBottom: 16, borderRadius: 10 }}
      message={
        <span>
          您有 <strong style={{ color: '#6366f1' }}>{dispatchedCount}</strong> 笔申领单已发放，请及时签收确认
          <Button type="link" size="small" style={{ paddingLeft: 8 }}
            onClick={() => handleTabChange('toSign')}>
            去签收
          </Button>
        </span>
      }
    />
  ) : null

  // 构建 Tabs 列表（按角色显示）
  const tabItems = []

  if (canApprove) {
    tabItems.push({
      key: 'pending',
      label: (
        <Badge count={pendingCount} size="small" offset={[6, -2]}>
          <span style={{ paddingRight: pendingCount > 0 ? 12 : 0 }}>待我审批</span>
        </Badge>
      ),
      children: <div>{table}</div>,
    })
  }

  // 库管员「待发放」Tab
  if (isAdmin || isKeeper) {
    tabItems.push({
      key: 'approved',
      label: (
        <Badge count={approvedCount} size="small" offset={[6, -2]}>
          <span style={{ paddingRight: approvedCount > 0 ? 12 : 0 }}>待发放</span>
        </Badge>
      ),
      children: <div>{table}</div>,
    })
  }

  // 护士长 / 管理员「待签收」Tab
  if (canSign) {
    tabItems.push({
      key: 'toSign',
      label: (
        <Badge count={dispatchedCount} size="small" offset={[6, -2]}>
          <span style={{ paddingRight: dispatchedCount > 0 ? 12 : 0 }}>待签收</span>
        </Badge>
      ),
      children: <div>{table}</div>,
    })
  }

  if (!isKeeper || isAdmin) {
    tabItems.push({
      key: 'mine',
      label: '我的申领',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            {statusSelect}
          </div>
          {table}
        </div>
      ),
    })
  }

  if (isAdmin || isKeeper || isDirector) {
    tabItems.push({
      key: 'all',
      label: '全部申领',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            {statusSelect}
          </div>
          {table}
        </div>
      ),
    })
  }

  // 只有一个 tab 时不显示 Tabs
  if (tabItems.length === 0) {
    tabItems.push({
      key: 'mine',
      label: '我的申领',
      children: (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
            {statusSelect}
          </div>
          {table}
        </div>
      ),
    })
  }

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="申领管理"
        extra={
          !isKeeper && (
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => navigate('/requisitions/create')}>
              发起申领
            </Button>
          )
        }
      >
        {signBanner}
        {tabItems.length === 1 ? (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
              {statusSelect}
            </div>
            {table}
          </>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
          />
        )}
      </Card>

      {/* 签收确认弹窗 */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#10b981' }} />
            确认签收
          </Space>
        }
        open={signModalOpen}
        onCancel={() => { setSignModalOpen(false); setSignTarget(null) }}
        onOk={handleSign}
        confirmLoading={signLoading}
        okText="确认签收"
        okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
      >
        {signTarget && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ marginBottom: 4 }}>
              <strong>申领单号：</strong>{signTarget.requisitionNo}
            </div>
            <div style={{ marginBottom: 4 }}>
              <strong>申领科室：</strong>{signTarget.deptName}
            </div>
            <div>
              <strong>耗材明细：</strong>
              {signTarget.items?.map(item => `${item.materialName} ×${item.quantity}`).join('、') || '-'}
            </div>
          </div>
        )}
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
          请确认已收到发放的耗材且数量无误，签收后状态将变为「已签收」。
        </div>
        <Input.TextArea
          rows={2}
          placeholder="签收备注（可选，如：实收数量与申领一致）"
          value={signRemark}
          onChange={e => setSignRemark(e.target.value)}
        />
      </Modal>
    </div>
  )
}
