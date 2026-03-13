import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Row, Col, Card, Space, Spin, theme, Tag, Badge, Tooltip, Progress, Button, message } from 'antd'
import {
  MedicineBoxOutlined, DatabaseOutlined, WarningOutlined,
  FileTextOutlined, RiseOutlined, CheckCircleOutlined,
  RobotOutlined, BulbOutlined, ShoppingCartOutlined,
  ArrowRightOutlined, AlertOutlined, ThunderboltOutlined,
  SyncOutlined, LineChartOutlined, SafetyCertificateOutlined,
  ApiOutlined, ClockCircleOutlined, ExperimentOutlined, FireOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { reportsApi } from '@/api/reports'
import { aiApi } from '@/api/ai'
import { smallConsumablesApi } from '@/api/smallConsumables'
import type { AnomalySummaryVO } from '@/api/smallConsumables'
import type { DashboardData, WarningVO, SafetyStockVO, AiDashboardAnalysis, AiWarningVO, AiSuggestionVO } from '@/types'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import PurchaseDrawer from '@/components/PurchaseDrawer'
import AiChat from '@/components/AiChat'

/* ─── CSS 动画注入 ─── */
const STYLES = `
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.8; }
  70%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scan-line {
  0%   { top: 0%;   opacity: 0.6; }
  50%  { opacity: 0.3; }
  100% { top: 100%; opacity: 0; }
}
@keyframes float-dot {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
}
.ai-panel-item { animation: slide-up .35s ease both; }
.ai-panel-item:nth-child(1) { animation-delay: .05s }
.ai-panel-item:nth-child(2) { animation-delay: .12s }
.ai-panel-item:nth-child(3) { animation-delay: .19s }
.ai-panel-item:nth-child(4) { animation-delay: .26s }
.ai-panel-item:nth-child(5) { animation-delay: .33s }
`

/* ─── 打字机 Hook ─── */
function useTypewriter(texts: string[], speed = 45) {
  const [displayed, setDisplayed] = useState('')
  const [ti, setTi] = useState(0)
  const [ci, setCi] = useState(0)
  const ref = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!texts.length) return
    const text = texts[ti]
    if (ci < text.length) {
      ref.current = setTimeout(() => {
        setDisplayed(text.slice(0, ci + 1))
        setCi(c => c + 1)
      }, speed)
    } else {
      ref.current = setTimeout(() => {
        setTi(i => (i + 1) % texts.length)
        setCi(0)
        setDisplayed('')
      }, 4500)
    }
    return () => clearTimeout(ref.current)
  }, [ci, ti, texts, speed])

  return displayed
}

/* ─── 颜色工具 ─── */
const PIE_COLORS = ['#4096ff','#36cfc9','#52c41a','#faad14','#ff7875','#9254de','#ff9c6e','#13c2c2']
function lightenHex(hex: string, ratio = 0.5) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (ch: number) => Math.round(ch + (255 - ch) * ratio)
  const r = mix((n >> 16) & 0xff), g = mix((n >> 8) & 0xff), b = mix(n & 0xff)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/* ─── AI 健康评分 ─── */
function calcHealthScore(data: DashboardData | null, warnings: WarningVO[], safety: SafetyStockVO[]) {
  if (!data) return 0
  let score = 100
  const high   = warnings.filter(w => w.severity === 'HIGH').length
  const medium = warnings.filter(w => w.severity === 'MEDIUM').length
  const lowStock = safety.filter(s => s.shortage > 0).length
  score -= high * 8 + medium * 4 + lowStock * 3
  if (data.pendingRequisitions > 10) score -= 5
  return Math.max(0, Math.min(100, score))
}

export default function Dashboard() {
  const [data, setData]                     = useState<DashboardData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [aiWarnings, setAiWarnings]         = useState<WarningVO[]>([])
  const [safetyList, setSafetyList]         = useState<SafetyStockVO[]>([])
  const [aiLoading, setAiLoading]           = useState(true)
  const [aiDashData, setAiDashData]         = useState<AiDashboardAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null)
  const [purchaseDrawerOpen, setPurchaseDrawerOpen] = useState(false)
  const [anomalySummary, setAnomalySummary] = useState<AnomalySummaryVO | null>(null)
  const [now, setNow]                       = useState(new Date())
  const { realName }                        = useSelector((s: RootState) => s.auth)
  const { token }                           = theme.useToken()
  const navigate                            = useNavigate()
  const { can }                             = usePermission()
  const hasAi                              = can('menu:ai')
  const hasInventory                       = can('menu:inventory')

  useEffect(() => {
    reportsApi.getDashboard().then(setData).finally(() => setLoading(false))
    smallConsumablesApi.getAnomalySummary().then(setAnomalySummary).catch(() => {})
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!hasInventory) { setAiLoading(false); return }
    Promise.all([
      aiApi.getWarnings().catch(() => [] as WarningVO[]),
      aiApi.getSafetyStock().catch(() => [] as SafetyStockVO[]),
    ]).then(([w, s]) => {
      setAiWarnings(w.slice(0, 5))
      setSafetyList(s.filter(x => x.shortage > 0).slice(0, 5))
    }).finally(() => setAiLoading(false))
  }, [hasInventory])

  // 拉取 Claude 全量分析（Key 未配置时返回 null，走规则兜底；无 menu:ai 权限时跳过）
  const fetchAnalysis = useCallback(() => {
    if (!hasAi) return
    setAnalysisLoading(true)
    aiApi.getDashboardAnalysis().then(result => {
      if (result) setAiDashData(result)
      setLastAnalysisTime(new Date())
    }).catch(() => {}).finally(() => setAnalysisLoading(false))
  }, [hasAi])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  /* AI 数据优先使用 Claude 全量返回，否则降级规则兜底 */
  const displayWarnings    = aiDashData ? aiDashData.warnings   : aiWarnings
  const displaySuggestions = aiDashData ? aiDashData.suggestions : safetyList.map(s => ({ ...s, priority: '', aiReason: '' }))
  const highCount          = displayWarnings.filter((w: any) => w.severity === 'HIGH').length
  const shortageCount      = displaySuggestions.length
  const healthScore        = aiDashData?.healthScore ?? calcHealthScore(data, aiWarnings, safetyList)
  const scoreColor         = healthScore >= 85 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'
  const scoreLabel         = aiDashData?.healthLabel ?? (healthScore >= 85 ? '优秀' : healthScore >= 60 ? '良好' : '需关注')

  /* 健康评分扣分明细（规则模式下计算，Claude 模式用 healthLabel 替代） */
  const scoreDeductions = !aiDashData ? (() => {
    const high   = aiWarnings.filter(w => w.severity === 'HIGH').length
    const medium = aiWarnings.filter(w => w.severity === 'MEDIUM').length
    const low    = safetyList.filter(s => s.shortage > 0).length
    const pending = (data?.pendingRequisitions ?? 0) > 10 ? 1 : 0
    const items = [
      high   > 0 ? `高危预警 ×${high}（-${high * 8}分）`    : null,
      medium > 0 ? `中危预警 ×${medium}（-${medium * 4}分）` : null,
      low    > 0 ? `库存不足 ×${low}（-${low * 3}分）`       : null,
      pending    ? '待审申领过多（-5分）'                       : null,
    ].filter(Boolean)
    return items.length ? items.join('\n') : '当前无扣分项，系统运行良好'
  })() : null

  /* 打字机洞察文本：优先用 Claude 返回，否则本地规则兜底 */
  const fallbackInsights = aiLoading || !data ? ['AI 正在分析库存数据，请稍候...'] : [
    highCount > 0
      ? `检测到 ${highCount} 条高危预警，建议立即处理相关耗材库存风险`
      : '当前无高危预警，库存整体运行状态正常',
    shortageCount > 0
      ? `${shortageCount} 种耗材库存低于安全线，AI 已生成补货建议方案`
      : '全部耗材库存充足，近期无需紧急补货',
    data.pendingRequisitions > 0
      ? `${data.pendingRequisitions} 份申领单待审批，请及时处理以保障科室用耗需求`
      : '所有申领单已处理完毕，申领流程畅通',
  ]
  const insights = aiDashData?.insight ? [aiDashData.insight] : fallbackInsights
  const typeText = useTypewriter(insights)

  /* 统计卡片 */
  const statCards = [
    { title: '耗材品种', value: data?.totalMaterials ?? 0, suffix: '种',
      icon: <MedicineBoxOutlined style={{ fontSize: 20 }} />, iconBg: '#ede9fe', iconColor: '#6366f1', accent: '#6366f1' },
    { title: '库存批次', value: data?.totalInventoryItems ?? 0, suffix: '批',
      icon: <DatabaseOutlined style={{ fontSize: 20 }} />, iconBg: '#e0f2fe', iconColor: '#0ea5e9', accent: '#0ea5e9' },
    { title: '待审批申领', value: data?.pendingRequisitions ?? 0, suffix: '单',
      icon: <FileTextOutlined style={{ fontSize: 20 }} />, iconBg: '#fef3c7', iconColor: '#f59e0b', accent: '#f59e0b' },
    { title: '智能预警', value: (data?.expiringAlerts ?? 0) + (data?.lowStockAlerts ?? 0), suffix: '条',
      icon: <WarningOutlined style={{ fontSize: 20 }} />, iconBg: '#fee2e2', iconColor: '#ef4444', accent: '#ef4444' },
  ]

  /* 趋势图 */
  const trendData = data?.weeklyTrend ?? []
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 10,
      shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.08)',
      textStyle: { color: '#333', fontSize: 12 },
      formatter: (params: any[]) => {
        let h = `<div style="font-weight:600;margin-bottom:8px;color:#555">${params[0]?.axisValue}</div>`
        params.forEach(p => {
          h += `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>
            <span style="color:#666">${p.seriesName}</span>
            <span style="font-weight:700;margin-left:auto;padding-left:20px;color:#222">${p.value ?? 0}</span>
          </div>`
        })
        return h
      },
    },
    legend: { data: ['入库数量','出库数量'], bottom: 0, icon: 'circle', itemWidth: 8, itemGap: 20,
      textStyle: { fontSize: 12, color: token.colorTextSecondary } },
    grid: { left: 44, right: 16, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: trendData.map(p => p.date.slice(5)),
      axisLine: { lineStyle: { color: token.colorBorderSecondary } },
      axisTick: { show: false }, axisLabel: { fontSize: 11, color: token.colorTextSecondary }, boundaryGap: true },
    yAxis: { type: 'value', minInterval: 1,
      splitLine: { lineStyle: { color: token.colorBorderSecondary, type: 'dashed', dashOffset: 4 } },
      axisLabel: { fontSize: 11, color: token.colorTextSecondary }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: '入库数量', type: 'line', smooth: 0.4, data: trendData.map(p => p.inbound),
        itemStyle: { color: '#6366f1' },
        lineStyle: { width: 2.5, shadowColor: 'rgba(99,102,241,0.3)', shadowBlur: 6 },
        areaStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1,
          colorStops: [{ offset:0,color:'rgba(99,102,241,0.20)' },{ offset:1,color:'rgba(99,102,241,0.02)' }] } },
        symbol: 'circle', symbolSize: 7,
        emphasis: { focus:'series', itemStyle: { shadowBlur:10, shadowColor:'rgba(99,102,241,0.5)' } } },
      { name: '出库数量', type: 'bar', data: trendData.map(p => p.outbound),
        itemStyle: { borderRadius:[5,5,0,0],
          color: { type:'linear',x:0,y:0,x2:0,y2:1,
            colorStops:[{ offset:0,color:'rgba(14,165,233,0.85)' },{ offset:1,color:'rgba(14,165,233,0.30)' }] } },
        barMaxWidth: 28,
        emphasis: { focus:'series', itemStyle: { color:'#0ea5e9' } } },
    ],
  }

  /* 饼图 */
  const categoryData = data?.categoryDistribution ?? []
  const categoryTotal = categoryData.reduce((s, d) => s + d.value, 0)
  const pieOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e6eaf0', borderWidth: 1, borderRadius: 12,
      shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.10)', padding: [10, 14],
      formatter: (p: any) => {
        const base = PIE_COLORS[categoryData.findIndex(d => d.name === p.name) % PIE_COLORS.length]
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${base};display:inline-block;flex-shrink:0"></span>
          <span style="font-weight:600;font-size:13px;color:#222">${p.name}</span></div>
          <div style="padding-left:18px;color:#666;font-size:12px;line-height:1.8">
          数量：<b style="color:#222">${p.value}</b> 种<br/>占比：<b style="color:${base}">${p.percent}%</b></div>`
      },
    },
    legend: { bottom: 4, type: 'scroll', icon: 'circle', itemWidth: 9, itemHeight: 9, itemGap: 12,
      textStyle: { fontSize: 11, color: token.colorTextSecondary },
      formatter: (name: string) => {
        const item = categoryData.find(d => d.name === name)
        const pct = categoryTotal > 0 ? Math.round((item?.value ?? 0) / categoryTotal * 100) : 0
        return `${name}  ${pct}%`
      } },
    graphic: categoryTotal > 0 ? [
      { type:'text', left:'center', top:'32%', style:{ text:`${categoryTotal}`, fontSize:28, fontWeight:700, fill:token.colorText, textAlign:'center' } },
      { type:'text', left:'center', top:'45%', style:{ text:'总品种', fontSize:12, fill:token.colorTextTertiary, textAlign:'center' } },
    ] : [],
    series: [{
      type: 'pie', radius: ['46%','66%'], center: ['50%','42%'],
      data: categoryData.map((d, i) => {
        const base = PIE_COLORS[i % PIE_COLORS.length]
        return { value: d.value, name: d.name,
          itemStyle: { color: { type:'linear',x:0,y:0,x2:1,y2:1,
            colorStops:[{ offset:0,color:lightenHex(base,0.42) },{ offset:1,color:base }] },
            borderWidth:2.5, borderColor:'#fff' } }
      }),
      label: { show: false }, labelLine: { show: false },
      emphasis: { scale:true, scaleSize:9, itemStyle:{ shadowBlur:20, shadowColor:'rgba(0,0,0,0.18)' } },
    }],
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <style>{STYLES}</style>

      {/* ══════════ AI 智能中枢横幅 ══════════ */}
      <div style={{
        marginBottom: 20, borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 100%)',
        boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
      }}>
        {/* 背景装饰网格 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* 扫描线 */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),transparent)',
          animation: 'scan-line 4s linear infinite', pointerEvents: 'none',
        }} />
        {/* 光晕装饰 */}
        <div style={{ position:'absolute', top:-60, right: 80, width:180, height:180,
          borderRadius:'50%', background:'rgba(99,102,241,0.15)', filter:'blur(40px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left: 60, width:120, height:120,
          borderRadius:'50%', background:'rgba(14,165,233,0.12)', filter:'blur(30px)', pointerEvents:'none' }} />

        <div style={{ padding: '22px 28px', position: 'relative', zIndex: 1 }}>
          <Row align="middle" gutter={24}>
            {/* 左：图标 + 标题 */}
            <Col flex="none">
              <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
                <div style={{ position:'relative', width: 54, height: 54 }}>
                  {/* 脉冲外圈 */}
                  <div style={{
                    position:'absolute', inset:-6, borderRadius:'50%',
                    background:'rgba(99,102,241,0.4)',
                    animation:'pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite',
                  }} />
                  <div style={{
                    width: 54, height: 54, borderRadius: 14, position:'relative',
                    background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
                  }}>
                    <RobotOutlined style={{ fontSize: 26, color: '#fff' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '.5px' }}>
                      AI 智能中枢
                    </span>
                    <Tag style={{ background:'rgba(16,185,129,0.2)', border:'1px solid rgba(16,185,129,0.4)',
                      color:'#6ee7b7', borderRadius:20, fontSize:11, padding:'0 8px' }}>
                      ● {aiDashData ? 'Claude 模式' : '规则模式'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {now.toLocaleDateString('zh-CN', { month:'long', day:'numeric', weekday:'long' })}
                    &nbsp;·&nbsp;{now.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                    {lastAnalysisTime && (
                      <>
                        &nbsp;·&nbsp;分析于 {lastAnalysisTime.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' })}
                        <Button
                          size="small" type="text"
                          loading={analysisLoading}
                          onClick={fetchAnalysis}
                          style={{ color:'rgba(255,255,255,0.5)', fontSize:11, padding:'0 4px', height:'auto', marginLeft:4 }}
                        >
                          刷新
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Col>

            {/* 中：打字机洞察 */}
            <Col flex="1" style={{ minWidth: 0 }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.10)',
                padding: '10px 16px',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, display:'flex', alignItems:'center', gap:5 }}>
                  <ThunderboltOutlined style={{ fontSize: 10 }} />
                  {aiDashData ? 'Claude AI 实时分析' : 'AI 规则洞察'}
                  {aiDashData && (
                    <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.8)',
                      background: 'rgba(99,102,241,0.15)', padding: '0 6px',
                      borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)' }}>
                      Claude
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', minHeight: 20, lineHeight: 1.5 }}>
                  {typeText}
                  <span style={{ animation:'blink-cursor .8s step-end infinite', marginLeft:1, color:'#818cf8' }}>|</span>
                </div>
              </div>
            </Col>

            {/* 右：AI 健康评分 */}
            <Col flex="none">
              <Tooltip
                title={scoreDeductions ?? undefined}
                overlayStyle={{ whiteSpace: 'pre-line', maxWidth: 240 }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.06)', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.10)',
                  padding: '14px 20px', textAlign: 'center', minWidth: 100, cursor: 'help',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>AI 健康评分</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                    {healthScore}
                  </div>
                  <div style={{ fontSize: 11, color: scoreColor, marginTop: 4 }}>{scoreLabel}</div>
                  {scoreDeductions && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                      悬停查看明细
                    </div>
                  )}
                </div>
              </Tooltip>
            </Col>
          </Row>

          {/* 底部指标栏 */}
          <div style={{
            marginTop: 16, display:'flex', gap: 24, flexWrap:'wrap',
            paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            {[
              { icon: <AlertOutlined />, label: '高危预警', value: highCount, color: '#ef4444', warn: highCount > 0 },
              { icon: <BulbOutlined />, label: '补货建议', value: shortageCount, color: '#f59e0b', warn: shortageCount > 0 },
              { icon: <FileTextOutlined />, label: '待审申领', value: data?.pendingRequisitions ?? 0, color: '#0ea5e9', warn: (data?.pendingRequisitions ?? 0) > 5 },
              { icon: <LineChartOutlined />, label: '近7天流水', value: trendData.reduce((s, d) => s + d.inbound + d.outbound, 0), color: '#6366f1', warn: false },
            ].map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 7 }}>
                <span style={{ color: m.warn ? m.color : 'rgba(255,255,255,0.35)', fontSize: 13 }}>{m.icon}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: m.warn ? m.color : 'rgba(255,255,255,0.75)' }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ 统计卡片 ══════════ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {statCards.map((card, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card bordered={false} style={{ borderRadius: 12, borderLeft: `3px solid ${card.accent}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              styles={{ body: { padding: '20px 20px 16px' } }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: token.colorTextSecondary }}>{card.title}</span>
                <div style={{ width:44, height:44, borderRadius:10, flexShrink:0,
                  background: card.iconBg, color: card.iconColor,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: token.colorText, lineHeight: 1 }}>
                {card.value}
                <span style={{ fontSize: 14, fontWeight: 400, color: token.colorTextSecondary, marginLeft: 5 }}>
                  {card.suffix}
                </span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ══════════ 图表区 ══════════ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            title={<Space><RiseOutlined style={{ color:'#6366f1' }} /><span>近7天耗材流动趋势</span></Space>}>
            {trendData.length > 0
              ? <ReactECharts option={trendOption} style={{ height: 260 }} />
              : <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:token.colorTextQuaternary }}>暂无流水数据</div>}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            title={<Space><DatabaseOutlined style={{ color:'#0ea5e9' }} /><span>耗材分类分布</span></Space>}>
            {categoryData.length > 0
              ? <ReactECharts option={pieOption} style={{ height: 260 }} />
              : <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:token.colorTextQuaternary }}>暂无分类数据</div>}
          </Card>
        </Col>
      </Row>

      {/* ══════════ 小耗材精细化管理 ══════════ */}
      <Card
        bordered={false}
        style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid #13c2c2' }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#e6fffb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExperimentOutlined style={{ color: '#13c2c2', fontSize: 14 }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>小耗材精细化管理</span>
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>本月实时</span>
          </Space>
          <Button
            type="link" size="small"
            style={{ fontSize: 12, padding: 0 }}
            onClick={() => navigate('/consumables/anomaly')}
          >
            消耗异常分析 <ArrowRightOutlined style={{ fontSize: 10 }} />
          </Button>
        </div>
        <Row gutter={[24, 0]}>
          {[
            {
              label: '已配置科室', value: anomalySummary?.totalDepts ?? '-',
              suffix: '个', color: '#13c2c2', link: '/consumables/par-levels',
              icon: <MedicineBoxOutlined />,
            },
            {
              label: '本月超限额',
              value: anomalySummary?.dangerCount ?? '-',
              suffix: '项',
              color: (anomalySummary?.dangerCount ?? 0) > 0 ? '#ff4d4f' : '#52c41a',
              link: '/consumables/anomaly',
              icon: (anomalySummary?.dangerCount ?? 0) > 0 ? <FireOutlined /> : <CheckCircleOutlined />,
            },
            {
              label: '偏高预警',
              value: anomalySummary?.warningCount ?? '-',
              suffix: '项',
              color: (anomalySummary?.warningCount ?? 0) > 0 ? '#faad14' : '#52c41a',
              link: '/consumables/anomaly',
              icon: (anomalySummary?.warningCount ?? 0) > 0 ? <WarningOutlined /> : <CheckCircleOutlined />,
            },
            {
              label: '异常科室',
              value: anomalySummary?.abnormalDepts ?? '-',
              suffix: '个',
              color: (anomalySummary?.abnormalDepts ?? 0) > 0 ? '#ff7849' : '#52c41a',
              link: '/consumables/anomaly',
              icon: (anomalySummary?.abnormalDepts ?? 0) > 0 ? <WarningOutlined /> : <CheckCircleOutlined />,
            },
          ].map((item, i) => (
            <Col key={i} xs={12} sm={6}>
              <div
                style={{ cursor: 'pointer', padding: '8px 0' }}
                onClick={() => navigate(item.link)}
              >
                <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                  {item.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: item.color, lineHeight: 1 }}>
                  {item.value}
                  <span style={{ fontSize: 13, fontWeight: 400, color: token.colorTextSecondary, marginLeft: 4 }}>{item.suffix}</span>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ══════════ AI 智能洞察（三栏） ══════════ */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width:30, height:30, borderRadius:8,
            background:'linear-gradient(135deg,#6366f1,#818cf8)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RobotOutlined style={{ color:'#fff', fontSize:15 }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>AI 智能洞察</span>
          <Tag color="purple" style={{ marginLeft:4, fontSize:11, borderRadius:20 }}>实时</Tag>
        </div>

        <Row gutter={[16, 16]}>
          {/* ── 列1：智能预警 ── */}
          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', height:'100%' }}
              styles={{ body: { padding:'16px 20px' } }}
              title={<Space>
                <AlertOutlined style={{ color:'#ef4444' }} />
                <span style={{ fontSize:14 }}>智能预警摘要</span>
                {aiWarnings.length > 0 && <Badge count={aiWarnings.length} style={{ backgroundColor:'#ef4444' }} />}
              </Space>}
              extra={<span onClick={() => navigate('/ai/warnings')}
                style={{ fontSize:12, color:token.colorPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                全部 <ArrowRightOutlined style={{ fontSize:10 }} /></span>}>
              <Spin spinning={aiLoading && !aiDashData}>
                {displayWarnings.length === 0 && (!aiLoading || aiDashData) ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:token.colorTextQuaternary, fontSize:13 }}>
                    <CheckCircleOutlined style={{ fontSize:28, color:'#52c41a', marginBottom:8, display:'block' }} />
                    库存状态良好，无异常预警
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                    {(displayWarnings as any[]).slice(0, 5).map((w, i) => {
                      const sMap: Record<string, { color:string; bg:string; border:string; label:string }> = {
                        HIGH:   { color:'#ef4444', bg:'#fff5f5', border:'#fecaca', label:'高危' },
                        MEDIUM: { color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', label:'中危' },
                        LOW:    { color:'#0ea5e9', bg:'#f0f9ff', border:'#bae6fd', label:'低危' },
                      }
                      const s = sMap[w.severity] ?? sMap.LOW
                      return (
                        <div key={i} className="ai-panel-item" style={{ padding:'9px 12px', borderRadius:8, background:s.bg, border:`1px solid ${s.border}` }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <span style={{ fontSize:13, color:token.colorText, fontWeight:500 }}>{w.materialName}</span>
                              <span style={{ fontSize:12, color:token.colorTextSecondary, marginLeft:6 }}>{w.message}</span>
                            </div>
                            <Tag style={{ fontSize:11, borderRadius:12, border:'none',
                              background: s.color+'20', color:s.color, flexShrink:0 }}>{s.label}</Tag>
                          </div>
                          {w.aiReason && (
                            <div style={{ fontSize:11, color:s.color, marginTop:5, paddingLeft:16,
                              display:'flex', alignItems:'center', gap:4 }}>
                              <RobotOutlined style={{ fontSize:10 }} />
                              <span>AI：{w.aiReason}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Spin>
            </Card>
          </Col>

          {/* ── 列2：智能采购建议 ── */}
          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', height:'100%' }}
              styles={{ body: { padding:'16px 20px' } }}
              title={<Space>
                <BulbOutlined style={{ color:'#f59e0b' }} />
                <span style={{ fontSize:14 }}>智能补货建议</span>
                {safetyList.length > 0 && <Badge count={safetyList.length} style={{ backgroundColor:'#f59e0b' }} />}
              </Space>}
              extra={
                <Space size={10}>
                  <Button
                    size="small"
                    type="primary"
                    icon={<ShoppingCartOutlined />}
                    disabled={safetyList.length === 0}
                    onClick={() => setPurchaseDrawerOpen(true)}
                    style={{ fontSize: 11 }}
                  >
                    一键采购
                  </Button>
                  <span onClick={() => navigate('/ai/prediction')}
                    style={{ fontSize:12, color:token.colorPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                    需求预测 <ArrowRightOutlined style={{ fontSize:10 }} />
                  </span>
                </Space>
              }>
              <Spin spinning={aiLoading && !aiDashData}>
                {displaySuggestions.length === 0 && (!aiLoading || aiDashData) ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:token.colorTextQuaternary, fontSize:13 }}>
                    <CheckCircleOutlined style={{ fontSize:28, color:'#52c41a', marginBottom:8, display:'block' }} />
                    当前库存充足，无需补货
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                    {(displaySuggestions as any[]).slice(0, 5).map((s, i) => {
                      const priorityMap: Record<string, { color:string; label:string }> = {
                        '紧急': { color:'#ef4444', label:'紧急' },
                        '重要': { color:'#f59e0b', label:'重要' },
                        '一般': { color:'#0ea5e9', label:'一般' },
                      }
                      const pInfo = s.priority ? (priorityMap[s.priority] ?? priorityMap['一般']) : null
                      return (
                        <div key={i} className="ai-panel-item" style={{ padding:'9px 12px', borderRadius:8,
                          background:'#fffbeb', border:'1px solid #fde68a' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: s.aiReason ? 4 : 0 }}>
                            <ShoppingCartOutlined style={{ color:'#f59e0b', fontSize:13 }} />
                            <span style={{ fontSize:13, fontWeight:500, color:token.colorText, flex:1, minWidth:0,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.materialName}</span>
                            {pInfo && (
                              <Tag style={{ fontSize:10, borderRadius:10, border:'none',
                                background:pInfo.color+'20', color:pInfo.color, flexShrink:0 }}>{pInfo.label}</Tag>
                            )}
                            <Tooltip title="AI 建议补货量">
                              <span style={{ fontSize:14, fontWeight:700, color:'#f59e0b', flexShrink:0 }}>
                                +{s.suggestedPurchase}
                              </span>
                            </Tooltip>
                          </div>
                          <div style={{ fontSize:11, color:token.colorTextSecondary }}>
                            当前 {s.currentStock} · 缺口
                            <span style={{ color:'#ef4444', fontWeight:600, marginLeft:3 }}>{s.shortage}</span>
                          </div>
                          {s.aiReason && (
                            <div style={{ fontSize:11, color:'#d97706', marginTop:4,
                              display:'flex', alignItems:'center', gap:4 }}>
                              <RobotOutlined style={{ fontSize:10 }} />
                              <span>AI：{s.aiReason}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Spin>
            </Card>
          </Col>

          {/* ── 列3：AI 系统状态 ── */}
          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', height:'100%' }}
              styles={{ body: { padding:'16px 20px' } }}
              title={<Space>
                <ApiOutlined style={{ color:'#6366f1' }} />
                <span style={{ fontSize:14 }}>AI 系统状态</span>
              </Space>}>
              {/* 健康评分大图 */}
              <div style={{ textAlign:'center', marginBottom: 16 }}>
                <Progress
                  type="dashboard"
                  percent={healthScore}
                  size={100}
                  strokeColor={{ '0%': '#818cf8', '100%': scoreColor }}
                  format={p => (
                    <div>
                      <div style={{ fontSize:22, fontWeight:800, color:scoreColor, lineHeight:1 }}>{p}</div>
                      <div style={{ fontSize:10, color:token.colorTextSecondary, marginTop:2 }}>健康分</div>
                    </div>
                  )}
                />
              </div>

              {/* 各模块状态 */}
              <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
                {(aiDashData ? aiDashData.moduleStatus.map((m, idx) => {
                  const iconList = [<SafetyCertificateOutlined />, <LineChartOutlined />, <SyncOutlined />, <ClockCircleOutlined />]
                  return { icon: iconList[idx] ?? <ApiOutlined />, label: m.module, status: m.status, desc: m.desc }
                }) : [
                  { icon:<SafetyCertificateOutlined />, label:'库存风控', status: highCount === 0 ? 'ok' : 'warn',
                    desc: highCount === 0 ? '运行正常' : `${highCount} 条高危` },
                  { icon:<LineChartOutlined />, label:'需求预测', status: 'ok', desc: '模型就绪' },
                  { icon:<SyncOutlined />, label:'自动补货', status: shortageCount > 0 ? 'warn' : 'ok',
                    desc: shortageCount > 0 ? `${shortageCount} 项待处理` : '库存充足' },
                  { icon:<ClockCircleOutlined />, label:'到期监控', status: (data?.expiringAlerts ?? 0) > 0 ? 'warn' : 'ok',
                    desc: (data?.expiringAlerts ?? 0) > 0 ? `${data?.expiringAlerts} 项预警` : '无近效期' },
                ]).map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, flexShrink:0,
                      background: item.status === 'ok' ? '#f0fdf4' : item.status === 'error' ? '#fff5f5' : '#fff7ed',
                      color: item.status === 'ok' ? '#10b981' : item.status === 'error' ? '#ef4444' : '#f59e0b',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:token.colorText }}>{item.label}</div>
                      <div style={{ fontSize:11, color: item.status === 'ok' ? '#10b981' : item.status === 'error' ? '#ef4444' : '#f59e0b' }}>{item.desc}</div>
                    </div>
                    <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                      background: item.status === 'ok' ? '#10b981' : item.status === 'error' ? '#ef4444' : '#f59e0b' }} />
                  </div>
                ))}
              </div>

              {/* 快捷操作 */}
              <div style={{ marginTop: 16, display:'flex', gap: 8 }}>
                <Button size="small" icon={<RobotOutlined />} style={{ flex:1, fontSize:12 }}
                  onClick={() => navigate('/ai/prediction')}>需求预测</Button>
                <Button size="small" icon={<AlertOutlined />} danger style={{ flex:1, fontSize:12 }}
                  onClick={() => navigate('/ai/warnings')}>预警中心</Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* ── AI 补货快速采购 Drawer ── */}
      <PurchaseDrawer
        open={purchaseDrawerOpen}
        onClose={() => setPurchaseDrawerOpen(false)}
        items={safetyList}
        onSuccess={() => message.success('采购申请已创建，请前往采购管理查看')}
      />

      {/* ── AI 对话助手（右下角悬浮） ── */}
      <AiChat onOpenPurchase={() => setPurchaseDrawerOpen(true)} />
    </div>
  )
}
