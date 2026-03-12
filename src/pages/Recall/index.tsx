import React, { useState, useEffect } from 'react'
import {
  Table, Button, Space, Tag, Card, Modal, Form, Input, Select,
  DatePicker, message, Drawer, Descriptions, Divider, Popconfirm,
  Row, Col, Badge, InputNumber, Alert,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, CheckOutlined, AlertOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { recallApi, type RecallVO, type RecallDetailVO } from '@/api/recall'
import { materialsApi } from '@/api/materials'
import { inventoryApi } from '@/api/inventory'
import type { Material } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'

const LEVEL_COLOR: Record<string, string> = { I: 'red', II: 'orange', III: 'gold' }
const LEVEL_LABEL: Record<string, string> = { I: 'I级（最严重）', II: 'II级（中等）', III: 'III级（轻微）' }
const DISPOSAL_LABELS: Record<string, string> = { RETURN: '退货', DESTROY: '销毁', QUARANTINE: '隔离封存' }
const STATUS_COLOR: Record<string, string> = { ACTIVE: 'red', CLOSED: 'default' }
const STATUS_LABEL: Record<string, string> = { ACTIVE: '进行中', CLOSED: '已关闭' }

export default function RecallPage() {
  const [data, setData] = useState<RecallVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState({ status: '', keyword: '', page: 1, size: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<RecallDetailVO | null>(null)
  const [disposalOpen, setDisposalOpen] = useState(false)
  const [currentRecallId, setCurrentRecallId] = useState<number | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [form] = Form.useForm()
  const [disposalForm] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await recallApi.getList(params)
      setData(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [params])
  useEffect(() => { materialsApi.getActive().then(setMaterials) }, [])

  const handleCreate = async (values: any) => {
    try {
      await recallApi.create({
        ...values,
        issuedDate: values.issuedDate?.format('YYYY-MM-DD'),
        batches: values.batches || [],
      })
      message.success('召回通知创建成功')
      setCreateOpen(false)
      form.resetFields()
      fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const openDetail = async (id: number) => {
    const d = await recallApi.getDetail(id)
    setDetail(d)
    setDetailOpen(true)
  }

  const handleClose = async (id: number) => {
    await recallApi.close(id)
    message.success('召回通知已关闭')
    fetchData()
    if (detail) {
      const d = await recallApi.getDetail(id)
      setDetail(d)
    }
  }

  const handleAddDisposal = async (values: any) => {
    if (!currentRecallId) return
    try {
      await recallApi.addDisposal(currentRecallId, values)
      message.success('处置记录添加成功')
      setDisposalOpen(false)
      disposalForm.resetFields()
      const d = await recallApi.getDetail(currentRecallId)
      setDetail(d)
      fetchData()
    } catch (e: any) { message.error(e?.message || '操作失败，请重试') }
  }

  const columns: ColumnsType<RecallVO> = [
    { title: '召回编号', dataIndex: 'recallNo', width: 140, fixed: 'left' },
    { title: '召回标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '召回级别', dataIndex: 'recallLevel', width: 120,
      render: (v) => <Tag color={LEVEL_COLOR[v]}>{LEVEL_LABEL[v] || v}</Tag>,
    },
    {
      title: '来源', dataIndex: 'source', width: 120,
      render: (v) => <Tag>{v === 'SUPPLIER' ? '供应商主动' : '监管部门'}</Tag>,
    },
    { title: '发布日期', dataIndex: 'issuedDate', width: 110, render: (v) => formatDate(v) },
    { title: '涉及批次数', dataIndex: 'batchCount', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v) => <Badge status={v === 'ACTIVE' ? 'error' : 'default'}
        text={<Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag>} />,
    },
    { title: '创建人', dataIndex: 'createdByName', width: 100 },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>详情</Button>
          {record.status === 'ACTIVE' && (
            <>
              <Button size="small" type="primary" danger
                icon={<AlertOutlined />}
                onClick={() => { setCurrentRecallId(record.id); setDisposalOpen(true) }}>
                登记处置
              </Button>
              <Popconfirm title="确认关闭此召回通知？" onConfirm={() => handleClose(record.id)}>
                <Button size="small" icon={<CheckOutlined />}>关闭</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        message="耗材召回管理：收到供应商或监管部门的召回通知后，在此创建记录，系统自动定位受影响库存，登记处置结果（退货/销毁/隔离）。"
        style={{ marginBottom: 16 }}
        closable
      />
      <Card
        bordered={false}
        title="召回管理"
        extra={
          <Space>
            <Select placeholder="状态筛选" value={params.status || undefined}
              onChange={(v) => setParams({ ...params, status: v || '', page: 1 })}
              allowClear className="w-[120px]">
              <Select.Option value="ACTIVE">进行中</Select.Option>
              <Select.Option value="CLOSED">已关闭</Select.Option>
            </Select>
            <Input.Search placeholder="搜索编号/标题"
              onSearch={(v) => setParams({ ...params, keyword: v, page: 1 })}
              allowClear className="w-[200px]" />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建召回通知
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            total, current: params.page, pageSize: params.size,
            showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => setParams({ ...params, page, size }),
          }}
        />
      </Card>

      {/* 新建召回 */}
      <Modal title="新建召回通知" open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields() }}
        onOk={() => form.submit()} width={720} destroyOnClose>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="title" label="召回标题" rules={[{ required: true }]}>
                <Input placeholder="如：XX品牌手术刀召回" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issuedDate" label="发布日期" initialValue={dayjs()}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="recallLevel" label="召回级别" initialValue="II">
                <Select>
                  <Select.Option value="I">I级（最严重）</Select.Option>
                  <Select.Option value="II">II级（中等）</Select.Option>
                  <Select.Option value="III">III级（轻微）</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="source" label="召回来源" initialValue="SUPPLIER">
                <Select>
                  <Select.Option value="SUPPLIER">供应商主动召回</Select.Option>
                  <Select.Option value="REGULATOR">监管部门强制</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="recallReason" label="召回原因">
                <Input.TextArea rows={3} placeholder="填写召回原因..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Divider>受影响批次（至少填写一项）</Divider>
            </Col>
            <Col span={24}>
              <Form.List name="batches" initialValue={[{}]}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => (
                      <Row gutter={12} key={key} style={{ marginBottom: 8 }}>
                        <Col span={8}>
                          <Form.Item {...rest} name={[name, 'materialId']} rules={[{ required: true, message: '请选择耗材' }]} noStyle>
                            <Select placeholder="选择耗材" style={{ width: '100%' }}>
                              {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item {...rest} name={[name, 'batchNumber']} noStyle>
                            <Input placeholder="批号（空=全部批次）" />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Form.Item {...rest} name={[name, 'quantityAffected']} noStyle>
                            <InputNumber placeholder="受影响数量" style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={5}>
                          <Space>
                            <Form.Item {...rest} name={[name, 'remark']} noStyle>
                              <Input placeholder="备注" />
                            </Form.Item>
                            <Button danger size="small" onClick={() => remove(name)}>删除</Button>
                          </Space>
                        </Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} style={{ marginTop: 8 }}>
                      + 添加批次
                    </Button>
                  </>
                )}
              </Form.List>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer title="召回详情" open={detailOpen} onClose={() => setDetailOpen(false)} width={760}>
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="召回编号">{detail.basic.recallNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_COLOR[detail.basic.status]}>{STATUS_LABEL[detail.basic.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="召回标题" span={2}>{detail.basic.title}</Descriptions.Item>
              <Descriptions.Item label="召回级别">
                <Tag color={LEVEL_COLOR[detail.basic.recallLevel]}>{LEVEL_LABEL[detail.basic.recallLevel]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="来源">
                {detail.basic.source === 'SUPPLIER' ? '供应商主动' : '监管部门'}
              </Descriptions.Item>
              <Descriptions.Item label="发布日期">{detail.basic.issuedDate}</Descriptions.Item>
              <Descriptions.Item label="创建人">{detail.basic.createdByName}</Descriptions.Item>
              <Descriptions.Item label="召回原因" span={2}>{detail.basic.recallReason || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider>受影响库存（{detail.affectedInventory.length} 条）</Divider>
            <Table
              rowKey="inventoryId"
              size="small"
              pagination={false}
              dataSource={detail.affectedInventory}
              columns={[
                { title: '耗材名称', dataIndex: 'materialName', width: 150 },
                { title: '批号', dataIndex: 'batchNumber', width: 130 },
                { title: '当前库存', dataIndex: 'quantity', width: 90 },
                { title: '库位', dataIndex: 'location', width: 100 },
                { title: '效期', dataIndex: 'expiryDate', width: 110, render: (v) => formatDate(v) },
              ]}
            />

            <Divider>处置记录（{detail.disposals.length} 条）</Divider>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.disposals}
              columns={[
                { title: '耗材名称', dataIndex: 'materialName', width: 140 },
                { title: '批号', dataIndex: 'batchNumber', width: 120 },
                { title: '数量', dataIndex: 'quantity', width: 80 },
                {
                  title: '处置方式', dataIndex: 'disposalType', width: 100,
                  render: (v) => <Tag color={v === 'DESTROY' ? 'red' : v === 'RETURN' ? 'blue' : 'orange'}>
                    {DISPOSAL_LABELS[v]}
                  </Tag>,
                },
                { title: '处置时间', dataIndex: 'disposalDate', width: 160,
                  render: (v) => formatDateTime(v) },
                { title: '操作人', dataIndex: 'operatorName', width: 90 },
                { title: '备注', dataIndex: 'remark', ellipsis: true },
              ]}
            />
          </>
        )}
      </Drawer>

      {/* 登记处置 */}
      <Modal title="登记处置记录" open={disposalOpen}
        onCancel={() => { setDisposalOpen(false); disposalForm.resetFields() }}
        onOk={() => disposalForm.submit()} destroyOnClose>
        <Form form={disposalForm} onFinish={handleAddDisposal} layout="vertical">
          <Form.Item name="materialId" label="耗材" rules={[{ required: true }]}>
            <Select placeholder="选择耗材">
              {materials.map(m => <Select.Option key={m.id} value={m.id}>{m.materialName}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="batchNumber" label="批号">
            <Input placeholder="填写处置的批号" />
          </Form.Item>
          <Form.Item name="quantity" label="处置数量" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="disposalType" label="处置方式" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="RETURN">退货给供应商</Select.Option>
              <Select.Option value="DESTROY">就地销毁</Select.Option>
              <Select.Option value="QUARANTINE">隔离封存</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="处置说明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
