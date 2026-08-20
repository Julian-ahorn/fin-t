import { useMemo, useState } from 'react'
import {
  App,
  Button,
  DatePicker,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { useDataStore } from '../store/dataStore'
import { useUiStore } from '../store/uiStore'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'
import type { Transaction } from '../types'

type KindFilter = 'all' | 'expense' | 'income' | 'transfer'

interface Filters {
  range: [Dayjs, Dayjs] | null
  kind: KindFilter
  accountId?: string
  categoryId?: string
  keyword?: string
}

export default function Transactions() {
  const { message } = App.useApp()
  const [filters, setFilters] = useState<Filters>({ range: null, kind: 'all' })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const transactions = useDataStore((s) => s.transactions)
  const accounts = useDataStore((s) => s.accounts)
  const categories = useDataStore((s) => s.categories)
  const bulkRemoveTransactions = useDataStore((s) => s.bulkRemoveTransactions)
  const removeTransaction = useDataStore((s) => s.removeTransaction)
  const openEdit = useUiStore((s) => s.openEdit)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    let list = [...transactions]
    if (filters.kind !== 'all') list = list.filter((t) => t.kind === filters.kind)
    if (filters.accountId) {
      list = list.filter(
        (t) => t.accountId === filters.accountId || t.toAccountId === filters.accountId,
      )
    }
    if (filters.categoryId) list = list.filter((t) => t.categoryId === filters.categoryId)
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase()
      list = list.filter(
        (t) =>
          (t.note ?? '').toLowerCase().includes(kw) ||
          (t.counterparty ?? '').toLowerCase().includes(kw) ||
          t.tags.some((tag) => tag.toLowerCase().includes(kw)),
      )
    }
    if (filters.range) {
      const [start, end] = filters.range
      list = list.filter((t) => {
        const d = t.date
        return d >= start.format('YYYY-MM-DD') && d <= end.format('YYYY-MM-DD')
      })
    }
    return list.sort((a, b) => b.timestamp - a.timestamp)
  }, [transactions, filters])

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return
    await bulkRemoveTransactions(selectedRowKeys as string[])
    message.success(`已删除 ${selectedRowKeys.length} 条记录`)
    setSelectedRowKeys([])
  }

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 110,
      render: (date: string) => formatDate(date),
      sorter: (a, b) => a.timestamp - b.timestamp,
    },
    {
      title: '类型',
      dataIndex: 'kind',
      width: 80,
      render: (kind: Transaction['kind']) => (
        <Tag
          color={kind === 'expense' ? 'red' : kind === 'income' ? 'green' : 'blue'}
        >
          {kind === 'expense' ? '支出' : kind === 'income' ? '收入' : '转账'}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 140,
      render: (categoryId: string | undefined, tx) => {
        if (tx.kind === 'transfer') return <span>—</span>
        const cat = categoryMap.get(categoryId ?? '')
        return <span>{cat ? `${cat.icon ?? ''} ${cat.name}` : '未分类'}</span>
      },
    },
    {
      title: '商家/对方',
      dataIndex: 'counterparty',
      width: 140,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '账户',
      width: 120,
      render: (_, tx) => {
        const from = accountMap.get(tx.accountId)?.name ?? '—'
        if (tx.kind === 'transfer') {
          const to = accountMap.get(tx.toAccountId ?? '')?.name ?? '—'
          return (
            <span>
              {from} <span style={{ color: '#999' }}>→</span> {to}
            </span>
          )
        }
        return from
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      align: 'right',
      width: 140,
      render: (amount: number, tx) => {
        if (tx.kind === 'expense') {
          return <span style={{ color: '#f5222d' }}>-{formatMoney(amount)}</span>
        }
        if (tx.kind === 'income') {
          return <span style={{ color: '#52c41a' }}>+{formatMoney(amount)}</span>
        }
        return <span style={{ color: '#1677ff' }}>→ {formatMoney(amount)}</span>
      },
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '操作',
      width: 120,
      render: (_, tx) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(tx.id)}>
            编辑
          </Button>
          <Popconfirm
            title="删除这条记录？"
            onConfirm={() => void removeTransaction(tx.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={3}>流水</Typography.Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          onChange={(range) => {
            if (range?.[0] && range[1]) {
              setFilters((f) => ({ ...f, range: [range[0], range[1]] as [Dayjs, Dayjs] }))
            } else {
              setFilters((f) => ({ ...f, range: null }))
            }
          }}
          placeholder={['开始日期', '结束日期']}
        />
        <Select<KindFilter>
          value={filters.kind}
          style={{ width: 110 }}
          onChange={(kind) => setFilters((f) => ({ ...f, kind }))}
          options={[
            { value: 'all', label: '全部类型' },
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
            { value: 'transfer', label: '转账' },
          ]}
        />
        <Select
          allowClear
          placeholder="账户"
          style={{ width: 130 }}
          onChange={(accountId) => setFilters((f) => ({ ...f, accountId }))}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          allowClear
          placeholder="分类"
          style={{ width: 140 }}
          onChange={(categoryId) => setFilters((f) => ({ ...f, categoryId }))}
          options={categories.map((c) => ({
            value: c.id,
            label: `${c.icon ?? ''} ${c.name}`,
          }))}
        />
        <Select
          allowClear
          showSearch
          placeholder="搜索备注/商家/标签"
          style={{ width: 200 }}
          onChange={(keyword) => setFilters((f) => ({ ...f, keyword }))}
          onSearch={(keyword) => setFilters((f) => ({ ...f, keyword }))}
          options={Array.from(
            new Set(
              transactions.flatMap((t) => [
                ...(t.counterparty ? [t.counterparty] : []),
                ...(t.note ? [t.note] : []),
                ...t.tags,
              ]),
            ),
          )
            .slice(0, 200)
            .map((v) => ({ value: v, label: v }))}
        />
      </Space>

      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Button danger icon={<DeleteOutlined />} onClick={() => void handleBulkDelete()}>
            删除选中（{selectedRowKeys.length}）
          </Button>
        </div>
      )}

      <Table<Transaction>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
      />
    </div>
  )
}
