import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { PlusOutlined } from '@ant-design/icons'
import { useDataStore } from '../store/dataStore'
import { formatMoney, toCents } from '../utils/money'
import { formatDate } from '../utils/date'
import type { Debt, DebtDirection } from '../types'
import type { DebtInput } from '../db/repositories/debts'

interface DebtFormValues {
  direction: DebtDirection
  counterparty: string
  amount: number
  accountId: string
  dueDate?: Dayjs
  note?: string
}

interface SettleState {
  debt: Debt
  recordTx: boolean
}

export default function Debts() {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [settleState, setSettleState] = useState<SettleState | null>(null)
  const [form] = Form.useForm<DebtFormValues>()

  const debts = useDataStore((s) => s.debts)
  const accounts = useDataStore((s) => s.accounts)
  const addDebt = useDataStore((s) => s.addDebt)
  const updateDebt = useDataStore((s) => s.updateDebt)
  const settleDebt = useDataStore((s) => s.settleDebt)
  const removeDebt = useDataStore((s) => s.removeDebt)
  const addTransaction = useDataStore((s) => s.addTransaction)

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const lends = debts.filter((d) => d.direction === 'lend')
  const borrows = debts.filter((d) => d.direction === 'borrow')
  const receivable = lends
    .filter((d) => d.status === 'outstanding')
    .reduce((s, d) => s + d.amount, 0)
  const payable = borrows
    .filter((d) => d.status === 'outstanding')
    .reduce((s, d) => s + d.amount, 0)

  const openAdd = (direction: DebtDirection) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ direction })
    setModalOpen(true)
  }
  const openEdit = (debt: Debt) => {
    setEditing(debt)
    form.setFieldsValue({
      direction: debt.direction,
      counterparty: debt.counterparty,
      amount: debt.amount / 100,
      accountId: debt.accountId,
      dueDate: debt.dueDate ? dayjs(debt.dueDate) : undefined,
      note: debt.note,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const input: DebtInput = {
        direction: values.direction,
        counterparty: values.counterparty.trim(),
        amount: toCents(values.amount || 0),
        accountId: values.accountId,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        note: values.note?.trim() || undefined,
      }
      if (editing) {
        await updateDebt(editing.id, input)
        message.success('已保存')
      } else {
        await addDebt(input)
        message.success('已添加借贷记录')
      }
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  const confirmSettle = async () => {
    if (!settleState) return
    const { debt, recordTx } = settleState
    if (recordTx) {
      // 借出收回 -> 收入；借入偿还 -> 支出（联动记账）
      const kind = debt.direction === 'lend' ? 'income' : 'expense'
      await addTransaction({
        kind,
        accountId: debt.accountId,
        amount: debt.amount,
        currency: 'CNY',
        date: dayjs().format('YYYY-MM-DD'),
        counterparty: debt.counterparty,
        note: debt.note ?? (debt.direction === 'lend' ? '收回借款' : '偿还借款'),
        tags: ['借贷'],
      })
    }
    await settleDebt(debt.id)
    message.success('已结清')
    setSettleState(null)
  }

  const columns: ColumnsType<Debt> = [
    {
      title: '对方',
      dataIndex: 'counterparty',
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      align: 'right',
      render: (amount: number, debt) => (
        <span style={{ color: debt.direction === 'lend' ? '#1677ff' : '#f5222d' }}>
          {debt.direction === 'lend' ? '+' : '-'}
          {formatMoney(amount)}
        </span>
      ),
    },
    {
      title: '账户',
      width: 120,
      render: (_, debt) => accountMap.get(debt.accountId)?.name ?? '—',
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      width: 120,
      render: (dueDate: string | undefined, debt) => {
        if (!dueDate) return '—'
        const overdue = debt.status === 'outstanding' && dayjs(dueDate).isBefore(dayjs(), 'day')
        return (
          <span style={{ color: overdue ? '#f5222d' : undefined }}>
            {formatDate(dueDate)}
            {overdue && ' ⚠'}
          </span>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: Debt['status']) =>
        status === 'settled' ? <Tag>已结清</Tag> : <Tag color="processing">未结清</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      render: (v: string | undefined) => v || '—',
    },
    {
      title: '操作',
      width: 200,
      render: (_, debt) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(debt)}>
            编辑
          </Button>
          {debt.status === 'outstanding' && (
            <Button type="link" size="small" onClick={() => setSettleState({ debt, recordTx: true })}>
              结清
            </Button>
          )}
          <Popconfirm title="删除该记录？" onConfirm={() => void removeDebt(debt.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const renderTable = (title: string, direction: DebtDirection, list: Debt[]) => (
    <Card
      size="small"
      title={title}
      extra={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openAdd(direction)}>
          新增
        </Button>
      }
    >
      {list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`暂无${title}`} />
      ) : (
        <Table<Debt>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={list}
          pagination={false}
          rowClassName={(debt) =>
            debt.status === 'outstanding' &&
            debt.dueDate &&
            dayjs(debt.dueDate).isBefore(dayjs(), 'day')
              ? 'ant-table-row-danger'
              : ''
          }
        />
      )}
    </Card>
  )

  return (
    <div>
      <Typography.Title level={3}>借贷</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="应收（借出未还）"
              value={formatMoney(receivable)}
              valueStyle={{ color: '#1677ff', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="应付（借入未还）"
              value={formatMoney(payable)}
              valueStyle={{ color: '#f5222d', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              结清借贷时可选择联动记账：借出收回记为收入，借入偿还记为支出（标签「借贷」）。
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {renderTable('借出（应收）', 'lend', lends)}
        {renderTable('借入（应付）', 'borrow', borrows)}
      </Space>

      <Modal
        title={editing ? '编辑借贷记录' : '新增借贷记录'}
        open={modalOpen}
        onOk={() => void handleSave()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="direction" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'lend', label: '借出（借给别人，应收）' },
                { value: 'borrow', label: '借入（向别人借，应付）' },
              ]}
            />
          </Form.Item>
          <Form.Item name="counterparty" label="对方" rules={[{ required: true, message: '请输入对方' }]}>
            <Input placeholder="如：张三" />
          </Form.Item>
          <Form.Item name="amount" label="金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
          </Form.Item>
          <Form.Item name="accountId" label="关联账户" rules={[{ required: true, message: '请选择账户' }]}>
            <Select
              options={accounts.filter((a) => !a.isArchived).map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
          <Form.Item name="dueDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input placeholder="备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="结清确认"
        open={!!settleState}
        onOk={() => void confirmSettle()}
        onCancel={() => setSettleState(null)}
        okText="确认结清"
        cancelText="取消"
      >
        {settleState && (
          <Space direction="vertical">
            <Typography.Text>
              {settleState.debt.direction === 'lend' ? '收回' : '偿还'}给「
              {settleState.debt.counterparty}」{formatMoney(settleState.debt.amount)}，确认结清？
            </Typography.Text>
            <Checkbox
              checked={settleState.recordTx}
              onChange={(e) =>
                setSettleState((s) => (s ? { ...s, recordTx: e.target.checked } : s))
              }
            >
              同时记一笔（{settleState.debt.direction === 'lend' ? '收入：收回借款' : '支出：偿还借款'}）
            </Checkbox>
          </Space>
        )}
      </Modal>
    </div>
  )
}
