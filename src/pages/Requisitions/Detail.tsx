import React, { useState, useEffect } from 'react'
import {
  Card, Table, Tag, Button, Space, Modal, Input, message, Timeline,
  Typography, Row, Col, Spin, Divider,
} from 'antd'
import {
  ArrowLeftOutlined, CheckOutlined, CloseOutlined, SendOutlined,
  UserOutlined, CalendarOutlined, MedicineBoxOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  FileTextOutlined, TeamOutlined, AuditOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { requisitionsApi } from '@/api/requisitions'
import type { Requisition } from '@/types'
import { REQUISITION_STATUS } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { theme } from 'antd'

const { Text } = Typography

// 审批流程步骤配置
const FLOW_STEPS = [
  { key: 'DRAFT',      label: '草稿',    icon: <FileTextOutlined /> },
  { key: 'PENDING',    label: '待审批',  icon: <ClockCircleOutlined /> },
  { key: 'APPROVED',   label: '已审批',  icon: <CheckCircleOutlined /> },
  { key: 'DISPATCHED', label: '已发放',  icon: <MedicineBoxOutlined /> },
  { key: 'SIGNED',     label: '已签收',  icon: <AuditOutlined /> },
]

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  DRAFT:      { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
  PENDING:    { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  APPROVED:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  REJECTED:   { bg: '#fff5f5', border: '#fecaca', text: '#dc2626' },
  DISPATCHED: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  SIGNED:     { bg: '#f0fdf4', border: '#86efac', text: '#15803d' },
}

export default function RequisitionDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Requisition | null>(null)
  const [loading, setLoading] = useState(true)
  const [approveModal, setApproveModal] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)
  const [signModal, setSignModal] = useState(false)
  const [remark, setRemark] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()
  const { roles } = useSelector((state: RootState) => state.auth)
  const { token } = theme.useToken()
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

  const handleSign = async () => {
    setActionLoading(true)
    try {
      await requisitionsApi.sign(Number(id), { remark })
      message.success('签收成功')
      setSignModal(false)
      fetchData()
    } catch {} finally { setActionLoading(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <Spin size="large" />
    </div>
  )
  if (!data) return <div>申领单不存在</div>

  const statusInfo = REQUISITION_STATUS[data.status]
  const statusStyle = STATUS_COLOR[data.status] ?? STATUS_COLOR.DRAFT

  // 当前流程所在步骤索引
  const currentStepIdx = data.status === 'REJECTED'
    ? 1
    : FLOW_STEPS.findIndex(s => s.key === data.status)
  const isSigned = data.status === 'SIGNED'

  return (
    <div>
      {/* 顶部标题栏 */}
      <Card
        bordered={false}
        style={{ borderRadius: 12, marginBottom: 16 }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={12}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/requisitions')}
              style={{ borderRadius: 8 }}
            >
              返回
            </Button>
            <Divider type="vertical" style={{ margin: 0 }} />
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: token.colorText }}>
                申领单详情
              </span>
              <span style={{ fontSize: 13, color: token.colorTextSecondary, marginLeft: 8 }}>
                {data.requisitionNo}
              </span>
            </div>
            {statusInfo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: statusStyle.bg,
                border: `1px solid ${statusStyle.border}`,
                color: statusStyle.text,
                fontSize: 12, fontWeight: 500,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: statusStyle.text, display: 'inline-block',
                }} />
                {statusInfo.label}
              </div>
            )}
          </Space>
          <Space>
            {data.status === 'PENDING' && isManager && (
              <>
                <Button
                  type="primary" icon={<CheckOutlined />}
                  onClick={() => { setRemark(''); setApproveModal(true) }}
                  style={{ borderRadius: 8 }}
                >
                  审批通过
                </Button>
                <Button
                  danger icon={<CloseOutlined />}
                  onClick={() => { setRemark(''); setRejectModal(true) }}
                  style={{ borderRadius: 8 }}
                >
                  驳回
                </Button>
              </>
            )}
            {data.status === 'APPROVED' && isManager && (
              <Button
                type="primary" icon={<SendOutlined />}
                onClick={handleDispatch} loading={actionLoading}
                style={{ borderRadius: 8 }}
              >
                确认发放
              </Button>
            )}
            {data.status === 'DISPATCHED' && (
              <Button
                type="primary" icon={<AuditOutlined />}
                onClick={() => { setRemark(''); setSignModal(true) }}
                style={{ borderRadius: 8, background: '#15803d' }}
              >
                确认签收
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={16}>
        {/* 左侧主内容 */}
        <Col span={16}>
          {/* 基本信息 */}
          <Card
            style={{ borderRadius: 12, marginBottom: 16 }}
            title={
              <Space>
                <FileTextOutlined style={{ color: '#6366f1' }} />
                <span>基本信息</span>
              </Space>
            }
            bordered={false}
          >
            <Row gutter={[0, 0]}>
              {[
                { icon: <TeamOutlined style={{ color: '#6366f1' }} />, label: '申领科室', value: data.deptName },
                { icon: <UserOutlined style={{ color: '#0ea5e9' }} />, label: '申领人', value: data.createdByName },
                {
                  icon: <CalendarOutlined style={{ color: '#10b981' }} />,
                  label: '申领时间',
                  value: data.requisitionDate?.replace('T', ' ').slice(0, 16),
                },
                {
                  icon: <CalendarOutlined style={{ color: '#f59e0b' }} />,
                  label: '需求日期',
                  value: data.requiredDate || '-',
                },
              ].map((item, i) => (
                <Col span={12} key={i}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px',
                    borderBottom: i < 2 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                    borderRight: i % 2 === 0 ? `1px solid ${token.colorBorderSecondary}` : 'none',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: token.colorFillQuaternary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary, marginBottom: 2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: token.colorText }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
              {data.remark && (
                <Col span={24}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 16px',
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                  }}>
                    <div style={{ fontSize: 12, color: token.colorTextSecondary, minWidth: 56, paddingTop: 2 }}>备注</div>
                    <div style={{ fontSize: 13, color: token.colorText }}>{data.remark}</div>
                  </div>
                </Col>
              )}
            </Row>
          </Card>

          {/* 申领明细 */}
          <Card
            title={
              <Space>
                <MedicineBoxOutlined style={{ color: '#0ea5e9' }} />
                <span>申领明细</span>
                <Tag style={{ borderRadius: 20, fontSize: 11 }}>{data.items?.length ?? 0} 项</Tag>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            <Table
              rowKey="id"
              dataSource={data.items}
              pagination={false}
              size="middle"
              columns={[
                { title: '耗材名称', dataIndex: 'materialName' },
                { title: '规格', dataIndex: 'specification' },
                { title: '单位', dataIndex: 'unit', width: 70 },
                {
                  title: '申领数量', dataIndex: 'quantity', width: 100,
                  render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
                },
                {
                  title: '实发数量', dataIndex: 'actualQuantity', width: 100,
                  render: (v) => v != null
                    ? <span style={{ fontWeight: 600, color: '#10b981' }}>{v}</span>
                    : <span style={{ color: token.colorTextQuaternary }}>-</span>,
                },
                {
                  title: '备注', dataIndex: 'remark',
                  render: (v) => v || <span style={{ color: token.colorTextQuaternary }}>-</span>,
                },
              ]}
            />
          </Card>
        </Col>

        {/* 右侧 */}
        <Col span={8}>
          {/* 审批进度 */}
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#10b981' }} />
                <span>审批进度</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
              {FLOW_STEPS.map((step, i) => {
                const isRejected = data.status === 'REJECTED' && i === 1
                const isDone = !isRejected && (
                  (isSigned || data.status === 'DISPATCHED')
                    ? true
                    : currentStepIdx >= i
                )
                const isCurrent = !isRejected && currentStepIdx === i
                const color = isRejected ? '#ef4444' : isDone ? '#10b981' : token.colorTextQuaternary
                const bgColor = isRejected ? '#fff5f5' : isDone ? '#f0fdf4' : token.colorFillQuaternary

                return (
                  <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* 左侧连接线 + 圆点 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: bgColor,
                        border: `2px solid ${isCurrent || isRejected ? color : isDone ? color : token.colorBorderSecondary}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color,
                        fontSize: 14,
                        transition: 'all 0.3s',
                      }}>
                        {isRejected ? <CloseCircleOutlined /> : step.icon}
                      </div>
                      {i < FLOW_STEPS.length - 1 && (
                        <div style={{
                          width: 2, height: 28, marginTop: 2, marginBottom: 2,
                          background: isDone && !isRejected ? '#10b981' : token.colorBorderSecondary,
                          borderRadius: 2,
                        }} />
                      )}
                    </div>
                    {/* 右侧文字 */}
                    <div style={{ paddingTop: 5, paddingBottom: i < FLOW_STEPS.length - 1 ? 0 : 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isCurrent || isRejected ? 600 : 400,
                        color: isCurrent || isRejected ? color : isDone ? token.colorText : token.colorTextQuaternary,
                      }}>
                        {isRejected ? '已驳回' : step.label}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* 审批记录 */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#6366f1' }} />
                <span>审批记录</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12 }}
          >
            {data.approvalRecords?.length > 0 ? (
              <Timeline
                items={data.approvalRecords.map(r => ({
                  color: r.status === 'APPROVED' ? 'green' : 'red',
                  dot: r.status === 'APPROVED'
                    ? <CheckCircleOutlined style={{ fontSize: 14, color: '#10b981' }} />
                    : <CloseCircleOutlined style={{ fontSize: 14, color: '#ef4444' }} />,
                  children: (
                    <div style={{ paddingBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Tag
                          color={r.status === 'APPROVED' ? 'success' : 'error'}
                          style={{ borderRadius: 12, margin: 0 }}
                        >
                          {r.status === 'APPROVED' ? '审批通过' : '已驳回'}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                        {r.approverName} · {r.approvalTime?.replace('T', ' ').slice(0, 16)}
                      </div>
                      {r.remark && (
                        <div style={{
                          marginTop: 6, padding: '6px 10px', borderRadius: 6,
                          background: token.colorFillQuaternary,
                          fontSize: 12, color: token.colorText,
                        }}>
                          {r.remark}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: token.colorTextQuaternary, fontSize: 13 }}>
                暂无审批记录
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="审批通过确认"
        open={approveModal}
        onCancel={() => setApproveModal(false)}
        onOk={handleApprove}
        confirmLoading={actionLoading}
        okText="确认通过"
        okButtonProps={{ icon: <CheckOutlined /> }}
      >
        <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontSize: 13 }}>审批意见（可选）</div>
        <Input.TextArea
          rows={3} value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="请输入审批意见"
        />
      </Modal>

      <Modal
        title="驳回申领单"
        open={rejectModal}
        onCancel={() => setRejectModal(false)}
        onOk={handleReject}
        confirmLoading={actionLoading}
        okText="确认驳回"
        okType="danger"
        okButtonProps={{ icon: <CloseOutlined /> }}
      >
        <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontSize: 13 }}>驳回原因</div>
        <Input.TextArea
          rows={3} value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="请输入驳回原因"
        />
      </Modal>

      <Modal
        title="确认签收"
        open={signModal}
        onCancel={() => setSignModal(false)}
        onOk={handleSign}
        confirmLoading={actionLoading}
        okText="确认签收"
        okButtonProps={{ icon: <AuditOutlined /> }}
      >
        <div style={{ marginBottom: 8, color: token.colorTextSecondary, fontSize: 13 }}>
          签收说明：科室已收到发放的耗材，确认无误后点击签收。
        </div>
        <Input.TextArea
          rows={3} value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="签收备注（可选）"
        />
      </Modal>
    </div>
  )
}
