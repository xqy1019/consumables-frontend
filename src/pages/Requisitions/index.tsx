import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Select, Tag, Card, Popconfirm, message } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { requisitionsApi } from '@/api/requisitions'
import type { Requisition } from '@/types'
import { REQUISITION_STATUS } from '@/types'

export default function RequisitionsPage() {
  const [data, setData] = useState<Requisition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ page: 1, size: 10, status: '' })
  const navigate = useNavigate()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await requisitionsApi.getList({ ...params, status: params.status || undefined })
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [params])

  const handleSubmit = async (id: number) => {
    await requisitionsApi.submit(id)
    message.success('提交成功')
    fetchData()
  }

  const columns: ColumnsType<Requisition> = [
    { title: '申领单号', dataIndex: 'requisitionNo', width: 160, fixed: 'left' },
    { title: '申领科室', dataIndex: 'deptName', width: 120 },
    { title: '申领人', dataIndex: 'createdByName', width: 100 },
    { title: '申领时间', dataIndex: 'requisitionDate', width: 160,
      render: (v) => v ? v.replace('T', ' ').slice(0, 16) : '-' },
    { title: '需求日期', dataIndex: 'requiredDate', width: 110 },
    { title: '品种数', width: 80,
      render: (_, r) => r.items?.length ?? 0 },
    {
      title: '状态', dataIndex: 'status', width: 100,
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
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl"
        title="申领管理"
        extra={
          <Space>
            <Select placeholder="按状态筛选" value={params.status || undefined}
              onChange={(v) => setParams({ ...params, status: v || '', page: 1 })}
              allowClear className="w-[140px]">
              {Object.entries(REQUISITION_STATUS).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v.label}</Select.Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => navigate('/requisitions/create')}>
              发起申领
            </Button>
          </Space>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }} />
      </Card>
    </div>
  )
}
