import React, { useState } from 'react'
import {
  Button, Input, Card, Row, Col, Typography, Tag, Tabs, Table,
  Empty, Spin, Descriptions, Alert,
} from 'antd'
import { SearchOutlined, UserOutlined, MedicineBoxOutlined, QrcodeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { tracingApi } from '@/api/tracing'
import type { TraceResult, SurgeryVO, BindingVO } from '@/types'

const { Title } = Typography

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
    } catch {} finally {
      setLoading(false)
    }
  }

  const surgeryColumns: ColumnsType<SurgeryVO> = [
    { title: '手术单号', dataIndex: 'surgeryNo', width: 180 },
    { title: '患者', dataIndex: 'patientName', width: 100 },
    { title: '手术类型', dataIndex: 'surgeryType', width: 120 },
    { title: '手术日期', dataIndex: 'surgeryDate', width: 110 },
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
    { title: '绑定时间', dataIndex: 'bindTime', width: 160 },
  ]

  const traceOptions = [
    { key: 'patient', icon: <UserOutlined />, label: '患者追溯', placeholder: '输入患者ID', description: '查询患者使用的所有耗材' },
    { key: 'material', icon: <MedicineBoxOutlined />, label: '耗材追溯', placeholder: '输入耗材ID', description: '查询耗材的全部使用记录' },
    { key: 'udi', icon: <QrcodeOutlined />, label: 'UDI 追溯', placeholder: '输入 UDI 码', description: '追溯单件耗材完整链条' },
  ]

  const currentOption = traceOptions.find(o => o.key === traceType)!

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 16 }}>高值耗材追溯</Title>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {traceOptions.map(opt => (
            <Col span={8} key={opt.key}>
              <Card
                size="small" hoverable
                style={{ cursor: 'pointer', borderColor: traceType === opt.key ? '#1677ff' : undefined, background: traceType === opt.key ? '#f0f5ff' : undefined }}
                onClick={() => { setTraceType(opt.key as any); setResult(null); setSearchValue('') }}
              >
                <Row align="middle" gutter={8}>
                  <Col style={{ fontSize: 20, color: '#1677ff' }}>{opt.icon}</Col>
                  <Col>
                    <div style={{ fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{opt.description}</div>
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={8}>
          <Col flex="1">
            <Input
              size="large"
              placeholder={currentOption.placeholder}
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              allowClear onClear={() => { setSearchValue(''); setResult(null) }}
            />
          </Col>
          <Col>
            <Button type="primary" size="large" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
              追溯查询
            </Button>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Spin spinning={loading}>
          {!result && !loading && (
            <Empty description="请输入查询条件开始追溯" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}

          {result && traceType === 'patient' && (
            <>
              <Alert type="info" message={`患者 ${searchValue} 的耗材使用追溯结果`} style={{ marginBottom: 16 }} />
              <Table
                rowKey="surgeryNo"
                columns={surgeryColumns}
                dataSource={(result.surgeries || []) as SurgeryVO[]}
                expandable={{
                  expandedRowRender: (record: SurgeryVO) => (
                    <Table rowKey="id" columns={bindingColumns} dataSource={record.bindings || []} pagination={false} />
                  ),
                }}
                pagination={false}
              />
            </>
          )}

          {result && traceType === 'udi' && result.udi && (
            <>
              <Alert type="info" message={`UDI 码 ${searchValue} 完整追溯链`} style={{ marginBottom: 16 }} />
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
                  <Typography.Title level={5}>手术使用记录</Typography.Title>
                  <Table rowKey="surgeryNo" columns={surgeryColumns} dataSource={result.surgeries as SurgeryVO[]} pagination={false} />
                </>
              )}
            </>
          )}

          {result && traceType === 'material' && (
            <>
              <Alert type="info" message={`耗材 ID：${searchValue} 的使用追溯结果`} style={{ marginBottom: 16 }} />
              <Table
                rowKey={(r: any) => r.surgeryNo || r.id}
                columns={[
                  { title: '记录类型', dataIndex: 'type', width: 100, render: v => <Tag>{v || '手术使用'}</Tag> },
                  { title: '手术/事务编号', dataIndex: 'surgeryNo', width: 180 },
                  { title: '患者', dataIndex: 'patientName', width: 100 },
                  { title: '日期', dataIndex: 'surgeryDate', width: 110 },
                  { title: '数量', dataIndex: 'quantity', width: 80 },
                ]}
                dataSource={(result.usages || result.surgeries || []) as any[]}
                pagination={false}
              />
            </>
          )}
        </Spin>
      </Card>
    </div>
  )
}
