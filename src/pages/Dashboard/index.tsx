import React, { useEffect, useState } from 'react'
import { Row, Col, Card, Space, Spin, theme, Tag, Badge, Tooltip } from 'antd'
import {
  MedicineBoxOutlined, DatabaseOutlined, WarningOutlined,
  FileTextOutlined, RiseOutlined,
  CheckCircleOutlined,
  RobotOutlined, BulbOutlined, ShoppingCartOutlined,
  ArrowRightOutlined, AlertOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { reportsApi } from '@/api/system'
import { aiApi } from '@/api/ai'
import type { DashboardData, WarningVO, SafetyStockVO } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { useNavigate } from 'react-router-dom'


const CHART_COLORS = [
  '#6366f1', '#0ea5e9', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16',
]

// 专业数据可视化配色（Ant Design G2 默认主题）
const PIE_COLORS = [
  '#4096ff', '#36cfc9', '#52c41a', '#faad14',
  '#ff7875', '#9254de', '#ff9c6e', '#13c2c2',
]

// 将 hex 颜色向白色混合，生成浅色版本
function lightenHex(hex: string, ratio = 0.5): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio)
  const g = Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio)
  const b = Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiWarnings, setAiWarnings] = useState<WarningVO[]>([])
  const [safetySuggestions, setSafetySuggestions] = useState<SafetyStockVO[]>([])
  const [aiLoading, setAiLoading] = useState(true)
  const { realName } = useSelector((state: RootState) => state.auth)
  const { token } = theme.useToken()
  const navigate = useNavigate()

  useEffect(() => {
    reportsApi.getDashboard().then(setData).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    Promise.all([
      aiApi.getWarnings().catch(() => [] as WarningVO[]),
      aiApi.getSafetyStock().catch(() => [] as SafetyStockVO[]),
    ]).then(([warnings, safety]) => {
      setAiWarnings(warnings.slice(0, 5))
      setSafetySuggestions(safety.filter(s => s.shortage > 0).slice(0, 5))
    }).finally(() => setAiLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    )
  }

  const statCards = [
    {
      title: '耗材品种',
      value: data?.totalMaterials ?? 0,
      suffix: '种',
      desc: '在用耗材总品种数',
      icon: <MedicineBoxOutlined style={{ fontSize: 22 }} />,
      iconBg: '#ede9fe',
      iconColor: '#6366f1',
      accentColor: '#6366f1',
    },
    {
      title: '库存批次',
      value: data?.totalInventoryItems ?? 0,
      suffix: '批',
      desc: '当前在库批次总数',
      icon: <DatabaseOutlined style={{ fontSize: 22 }} />,
      iconBg: '#e0f2fe',
      iconColor: '#0ea5e9',
      accentColor: '#0ea5e9',
    },
    {
      title: '待审批申领',
      value: data?.pendingRequisitions ?? 0,
      suffix: '单',
      desc: '等待审批的申领单',
      icon: <FileTextOutlined style={{ fontSize: 22 }} />,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      accentColor: '#f59e0b',
    },
    {
      title: '预警提醒',
      value: (data?.expiringAlerts ?? 0) + (data?.lowStockAlerts ?? 0),
      suffix: '条',
      desc: '过期及低库存预警',
      icon: <WarningOutlined style={{ fontSize: 22 }} />,
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      accentColor: '#ef4444',
    },
  ]

  const trendData = data?.weeklyTrend ?? []
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      borderRadius: 10,
      shadowBlur: 16,
      shadowColor: 'rgba(0,0,0,0.08)',
      textStyle: { color: '#333', fontSize: 12 },
      formatter: (params: any[]) => {
        let html = `<div style="font-weight:600;margin-bottom:8px;color:#555">${params[0]?.axisValue}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span style="color:#666">${p.seriesName}</span>
            <span style="font-weight:700;margin-left:auto;padding-left:20px;color:#222">${p.value ?? 0}</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['入库数量', '出库数量'],
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemGap: 20,
      textStyle: { fontSize: 12, color: token.colorTextSecondary },
    },
    grid: { left: 44, right: 16, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: trendData.map(p => p.date.slice(5)),
      axisLine: { lineStyle: { color: token.colorBorderSecondary } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
      boundaryGap: true,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: token.colorBorderSecondary, type: 'dashed', dashOffset: 4 } },
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '入库数量',
        type: 'line',
        smooth: 0.4,
        data: trendData.map(p => p.inbound),
        itemStyle: { color: '#6366f1' },
        lineStyle: { width: 2.5, shadowColor: 'rgba(99,102,241,0.3)', shadowBlur: 6 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.20)' },
              { offset: 1, color: 'rgba(99,102,241,0.02)' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 7,
        emphasis: { focus: 'series', itemStyle: { shadowBlur: 10, shadowColor: 'rgba(99,102,241,0.5)' } },
      },
      {
        name: '出库数量',
        type: 'bar',
        data: trendData.map(p => p.outbound),
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14,165,233,0.85)' },
              { offset: 1, color: 'rgba(14,165,233,0.30)' },
            ],
          },
        },
        barMaxWidth: 28,
        emphasis: { focus: 'series', itemStyle: { color: '#0ea5e9' } },
      },
    ],
  }

  const categoryData = data?.categoryDistribution ?? []
  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0)
  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e6eaf0',
      borderWidth: 1,
      borderRadius: 12,
      shadowBlur: 20,
      shadowColor: 'rgba(0,0,0,0.10)',
      padding: [10, 14],
      formatter: (p: any) => {
        const base = PIE_COLORS[categoryData.findIndex(d => d.name === p.name) % PIE_COLORS.length]
        return (
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">` +
          `<span style="width:10px;height:10px;border-radius:50%;background:${base};display:inline-block;flex-shrink:0"></span>` +
          `<span style="font-weight:600;font-size:13px;color:#222">${p.name}</span></div>` +
          `<div style="padding-left:18px;color:#666;font-size:12px;line-height:1.8">` +
          `数量：<b style="color:#222">${p.value}</b> 种<br/>` +
          `占比：<b style="color:${base}">${p.percent}%</b></div>`
        )
      },
    },
    legend: {
      bottom: 4,
      type: 'scroll',
      icon: 'circle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 12,
      textStyle: { fontSize: 11, color: token.colorTextSecondary },
      formatter: (name: string) => {
        const item = categoryData.find(d => d.name === name)
        const pct = categoryTotal > 0 ? Math.round((item?.value ?? 0) / categoryTotal * 100) : 0
        return `${name}  ${pct}%`
      },
    },
    graphic: categoryTotal > 0 ? [
      {
        type: 'text',
        left: 'center',
        top: '32%',
        style: {
          text: `${categoryTotal}`,
          fontSize: 28,
          fontWeight: 700,
          fill: token.colorText,
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '45%',
        style: {
          text: '总品种',
          fontSize: 12,
          fill: token.colorTextTertiary,
          textAlign: 'center',
        },
      },
    ] : [],
    series: [
      {
        type: 'pie',
        radius: ['46%', '66%'],
        center: ['50%', '42%'],
        data: categoryData.map((d, i) => {
          const base = PIE_COLORS[i % PIE_COLORS.length]
          const light = lightenHex(base, 0.42)
          return {
            value: d.value,
            name: d.name,
            itemStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 1, y2: 1,
                colorStops: [
                  { offset: 0, color: light },
                  { offset: 1, color: base },
                ],
              },
              borderWidth: 2.5,
              borderColor: '#fff',
            },
          }
        }),
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 9,
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0,0,0,0.18)',
          },
        },
      },
    ],
  }

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                borderLeft: `3px solid ${card.accentColor}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
              styles={{ body: { padding: '20px 20px 16px' } }}
            >
              {/* 上半部分：标题 + 图标 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: token.colorTextSecondary }}>{card.title}</span>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: card.iconBg, color: card.iconColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {card.icon}
                </div>
              </div>
              {/* 下半部分：数值 + 描述 */}
              <div style={{ fontSize: 30, fontWeight: 700, color: token.colorText, lineHeight: 1 }}>
                {card.value}
                <span style={{ fontSize: 14, fontWeight: 400, color: token.colorTextSecondary, marginLeft: 5 }}>
                  {card.suffix}
                </span>
              </div>
              <div style={{ fontSize: 12, color: token.colorTextQuaternary, marginTop: 8 }}>
                {card.desc}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            title={
              <Space>
                <RiseOutlined style={{ color: '#6366f1' }} />
                <span>近7天耗材流动趋势</span>
              </Space>
            }
          >
            {trendData.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextQuaternary }}>
                暂无流水数据
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            title={
              <Space>
                <DatabaseOutlined style={{ color: '#0ea5e9' }} />
                <span>耗材分类分布</span>
              </Space>
            }
          >
            {categoryData.length > 0 ? (
              <ReactECharts option={pieOption} style={{ height: 260 }} />
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextQuaternary }}>
                暂无分类数据
              </div>
            )}
          </Card>
        </Col>
      </Row>


      {/* AI 智能洞察 */}
      <div style={{ marginTop: 20 }}>
        {/* 区块标题 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 15 }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>AI 智能洞察</span>
          <Tag color="purple" style={{ marginLeft: 4, fontSize: 11, borderRadius: 20 }}>Beta</Tag>
        </div>

        <Row gutter={[16, 16]}>
          {/* 左：AI 预警摘要 */}
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}
              styles={{ body: { padding: '16px 20px' } }}
              title={
                <Space>
                  <AlertOutlined style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: 14 }}>智能预警摘要</span>
                  {aiWarnings.length > 0 && (
                    <Badge count={aiWarnings.length} style={{ backgroundColor: '#ef4444' }} />
                  )}
                </Space>
              }
              extra={
                <span
                  onClick={() => navigate('/ai/warnings')}
                  style={{ fontSize: 12, color: token.colorPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  全部预警 <ArrowRightOutlined style={{ fontSize: 10 }} />
                </span>
              }
            >
              <Spin spinning={aiLoading}>
                {aiWarnings.length === 0 && !aiLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: token.colorTextQuaternary, fontSize: 13 }}>
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8, display: 'block' }} />
                    暂无异常预警，库存状态良好
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {aiWarnings.map((w, i) => {
                      const severityMap: Record<string, { color: string; bg: string; border: string; label: string }> = {
                        HIGH:   { color: '#ef4444', bg: '#fff5f5', border: '#fecaca', label: '高危' },
                        MEDIUM: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '中危' },
                        LOW:    { color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd', label: '低危' },
                      }
                      const s = severityMap[w.severity] ?? severityMap.LOW
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px', borderRadius: 8,
                          background: s.bg, border: `1px solid ${s.border}`,
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: s.color, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, color: token.colorText, fontWeight: 500 }}>
                              {w.materialName}
                            </span>
                            <span style={{ fontSize: 12, color: token.colorTextSecondary, marginLeft: 6 }}>
                              {w.message}
                            </span>
                          </div>
                          <Tag
                            style={{
                              fontSize: 11, borderRadius: 12, border: 'none',
                              background: s.color + '20', color: s.color, flexShrink: 0,
                            }}
                          >
                            {s.label}
                          </Tag>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Spin>
            </Card>
          </Col>

          {/* 右：智能采购建议 */}
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}
              styles={{ body: { padding: '16px 20px' } }}
              title={
                <Space>
                  <BulbOutlined style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: 14 }}>智能采购建议</span>
                  {safetySuggestions.length > 0 && (
                    <Badge count={safetySuggestions.length} style={{ backgroundColor: '#f59e0b' }} />
                  )}
                </Space>
              }
              extra={
                <span
                  onClick={() => navigate('/ai/safety-stock')}
                  style={{ fontSize: 12, color: token.colorPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  安全库存 <ArrowRightOutlined style={{ fontSize: 10 }} />
                </span>
              }
            >
              <Spin spinning={aiLoading}>
                {safetySuggestions.length === 0 && !aiLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: token.colorTextQuaternary, fontSize: 13 }}>
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8, display: 'block' }} />
                    当前库存充足，无需补货
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {safetySuggestions.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 8,
                        background: '#fffbeb', border: '1px solid #fde68a',
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                          background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ShoppingCartOutlined style={{ color: '#fff', fontSize: 13 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: token.colorText }}>
                            {s.materialName}
                          </div>
                          <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 1 }}>
                            当前库存 {s.currentStock} · 缺口 <span style={{ color: '#ef4444', fontWeight: 600 }}>{s.shortage}</span>
                          </div>
                        </div>
                        <Tooltip title="AI 建议采购量">
                          <div style={{
                            textAlign: 'right', flexShrink: 0,
                          }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
                              +{s.suggestedPurchase}
                            </div>
                            <div style={{ fontSize: 10, color: token.colorTextSecondary }}>建议补货</div>
                          </div>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </Spin>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
