import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Statistic, Table, Tag, DatePicker, Space, Spin, Button,
  Typography, Divider, Alert, Empty,
} from 'antd'
import {
  BarChartOutlined, WarningOutlined, CheckCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, DatabaseOutlined, DownloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { smallConsumablesApi, exportMonthlyReport, type AnomalySummaryVO, type ParSuggestionVO, type AnomalyTrendVO } from '@/api/smallConsumables'
import { deptInventoryApi, type DeptInventorySummaryVO, type DeptConsumptionRankVO } from '@/api/deptInventory'
import { anomalyWorkOrderApi, type WorkOrderStatsVO } from '@/api/anomalyWorkOrder'

const { Title, Text, Paragraph } = Typography

export default function MonthlyReportPage() {
  const [yearMonth, setYearMonth] = useState(dayjs().format('YYYY-MM'))
  const [loading, setLoading] = useState(false)
  const [anomaly, setAnomaly] = useState<AnomalySummaryVO | null>(null)
  const [summaries, setSummaries] = useState<DeptInventorySummaryVO[]>([])
  const [ranking, setRanking] = useState<DeptConsumptionRankVO[]>([])
  const [workOrderStats, setWorkOrderStats] = useState<WorkOrderStatsVO | null>(null)
  const [suggestions, setSuggestions] = useState<ParSuggestionVO[]>([])
  const [anomalyTrend, setAnomalyTrend] = useState<AnomalyTrendVO[]>([])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [anomalyData, summaryData, rankData, statsData, sugData, trendData] = await Promise.all([
        smallConsumablesApi.getAnomalySummary(yearMonth),
        deptInventoryApi.getSummary(),
        deptInventoryApi.getConsumptionRanking(),
        anomalyWorkOrderApi.getStats(),
        smallConsumablesApi.getParSuggestions(),
        smallConsumablesApi.getAnomalyTrend(6),
      ])
      setAnomaly(anomalyData)
      setSummaries(summaryData)
      setRanking(rankData)
      setWorkOrderStats(statsData)
      setSuggestions(sugData)
      setAnomalyTrend(trendData)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [yearMonth])

  const totalBelowMin = summaries.reduce((s, d) => s + d.belowMinCount, 0)
  const totalItems = summaries.reduce((s, d) => s + d.totalItems, 0)

  // 科室消耗分布饼图
  const pieOption = {
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: ranking.map(r => ({ name: r.deptName, value: r.totalConsumption })),
      label: { formatter: '{b}: {d}%' },
    }],
  }

  // 异常趋势对比（当月各科异常数）
  const anomalyBarOption = anomaly?.anomalies && anomaly.anomalies.length > 0 ? {
    tooltip: { trigger: 'axis' as const },
    xAxis: {
      type: 'category' as const,
      data: anomaly.anomalies.map(a => `${a.deptName}-${a.materialName}`),
      axisLabel: { rotate: 30, fontSize: 10 },
    },
    yAxis: { type: 'value' as const, name: '偏差率(%)' },
    series: [{
      type: 'bar',
      data: anomaly.anomalies.map(a => ({
        value: Math.round((a.deviationRate || 0) * 100),
        itemStyle: { color: (a.deviationRate || 0) > 0.5 ? '#ff4d4f' : '#faad14' },
      })),
    }],
    grid: { bottom: 80 },
  } : null

  // 异常趋势折线图（近6个月）
  const trendOption = anomalyTrend.length > 0 ? {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'cross' as const },
    },
    legend: {
      data: ['严重超标', '偏高预警'],
      bottom: 0,
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: anomalyTrend.map(t => t.yearMonth),
      boundaryGap: false,
    },
    yAxis: { type: 'value' as const, name: '异常数量', minInterval: 1 },
    series: [
      {
        name: '严重超标',
        type: 'line',
        stack: 'total',
        areaStyle: { opacity: 0.3 },
        lineStyle: { color: '#ff4d4f', width: 2 },
        itemStyle: { color: '#ff4d4f' },
        data: anomalyTrend.map(t => t.dangerCount),
        smooth: true,
      },
      {
        name: '偏高预警',
        type: 'line',
        stack: 'total',
        areaStyle: { opacity: 0.3 },
        lineStyle: { color: '#faad14', width: 2 },
        itemStyle: { color: '#faad14' },
        data: anomalyTrend.map(t => t.warningCount),
        smooth: true,
      },
    ],
  } : null

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              <BarChartOutlined /> 月度精细化管理报告
            </Title>
            <Button
              icon={<DownloadOutlined />}
              onClick={async () => { await exportMonthlyReport(yearMonth) }}
            >
              导出报告
            </Button>
          </Space>
          <DatePicker
            picker="month"
            value={dayjs(yearMonth)}
            onChange={v => v && setYearMonth(v.format('YYYY-MM'))}
            allowClear={false}
          />
        </div>

        {/* 总览 KPI */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="管控科室" value={summaries.length} suffix="个" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="管控耗材" value={totalItems} suffix="项" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="消耗异常"
                value={(anomaly?.dangerCount || 0) + (anomaly?.warningCount || 0)}
                suffix="项"
                valueStyle={{ color: (anomaly?.dangerCount || 0) > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="低库存预警"
                value={totalBelowMin}
                suffix="项"
                valueStyle={{ color: totalBelowMin > 0 ? '#faad14' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="待处理工单"
                value={workOrderStats?.open || 0}
                suffix="个"
                valueStyle={{ color: (workOrderStats?.open || 0) > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="定数待调整"
                value={suggestions.length}
                suffix="项"
                prefix={suggestions.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                valueStyle={{ color: suggestions.length > 0 ? '#faad14' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 综合评价 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Title level={5}>综合评价</Title>
          {anomaly?.dangerCount === 0 && totalBelowMin === 0 && (workOrderStats?.open || 0) === 0 ? (
            <Alert type="success" showIcon message="本月各科室耗材管理整体运行良好，无重大异常" />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {(anomaly?.dangerCount || 0) > 0 && (
                <Alert type="error" showIcon
                  message={`发现 ${anomaly?.dangerCount} 项严重消耗异常，需重点关注`}
                  description={anomaly?.anomalies?.filter(a => a.level === 'DANGER').map(a =>
                    `${a.deptName}-${a.materialName}（偏差${Math.round((a.deviationRate || 0) * 100)}%）`
                  ).join('、')}
                />
              )}
              {totalBelowMin > 0 && (
                <Alert type="warning" showIcon message={`${totalBelowMin} 项耗材低于最低库存线，建议及时补货`} />
              )}
              {(workOrderStats?.open || 0) > 0 && (
                <Alert type="info" showIcon message={`${workOrderStats?.open} 个异常工单待处理，请尽快跟进`} />
              )}
            </Space>
          )}
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          {/* 消耗分布 */}
          <Col span={12}>
            <Card size="small" title="科室消耗分布">
              {ranking.length > 0 ? (
                <ReactECharts option={pieOption} style={{ height: 300 }} />
              ) : (
                <Empty description="暂无消耗数据" />
              )}
            </Card>
          </Col>

          {/* 异常偏差对比 */}
          <Col span={12}>
            <Card size="small" title={`${yearMonth} 消耗异常偏差`}>
              {anomalyBarOption ? (
                <ReactECharts option={anomalyBarOption} style={{ height: 300 }} />
              ) : (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text type="success"><CheckCircleOutlined /> 本月无消耗异常</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 异常趋势（近6个月） */}
        {trendOption && (
          <Card size="small" title="异常趋势（近6个月）" style={{ marginBottom: 16 }}>
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          </Card>
        )}

        {/* 定数调整建议 */}
        {suggestions.length > 0 && (
          <Card size="small" title="定数调整建议" style={{ marginBottom: 16 }}>
            <Table
              dataSource={suggestions}
              rowKey={r => `${r.deptId}_${r.materialId}`}
              size="small"
              pagination={false}
              columns={[
                { title: '科室', dataIndex: 'deptName', width: 80 },
                { title: '耗材', dataIndex: 'materialName', ellipsis: true },
                {
                  title: '调整方向', dataIndex: 'direction', width: 80,
                  render: (d: string) => d === 'UP'
                    ? <Tag color="red" icon={<ArrowUpOutlined />}>上调</Tag>
                    : <Tag color="blue" icon={<ArrowDownOutlined />}>下调</Tag>,
                },
                {
                  title: '当前→建议', width: 120,
                  render: (_: unknown, r: ParSuggestionVO) => `${r.currentPar} → ${r.suggestedPar}`,
                },
                { title: '月均消耗', dataIndex: 'avgMonthlyUsage', width: 80 },
                { title: '原因', dataIndex: 'reason', ellipsis: true },
              ]}
            />
          </Card>
        )}

        {/* 工单处理统计 */}
        <Card size="small" title="异常工单处理统计" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总工单" value={workOrderStats?.total || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="待处理" value={workOrderStats?.open || 0}
                valueStyle={{ color: (workOrderStats?.open || 0) > 0 ? '#ff4d4f' : undefined }} />
            </Col>
            <Col span={6}>
              <Statistic title="已解决" value={workOrderStats?.resolved || 0}
                valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col span={6}>
              <Statistic title="已关闭" value={workOrderStats?.closed || 0} />
            </Col>
          </Row>
        </Card>

        {/* 科室库存健康度 */}
        <Card size="small" title="科室库存健康度">
          <Table
            dataSource={summaries}
            rowKey="deptId"
            size="small"
            pagination={false}
            columns={[
              { title: '科室', dataIndex: 'deptName', width: 120 },
              { title: '管控耗材数', dataIndex: 'totalItems', width: 100 },
              {
                title: '低库存', dataIndex: 'belowMinCount', width: 80,
                render: (v: number) => v > 0
                  ? <Tag color="red">{v} 项</Tag>
                  : <Tag color="green">正常</Tag>,
              },
              {
                title: '健康度', width: 150,
                render: (_: unknown, r: DeptInventorySummaryVO) => {
                  const pct = r.totalItems > 0 ? Math.round(((r.totalItems - r.belowMinCount) / r.totalItems) * 100) : 100
                  return (
                    <Space>
                      <span style={{ fontWeight: 600, color: pct >= 90 ? '#52c41a' : pct >= 70 ? '#faad14' : '#ff4d4f' }}>
                        {pct}%
                      </span>
                      <Tag color={pct >= 90 ? 'green' : pct >= 70 ? 'orange' : 'red'}>
                        {pct >= 90 ? '优秀' : pct >= 70 ? '良好' : '待改善'}
                      </Tag>
                    </Space>
                  )
                },
              },
            ]}
          />
        </Card>
      </div>
    </Spin>
  )
}
