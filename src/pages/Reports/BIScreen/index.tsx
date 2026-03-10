import React, { useState, useEffect, useRef } from 'react'
import {
  ReloadOutlined, RobotOutlined, WarningOutlined,
  DatabaseOutlined, ShoppingCartOutlined,
  FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import { aiApi } from '@/api/ai'
import type { BiDashboard, AiDashboardAnalysis } from '@/types'

/* ─────────────────── CSS 注入 ─────────────────── */
const BI_CSS = `
@keyframes bi-scan {
  0%   { top: -15%; opacity: 0; }
  8%   { opacity: 1; }
  92%  { opacity: 0.7; }
  100% { top: 115%; opacity: 0; }
}
@keyframes bi-live {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px #00e887, 0 0 16px #00e88755; }
  50%       { opacity: 0.35; box-shadow: 0 0 2px #00e887; }
}
@keyframes bi-pulse-red {
  0%, 100% { box-shadow: 0 0 10px rgba(255,77,107,0.08); border-color: rgba(255,77,107,0.18); }
  50%       { box-shadow: 0 0 30px rgba(255,77,107,0.5), inset 0 0 12px rgba(255,77,107,0.06); border-color: rgba(255,77,107,0.6); }
}
@keyframes bi-pulse-orange {
  0%, 100% { box-shadow: 0 0 10px rgba(255,140,66,0.08); border-color: rgba(255,140,66,0.18); }
  50%       { box-shadow: 0 0 30px rgba(255,140,66,0.5), inset 0 0 12px rgba(255,140,66,0.06); border-color: rgba(255,140,66,0.6); }
}
@keyframes bi-num-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bi-bar-in {
  from { width: 0 !important; }
}
.bi-pulse-red    { animation: bi-pulse-red    2.8s ease-in-out infinite; }
.bi-pulse-orange { animation: bi-pulse-orange 2.8s ease-in-out infinite; }
.bi-num-in       { animation: bi-num-in 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.bi-bar-in       { animation: bi-bar-in 1.4s cubic-bezier(0.25,0.46,0.45,0.94) both; }
@keyframes bi-ticker-in {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}
.bi-ticker-in { animation: bi-ticker-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes bi-module-in {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
`

/* ─────────────────── 颜色系统 ─────────────────── */
const C = {
  bg:     '#0e1b3d',                    // 深海军蓝，替代近黑色
  card:   'rgba(16,28,64,0.88)',        // 更亮的卡片底色
  border: 'rgba(80,160,255,0.14)',
  blue:   '#40b8ff',                    // 降低饱和度，更耐看
  green:  '#2ddf8a',
  orange: '#ff9a55',
  red:    '#ff6080',
  purple: '#c084fc',
  text:   '#e2f0ff',                    // 更亮的正文色
  dim:    'rgba(180,215,255,0.58)',      // 更亮的辅助色
  grid:   'rgba(255,255,255,0.07)',
}

const PIE_COLORS = ['#00d4ff','#00e887','#b47aff','#ff8c42','#ff4d6b','#ffd166','#40a9ff','#ff85c2']

const TOOLTIP_BASE = {
  backgroundColor: 'rgba(10,20,52,0.96)',
  borderColor: 'rgba(80,160,255,0.3)',
  textStyle: { color: C.text, fontSize: 12 },
  extraCssText: 'backdrop-filter:blur(12px);border-radius:8px;',
}
const DARK_XAXIS = {
  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
  axisTick: { show: false },
  axisLabel: { color: '#7aa0c8', fontSize: 10 },   // 更亮
  splitLine: { show: false },
}
const DARK_YAXIS = {
  splitLine: { lineStyle: { color: C.grid } },
  axisLabel: { color: '#7aa0c8', fontSize: 10 },    // 更亮
  axisLine: { show: false },
  axisTick: { show: false },
}

/* ─────────────────── GlowCard ─────────────────── */
interface GlowCardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  glow?: string
  pulseClass?: string
  title?: string
  titleRight?: React.ReactNode
}
function GlowCard({ children, style, glow = C.blue, pulseClass, title, titleRight }: GlowCardProps) {
  return (
    <div
      className={pulseClass}
      style={{
        background: C.card,
        border: `1px solid ${glow}22`,
        borderRadius: 14,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 0 1px ${glow}30, 0 8px 32px rgba(0,0,0,0.5)`,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 顶部发光边 */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: `linear-gradient(90deg, transparent, ${glow}60, transparent)`,
        pointerEvents: 'none',
      }} />
      {title && (
        <div style={{
          padding: '12px 16px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: C.dim, fontSize: 12, letterSpacing: 0.6 }}>{title}</span>
          {titleRight}
        </div>
      )}
      {children}
    </div>
  )
}

/* ─────────────────── 主组件 ─────────────────── */
export default function BIScreenPage() {
  const trendRef    = useRef<HTMLDivElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const purchaseRef = useRef<HTMLDivElement>(null)
  const gaugeRef    = useRef<HTMLDivElement>(null)
  const trendChart    = useRef<echarts.ECharts | null>(null)
  const categoryChart = useRef<echarts.ECharts | null>(null)
  const purchaseChart = useRef<echarts.ECharts | null>(null)
  const gaugeChart    = useRef<echarts.ECharts | null>(null)

  const [data, setData]               = useState<BiDashboard | null>(null)
  const [aiData, setAiData]           = useState<AiDashboardAnalysis | null>(null)
  const [loading, setLoading]         = useState(false)
  const [clock, setClock]             = useState('')
  const [barsReady, setBarsReady]     = useState(false)
  const [fullscreen, setFullscreen]   = useState(false)
  const [tickerIdx, setTickerIdx]     = useState(0)

  /* CSS 注入 */
  useEffect(() => {
    if (document.getElementById('bi-screen-css')) return
    const el = document.createElement('style')
    el.id = 'bi-screen-css'
    el.textContent = BI_CSS
    document.head.appendChild(el)
  }, [])

  /* 实时时钟 */
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  /* 数据加载：BI 数据 + AI 分析并行请求 */
  const fetchData = async () => {
    setLoading(true)
    setBarsReady(false)
    try {
      const [biRes, aiRes] = await Promise.allSettled([
        reportsApi.getBiDashboard(),
        aiApi.getDashboardAnalysis(),
      ])
      if (biRes.status === 'fulfilled') {
        setData(biRes.value)
        setTimeout(() => setBarsReady(true), 200)
      }
      if (aiRes.status === 'fulfilled' && aiRes.value) {
        setAiData(aiRes.value)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  /* AI 洞察播报条：每 6 秒切换一条 */
  const tickerMsgs = React.useMemo(() => {
    if (!aiData) return []
    const msgs: { text: string; color: string }[] = []
    if (aiData.insight) {
      // 按句号分割，每句作为一条播报
      aiData.insight.split(/[。！？]/).filter(s => s.trim().length > 5).slice(0, 4)
        .forEach(s => msgs.push({ text: s.trim(), color: C.blue }))
    }
    aiData.warnings.slice(0, 3).forEach(w =>
      msgs.push({ text: `⚠ ${w.materialName}：${w.message}`, color: w.severity === 'HIGH' ? C.red : C.orange })
    )
    aiData.suggestions.slice(0, 3).forEach(s =>
      msgs.push({ text: `💡 ${s.materialName}：建议补充 ${s.suggestedPurchase} 件，${s.aiReason}`, color: C.green })
    )
    return msgs
  }, [aiData])

  useEffect(() => {
    if (tickerMsgs.length <= 1) return
    const id = setInterval(() => setTickerIdx(i => (i + 1) % tickerMsgs.length), 6000)
    return () => clearInterval(id)
  }, [tickerMsgs.length])

  /* ECharts 初始化与更新 */
  useEffect(() => {
    if (!data) return

    const init = (ref: React.RefObject<HTMLDivElement>, inst: React.MutableRefObject<echarts.ECharts | null>) => {
      if (ref.current && !inst.current) inst.current = echarts.init(ref.current)
      return inst.current
    }

    /* 入出库趋势 */
    init(trendRef, trendChart)?.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', ...TOOLTIP_BASE },
      legend: { data: ['入库','出库'], top: 6, right: 4, textStyle: { color: C.dim, fontSize: 11 }, itemWidth: 14, itemHeight: 5 },
      grid: { left: 38, right: 8, top: 36, bottom: 36 },
      xAxis: { type: 'category', data: data.consumptionTrend.map(d => d.date), ...DARK_XAXIS, axisLabel: { ...DARK_XAXIS.axisLabel, rotate: 30 } },
      yAxis: { type: 'value', ...DARK_YAXIS },
      series: [
        {
          name: '入库', type: 'bar', barGap: '8%', barMaxWidth: 20,
          data: data.consumptionTrend.map(d => d.inbound),
          itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:C.green},{offset:1,color:C.green+'15'}]) },
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor: C.green } },
        },
        {
          name: '出库', type: 'bar', barMaxWidth: 20,
          data: data.consumptionTrend.map(d => d.outbound),
          itemStyle: { borderRadius: [4,4,0,0], color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:C.blue},{offset:1,color:C.blue+'15'}]) },
          emphasis: { itemStyle: { shadowBlur: 12, shadowColor: C.blue } },
        },
      ],
    })

    /* 分类饼图 */
    init(categoryRef, categoryChart)?.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)', ...TOOLTIP_BASE },
      legend: {
        orient: 'vertical', right: 2, top: 'middle',
        textStyle: { color: C.dim, fontSize: 10 }, itemWidth: 10, itemHeight: 10, type: 'scroll',
        pageTextStyle: { color: C.dim },
      },
      series: [{
        type: 'pie', radius: ['44%','70%'], center: ['38%','52%'],
        avoidLabelOverlap: true, label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold', color: C.text },
          itemStyle: { shadowBlur: 28, shadowColor: 'rgba(0,212,255,0.7)' },
          scale: true, scaleSize: 6,
        },
        data: data.categoryDistribution.map((d, i) => ({
          name: d.name, value: d.value,
          itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length], shadowBlur: 6, shadowColor: PIE_COLORS[i%PIE_COLORS.length]+'44' },
        })),
      }],
    })

    /* 采购趋势 */
    init(purchaseRef, purchaseChart)?.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', ...TOOLTIP_BASE, formatter: (p: any) => `${p[0].name}<br/>采购成本：¥${Number(p[0].value).toLocaleString()}` },
      grid: { left: 56, right: 10, top: 14, bottom: 36 },
      xAxis: { type: 'category', data: data.purchaseTrend.map(d => d.month), ...DARK_XAXIS, axisLabel: { ...DARK_XAXIS.axisLabel, rotate: 30 } },
      yAxis: { type: 'value', ...DARK_YAXIS, axisLabel: { ...DARK_YAXIS.axisLabel, formatter: (v:number) => `¥${(v/1000).toFixed(0)}k` } },
      series: [{
        type: 'line', smooth: 0.6,
        data: data.purchaseTrend.map(d => d.purchaseCost),
        symbol: 'circle', symbolSize: 6,
        lineStyle: { color: C.purple, width: 2, shadowBlur: 14, shadowColor: C.purple+'88' },
        itemStyle: { color: C.purple, borderColor: '#05091a', borderWidth: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:C.purple+'55'},{offset:1,color:C.purple+'04'}]) },
      }],
    })

    /* AI 准确率仪表盘 */
    const accuracy = parseFloat(String(data.predictionAccuracy || 0))
    init(gaugeRef, gaugeChart)?.setOption({
      backgroundColor: 'transparent',
      series: [{
        type: 'gauge',
        startAngle: 215, endAngle: -35,
        min: 0, max: 100,
        radius: '90%', center: ['50%', '60%'],
        progress: {
          show: true, width: 11, roundCap: true,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:C.blue},{offset:1,color:C.green}]),
            shadowBlur: 20, shadowColor: C.blue+'99',
          },
        },
        axisLine: { lineStyle: { width: 11, color: [[1,'rgba(255,255,255,0.05)']] } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        pointer: { show: false }, title: { show: false },
        detail: {
          valueAnimation: true, fontSize: 28, fontWeight: 'bold',
          color: C.blue, formatter: '{value}%',
          offsetCenter: [0, '22%'],
        },
        data: [{ value: accuracy }],
      }],
    })

    const onResize = () => {
      trendChart.current?.resize()
      categoryChart.current?.resize()
      purchaseChart.current?.resize()
      gaugeChart.current?.resize()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [data])

  useEffect(() => {
    return () => {
      trendChart.current?.dispose()
      categoryChart.current?.dispose()
      purchaseChart.current?.dispose()
      gaugeChart.current?.dispose()
    }
  }, [])

  /* KPI 配置 */
  const kpis = [
    { label: '库存总价值',  value: data ? `¥${data.totalInventoryValue.toLocaleString()}` : '--', color: C.blue,   icon: <DatabaseOutlined /> },
    { label: '库存品种数',  value: data ? `${data.totalInventoryItems} 种`               : '--', color: C.green,  icon: <DatabaseOutlined /> },
    { label: '即将过期',    value: data ? `${data.expiringCount} 批`                     : '--', color: C.orange, icon: <WarningOutlined />, pulse: 'bi-pulse-orange' },
    { label: '库存不足',    value: data ? `${data.lowStockCount} 种`                     : '--', color: C.red,    icon: <WarningOutlined />, pulse: 'bi-pulse-red' },
    { label: '待执行采购',  value: data ? `${data.pendingPurchase} 单`                   : '--', color: C.purple, icon: <ShoppingCartOutlined /> },
  ]

  const maxDeptQty = Math.max(...(data?.deptRanking?.map(d => d.totalQuantity) ?? [1]), 1)
  const rankAccentColors = [C.red, C.orange, C.blue]

  /* AI 健康评分颜色 */
  const healthScore = aiData?.healthScore ?? 0
  const healthColor = healthScore >= 80 ? C.green : healthScore >= 60 ? C.blue : healthScore >= 40 ? C.orange : C.red

  /* 模块状态颜色 */
  const moduleColor = (s: string) => s === 'ok' ? C.green : s === 'warn' ? C.orange : C.red

  /* 严重度颜色 */
  const severityColor = (s: string) => s === 'HIGH' ? C.red : s === 'MEDIUM' ? C.orange : C.blue

  return (
    <div style={{
      background: `
        radial-gradient(ellipse at 10% 50%, rgba(30,90,220,0.22) 0%, transparent 50%),
        radial-gradient(ellipse at 90% 10%, rgba(120,50,240,0.16) 0%, transparent 45%),
        radial-gradient(ellipse at 60% 90%, rgba(0,140,255,0.10) 0%, transparent 40%),
        ${C.bg}
      `,
      // 全屏模式：fixed 覆盖整个视口（含 header/breadcrumb）
      // 正常模式：填满内容区（layout 已将 padding 设为 0）
      ...(fullscreen
        ? { position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto' }
        : { position: 'relative', minHeight: '100%' }
      ),
      padding: '18px 22px 26px',
      overflow: fullscreen ? 'auto' : 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: C.text,
      boxSizing: 'border-box',
    }}>

      {/* 顶部渐入遮罩：让从白色面包屑到深色大屏的过渡更自然 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 40,
        background: 'linear-gradient(180deg, rgba(14,27,61,0.6) 0%, transparent 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* 扫描线 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 120,
          background: 'linear-gradient(180deg, transparent, rgba(64,184,255,0.02) 50%, transparent)',
          animation: 'bi-scan 10s linear infinite',
        }} />
      </div>

      {/* 所有内容层 */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18, paddingBottom: 14,
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}>
          <div>
            <div style={{
              fontSize: 22, fontWeight: 800, letterSpacing: 1.5,
              background: `linear-gradient(120deg, ${C.blue} 0%, ${C.green} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              textShadow: 'none',
            }}>
              BI 智能大屏
            </div>
            <div style={{ color: C.dim, fontSize: 11, marginTop: 3, letterSpacing: 0.8 }}>
              医疗耗材实时数据监控平台
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {/* LIVE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: C.green,
                animation: 'bi-live 2s ease-in-out infinite',
              }} />
              <span style={{ color: C.green, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>LIVE</span>
            </div>
            {/* 时钟 */}
            <div style={{
              color: C.blue, fontSize: 16, fontWeight: 700,
              letterSpacing: 2, fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 12px ${C.blue}88`,
            }}>
              {clock}
            </div>
            {/* 刷新 */}
            <button
              onClick={fetchData}
              style={{
                cursor: 'pointer', color: C.blue, background: 'transparent',
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '5px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = C.blue)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <ReloadOutlined spin={loading} />
              <span style={{ fontSize: 12 }}>刷新</span>
            </button>
            {/* 全屏 */}
            <button
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? '退出全屏' : '全屏展示'}
              style={{
                cursor: 'pointer', color: C.dim, background: 'transparent',
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '5px 10px', fontSize: 15, display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.blue }}
              onMouseLeave={e => { e.currentTarget.style.color = C.dim;  e.currentTarget.style.borderColor = C.border }}
            >
              {fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
          </div>
        </div>

        {/* ── KPI 卡片 ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          {kpis.map((kpi, i) => (
            <GlowCard key={i} glow={kpi.color} pulseClass={kpi.pulse} style={{ flex: 1, padding: '14px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.dim, fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: kpi.color, fontSize: 15 }}>{kpi.icon}</span>
                {kpi.label}
              </div>
              <div
                className={data ? 'bi-num-in' : ''}
                style={{
                  color: kpi.color, fontSize: 22, fontWeight: 800,
                  letterSpacing: -0.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  textShadow: `0 0 16px ${kpi.color}66`,
                }}
              >
                {kpi.value}
              </div>
            </GlowCard>
          ))}
        </div>

        {/* ── Claude AI 洞察播报条 ── */}
        {tickerMsgs.length > 0 && (
          <div style={{
            marginBottom: 12, padding: '9px 16px',
            background: 'rgba(16,28,64,0.75)',
            border: '1px solid rgba(64,184,255,0.15)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 14,
            overflow: 'hidden',
          }}>
            {/* 标签 */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '2px 10px', borderRadius: 20,
              background: 'rgba(64,184,255,0.12)', border: '1px solid rgba(64,184,255,0.25)' }}>
              <RobotOutlined style={{ color: C.blue, fontSize: 12 }} />
              <span style={{ color: C.blue, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>Claude AI</span>
            </div>
            {/* 播报文字 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                key={tickerIdx}
                className="bi-ticker-in"
                style={{ color: tickerMsgs[tickerIdx]?.color ?? C.text, fontSize: 13,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {tickerMsgs[tickerIdx]?.text}
              </div>
            </div>
            {/* 进度点 */}
            <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
              {tickerMsgs.map((_, i) => (
                <div key={i} style={{
                  width: i === tickerIdx ? 16 : 5, height: 5, borderRadius: 3,
                  background: i === tickerIdx ? C.blue : 'rgba(255,255,255,0.15)',
                  transition: 'width 0.3s ease',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ── 图表区（3列）── */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* AI 综合评估面板 */}
          <GlowCard glow={C.blue} style={{ padding: '12px 10px 10px', display: 'flex', flexDirection: 'column' }}>
            {/* 标题 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              color: C.dim, fontSize: 11, marginBottom: 4 }}>
              <RobotOutlined style={{ color: C.blue }} />
              <span>AI 综合评估</span>
              <span style={{ color: C.dim, opacity: 0.5 }}>· Claude</span>
            </div>

            {/* 预测准确率仪表（缩小高度给下方内容留空间）*/}
            <div ref={gaugeRef} style={{ height: 155 }} />

            {/* 健康评分 badge */}
            {aiData && (
              <div style={{ textAlign: 'center', marginTop: -4, marginBottom: 10 }}>
                <span style={{
                  padding: '3px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: healthColor + '20', border: `1px solid ${healthColor}60`, color: healthColor,
                  textShadow: `0 0 8px ${healthColor}66`,
                }}>
                  健康评分 {aiData.healthScore} · {aiData.healthLabel}
                </span>
              </div>
            )}

            {/* 模块状态网格 */}
            {aiData?.moduleStatus && aiData.moduleStatus.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {aiData.moduleStatus.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(255,255,255,0.04)', borderRadius: 6,
                    padding: '5px 7px', fontSize: 11,
                    border: `1px solid ${moduleColor(m.status)}22`,
                    animation: 'bi-module-in 0.4s ease both',
                    animationDelay: `${i * 0.06}s`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: moduleColor(m.status),
                      boxShadow: `0 0 6px ${moduleColor(m.status)}`,
                    }} />
                    <span style={{ color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.module}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!aiData && (
              <div style={{ textAlign: 'center', color: C.dim, fontSize: 11, paddingTop: 6 }}>
                Claude AI · 基于历史数据
              </div>
            )}
          </GlowCard>

          {/* 入出库趋势 */}
          <GlowCard glow={C.green} title="近 7 天出入库趋势" style={{ padding: '0 10px 10px' }}>
            <div ref={trendRef} style={{ height: 246 }} />
          </GlowCard>

          {/* 耗材分类分布 */}
          <GlowCard glow={C.purple} title="耗材分类分布" style={{ padding: '0 10px 10px' }}>
            <div ref={categoryRef} style={{ height: 246 }} />
          </GlowCard>
        </div>

        {/* ── 底部行（3列：排名 + AI建议 + 采购趋势）── */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr 4fr', gap: 12 }}>

          {/* 科室消耗排名 */}
          <GlowCard glow={C.orange} style={{ padding: '14px 18px 16px' }}>
            <div style={{ color: C.dim, fontSize: 12, marginBottom: 14, letterSpacing: 0.6 }}>
              科室消耗排名（近 30 天 TOP8）
            </div>
            {(data?.deptRanking?.slice(0, 8) ?? Array(5).fill(null)).map((dept, idx) => {
              const rColor = idx < 3 ? rankAccentColors[idx] : C.dim
              const pct    = dept ? (dept.totalQuantity / maxDeptQty) * 100 : 30
              const name   = dept ? (dept.deptName || `科室${dept.deptId}`) : '加载中...'
              const qty    = dept?.totalQuantity ?? 0
              return (
                <div key={dept?.deptId ?? idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: idx < 7 ? 11 : 0 }}>
                  {/* 排名徽章 */}
                  <div style={{
                    width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                    background: idx < 3 ? rColor + '1a' : 'transparent',
                    border: `1px solid ${rColor}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: rColor,
                  }}>
                    {idx + 1}
                  </div>
                  {/* 科室名 */}
                  <div style={{ width: 80, color: C.text, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {name}
                  </div>
                  {/* 进度条 */}
                  <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      className={barsReady ? 'bi-bar-in' : ''}
                      style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: `linear-gradient(90deg, ${rColor}, ${rColor}50)`,
                        boxShadow: `0 0 8px ${rColor}55`,
                        transition: 'width 1.4s cubic-bezier(0.25,0.46,0.45,0.94)',
                      }}
                    />
                  </div>
                  {/* 数值 */}
                  <div style={{ width: 46, textAlign: 'right', color: rColor, fontSize: 12, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {qty}
                  </div>
                </div>
              )
            })}
          </GlowCard>

          {/* AI 智能建议面板 */}
          <GlowCard glow={C.purple} style={{ padding: '14px 14px 16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <RobotOutlined style={{ color: C.purple, fontSize: 13 }} />
              <span style={{ color: C.dim, fontSize: 12, letterSpacing: 0.5 }}>Claude AI 智能建议</span>
            </div>

            {/* AI 预警列表 */}
            {aiData?.warnings && aiData.warnings.length > 0 ? (
              <>
                <div style={{ color: C.dim, fontSize: 11, marginBottom: 8, letterSpacing: 0.5 }}>⚡ 风险预警</div>
                {aiData.warnings.slice(0, 3).map((w, i) => (
                  <div key={i} style={{
                    marginBottom: 8, padding: '8px 10px', borderRadius: 8,
                    background: severityColor(w.severity) + '10',
                    border: `1px solid ${severityColor(w.severity)}28`,
                    fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: C.text, fontWeight: 600 }}>{w.materialName}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 10,
                        background: severityColor(w.severity) + '25',
                        color: severityColor(w.severity), fontWeight: 700,
                      }}>
                        {w.severity === 'HIGH' ? '高危' : w.severity === 'MEDIUM' ? '中危' : '低危'}
                      </span>
                    </div>
                    <div style={{ color: C.dim, fontSize: 11, lineHeight: 1.5 }}>{w.aiReason}</div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ color: C.dim, fontSize: 12, padding: '8px 0' }}>暂无风险预警</div>
            )}

            {/* AI 补货建议 */}
            {aiData?.suggestions && aiData.suggestions.length > 0 && (
              <>
                <div style={{ color: C.dim, fontSize: 11, marginTop: 12, marginBottom: 8, letterSpacing: 0.5 }}>💡 补货建议</div>
                {aiData.suggestions.slice(0, 3).map((s, i) => (
                  <div key={i} style={{
                    marginBottom: 7, padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(192,132,252,0.08)',
                    border: '1px solid rgba(192,132,252,0.18)',
                    fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ color: C.text }}>{s.materialName}</span>
                      <span style={{ color: C.green, fontWeight: 700 }}>+{s.suggestedPurchase}</span>
                    </div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{s.aiReason}</div>
                  </div>
                ))}
              </>
            )}

            {!aiData && (
              <div style={{ color: C.dim, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                AI 分析加载中...
              </div>
            )}
          </GlowCard>

          {/* 采购成本趋势 */}
          <GlowCard glow={C.purple} title="近 6 月采购成本趋势" style={{ padding: '0 10px 10px' }}>
            <div ref={purchaseRef} style={{ height: 258 }} />
          </GlowCard>

        </div>
      </div>
    </div>
  )
}
