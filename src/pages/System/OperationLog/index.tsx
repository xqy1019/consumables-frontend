import React, { useState, useEffect } from 'react'
import { Table, Form, Input, Select, Button, DatePicker, Tag, Space } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getOperationLogs } from '@/api/system'

const { RangePicker } = DatePicker
const { Option } = Select

interface OperationLogItem {
  id: number
  username: string
  deptName: string
  module: string
  action: string
  ipAddr: string
  status: number
  errorMsg: string
  requestParams: string
  durationMs: number
  operateTime: string
}

const OperationLogPage: React.FC = () => {
  const [form] = Form.useForm()
  const [data, setData] = useState<OperationLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  const fetchData = async (page = 1) => {
    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const [startTime, endTime] = values.timeRange || []
      const res: any = await getOperationLogs({
        username: values.username,
        module: values.module,
        status: values.status,
        startTime: startTime ? startTime.format('YYYY-MM-DDTHH:mm:ss') : undefined,
        endTime: endTime ? endTime.format('YYYY-MM-DDTHH:mm:ss') : undefined,
        page,
        size: pagination.pageSize,
      })
      const pageData = (res as any)
      setData(pageData?.records || pageData?.content || [])
      setPagination(prev => ({ ...prev, total: pageData?.total || pageData?.totalElements || 0, current: page }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const columns: ColumnsType<OperationLogItem> = [
    { title: '操作时间', dataIndex: 'operateTime', width: 180 },
    { title: '操作人', dataIndex: 'username', width: 100 },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '模块', dataIndex: 'module', width: 100 },
    { title: '操作', dataIndex: 'action', width: 120 },
    { title: 'IP地址', dataIndex: 'ipAddr', width: 130 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'error'}>{status === 1 ? '成功' : '失败'}</Tag>
      ),
    },
    { title: '耗时(ms)', dataIndex: 'durationMs', width: 90 },
  ]

  return (
    <div>
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="timeRange"><RangePicker showTime /></Form.Item>
        <Form.Item name="username"><Input placeholder="操作人" allowClear /></Form.Item>
        <Form.Item name="module">
          <Select placeholder="模块" allowClear style={{ width: 120 }}>
            <Option value="认证">认证</Option>
            <Option value="库存">库存</Option>
            <Option value="申领">申领</Option>
            <Option value="采购">采购</Option>
            <Option value="用户">用户</Option>
          </Select>
        </Form.Item>
        <Form.Item name="status">
          <Select placeholder="状态" allowClear style={{ width: 100 }}>
            <Option value={1}>成功</Option>
            <Option value={0}>失败</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" onClick={() => fetchData(1)}>查询</Button>
            <Button onClick={() => { form.resetFields(); fetchData(1) }}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        rowClassName={(record) => record.status === 0 ? 'row-error' : ''}
        expandable={{
          expandedRowRender: (record) => (
            <div>
              {record.errorMsg && <p style={{ color: 'red' }}>错误信息：{record.errorMsg}</p>}
              {record.requestParams && <p>请求参数：<code>{record.requestParams}</code></p>}
            </div>
          ),
          rowExpandable: (record) => !!record.errorMsg || !!record.requestParams,
        }}
        pagination={{
          ...pagination,
          onChange: (page) => fetchData(page),
          showSizeChanger: false,
        }}
      />
      <style>{`.row-error { background-color: #fff1f0 !important; }`}</style>
    </div>
  )
}

export default OperationLogPage
