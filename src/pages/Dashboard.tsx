import { useMemo } from 'react'
import { Button, Card, Col, Empty, List, Progress, Row, Statistic, Typography } from 'antd'
import { PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import { useDataStore } from '../store/dataStore'
import { useUiStore } from '../store/uiStore'
import {
  categoryBreakdown,
  filterByDateRange,
  monthlyTrend,
  sumTotals,
} from '../services/stats'
import { budgetProgressForMonth } from '../services/budgetProgress'
import { monthRange } from '../utils/date'
import { formatMoney } from '../utils/money'
import Chart from '../charts/Chart'
import { baseChartOption, getChartTheme, PALETTE } from '../charts/theme'
import { accountBalances, netWorth } from '../services/balance'

export default function Dashboard() {
  const transactions = useDataStore((s) => s.transactions)
  const categories = useDataStore((s) => s.categories)
  const accounts = useDataStore((s) => s.accounts)
  const budgets = useDataStore((s) => s.budgets)
  const createSampleData = useDataStore((s) => s.createSampleData)
  const dark = useUiStore((s) => s.theme) === 'dark'

  const now = dayjs()
  const { start, end } = monthRange(now.year(), now.month() + 1)
  const monthTxs = useMemo(
    () => filterByDateRange(transactions, start, end),
    [transactions, start, end],
  )
  const totals = useMemo(() => sumTotals(monthTxs), [monthTxs])
  const trend = useMemo(() => monthlyTrend(transactions, 6), [transactions])
  const pieData = useMemo(
    () => categoryBreakdown(monthTxs, 'expense', categories),
    [monthTxs, categories],
  )
  const budgetProgress = useMemo(
    () => budgetProgressForMonth(budgets, transactions, categories, now.year(), now.month() + 1),
    [budgets, transactions, categories, now],
  )
  const netWorthValue = useMemo(
    () => netWorth(accountBalances(accounts, transactions)),
    [accounts, transactions],
  )
  const recentTxs = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8),
    [transactions],
  )

  const trendOption = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    return {
      ...base,
      tooltip: { ...base.tooltip, valueFormatter: (v) => formatMoney(Number(v)) },
      legend: { data: ['支出', '收入'] },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: trend.map((t) => t.label),
        axisLine: { lineStyle: { color: baseChartOption(dark).textStyle?.color } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatMoney(v, 'CNY').replace('¥', '') },
        splitLine: { lineStyle: { color: getChartTheme(dark).splitLineColor } },
      },
      series: [
        {
          name: '支出',
          type: 'line',
          smooth: true,
          data: trend.map((t) => t.expense),
          itemStyle: { color: '#f5222d' },
          areaStyle: { opacity: 0.08 },
        },
        {
          name: '收入',
          type: 'line',
          smooth: true,
          data: trend.map((t) => t.income),
          itemStyle: { color: '#52c41a' },
          areaStyle: { opacity: 0.08 },
        },
      ],
    }
  }, [trend, dark])

  const pieOption = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    return {
      ...base,
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as unknown as { name: string; value: number; percent: number }
          return `${p.name}: ${formatMoney(p.value)} (${p.percent}%)`
        },
      },
      legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { color: getChartTheme(dark).textColor } },
      series: [
        {
          name: '支出分类',
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 },
          label: { formatter: '{b}', color: getChartTheme(dark).textColor },
          data: pieData.map((d, i) => ({
            name: d.name,
            value: d.amount,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
        },
      ],
    }
  }, [pieData, dark])

  if (transactions.length === 0) {
    return (
      <div>
        <Typography.Title level={3}>仪表盘</Typography.Title>
        <Empty style={{ marginTop: 80 }} description="还没有记账数据，先体验一下示例数据吧">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => void createSampleData()}>
            生成示例数据
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={3}>仪表盘</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月支出"
              value={formatMoney(totals.expense)}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={formatMoney(totals.income)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月结余"
              value={formatMoney(totals.income - totals.expense)}
              valueStyle={{
                color: totals.income - totals.expense >= 0 ? '#1677ff' : '#f5222d',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="净资产"
              value={formatMoney(netWorthValue)}
              valueStyle={{ color: netWorthValue >= 0 ? '#1677ff' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="近 6 个月收支趋势" size="small">
            <Chart option={trendOption} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="本月支出分类占比" size="small">
            <Chart option={pieOption} height={300} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}>
          <Card
            title="本月预算进度"
            size="small"
            extra={
              <Link to="/budgets">
                管理 <RightOutlined />
              </Link>
            }
          >
            {budgetProgress.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有预算，去设置一个吧"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {budgetProgress.map((item) => {
                  const over = item.percent > 100
                  return (
                    <div key={item.budget.id}>
                      <Row justify="space-between">
                        <Typography.Text>
                          {item.icon ?? ''} {item.categoryName}
                        </Typography.Text>
                        <Typography.Text type={over ? 'danger' : 'secondary'}>
                          {formatMoney(item.spent)} / {formatMoney(item.budget.amount)}
                        </Typography.Text>
                      </Row>
                      <Progress
                        percent={Math.min(item.percent, 100)}
                        status={over ? 'exception' : 'normal'}
                        strokeColor={over ? '#f5222d' : item.color}
                        size="small"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="近期流水"
            size="small"
            extra={
              <Link to="/transactions">
                全部 <RightOutlined />
              </Link>
            }
          >
            <List
              size="small"
              dataSource={recentTxs}
              renderItem={(tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId)
                const account = accounts.find((a) => a.id === tx.accountId)
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          {tx.kind === 'expense' && <span style={{ color: '#f5222d' }}>-</span>}
                          {tx.kind === 'income' && <span style={{ color: '#52c41a' }}>+</span>}
                          {formatMoney(tx.amount)}
                          {cat && <Typography.Text type="secondary"> · {cat.name}</Typography.Text>}
                        </span>
                      }
                      description={`${dayjs(tx.date).format('M月D日')} · ${account?.name ?? '—'}${
                        tx.counterparty ? ` · ${tx.counterparty}` : ''
                      }`}
                    />
                  </List.Item>
                )
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
