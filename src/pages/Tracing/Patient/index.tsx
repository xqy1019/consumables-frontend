import React, { useState } from 'react'
import {
  Button, Input, Card, Row, Col, Tag, Table,
  Empty, Spin, Descriptions, Alert, Typography, message,
} from 'antd'
import { SearchOutlined, UserOutlined, MedicineBoxOutlined, QrcodeOutlined, CheckCircleFilled } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { tracingApi } from '@/api/tracing'
import type { TraceResult, SurgeryVO, BindingVO } from '@/types'
import { formatDateTime } from '@/utils/format'


type TraceType = 'patient' | 'material' | 'udi'

const TRACE_OPTIONS: { key: TraceType; icon: React.ReactNode; label: string; placeholder: string; description: string; color: string; bg: string }[] = [
  {
    key: 'patient',
    icon: <UserOutlined style={{ fontSize: 22, color: '#fff' }} />,
    label: '患者追溯',
    placeholder: '输入患者ID',
    description: '查询患者使用的所有耗材',
    color: '#1677ff',
    bg: '#e6f4ff',
  },
  {
    key: 'material',
    icon: <MedicineBoxOutlined style={{ fontSize: 22, color: '#fff' }} />,
    label: '耗材追溯',
    placeholder: '输入耗材ID',
    description: '查询耗材的全部使用记录',
    color: '#52c41a',
    bg: '#f6ffed',
  },
  {
    key: 'udi',
    icon: <QrcodeOutlined style={{ fontSize: 22, color: '#fff' }} />,
    label: 'UDI 追溯',
    placeholder: '输入 UDI 码',
    description: '追溯单件耗材完整链条',
    color: '#fa8c16',
    bg: '#fff7e6',
  },
]

export default function PatientTracePage() {
  const [traceType, setTraceType] = useState<'patient' | 'material' | 'udi'>('patient')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TraceResult | null>(null)

  const handleSearch = async () => {
    if (!searchValue.trim()) return
    setLoading(true)
    setResult(null)
    try {
      let res: TraceResult
      if (traceType === 'patient') {
        res = await tracingApi.traceByPatient(searchValue.trim())
      } else if (traceType === 'material') {
        res = await tracingApi.traceByMaterial(parseInt(searchValue.trim()))
      } else {
        res = await tracingApi.traceByUdi(searchValue.trim())
      }
      setResult(res)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '查询失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const surgeryColumns: ColumnsType<SurgeryVO> = [
    { title: '手术单号', dataIndex: 'surgeryNo', width: 180 },
    { title: '患者', dataIndex: 'patientName', width: 100 },
    { title: '手术类型', dataIndex: 'surgeryType', width: 120 },
    { title: '手术日期', dataIndex: 'surgeryDate', width: 110, render: (v) => formatDateTime(v) },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '主治医生', dataIndex: 'operatingDoctor', width: 110 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: v => <Tag color={v === 'COMPLETED' ? 'success' : 'processing'}>{v === 'COMPLETED' ? '已完成' : v}</Tag>,
    },
  ]

  const bindingColumns: ColumnsType<BindingVO> = [
    { title: 'UDI 码', dataIndex: 'udiCode', width: 200, ellipsis: true },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '规格', dataIndex: 'specification', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '绑定时间', dataIndex: 'bindTime', width: 160, render: (v) => formatDateTime(v) },
  ]

  const currentOption = TRACE_OPTIONS.find(o => o.key === traceType)!

  return (
    <div>
      <Card bordered={false} className="rounded-xl mb-4" title="高值耗材追溯">
        {/* 模式选择 */}
        <Row gutter={16} className="mb-5">
          {TRACE_OPTIONS.map(opt => {
            const active = traceType === opt.key
            return (
              <Col span={8} key={opt.key}>
                <div
                  onClick={() => { setTraceType(opt.key); setResult(null); setSearchValue('') }}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 10,
                    padding: '16px 20px',
                    border: `2px solid ${active ? opt.color : '#f0f0f0'}`,
                    background: active ? opt.bg : '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'all 0.2s',
                    position: 'relative',
                    userSelect: 'none',
                  }}
                >
                  {/* 图标圆形背景 */}
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: active ? opt.color : '#d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}>
                    {opt.icon}
                  </div>
                  {/* 文字信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: active ? opt.color : '#333',
                      marginBottom: 2,
                    }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: '18px' }}>{opt.description}</div>
                  </div>
                  {/* 已选中角标 */}
                  {active && (
                    <CheckCircleFilled style={{
                      position: 'absolute',
                      top: 10,
                      right: 12,
                      fontSize: 16,
                      color: opt.color,
                    }} />
                  )}
                </div>
              </Col>
            )
          })}
        </Row>

        {/* 搜索区域 */}
        <div style={{
          background: '#f7f8fa',
          borderRadius: 8,
          padding: '16px 20px',
        }}>
          <Row gutter={10} align="middle">
            <Col flex="1">
              <Input
                size="large"
                placeholder={currentOption.placeholder}
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                onClear={() => { setSearchValue(''); setResult(null) }}
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                style={{ borderRadius: 8, paddingInline: 28 }}
              >
                追溯查询
              </Button>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 结果区域 */}
      <Card bordered={false} className="rounded-xl">
        <Spin spinning={loading}>
          {!result && !loading && (
            <div style={{ padding: '40px 0' }}>
              <Empty
                description={
                  <span style={{ color: '#999' }}>请选择追溯类型并输入查询条件</span>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}

          {result && traceType === 'patient' && (
            <>
              <Alert
                type="info"
                showIcon
                message={`患者 ${searchValue} 的耗材使用追溯结果`}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
              <Table
                rowKey="surgeryNo"
                columns={surgeryColumns}
                dataSource={(result.surgeries || []) as SurgeryVO[]}
                expandable={{
                  expandedRowRender: (record: SurgeryVO) => (
                    <Table
                      rowKey="id"
                      columns={bindingColumns}
                      dataSource={record.bindings || []}
                      pagination={false}
                      size="small"
                    />
                  ),
                }}
                pagination={false}
              />
            </>
          )}

          {result && traceType === 'udi' && result.udi && (
            <>
              <Alert
                type="info"
                showIcon
                message={`UDI 码 ${searchValue} 完整追溯链`}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="UDI 码">{result.udi.udiCode}</Descriptions.Item>
                <Descriptions.Item label="耗材">{result.udi.materialName}（{result.udi.specification}）</Descriptions.Item>
                <Descriptions.Item label="批号">{result.udi.batchNumber}</Descriptions.Item>
                <Descriptions.Item label="供应商">{result.udi.supplierName}</Descriptions.Item>
                <Descriptions.Item label="生产日期">{result.udi.manufactureDate}</Descriptions.Item>
                <Descriptions.Item label="有效期">{result.udi.expiryDate}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag color={result.udi.status === 'USED' ? 'default' : 'success'}>{result.udi.status}</Tag>
                </Descriptions.Item>
              </Descriptions>
              {result.surgeries && result.surgeries.length > 0 && (
                <>
                  <Typography.Title level={5} style={{ marginBottom: 12 }}>手术使用记录</Typography.Title>
                  <Table
                    rowKey="surgeryNo"
                    columns={surgeryColumns}
                    dataSource={result.surgeries as SurgeryVO[]}
                    pagination={false}
                  />
                </>
              )}
            </>
          )}

          {result && traceType === 'material' && (
            <>
              <Alert
                type="info"
                showIcon
                message={`耗材 ID：${searchValue} 的使用追溯结果`}
                style={{ marginBottom: 16, borderRadius: 8 }}
              />
              <Table<Record<string, unknown>>
                rowKey={(r) => String(r.surgeryNo || r.id)}
                columns={[
                  { title: '记录类型', dataIndex: 'type', width: 100, render: v => <Tag>{(v as string) || '手术使用'}</Tag> },
                  { title: '手术/事务编号', dataIndex: 'surgeryNo', width: 180 },
                  { title: '患者', dataIndex: 'patientName', width: 100 },
                  { title: '日期', dataIndex: 'surgeryDate', width: 110 },
                  { title: '数量', dataIndex: 'quantity', width: 80 },
                ]}
                dataSource={(result.usages || result.surgeries || []) as Record<string, unknown>[]}
                pagination={false}
              />
            </>
          )}
        </Spin>
      </Card>
    </div>
  )
}
