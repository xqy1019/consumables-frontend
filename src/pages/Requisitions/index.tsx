import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Select, Tag, Card, Popconfirm,
  message, Tabs, Badge,
} from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { requisitionsApi } from '@/api/requisitions'
import type { Requisition } from '@/types'
import { REQUISITION_STATUS } from '@/types'

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
  const [activeTab, setActiveTab] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const navigate = useNavigate()

  const { roles, userId } = useSelector((state: RootState) => state.auth)
  const isAdmin = roles.includes('ADMIN')
  const isKeeper = roles.includes('WAREHOUSE_KEEPER')
  const isDirector = roles.includes('DEPT_DIRECTOR')
  const isNurse = roles.includes('HEAD_NURSE')
  const canApprove = isAdmin || isDirector

  // 初始化默认 tab
  useEffect(() => {
    if (canApprove) setActiveTab('pending')
    else if (isNurse || isKeeper) setActiveTab('mine')
    else setActiveTab('all')
  }, [roles])

  // 获取待审批数量（用于徽标）
  useEffect(() => {
    if (canApprove) {
      requisitionsApi.getList({ status: 'PENDING', page: 1, size: 1 })
        .then(res => setPendingCount(res.total))
        .catch(() => {})
    }
  }, [roles])

  const fetchData = async (tab = activeTab, status = statusFilter, pg = page, sz = pageSize) => {
    if (!tab) return
    setLoading(true)
    try {
      const params: any = { page: pg, size: sz }
      if (tab === 'pending') {
        params.status = 'PENDING'
      } else if (tab === 'mine') {
        if (userId) params.createdBy = userId
        if (status) params.status = status
      } else {
        if (status) params.status = status
      }
      const res = await requisitionsApi.getList(params)
      setData(res.records)
      setTotal(res.total)
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
    if (canApprove) {
      requisitionsApi.getList({ status: 'PENDING', page: 1, size: 1 })
        .then(res => setPendingCount(res.total))
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
      render: (v) => v ? v.replace('T', ' ').slice(0, 16) : '-' },
    { title: '需求日期', dataIndex: 'requiredDate', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (v) => {
        const s = REQUISITION_STATUS[v]
        return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{v}</Tag>
      },
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    {
      title: '操作', width: 130, fixed: 'right',
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
      children: (
        <div>
          {table}
        </div>
      ),
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

  // 只有一个 tab（如护士长）时不显示 Tabs，直接展示
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
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => navigate('/requisitions/create')}>
            发起申领
          </Button>
        }
      >
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
    </div>
  )
}
