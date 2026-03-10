import React, { useState, useEffect } from 'react'
import { Table, Tag, Button, Statistic, Row, Col, Card } from 'antd'
import {
  CloseCircleFilled, WarningFilled, InfoCircleFilled,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { notificationsApi, type NotificationVO } from '@/api/notifications'
import { formatDateTime } from '@/utils/format'

const STORAGE_KEY = 'read_notification_ids'

const LEVEL_COLOR: Record<string, string> = {
  info: 'blue',
  warning: 'orange',
  error: 'red',
}
const LEVEL_LABEL: Record<string, string> = {
  info: '信息',
  warning: '警告',
  error: '错误',
}

const getLevelIcon = (level: string) => {
  if (level === 'error') return <CloseCircleFilled style={{ color: '#ff4d4f' }} />
  if (level === 'warning') return <WarningFilled style={{ color: '#faad14' }} />
  return <InfoCircleFilled style={{ color: '#1890ff' }} />
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationVO[]>([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    setLoading(true)
    notificationsApi.getAll()
      .then(res => setNotifications(res.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds))
    setReadIds(allIds)
  }

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const newIds = [...readIds, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds))
      setReadIds(newIds)
    }
  }

  const errorCount = notifications.filter(n => n.level === 'error').length
  const warningCount = notifications.filter(n => n.level === 'warning').length
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length

  const columns: ColumnsType<NotificationVO> = [
    {
      title: '级别', dataIndex: 'level', width: 80,
      render: (level: string) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {getLevelIcon(level)}
          <Tag color={LEVEL_COLOR[level]}>{LEVEL_LABEL[level]}</Tag>
        </span>
      ),
      filters: [
        { text: '错误', value: 'error' },
        { text: '警告', value: 'warning' },
        { text: '信息', value: 'info' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    { title: '标题', dataIndex: 'title', width: 200 },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '时间', dataIndex: 'createTime', width: 180, render: (v) => formatDateTime(v) },
    {
      title: '状态', width: 80,
      render: (_, record) => readIds.includes(record.id)
        ? <Tag>已读</Tag>
        : <Tag color="blue">未读</Tag>,
    },
    {
      title: '操作', width: 120,
      render: (_, record) => (
        <>
          {!readIds.includes(record.id) && (
            <Button type="link" size="small" onClick={() => markAsRead(record.id)}>
              标为已读
            </Button>
          )}
          {record.linkPath && (
            <Button type="link" size="small" onClick={() => navigate(record.linkPath)}>
              查看
            </Button>
          )}
        </>
      ),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="通知总数" value={notifications.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="未读" value={unreadCount} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="错误" value={errorCount} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false}>
            <Statistic title="警告" value={warningCount} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        title="通知列表"
        extra={
          <Button onClick={markAllRead} disabled={unreadCount === 0}>
            全部标为已读
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={notifications}
          loading={loading}
          rowClassName={(record) => readIds.includes(record.id) ? 'row-read' : ''}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </Card>
      <style>{`.row-read { opacity: 0.6; }`}</style>
    </div>
  )
}

export default NotificationsPage
