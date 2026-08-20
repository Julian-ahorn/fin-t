import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import type { FormInstance } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useDataStore } from '../store/dataStore'
import { accountBalances } from '../services/balance'
import { formatMoney, toCents } from '../utils/money'
import { formatDate } from '../utils/date'
import type { Account, Goal } from '../types'
import type { GoalInput } from '../db/repositories/goals'

interface GoalFormValues {
  name: string
  targetAmount: number
  startDate: Dayjs
  deadline?: Dayjs
  linkedAccountId?: string
  currentAmount?: number
  note?: string
}

function goalProgress(goal: Goal, balances: Map<string, number>) {
  const current = goal.linkedAccountId
    ? (balances.get(goal.linkedAccountId) ?? 0)
    : (goal.currentAmount ?? 0)
  const percent =
    goal.targetAmount > 0 ? Math.min(Math.round((current / goal.targetAmount) * 1000) / 10, 999) : 0
  return { current, percent }
}

export default function Goals() {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form] = Form.useForm<GoalFormValues>()

  const goals = useDataStore((s) => s.goals)
  const accounts = useDataStore((s) => s.accounts)
  const transactions = useDataStore((s) => s.transactions)
  const addGoal = useDataStore((s) => s.addGoal)
  const updateGoal = useDataStore((s) => s.updateGoal)
  const removeGoal = useDataStore((s) => s.removeGoal)

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of accountBalances(accounts, transactions)) {
      map.set(r.account.id, r.balance)
    }
    return map
  }, [accounts, transactions])

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ startDate: dayjs() })
    setModalOpen(true)
  }
  const openEdit = (goal: Goal) => {
    setEditing(goal)
    form.setFieldsValue({
      name: goal.name,
      targetAmount: goal.targetAmount / 100,
      startDate: dayjs(goal.startDate),
      deadline: goal.deadline ? dayjs(goal.deadline) : undefined,
      linkedAccountId: goal.linkedAccountId,
      currentAmount: goal.currentAmount ? goal.currentAmount / 100 : undefined,
      note: goal.note,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const input: GoalInput = {
        name: values.name.trim(),
        targetAmount: toCents(values.targetAmount || 0),
        startDate: values.startDate.format('YYYY-MM-DD'),
        deadline: values.deadline?.format('YYYY-MM-DD'),
        linkedAccountId: values.linkedAccountId,
        currentAmount: values.linkedAccountId ? undefined : toCents(values.currentAmount || 0),
        note: values.note?.trim() || undefined,
      }
      if (editing) {
        await updateGoal(editing.id, input)
        message.success('已保存')
      } else {
        await addGoal(input)
        message.success('已添加目标')
      }
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  if (goals.length === 0) {
    return (
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            目标
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增目标
          </Button>
        </Row>
        <Empty description="还没有目标，比如「攒钱买相机」「旅行基金」" style={{ marginTop: 60 }} />
        <Modal
          title="新增目标"
          open={modalOpen}
          onOk={() => void handleSave()}
          onCancel={() => setModalOpen(false)}
          okText="保存"
          cancelText="取消"
        >
          <GoalForm form={form} accounts={accounts} />
        </Modal>
      </div>
    )
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          目标
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增目标
        </Button>
      </Row>
      <Row gutter={[16, 16]}>
        {goals.map((goal) => {
          const { current, percent } = goalProgress(goal, balances)
          const achieved = percent >= 100
          const linked = goal.linkedAccountId ? accountMap.get(goal.linkedAccountId) : undefined
          const daysLeft = goal.deadline ? dayjs(goal.deadline).diff(dayjs(), 'day') : null
          return (
            <Col xs={24} sm={12} lg={8} key={goal.id}>
              <Card
                size="small"
                title={goal.name}
                extra={
                  <Space size={0}>
                    <Button type="link" size="small" onClick={() => openEdit(goal)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除该目标？"
                      onConfirm={() => void removeGoal(goal.id)}
                    >
                      <Button type="link" size="small" danger>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <Statistic
                  title="进度"
                  value={formatMoney(current)}
                  suffix={`/ ${formatMoney(goal.targetAmount)}`}
                  valueStyle={{ fontSize: 18 }}
                />
                <Progress
                  percent={Math.min(percent, 100)}
                  status={achieved ? 'success' : 'active'}
                  strokeColor={achieved ? '#52c41a' : '#1677ff'}
                  style={{ marginTop: 12 }}
                />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Typography.Text type="secondary">
                    起始 {formatDate(goal.startDate)}
                    {goal.deadline && ` · 截止 ${formatDate(goal.deadline)}`}
                  </Typography.Text>
                  <div>
                    {linked ? (
                      <Tag color="blue">关联账户：{linked.name}</Tag>
                    ) : (
                      <Tag>手动记录进度</Tag>
                    )}
                    {daysLeft !== null && (
                      <Tag color={daysLeft < 30 ? 'orange' : 'default'}>
                        {daysLeft >= 0 ? `剩余 ${daysLeft} 天` : `已逾期 ${-daysLeft} 天`}
                      </Tag>
                    )}
                  </div>
                  {goal.note && <Typography.Text type="secondary">备注：{goal.note}</Typography.Text>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Modal
        title={editing ? '编辑目标' : '新增目标'}
        open={modalOpen}
        onOk={() => void handleSave()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <GoalForm form={form} accounts={accounts} />
      </Modal>
    </div>
  )
}

function GoalForm({
  form,
  accounts,
}: {
  form: FormInstance<GoalFormValues>
  accounts: Account[]
}) {
  const linkedAccountId = Form.useWatch('linkedAccountId', form)
  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="目标名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input placeholder="如：攒钱买相机" />
      </Form.Item>
      <Form.Item name="targetAmount" label="目标金额（元）" rules={[{ required: true, message: '请输入金额' }]}>
        <InputNumber style={{ width: '100%' }} min={0.01} precision={2} />
      </Form.Item>
      <Form.Item name="startDate" label="开始日期" rules={[{ required: true }]}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="deadline" label="截止日期">
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="linkedAccountId" label="关联账户（可选，自动取账户余额作为进度）">
        <Select
          allowClear
          placeholder="选择账户"
          options={accounts.filter((a) => !a.isArchived).map((a) => ({ value: a.id, label: a.name }))}
        />
      </Form.Item>
      {!linkedAccountId && (
        <Form.Item name="currentAmount" label="当前已存金额（元）">
          <InputNumber style={{ width: '100%' }} min={0} precision={2} />
        </Form.Item>
      )}
      <Form.Item name="note" label="备注">
        <Input placeholder="备注（可选）" />
      </Form.Item>
    </Form>
  )
}
