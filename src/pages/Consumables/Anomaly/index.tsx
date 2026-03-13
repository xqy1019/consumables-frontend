import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Statistic, Table, Tag, Select, DatePicker, Button,
  Space, Alert, Progress, Typography, theme,
} from 'antd'
import {
  WarningOutlined, RiseOutlined, CheckCircleOutlined, FireOutlined, DownloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { smallConsumablesApi, getAnomalyExportUrl, type AnomalyVO, type AnomalySummaryVO } from '@/api/smallConsumables'
import { departmentsApi } from '@/api/system'
import type { Department } from '@/types'

const { Text } = Typography

const levelConfig = {
  DANGER: { color: 'red', text: '严重超标', icon: <FireOutlined /> },
  WARNING: { color: 'orange', text: '偏高预警', icon: <WarningOutlined /> },
  NORMAL: { color: 'green', text: '正常', icon: <CheckCircleOutlined /> },
}

export default function AnomalyPage() {
  const [summary, setSummary] = useState<AnomalySummaryVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [yearMonth, setYearMonth] = useState<string>(dayjs().format('YYYY-MM'))
  const [deptFilter, setDeptFilter] = useState<number>()
  const [departments, setDepartments] = useState<Department[]>([])
  const { token } = theme.useToken()

  const load = async () => {
    setLoading(true)
    try {
      const res = await smallConsumablesApi.getAnomalySummary(yearMonth)
      setSummary(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    departmentsApi.getAll().then(setDepartments).catch(() => {})
  }, [])

  useEffect(() => { load() }, [yearMonth])

  const filteredAnomalies = summary?.anomalies.filter(a =>
    deptFilter ? a.deptId === deptFilter : true
  ) ?? []

  // ── 图表数据 ──
  const top10 = [...filteredAnomalies]
    .sort((a, b) => b.deviationRate - a.deviationRate)
    .slice(0, 10)

  const barOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 8,
      formatter: (params: any[]) => {
        const idx = top10.length - 1 - (params[0]?.dataIndex ?? 0)
        const d = top10[idx]
        if (!d) return ''
        return `<b>${d.deptName} · ${d.materialName}</b><br/>
          偏差率：<span style="color:${d.level === 'DANGER' ? '#ff4d4f' : '#faad14'};font-weight:700">+${d.deviationRate}%</span>
          ${d.overLimit ? '<br/><span style="color:#ff4d4f">⚠ 已超月度限额</span>' : ''}
          <br/>本月：${d.thisMonthQty} ${d.unit}，基准：${d.baselineQty} ${d.unit}`
      },
    },
    grid: { left: 8, right: 60, top: 12, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%', fontSize: 11, color: token.colorTextSecondary },
      splitLine: { lineStyle: { type: 'dashed', color: token.colorBorderSecondary } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: top10.map(d => `${d.deptName}·${d.materialName}`).reverse(),
      axisLabel: { fontSize: 11, color: token.colorTextSecondary, overflow: 'truncate', width: 160 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: top10.map(d => ({
        value: d.deviationRate,
        itemStyle: {
          color: d.level === 'DANGER'
            ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ff7875' }, { offset: 1, color: '#ff4d4f' }] }
            : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ffd666' }, { offset: 1, color: '#faad14' }] },
          borderRadius: [0, 4, 4, 0],
        },
      })).reverse(),
      label: { show: true, position: 'right', formatter: '+{c}%', fontSize: 11, color: token.colorTextSecondary },
      barMaxWidth: 20,
      emphasis: { focus: 'self' },
    }],
  }

  // 科室异常分布（堆叠横向条形图）
  const deptMap = new Map<string, { danger: number; warning: number }>()
  filteredAnomalies.forEach(a => {
    if (!deptMap.has(a.deptName)) deptMap.set(a.deptName, { danger: 0, warning: 0 })
    const d = deptMap.get(a.deptName)!
    if (a.level === 'DANGER') d.danger++; else d.warning++
  })
  const deptChartData = Array.from(deptMap.entries())
    .map(([name, v]) => ({ name, ...v, total: v.danger + v.warning }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const deptStackOption = {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e8e8e8', borderWidth: 1, borderRadius: 8,
      formatter: (params: any[]) => {
        const d = deptChartData[params[0]?.dataIndex ?? 0]
        if (!d) return ''
        return `<b>${d.name}</b><br/>
          <span style="color:#ff4d4f">严重超标：${d.danger} 项</span><br/>
          <span style="color:#faad14">偏高预警：${d.warning} 项</span>`
      },
    },
    legend: {
      data: ['严重超标', '偏高预警'], bottom: 0,
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 16,
      textStyle: { fontSize: 11, color: token.colorTextSecondary },
    },
    grid: { left: 8, right: 16, top: 12, bottom: 36, containLabel: true },
    xAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
      splitLine: { lineStyle: { type: 'dashed', color: token.colorBorderSecondary } },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: deptChartData.map(d => d.name),
      axisLabel: { fontSize: 11, color: token.colorTextSecondary },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: '严重超标', type: 'bar', stack: 'total',
        data: deptChartData.map(d => d.danger),
        itemStyle: { color: '#ff4d4f', borderRadius: [0, 0, 0, 0] },
        barMaxWidth: 20,
      },
      {
        name: '偏高预警', type: 'bar', stack: 'total',
        data: deptChartData.map(d => d.warning),
        itemStyle: { color: '#faad14' },
        barMaxWidth: 20,
        label: {
          show: true, position: 'right',
          formatter: (p: any) => {
            const d = deptChartData[p.dataIndex]
            return d ? `${d.total}项` : ''
          },
          fontSize: 11, color: token.colorTextSecondary,
        },
      },
    ],
  }

  const columns: ColumnsType<AnomalyVO> = [
    {
      title: '异常等级', dataIndex: 'level', width: 110,
      filters: [
        { text: '严重超标', value: 'DANGER' },
        { text: '偏高预警', value: 'WARNING' },
      ],
      onFilter: (v, r) => r.level === v,
      render: v => {
        const cfg = levelConfig[v as keyof typeof levelConfig]
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.text}</Tag>
      },
    },
    { title: '科室', dataIndex: 'deptName', width: 100 },
    { title: '耗材', dataIndex: 'materialName', width: 160 },
    { title: '单位', dataIndex: 'unit', width: 60 },
    {
      title: '本月用量', dataIndex: 'thisMonthQty', width: 100,
      render: (v, r) => <Text strong style={{ color: '#ff4d4f' }}>{v} {r.unit}</Text>,
    },
    {
      title: '基准用量（前3月均值）', dataIndex: 'baselineQty', width: 160,
      render: (v, r) => `${v} ${r.unit}`,
    },
    {
      title: '偏差率', dataIndex: 'deviationRate', width: 140,
      sorter: (a, b) => a.deviationRate - b.deviationRate,
      defaultSortOrder: 'descend',
      render: (v, r) => {
        const color = v > 50 ? '#ff4d4f' : '#faad14'
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ color, fontWeight: 'bold' }}>
              <RiseOutlined /> +{v}%
            </Text>
            <Progress
              percent={Math.min(v, 150)}
              showInfo={false}
              strokeColor={color}
              size="small"
              style={{ width: 100 }}
            />
          </Space>
        )
      },
    },
    {
      title: '月度限额', width: 120,
      render: (_, r) => {
        if (!r.monthlyLimit) return <Tag color="default">未设限额</Tag>
        return (
          <Space direction="vertical" size={2}>
            <span>{r.monthlyLimit} {r.unit}</span>
            {r.overLimit && <Tag color="red">已超限 +{(r.thisMonthQty - r.monthlyLimit).toFixed(1)}</Tag>}
          </Space>
        )
      },
    },
    {
      title: '处理建议', width: 200,
      render: (_, r) => {
        if (r.overLimit) return (
          <Text type="danger">
            超出限额，请核查{r.deptName}领用原因，必要时与护士长确认
          </Text>
        )
        if (r.deviationRate > 50) return (
          <Text type="warning">
            消耗量远超正常水平，建议本月重点盘查核实
          </Text>
        )
        return (
          <Text type="warning">
            消耗偏高，关注是否存在备药浪费或记录遗漏
          </Text>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 说明 */}
      <Alert
        type="info" showIcon closable
        message="消耗异常分析说明"
        description="系统自动对比各科室本月领用量与前3个月均值，偏差 >20% 标记预警，>50% 标记严重超标。同时检查是否超出月度限额配置。"
        style={{ marginBottom: 16 }}
      />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="分析科室数" value={summary?.totalDepts ?? 0} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="异常科室数"
              value={summary?.abnormalDepts ?? 0} suffix="个"
              valueStyle={{ color: (summary?.abnormalDepts ?? 0) > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={(summary?.abnormalDepts ?? 0) > 0 ? <WarningOutlined /> : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="严重超标项"
              value={summary?.dangerCount ?? 0} suffix="项"
              valueStyle={{ color: (summary?.dangerCount ?? 0) > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={(summary?.dangerCount ?? 0) > 0 ? <FireOutlined /> : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="偏高预警项"
              value={summary?.warningCount ?? 0} suffix="项"
              valueStyle={{ color: (summary?.warningCount ?? 0) > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区 —— 有异常时才渲染 */}
      {filteredAnomalies.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={16}>
            <Card
              title={<Space><RiseOutlined style={{ color: '#ff4d4f' }} /><span>消耗偏差排名 TOP {Math.min(top10.length, 10)}</span></Space>}
              size="small"
              bordered={false}
              style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <ReactECharts option={barOption} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<Space><FireOutlined style={{ color: '#faad14' }} /><span>各科室异常分布</span></Space>}
              size="small"
              bordered={false}
              style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}
            >
              {deptChartData.length > 0
                ? <ReactECharts option={deptStackOption} style={{ height: 300 }} />
                : <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextQuaternary }}>暂无数据</div>
              }
            </Card>
          </Col>
        </Row>
      )}

      {/* 异常明细表 */}
      <Card
        title={
          <Space>
            <span>消耗异常明细</span>
            <Tag color={filteredAnomalies.length > 0 ? 'red' : 'green'}>
              {filteredAnomalies.length > 0 ? `${filteredAnomalies.length} 条异常` : '全部正常'}
            </Tag>
          </Space>
        }
        bordered={false}
        style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        extra={
          <Space>
            <DatePicker
              picker="month"
              value={dayjs(yearMonth)}
              onChange={v => v && setYearMonth(v.format('YYYY-MM'))}
              allowClear={false}
            />
            <Select
              placeholder="筛选科室"
              allowClear
              style={{ width: 140 }}
              options={departments.map(d => ({ value: d.id, label: d.deptName }))}
              onChange={setDeptFilter}
            />
            <Button icon={<DownloadOutlined />} onClick={() => window.open(getAnomalyExportUrl(yearMonth))}>
              导出
            </Button>
          </Space>
        }
      >
        {filteredAnomalies.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#52c41a' }}>
            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 8 }} />
            <div>本月暂无消耗异常，各科室用量正常</div>
          </div>
        ) : (
          <Table
            rowKey={r => `${r.deptId}_${r.materialId}`}
            columns={columns}
            dataSource={filteredAnomalies}
            loading={loading}
            size="small"
            rowClassName={r => r.level === 'DANGER' ? 'ant-table-row-danger' : ''}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        )}
      </Card>
    </div>
  )
}
