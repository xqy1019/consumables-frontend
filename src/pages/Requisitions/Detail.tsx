import React, { useState, useEffect } from 'react'
import {
  Card, Descriptions, Table, Tag, Button, Space, Modal, Input, message, Timeline,
  Typography, Row, Col, Spin,
} from 'antd'
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { requisitionsApi } from '@/api/requisitions'
import type { Requisition } from '@/types'
import { REQUISITION_STATUS } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const { Title, Text } = Typography

export default function RequisitionDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Requisition | null>(null)
  const [loading, setLoading] = useState(true)
  const [approveModal, setApproveModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [remark, setRemark] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()
  const { roles } = useSelector((state: RootState) => state.auth)
  const isManager = roles.includes('ADMIN') || roles.includes('DEPT_DIRECTOR') || roles.includes('WAREHOUSE_KEEPER')

  const fetchData = () => {
    if (!id) return
    setLoading(true)
    requisitionsApi.getById(Number(id)).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [id])

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await requisitionsApi.approve(Number(id), { remark })
      message.success('审批通过')
      setApproveModal(false)
      fetchData()
    } catch {} finally { setActionLoading(false) }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      await requisitionsApi.reject(Number(id), { remark })
      message.success('已驳回')
      setRejectModal(false)
      fetchData()
    } catch {} finally { setActionLoading(false) }
  }

  const handleDispatch = async () => {
    setActionLoading(true)
    try {
      await requisitionsApi.dispatch(Number(id))
      message.success('已发放')
      fetchData()
    } catch {} finally { setActionLoading(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
  if (!data) return <div>申领单不存在</div>

  const statusInfo = REQUISITION_STATUS[data.status]

  return (
    <div>
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/requisitions')}>返回</Button>
              <Title level={4} style={{ margin: 0 }}>申领单详情 - {data.requisitionNo}</Title>
              {statusInfo && <Tag color={statusInfo.color}>{statusInfo.label}</Tag>}
            </Space>
          </Col>
          <Col>
            <Space>
              {data.status === 'PENDING' && isManager && (
                <>
                  <Button type="primary" icon={<CheckOutlined />}
                    onClick={() => { setRemark(''); setApproveModal(true) }}>
                    审批通过
                  </Button>
                  <Button danger icon={<CloseOutlined />}
                    onClick={() => { setRemark(''); setRejectModal(true) }}>
                    驳回
                  </Button>
                </>
              )}
              {data.status === 'APPROVED' && isManager && (
                <Button type="primary" icon={<SendOutlined />} onClick={handleDispatch} loading={actionLoading}>
                  确认发放
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="基本信息" bordered={false} style={{ borderRadius: 12, marginBottom: 16 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="申领科室">{data.deptName}</Descriptions.Item>
              <Descriptions.Item label="申领人">{data.createdByName}</Descriptions.Item>
              <Descriptions.Item label="申领时间">
                {data.requisitionDate?.replace('T', ' ').slice(0, 16)}
              </Descriptions.Item>
              <Descriptions.Item label="需求日期">{data.requiredDate || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{data.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="申领明细" bordered={false} style={{ borderRadius: 12 }}>
            <Table
              rowKey="id"
              dataSource={data.items}
              pagination={false}
              columns={[
                { title: '耗材名称', dataIndex: 'materialName' },
                { title: '规格', dataIndex: 'specification' },
                { title: '单位', dataIndex: 'unit', width: 70 },
                { title: '申领数量', dataIndex: 'quantity', width: 100 },
                { title: '实发数量', dataIndex: 'actualQuantity', width: 100,
                  render: (v) => v ?? '-' },
                { title: '备注', dataIndex: 'remark', render: (v) => v || '-' },
              ]}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="审批流程" bordered={false} style={{ borderRadius: 12 }}>
            {data.approvalRecords?.length > 0 ? (
              <Timeline items={data.approvalRecords.map(r => ({
                color: r.status === 'APPROVED' ? 'green' : 'red',
                children: (
                  <div>
                    <div><Tag color={r.status === 'APPROVED' ? 'success' : 'error'}>
                      {r.status === 'APPROVED' ? '审批通过' : '已驳回'}
                    </Tag></div>
                    <div><Text type="secondary" style={{ fontSize: 12 }}>
                      {r.approverName} · {r.approvalTime?.replace('T', ' ').slice(0, 16)}
                    </Text></div>
                    {r.remark && <div><Text style={{ fontSize: 12 }}>{r.remark}</Text></div>}
                  </div>
                ),
              }))} />
            ) : (
              <Text type="secondary">暂无审批记录</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Modal title="审批通过确认" open={approveModal}
        onCancel={() => setApproveModal(false)} onOk={handleApprove}
        confirmLoading={actionLoading}>
        <div style={{ marginBottom: 8 }}>审批意见（可选）：</div>
        <Input.TextArea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="请输入审批意见" />
      </Modal>

      <Modal title="驳回申领单" open={rejectModal}
        onCancel={() => setRejectModal(false)} onOk={handleReject}
        confirmLoading={actionLoading}>
        <div style={{ marginBottom: 8 }}>驳回原因：</div>
        <Input.TextArea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="请输入驳回原因" />
      </Modal>
    </div>
  )
}
