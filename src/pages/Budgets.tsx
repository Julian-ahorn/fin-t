import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { PlusOutlined } from '@ant-design/icons'
import { useDataStore } from '../store/dataStore'
import { budgetProgressForMonth, budgetProgressForYear } from '../services/budgetProgress'
import { formatMoney, toCents } from '../utils/money'
import type { Budget, BudgetPeriod } from '../types'
import type { BudgetInput } from '../db/repositories/budgets'

interface BudgetFormValues {
  period: BudgetPeriod
  categoryId?: string
  amount: number
  rollover: boolean
}

export default function Budgets() {
  const { message } = App.useApp()
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [form] = Form.useForm<BudgetFormValues>()

  const budgets = useDataStore((s) => s.budgets)
  const transactions = useDataStore((s) => s.transactions)
  const categories = useDataStore((s) => s.categories)
  const addBudget = useDataStore((s) => s.addBudget)
  const updateBudget = useDataStore((s) => s.updateBudget)
  const removeBudget = useDataStore((s) => s.removeBudget)

  const year = month.year()
  const monthNum = month.month() + 1

  const monthly = useMemo(
    () => budgetProgressForMonth(budgets, transactions, categories, year, monthNum),
    [budgets, transactions, categories, year, monthNum],
  )
  const yearly = useMemo(
    () => budgetProgressForYear(budgets, transactions, categories, year),
    [budgets, transactions, categories, year],
  )

  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.isArchived && c.kind === 'expense'),
    [categories],
  )

  const openAdd = (period: BudgetPeriod) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ period, rollover: false })
    setModalOpen(true)
  }
  const openEdit = (budget: Budget) => {
    setEditing(budget)
    form.setFieldsValue({
      period: budget.period,
      categoryId: budget.categoryId,
      amount: budget.amount / 100,
      rollover: budget.rollover,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const input: BudgetInput = {
        period: values.period,
        year,
        month: values.period === 'monthly' ? monthNum : undefined,
        categoryId: values.categoryId || undefined,
        amount: toCents(values.amount || 0),
        rollover: values.period === 'monthly' ? values.rollover : false,
      }
      if (editing) {
        await updateBudget(editing.id, input)
        message.success('已保存')
      } else {
        await addBudget(input)
        message.success('已添加预算')
      }
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  const columns: ColumnsType<(typeof monthly)[number]> = [
    {
      title: '预算项目',
      dataIndex: 'categoryName',
      render: (name: string, item) => (
        <Space>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span>{name}</span>
          {!item.budget.categoryId && <Tag color="blue">总预算</Tag>}
        </Space>
      ),
    },
    {
      title: '预算额度',
      dataIndex: ['budget', 'amount'],
      align: 'right',
      render: (amount: number) => formatMoney(amount),
    },
    {
      title: '已支出',
      dataIndex: 'spent',
      align: 'right',
      render: (spent: number, item) => (
        <span style={{ color: item.percent > 100 ? '#f5222d' : undefined }}>{formatMoney(spent)}</span>
      ),
    },
    {
      title: '进度',
      render: (_, item) => (
        <Progress
          percent={Math.min(item.percent, 100)}
          status={item.percent > 100 ? 'exception' : 'normal'}
          strokeColor={item.percent > 100 ? '#f5222d' : item.color}
          size="small"
          style={{ width: 160 }}
        />
      ),
    },
    {
      title: '已用',
      dataIndex: 'percent',
      width: 90,
      align: 'right',
      render: (percent: number) => (
        <Typography.Text type={percent > 100 ? 'danger' : undefined}>
          {percent}%
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      width: 140,
      render: (_, item) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(item.budget)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该预算？"
            onConfirm={() => void removeBudget(item.budget.id)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          预算
        </Typography.Title>
        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(m) => m && setMonth(m)}
            allowClear={false}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openAdd('monthly')}>
            新增预算
          </Button>
        </Space>
      </Row>

      {budgets.length === 0 ? (
        <Empty description="还没有预算，点击右上角新增月度或年度预算" style={{ marginTop: 60 }} />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" title={`${year} 年 ${monthNum} 月预算`}>
            {monthly.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本月暂无预算" />
            ) : (
              <Table
                rowKey={(item) => item.budget.id}
                size="small"
                columns={columns}
                dataSource={monthly}
                pagination={false}
              />
            )}
          </Card>
          <Card size="small" title={`${year} 年年度预算`}>
            {yearly.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本年暂无年度预算">
                <Button type="link" onClick={() => openAdd('yearly')}>
                  添加年度预算
                </Button>
              </Empty>
            ) : (
              <Table
                rowKey={(item) => item.budget.id}
                size="small"
                columns={columns}
                dataSource={yearly}
                pagination={false}
              />
            )}
          </Card>
        </Space>
      )}

      <Modal
        title={editing ? '编辑预算' : '新增预算'}
        open={modalOpen}
        onOk={() => void handleSave()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ period: 'monthly', rollover: false }}>
          <Form.Item name="period" label="周期" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'monthly', label: `月度（${year} 年 ${monthNum} 月）` },
                { value: 'yearly', label: `年度（${year} 年）` },
              ]}
            />
          </Form.Item>
          <Form.Item name="categoryId" label="分类（留空为总预算）">
            <Select
              allowClear
              placeholder="选择分类，留空表示总预算"
              options={expenseCategories.map((c) => ({
                value: c.id,
                label: `${c.icon ?? ''} ${c.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="预算额度（元）" rules={[{ required: true, message: '请输入额度' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
          </Form.Item>
          <Form.Item
            name="rollover"
            label="结转未用额度（仅月度）"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
