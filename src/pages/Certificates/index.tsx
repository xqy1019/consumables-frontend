import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Card, Tabs, Tag, Select, Input, Row, Col, Button,
  Space, Badge, Tooltip, Progress,
} from 'antd'
import { SearchOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { materialsApi } from '@/api/materials'
import { suppliersApi } from '@/api/system'
import type { Material, Supplier } from '@/types'
import { useNavigate } from 'react-router-dom'

type CertStatus = 'normal' | 'soon' | 'expired' | 'missing'

function getCertStatus(expiryDate: string | null | undefined): CertStatus {
  if (!expiryDate) return 'missing'
  const expiry = dayjs(expiryDate)
  const now = dayjs()
  if (expiry.isBefore(now)) return 'expired'
  if (expiry.diff(now, 'day') <= 90) return 'soon'
  return 'normal'
}

const STATUS_CONFIG: Record<CertStatus, { color: string; label: string; icon: React.ReactNode }> = {
  normal: { color: 'green', label: '正常', icon: <CheckCircleOutlined /> },
  soon: { color: 'orange', label: '即将到期', icon: <WarningOutlined /> },
  expired: { color: 'red', label: '已过期', icon: <CloseCircleOutlined /> },
  missing: { color: 'default', label: '未填写', icon: null },
}

export default function CertificatesPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<CertStatus | ''>('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      materialsApi.getList({ size: 1000, status: 1 }).then(r => setMaterials(r.records)),
      suppliersApi.getList({ size: 1000 }).then(r => setSuppliers(r.records)),
    ]).finally(() => setLoading(false))
  }, [])

  const filterRows = <T extends { certStatus: CertStatus; searchText: string }>(rows: T[]) =>
    rows.filter(r => {
      if (keyword && !r.searchText.toLowerCase().includes(keyword.toLowerCase())) return false
      if (statusFilter && r.certStatus !== statusFilter) return false
      return true
    })

  const materialRows = useMemo(() => materials.map(m => ({
    ...m,
    certStatus: getCertStatus(m.registrationExpiry),
    searchText: `${m.materialName} ${m.materialCode} ${m.registrationNo ?? ''}`,
    daysLeft: m.registrationExpiry
      ? dayjs(m.registrationExpiry).diff(dayjs(), 'day')
      : null,
  })), [materials])

  const supplierRows = useMemo(() => suppliers.map(s => ({
    ...s,
    certStatus: getCertStatus(s.licenseExpiry),
    searchText: `${s.supplierName} ${s.supplierCode ?? ''} ${s.licenseNo ?? ''}`,
    daysLeft: s.licenseExpiry
      ? dayjs(s.licenseExpiry).diff(dayjs(), 'day')
      : null,
  })), [suppliers])

  const filteredMaterials = filterRows(materialRows)
  const filteredSuppliers = filterRows(supplierRows)

  // 统计数据
  const matStats = {
    expired: materialRows.filter(r => r.certStatus === 'expired').length,
    soon: materialRows.filter(r => r.certStatus === 'soon').length,
    normal: materialRows.filter(r => r.certStatus === 'normal').length,
    missing: materialRows.filter(r => r.certStatus === 'missing').length,
  }
  const supStats = {
    expired: supplierRows.filter(r => r.certStatus === 'expired').length,
    soon: supplierRows.filter(r => r.certStatus === 'soon').length,
    normal: supplierRows.filter(r => r.certStatus === 'normal').length,
    missing: supplierRows.filter(r => r.certStatus === 'missing').length,
  }

  const renderDaysLeft = (days: number | null) => {
    if (days === null) return <span style={{ color: '#999' }}>-</span>
    if (days < 0) return <Tag color="red">{Math.abs(days)}天前已过期</Tag>
    if (days <= 30) return <Tag color="red">{days}天后到期</Tag>
    if (days <= 90) return <Tag color="orange">{days}天后到期</Tag>
    return <Tag color="green">{days}天后到期</Tag>
  }

  const renderProgress = (days: number | null) => {
    if (days === null || days < 0) return null
    const total = 365
    const pct = Math.min(100, Math.round((days / total) * 100))
    const color = days <= 30 ? '#ff4d4f' : days <= 90 ? '#faad14' : '#52c41a'
    return <Progress percent={pct} size="small" strokeColor={color} showInfo={false} style={{ width: 80 }} />
  }

  const SearchBar = () => (
    <Row gutter={8} className="mb-4">
      <Col flex="1">
        <Input
          placeholder="搜索名称/编码/证件号"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
          onClear={() => setKeyword('')}
        />
      </Col>
      <Col>
        <Select
          placeholder="证件状态"
          value={statusFilter || undefined}
          allowClear
          onChange={(v) => setStatusFilter(v ?? '')}
          className="w-[140px]"
        >
          <Select.Option value="expired">已过期</Select.Option>
          <Select.Option value="soon">即将到期</Select.Option>
          <Select.Option value="normal">正常</Select.Option>
          <Select.Option value="missing">未填写</Select.Option>
        </Select>
      </Col>
      <Col>
        <Button type="primary" icon={<SearchOutlined />} onClick={() => {}}>搜索</Button>
      </Col>
    </Row>
  )

  const StatRow = ({ stats }: { stats: typeof matStats }) => (
    <Row gutter={16} className="mb-4">
      {[
        { label: '已过期', value: stats.expired, color: '#ff4d4f', status: 'expired' as CertStatus },
        { label: '即将到期(90天内)', value: stats.soon, color: '#faad14', status: 'soon' as CertStatus },
        { label: '正常', value: stats.normal, color: '#52c41a', status: 'normal' as CertStatus },
        { label: '未填写', value: stats.missing, color: '#d9d9d9', status: 'missing' as CertStatus },
      ].map(item => (
        <Col key={item.label}>
          <div
            style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 8,
              border: `1px solid ${statusFilter === item.status ? item.color : '#f0f0f0'}`,
              background: statusFilter === item.status ? `${item.color}15` : '#fafafa' }}
            onClick={() => setStatusFilter(statusFilter === item.status ? '' : item.status)}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</span>
            <span style={{ fontSize: 12, color: '#666', marginLeft: 6 }}>{item.label}</span>
          </div>
        </Col>
      ))}
    </Row>
  )

  const matColumns: ColumnsType<typeof filteredMaterials[0]> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 160, ellipsis: true },
    { title: '编码', dataIndex: 'materialCode', width: 120 },
    { title: '生产厂家', dataIndex: 'manufacturer', width: 160, ellipsis: true, render: (v) => v || '-' },
    {
      title: '注册证号', dataIndex: 'registrationNo', width: 180,
      render: (v) => v ? <span style={{ fontFamily: 'monospace' }}>{v}</span> : <span style={{ color: '#999' }}>未填写</span>,
    },
    {
      title: '到期日', dataIndex: 'registrationExpiry', width: 120,
      render: (v) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '剩余天数', dataIndex: 'daysLeft', width: 120,
      sorter: (a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
      render: (v) => renderDaysLeft(v),
    },
    { title: '', dataIndex: 'daysLeft', width: 100, render: (v) => renderProgress(v) },
    {
      title: '状态', dataIndex: 'certStatus', width: 110,
      render: (v: CertStatus) => {
        const c = STATUS_CONFIG[v]
        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>
      },
    },
    {
      title: '操作', width: 80,
      render: () => (
        <Button size="small" type="link" onClick={() => navigate('/materials')}>去编辑</Button>
      ),
    },
  ]

  const supColumns: ColumnsType<typeof filteredSuppliers[0]> = [
    { title: '供应商名称', dataIndex: 'supplierName', width: 180, ellipsis: true },
    { title: '编码', dataIndex: 'supplierCode', width: 120 },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    {
      title: '经营许可证号', dataIndex: 'licenseNo', width: 200,
      render: (v) => v ? <span style={{ fontFamily: 'monospace' }}>{v}</span> : <span style={{ color: '#999' }}>未填写</span>,
    },
    {
      title: '到期日', dataIndex: 'licenseExpiry', width: 120,
      render: (v) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '剩余天数', dataIndex: 'daysLeft', width: 120,
      sorter: (a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999),
      render: (v) => renderDaysLeft(v),
    },
    { title: '', dataIndex: 'daysLeft', width: 100, render: (v) => renderProgress(v) },
    {
      title: '状态', dataIndex: 'certStatus', width: 110,
      render: (v: CertStatus) => {
        const c = STATUS_CONFIG[v]
        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>
      },
    },
    {
      title: '操作', width: 80,
      render: () => (
        <Button size="small" type="link" onClick={() => navigate('/system/suppliers')}>去编辑</Button>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'material',
      label: (
        <Badge count={matStats.expired + matStats.soon} size="small" offset={[6, 0]}>
          耗材注册证
        </Badge>
      ),
      children: (
        <>
          <StatRow stats={matStats} />
          <SearchBar />
          <Table
            rowKey="id"
            columns={matColumns}
            dataSource={filteredMaterials}
            loading={loading}
            scroll={{ x: 1100 }}
            size="middle"
            rowClassName={(r) => r.certStatus === 'expired' ? 'bg-red-50' : r.certStatus === 'soon' ? 'bg-orange-50' : ''}
            pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          />
        </>
      ),
    },
    {
      key: 'supplier',
      label: (
        <Badge count={supStats.expired + supStats.soon} size="small" offset={[6, 0]}>
          供应商许可证
        </Badge>
      ),
      children: (
        <>
          <StatRow stats={supStats} />
          <SearchBar />
          <Table
            rowKey="id"
            columns={supColumns}
            dataSource={filteredSuppliers}
            loading={loading}
            scroll={{ x: 1100 }}
            size="middle"
            rowClassName={(r) => r.certStatus === 'expired' ? 'bg-red-50' : r.certStatus === 'soon' ? 'bg-orange-50' : ''}
            pagination={{ showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          />
        </>
      ),
    },
  ]

  return (
    <div>
      <Card bordered={false} className="rounded-xl" title="证件管理总览">
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
