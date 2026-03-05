import React, { useState, useEffect, useMemo } from 'react'
import {
  Table, Button, Card, Row, Col, Tag, Space, Statistic,
  Progress, message, Select, theme,
} from 'antd'
import { RobotOutlined, ThunderboltOutlined, SafetyOutlined, LineChartOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { ColumnsType } from 'antd/es/table'
import styled from 'styled-components'
import { aiApi } from '@/api/ai'
import type { PredictionVO, SafetyStockVO } from '@/types'

const ColorValue = styled.span<{ color: string }>`
  font-weight: 600;
  color: ${p => p.color};
`

export default function PredictionPage() {
  const [predictions, setPredictions] = useState<PredictionVO[]>([])
  const [safetyStock, setSafetyStock] = useState<SafetyStockVO[]>([])
  // 全量数据（用于图表聚合 & 科室下拉选项，最多取 500 条）
  const [allRecords, setAllRecords] = useState<PredictionVO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [page, setPage] = useState({ page: 1, size: 20 })
  const [month, setMonth] = useState<string | undefined>()
  const [dept, setDept] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'prediction' | 'safety'>('prediction')
  const { token } = theme.useToken()

  // 分页列表（受月份筛选影响）
  const fetchPredictions = async () => {
    setLoading(true)
    try {
      const res = await aiApi.getPredictions({ month, ...page })
      setPredictions(res.records)
      setTotal(res.total)
    } finally { setLoading(false) }
  }

  // 全量数据（用于图表，不分页）
  const fetchAllRecords = async () => {
    try {
      const res = await aiApi.getPredictions({ page: 1, size: 500 })
      setAllRecords(res.records)
    } catch {}
  }

  const fetchSafetyStock = async () => {
    const res = await aiApi.getSafetyStock()
    setSafetyStock(res)
  }

  useEffect(() => { fetchPredictions() }, [page, month])
  useEffect(() => { fetchAllRecords(); fetchSafetyStock() }, [])

  // 科室下拉选项（从全量数据中提取唯一值）
  const deptOptions = useMemo(() => {
    const set = new Set(allRecords.map(p => p.deptName).filter(Boolean))
    return Array.from(set).sort()
  }, [allRecords])

  // 表格数据：选了科室时从全量数据本地过滤，否则展示分页数据
  const tableData = useMemo(() => {
    if (!dept) return predictions
    return allRecords.filter(p => p.deptName === dept)
  }, [predictions, allRecords, dept])

  // 图表聚合：按科室 + 月份分组求和
  const chartAgg = useMemo(() => {
    const source = dept ? allRecords.filter(p => p.deptName === dept) : allRecords
    const map = new Map<string, { predicted: number; actual: number; accSum: number; accCount: number }>()
    source.forEach(p => {
      if (!map.has(p.predictionMonth)) map.set(p.predictionMonth, { predicted: 0, actual: 0, accSum: 0, accCount: 0 })
      const e = map.get(p.predictionMonth)!
      e.predicted += p.predictedQuantity
      if (p.actualQuantity != null) e.actual += p.actualQuantity
      if (p.accuracy != null && p.actualQuantity != null) { e.accSum += p.accuracy; e.accCount++ }
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        predicted: v.predicted,
        actual: v.actual > 0 ? v.actual : null,  // 无实际数据时用 null 避免折线断到0
      }))
  }, [allRecords, dept])

  // 平均预测准确率（仅统计有实际值的记录）
  const avgAccuracy = useMemo(() => {
    const valid = allRecords.filter(p => p.accuracy != null && p.actualQuantity != null)
    if (!valid.length) return null
    return (valid.reduce((s, p) => s + p.accuracy, 0) / valid.length).toFixed(1)
  }, [allRecords])

  const handleTrigger = async () => {
    setTriggering(true)
    try {
      const msg = await aiApi.triggerPredict()
      message.success(typeof msg === 'string' ? msg : 'AI 预测已完成')
      fetchPredictions()
      fetchAllRecords()
    } finally { setTriggering(false) }
  }

  /* ── ECharts 折线图配置 ── */
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 10,
      textStyle: { color: '#333', fontSize: 12 },
      formatter: (params: any[]) => {
        let h = `<div style="font-weight:600;margin-bottom:6px;color:#555">${params[0]?.axisValue}</div>`
        params.forEach(p => {
          if (p.value == null) return
          h += `<div style="display:flex;align-items:center;gap:8px;margin-top:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
            <span style="color:#666">${p.seriesName}</span>
            <span style="font-weight:700;margin-left:auto;padding-left:20px;color:#222">${p.value}</span>
          </div>`
        })
        return h
      },
    },
    legend: {
      data: ['预测用量', '实际用量'], bottom: 0, icon: 'circle',
      itemWidth: 8, itemGap: 20, textStyle: { fontSize: 12, color: token.colorTextSecondary },
    },
    grid: { left: 48, right: 16, top: 16, bottom: 40 },
    xAxis: {
      type: 'category', data: chartAgg.map(d => d.month),
      axisLine: { lineStyle: { color: token.colorBorderSecondary } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: token.colorBorderSecondary, type: 'dashed' } },
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: '预测用量', type: 'line', smooth: 0.4,
        data: chartAgg.map(d => d.predicted),
        itemStyle: { color: '#6366f1' },
        lineStyle: { width: 2.5, shadowColor: 'rgba(99,102,241,0.25)', shadowBlur: 6 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.18)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }] } },
        symbol: 'circle', symbolSize: 6,
        emphasis: { focus: 'series' },
      },
      {
        name: '实际用量', type: 'line', smooth: 0.4,
        data: chartAgg.map(d => d.actual),
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2.5, type: 'dashed' },
        symbol: 'circle', symbolSize: 6,
        connectNulls: false,   // 无实际数据的月份不连线
        emphasis: { focus: 'series' },
      },
    ],
  }

  /* ── 表格列定义 ── */
  const predColumns: ColumnsType<PredictionVO> = [
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '耗材编码', dataIndex: 'materialCode', width: 120 },
    { title: '科室', dataIndex: 'deptName', width: 120 },
    { title: '预测月份', dataIndex: 'predictionMonth', width: 100 },
    {
      title: '预测用量', dataIndex: 'predictedQuantity', width: 100,
      render: v => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span>,
    },
    {
      title: '置信度', dataIndex: 'confidence', width: 120,
      render: v => <Progress percent={v} size="small" status={v >= 85 ? 'success' : 'normal'} />,
    },
    {
      title: '实际用量', dataIndex: 'actualQuantity', width: 100,
      render: v => v != null ? v : <Tag>待确认</Tag>,
    },
    {
      title: '准确率', dataIndex: 'accuracy', width: 100,
      render: v => v != null
        ? <Tag color={v >= 90 ? 'success' : v >= 75 ? 'warning' : 'error'}>{v}%</Tag>
        : '-',
    },
    {
      title: '误差', width: 100,
      render: (_, r) => {
        if (r.actualQuantity == null || r.predictedQuantity === 0) return '-'
        const err = Math.abs(r.predictedQuantity - r.actualQuantity) / r.predictedQuantity * 100
        return <Tag color={err < 10 ? 'success' : err < 20 ? 'warning' : 'error'}>{err.toFixed(1)}%</Tag>
      },
    },
    {
      title: '算法', dataIndex: 'algorithm', width: 90,
      render: (v: string) => v === 'CLAUDE'
        ? <Tag color="purple" style={{ borderRadius: 8, fontSize: 11 }}>Claude AI</Tag>
        : <Tag color="default" style={{ borderRadius: 8, fontSize: 11 }}>{v || 'MA3'}</Tag>,
    },
    { title: '生成时间', dataIndex: 'createTime', width: 160 },
  ]

  const safetyColumns: ColumnsType<SafetyStockVO> = [
    { title: '耗材编码', dataIndex: 'materialCode', width: 130 },
    { title: '耗材名称', dataIndex: 'materialName', width: 150 },
    { title: '当前库存', dataIndex: 'currentStock', width: 100 },
    { title: '最低库存', dataIndex: 'minStock', width: 100 },
    { title: '最高库存', dataIndex: 'maxStock', width: 100 },
    {
      title: '缺口数量', dataIndex: 'shortage', width: 100,
      render: v => <ColorValue color={v > 0 ? '#ff4d4f' : '#52c41a'}>{v}</ColorValue>,
    },
    {
      title: '建议采购量', dataIndex: 'suggestedPurchase', width: 110,
      render: v => v > 0 ? <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span> : '-',
    },
    {
      title: '状态', width: 100,
      render: (_, r) => {
        if (r.shortage <= 0) return <Tag color="success">正常</Tag>
        if (r.shortage < r.minStock * 0.5) return <Tag color="warning">偏低</Tag>
        return <Tag color="error">严重不足</Tag>
      },
    },
  ]

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  return (
    <div>
      {/* ── 统计卡片（4 项） ── */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="预测记录总数"
              value={total}
              prefix={<RobotOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="安全库存预警数"
              value={safetyStock.filter(s => s.shortage > 0).length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="平均预测置信度"
              value={predictions.length > 0
                ? (predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length).toFixed(1)
                : '--'}
              suffix={predictions.length > 0 ? '%' : ''}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="平均预测准确率"
              value={avgAccuracy ?? '--'}
              suffix={avgAccuracy ? '%' : ''}
              valueStyle={{ color: avgAccuracy && Number(avgAccuracy) >= 85 ? '#52c41a' : '#faad14' }}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: 12 }}
        title="AI 智能预测"
        extra={
          <Button type="primary" icon={<ThunderboltOutlined />} loading={triggering} onClick={handleTrigger}>
            {triggering ? 'Claude AI 预测中…' : '触发 Claude AI 预测'}
          </Button>
        }
        tabList={[
          { key: 'prediction', tab: <Space><RobotOutlined />需求预测</Space> },
          { key: 'safety', tab: <Space><SafetyOutlined />安全库存分析</Space> },
        ]}
        activeTabKey={activeTab}
        onTabChange={k => setActiveTab(k as any)}
      >
        {activeTab === 'prediction' && (
          <>
            {/* 预测 vs 实际趋势图 */}
            {chartAgg.length > 0 && (
              <Card
                bordered={false}
                style={{ background: token.colorFillAlter, borderRadius: 10, marginBottom: 16 }}
                styles={{ body: { padding: '12px 16px 8px' } }}
                title={
                  <Space>
                    <LineChartOutlined style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>预测 vs 实际用量趋势</span>
                    {dept && <Tag color="purple" style={{ fontSize: 11, borderRadius: 10 }}>{dept}</Tag>}
                  </Space>
                }
              >
                <ReactECharts option={trendOption} style={{ height: 200 }} />
              </Card>
            )}

            {/* 筛选栏 */}
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col>
                <Select
                  placeholder="按月份筛选"
                  value={month}
                  onChange={v => { setMonth(v); setPage(p => ({ ...p, page: 1 })) }}
                  allowClear
                  style={{ width: 150 }}
                >
                  {months.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
                </Select>
              </Col>
              <Col>
                <Select
                  placeholder="按科室筛选"
                  value={dept}
                  onChange={setDept}
                  allowClear
                  style={{ width: 150 }}
                >
                  {deptOptions.map(d => <Select.Option key={d} value={d}>{d}</Select.Option>)}
                </Select>
              </Col>
            </Row>

            <Table
              rowKey="id"
              columns={predColumns}
              dataSource={tableData}
              loading={loading}
              scroll={{ x: 1050 }}
              pagination={
                dept
                  ? {
                      total: tableData.length,
                      pageSize: 20,
                      showTotal: t => `共 ${t} 条（已按科室筛选）`,
                    }
                  : {
                      total,
                      current: page.page,
                      pageSize: page.size,
                      showSizeChanger: true,
                      showTotal: t => `共 ${t} 条`,
                      onChange: (p, s) => setPage({ page: p, size: s }),
                    }
              }
            />
          </>
        )}

        {activeTab === 'safety' && (
          <Table
            rowKey="materialId"
            columns={safetyColumns}
            dataSource={safetyStock}
            pagination={false}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  )
}
