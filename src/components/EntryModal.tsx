import { useEffect, useMemo, useState } from 'react'
import {
  App,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Segmented,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useDataStore } from '../store/dataStore'
import { useUiStore } from '../store/uiStore'
import { toCents } from '../utils/money'
import type { TxKind } from '../types'
import type { TxInput } from '../db/repositories/transactions'

interface EntryFormValues {
  kind: TxKind
  amount: number | null
  accountId?: string
  categoryId?: string
  toAccountId?: string
  date: Dayjs
  counterparty?: string
  note?: string
  tags?: string[]
}

export default function EntryModal() {
  const { message } = App.useApp()
  const [form] = Form.useForm<EntryFormValues>()
  const [saving, setSaving] = useState(false)

  const entryOpen = useUiStore((s) => s.entryOpen)
  const closeEntry = useUiStore((s) => s.closeEntry)
  const editingTxId = useUiStore((s) => s.editingTxId)

  const accounts = useDataStore((s) => s.accounts)
  const categories = useDataStore((s) => s.categories)
  const transactions = useDataStore((s) => s.transactions)
  const addTransaction = useDataStore((s) => s.addTransaction)
  const updateTransaction = useDataStore((s) => s.updateTransaction)

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived).sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts],
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === 'expense').sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === 'income').sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const kind = Form.useWatch('kind', form) ?? 'expense'
  const editingTx = useMemo(
    () => (editingTxId ? transactions.find((t) => t.id === editingTxId) : undefined),
    [editingTxId, transactions],
  )

  // 打开时根据模式（新增/编辑）初始化表单
  useEffect(() => {
    if (!entryOpen) return
    if (editingTx) {
      form.setFieldsValue({
        kind: editingTx.kind,
        amount: editingTx.amount / 100,
        accountId: editingTx.accountId,
        categoryId: editingTx.kind === 'transfer' ? undefined : editingTx.categoryId,
        toAccountId: editingTx.toAccountId,
        date: dayjs(editingTx.date),
        counterparty: editingTx.counterparty,
        note: editingTx.note,
        tags: editingTx.tags,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        kind: 'expense',
        date: dayjs(),
        accountId: activeAccounts[0]?.id,
      })
    }
  }, [entryOpen, editingTx, form, activeAccounts])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (!values.amount || values.amount <= 0) {
        message.warning('请输入有效金额')
        return
      }
      const input: TxInput = {
        kind: values.kind,
        accountId: values.accountId!,
        amount: toCents(values.amount),
        currency: 'CNY',
        date: values.date.format('YYYY-MM-DD'),
        note: values.note?.trim() || undefined,
        counterparty: values.counterparty?.trim() || undefined,
        categoryId:
          values.kind === 'transfer' ? undefined : (values.categoryId || undefined),
        tags: values.tags ?? [],
        toAccountId: values.kind === 'transfer' ? values.toAccountId : undefined,
      }
      setSaving(true)
      if (editingTx) {
        await updateTransaction(editingTx.id, input)
        message.success('已更新')
      } else {
        await addTransaction(input)
        message.success('已记账')
      }
      closeEntry()
    } catch (err) {
      if (err instanceof Error && err.message.includes('验证')) {
        message.warning(err.message)
      }
      // 校验失败静默
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions =
    kind === 'income' ? incomeCategories : expenseCategories

  return (
    <Modal
      title={editingTx ? '编辑流水' : '记一笔'}
      open={entryOpen}
      onOk={() => void handleOk()}
      onCancel={closeEntry}
      confirmLoading={saving}
      okText={editingTx ? '保存' : '记一笔'}
      cancelText="取消"
      width={480}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        key={editingTxId ?? 'new'}
        onFinish={() => void handleOk()}
      >
        <Form.Item name="kind" label="类型" initialValue="expense">
          <Segmented
            block
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
              { label: '转账', value: 'transfer' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="金额（元）"
          rules={[{ required: true, message: '请输入金额' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            precision={2}
            placeholder="0.00"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          name="accountId"
          label={kind === 'transfer' ? '转出账户' : '账户'}
          rules={[{ required: true, message: '请选择账户' }]}
        >
          <Select
            placeholder="选择账户"
            options={activeAccounts.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Form.Item>

        {kind === 'transfer' ? (
          <Form.Item
            name="toAccountId"
            label="转入账户"
            rules={[
              { required: true, message: '请选择转入账户' },
              {
                validator: (_, value) =>
                  value && value === form.getFieldValue('accountId')
                    ? Promise.reject(new Error('转出与转入账户不能相同'))
                    : Promise.resolve(),
              },
            ]}
          >
            <Select
              placeholder="选择转入账户"
              options={activeAccounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
        ) : (
          <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select
              placeholder="选择分类"
              options={categoryOptions.map((c) => ({
                value: c.id,
                label: `${c.icon ?? ''} ${c.name}`,
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="date" label="日期" rules={[{ required: true }]} initialValue={dayjs()}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="counterparty" label="商家/对方">
          <Input placeholder="如：盒马鲜生（可选）" />
        </Form.Item>

        <Form.Item name="note" label="备注">
          <Input placeholder="备注（可选）" />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select mode="tags" placeholder="输入后回车添加标签" tokenSeparators={[',', '，']} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
