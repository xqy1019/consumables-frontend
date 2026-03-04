import React, { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Typography, Radio, Table, Spin } from 'antd'
import * as echarts from 'echarts'
import { reportsApi } from '@/api/reports'
import type { DeptRanking } from '@/types'
import type { ColumnsType } from 'antd/es/table'


export default function DeptRankingPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [data, setData] = useState<DeptRanking[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const fetchData = async (d: number) => {
    setLoading(true)
    try {
      const res = await reportsApi.getDeptRanking(d)
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData(days) }, [days])

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }
    const top10 = data.slice(0, 10)
    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value', name: '消耗数量' },
      yAxis: {
        type: 'category',
        data: top10.map(d => d.deptName || `科室${d.deptId}`).reverse(),
      },
      series: [
        {
          type: 'bar',
          data: top10.map(d => d.totalQuantity).reverse(),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#ff4d4f', '#ff7a45', '#ffa940', '#ffd666', '#95de64', '#5cdbd3', '#69c0ff', '#85a5ff', '#b37feb', '#ff85c2']
              return colors[params.dataIndex % colors.length]
            },
            borderRadius: [0, 4, 4, 0],
          },
          label: { show: true, position: 'right' },
        },
      ],
    }
    chartInstance.current.setOption(option)
    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [data])

  useEffect(() => {
    return () => { chartInstance.current?.dispose() }
  }, [])

  const columns: ColumnsType<DeptRanking> = [
    { title: '排名', dataIndex: 'rank', width: 60,
      render: (v: number) => v <= 3 ? <span className="font-bold" style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][v - 1] }}>#{v}</span> : `#${v}` },
    { title: '科室名称', dataIndex: 'deptName', render: (v, r) => v || `科室${r.deptId}` },
    { title: '消耗数量', dataIndex: 'totalQuantity',
      render: (v: number) => <span className="font-semibold">{v}</span> },
    { title: '消耗金额', dataIndex: 'totalAmount',
      render: v => `¥${(v || 0).toLocaleString()}` },
  ]

  return (
    <div>
      <Card
        bordered={false}
        className="rounded-xl mb-4"
        title="科室消耗排名"
        extra={
          <Radio.Group value={days} onChange={e => setDays(e.target.value)}>
            <Radio.Button value={7}>近7天</Radio.Button>
            <Radio.Button value={30}>近30天</Radio.Button>
            <Radio.Button value={90}>近90天</Radio.Button>
          </Radio.Group>
        }
      />
      <Row gutter={16}>
        <Col span={14}>
          <Card bordered={false} className="rounded-xl">
            <Spin spinning={loading}>
              <div ref={chartRef} className="h-[400px]" />
            </Spin>
          </Card>
        </Col>
        <Col span={10}>
          <Card bordered={false} className="rounded-xl">
            <Table
              rowKey={r => `${r.deptId}`}
              columns={columns} dataSource={data} loading={loading}
              pagination={false} size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
