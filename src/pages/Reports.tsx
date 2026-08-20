import { useMemo, useState } from 'react'
import { Card, Col, Empty, Row, Segmented, Select, Statistic, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { EChartsOption } from 'echarts'
import { useDataStore } from '../store/dataStore'
import { useUiStore } from '../store/uiStore'
import {
  categoryBreakdown,
  comparePeriods,
  dailyExpenseTotals,
  monthlyTrend,
} from '../services/stats'
import { accountBalances } from '../services/balance'
import { monthRange } from '../utils/date'
import { formatCompact, formatMoney } from '../utils/money'
import Chart from '../charts/Chart'
import { baseChartOption, getChartTheme, PALETTE } from '../charts/theme'

type View = 'trend' | 'category' | 'account' | 'calendar'

export default function Reports() {
  const [view, setView] = useState<View>('trend')
  return (
    <div>
      <Typography.Title level={3}>统计报表</Typography.Title>
      <Segmented
        block
        value={view}
        onChange={(v) => setView(v as View)}
        options={[
          { label: '收支趋势', value: 'trend' },
          { label: '分类统计', value: 'category' },
          { label: '账户分析', value: 'account' },
          { label: '日历热力图', value: 'calendar' },
        ]}
        style={{ marginBottom: 16, maxWidth: 560 }}
      />
      {view === 'trend' && <TrendView />}
      {view === 'category' && <CategoryView />}
      {view === 'account' && <AccountView />}
      {view === 'calendar' && <CalendarView />}
    </div>
  )
}

function useDark() {
  return useUiStore((s) => s.theme) === 'dark'
}

function TrendView() {
  const transactions = useDataStore((s) => s.transactions)
  const dark = useDark()
  const [months, setMonths] = useState(6)

  const trend = useMemo(() => monthlyTrend(transactions, months), [transactions, months])
  const cmp = useMemo(() => {
    const now = dayjs()
    const { start, end } = monthRange(now.year(), now.month() + 1)
    return comparePeriods(transactions, start, end)
  }, [transactions])

  const option = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    return {
      ...base,
      tooltip: { ...base.tooltip, valueFormatter: (v) => formatMoney(Number(v)) },
      legend: { data: ['支出', '收入'] },
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: trend.map((t) => t.label),
        axisLabel: { color: getChartTheme(dark).textColor },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatCompact(v, 'CNY'), color: getChartTheme(dark).textColor },
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

  if (transactions.length === 0) {
    return <Empty description="暂无数据" style={{ marginTop: 60 }} />
  }

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="本月支出"
              value={formatMoney(cmp.current.expense)}
              valueStyle={{ color: '#f5222d', fontSize: 20 }}
            />
            <Typography.Text type="secondary">
              环比 {cmp.expenseChangePct === null ? '—' : `${cmp.expenseChangePct > 0 ? '+' : ''}${cmp.expenseChangePct}%`}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="本月收入"
              value={formatMoney(cmp.current.income)}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
            <Typography.Text type="secondary">
              环比 {cmp.incomeChangePct === null ? '—' : `${cmp.incomeChangePct > 0 ? '+' : ''}${cmp.incomeChangePct}%`}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="本月结余"
              value={formatMoney(cmp.current.income - cmp.current.expense)}
              valueStyle={{ fontSize: 20 }}
            />
            <Typography.Text type="secondary">
              上月结余 {formatMoney(cmp.previous.income - cmp.previous.expense)}
            </Typography.Text>
          </Card>
        </Col>
      </Row>
      <Card
        title="收支趋势"
        size="small"
        extra={
          <Select
            size="small"
            value={months}
            onChange={setMonths}
            options={[
              { value: 6, label: '近 6 个月' },
              { value: 12, label: '近 12 个月' },
            ]}
          />
        }
      >
        <Chart option={option} height={340} />
      </Card>
    </>
  )
}

function CategoryView() {
  const transactions = useDataStore((s) => s.transactions)
  const categories = useDataStore((s) => s.categories)
  const dark = useDark()
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [months, setMonths] = useState(1)

  const rangeTxs = useMemo(() => {
    if (months === 1) {
      const now = dayjs()
      const { start, end } = monthRange(now.year(), now.month() + 1)
      return transactions.filter((t) => t.date >= start && t.date <= end)
    }
    const start = dayjs().subtract(months, 'month').startOf('month').format('YYYY-MM-DD')
    return transactions.filter((t) => t.date >= start)
  }, [transactions, months])

  const breakdown = useMemo(
    () => categoryBreakdown(rangeTxs, kind, categories),
    [rangeTxs, kind, categories],
  )
  const total = useMemo(() => breakdown.reduce((s, d) => s + d.amount, 0), [breakdown])

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
          name: kind === 'expense' ? '支出' : '收入',
          type: 'pie',
          radius: ['38%', '66%'],
          center: ['40%', '50%'],
          itemStyle: { borderRadius: 4 },
          label: { color: getChartTheme(dark).textColor },
          data: breakdown.map((d, i) => ({
            name: d.name,
            value: d.amount,
            itemStyle: { color: PALETTE[i % PALETTE.length] },
          })),
        },
      ],
    }
  }, [breakdown, kind, dark])

  const barOption = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    return {
      ...base,
      tooltip: { ...base.tooltip, valueFormatter: (v) => formatMoney(Number(v)) },
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatCompact(v, 'CNY'), color: getChartTheme(dark).textColor },
        splitLine: { lineStyle: { color: getChartTheme(dark).splitLineColor } },
      },
      yAxis: {
        type: 'category',
        data: [...breakdown].reverse().map((d) => d.name),
        axisLabel: { color: getChartTheme(dark).textColor },
      },
      series: [
        {
          name: kind === 'expense' ? '支出' : '收入',
          type: 'bar',
          data: [...breakdown].reverse().map((d, i) => ({
            value: d.amount,
            itemStyle: { color: PALETTE[(breakdown.length - 1 - i) % PALETTE.length] },
          })),
          label: { show: true, position: 'right', formatter: (p) => formatMoney(Number(p.value)), color: getChartTheme(dark).textColor },
        },
      ],
    }
  }, [breakdown, kind, dark])

  if (transactions.length === 0) {
    return <Empty description="暂无数据" style={{ marginTop: 60 }} />
  }

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12}>
          <Segmented
            value={kind}
            onChange={(v) => setKind(v as 'expense' | 'income')}
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
            ]}
          />
        </Col>
        <Col xs={12} style={{ textAlign: 'right' }}>
          <Select
            size="small"
            value={months}
            onChange={setMonths}
            options={[
              { value: 1, label: '本月' },
              { value: 3, label: '近 3 个月' },
              { value: 6, label: '近 6 个月' },
              { value: 12, label: '近 12 个月' },
            ]}
          />
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card size="small" title={`${kind === 'expense' ? '支出' : '收入'}分类占比（合计 ${formatMoney(total)}）`}>
            <Chart option={pieOption} height={320} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card size="small" title="分类对比">
            <Chart option={barOption} height={320} />
          </Card>
        </Col>
      </Row>
    </>
  )
}

function AccountView() {
  const accounts = useDataStore((s) => s.accounts)
  const transactions = useDataStore((s) => s.transactions)
  const dark = useDark()
  const results = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions])

  const option = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    const sorted = [...results].sort((a, b) => b.balance - a.balance)
    return {
      ...base,
      tooltip: { ...base.tooltip, valueFormatter: (v) => formatMoney(Number(v)) },
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: sorted.map((r) => r.account.name),
        axisLabel: { color: getChartTheme(dark).textColor },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => formatCompact(v, 'CNY'), color: getChartTheme(dark).textColor },
        splitLine: { lineStyle: { color: getChartTheme(dark).splitLineColor } },
      },
      series: [
        {
          name: '余额',
          type: 'bar',
          barWidth: 28,
          data: sorted.map((r) => ({
            value: r.balance,
            itemStyle: { color: r.balance >= 0 ? '#1677ff' : '#f5222d', borderRadius: [4, 4, 0, 0] },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: (p) => formatMoney(Number(p.value)),
            color: getChartTheme(dark).textColor,
          },
        },
      ],
    }
  }, [results, dark])

  const columns: ColumnsType<(typeof results)[number]> = [
    { title: '账户', dataIndex: ['account', 'name'] },
    { title: '累计收入', dataIndex: 'totalIncome', align: 'right', render: (v: number) => <span style={{ color: '#52c41a' }}>+{formatMoney(v)}</span> },
    { title: '累计支出', dataIndex: 'totalExpense', align: 'right', render: (v: number) => <span style={{ color: '#f5222d' }}>-{formatMoney(v)}</span> },
    { title: '当前余额', dataIndex: 'balance', align: 'right', render: (v: number) => formatMoney(v) },
  ]

  if (accounts.length === 0) {
    return <Empty description="暂无账户" style={{ marginTop: 60 }} />
  }

  return (
    <>
      <Card size="small" title="各账户当前余额" style={{ marginBottom: 16 }}>
        <Chart option={option} height={300} />
      </Card>
      <Card size="small" title="账户收支明细">
        <Table<(typeof results)[number]>
          rowKey={(r) => r.account.id}
          size="small"
          columns={columns}
          dataSource={results}
          pagination={false}
        />
      </Card>
    </>
  )
}

function CalendarView() {
  const transactions = useDataStore((s) => s.transactions)
  const dark = useDark()
  const now = dayjs()
  const [year, setYear] = useState(now.year())

  const data = useMemo(() => {
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    const map = dailyExpenseTotals(transactions, start, end)
    return [...map.entries()].map(([date, amount]) => [date, amount / 100] as [string, number])
  }, [transactions, year])

  const maxAmount = useMemo(() => Math.max(0, ...data.map((d) => d[1])), [data])

  const option = useMemo<EChartsOption>(() => {
    const base = baseChartOption(dark)
    const theme = getChartTheme(dark)
    return {
      ...base,
      tooltip: {
        formatter: (params) => {
          const item = params as unknown as { data: [string, number] }
          return `${item.data[0]}：${formatMoney(Math.round(item.data[1] * 100))}`
        },
      },
      visualMap: {
        min: 0,
        max: maxAmount || 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        textStyle: { color: theme.textColor },
        inRange: { color: ['#e8f4ff', '#91caff', '#1677ff', '#003eb3'] },
      },
      calendar: {
        top: 40,
        left: 40,
        right: 24,
        cellSize: ['auto', 14],
        range: String(year),
        itemStyle: { borderWidth: 3, borderColor: dark ? '#141414' : '#ffffff' },
        splitLine: { lineStyle: { color: theme.splitLineColor } },
        yearLabel: { show: false },
        dayLabel: { nameMap: ['日', '一', '二', '三', '四', '五', '六'], color: theme.textColor },
        monthLabel: { nameMap: 'ZH', color: theme.textColor },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data,
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' } },
        },
      ],
    }
  }, [data, maxAmount, year, dark])

  if (transactions.length === 0) {
    return <Empty description="暂无数据" style={{ marginTop: 60 }} />
  }

  return (
    <Card
      size="small"
      title={`${year} 年每日支出`}
      extra={
        <Select
          size="small"
          value={year}
          onChange={setYear}
          options={[now.year() - 1, now.year(), now.year() + 1].map((y) => ({
            value: y,
            label: `${y} 年`,
          }))}
        />
      }
    >
      <Chart option={option} height={220} />
      <Typography.Paragraph type="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
        颜色越深表示当日支出越高{maxAmount > 0 ? `（峰值 ${formatMoney(Math.round(maxAmount * 100))}）` : ''}
      </Typography.Paragraph>
    </Card>
  )
}
