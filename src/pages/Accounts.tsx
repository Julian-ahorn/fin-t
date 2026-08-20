import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  ColorPicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useDataStore } from '../store/dataStore'
import { accountBalances, netWorth } from '../services/balance'
import { accountTypeMeta, ACCOUNT_TYPES } from '../constants/accountTypes'
import { formatMoney, toCents } from '../utils/money'
import type { Account, AccountType } from '../types'
import type { AccountInput } from '../db/repositories/accounts'

interface AccountFormValues {
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  color: string
}

export default function Accounts() {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form] = Form.useForm<AccountFormValues>()

  const accounts = useDataStore((s) => s.accounts)
  const transactions = useDataStore((s) => s.transactions)
  const addAccount = useDataStore((s) => s.addAccount)
  const updateAccount = useDataStore((s) => s.updateAccount)
  const archiveAccount = useDataStore((s) => s.archiveAccount)
  const removeAccount = useDataStore((s) => s.removeAccount)

  const results = useMemo(() => accountBalances(accounts, transactions), [accounts, transactions])
  const active = results.filter((r) => !r.account.isArchived)
  const archived = results.filter((r) => r.account.isArchived)

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ type: 'cash', currency: 'CNY', initialBalance: 0, color: '#1677ff' })
    setModalOpen(true)
  }
  const openEdit = (account: Account) => {
    setEditing(account)
    form.setFieldsValue({
      name: account.name,
      type: account.type,
      currency: account.currency,
      initialBalance: account.initialBalance / 100,
      color: account.color,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const input: AccountInput = {
        name: values.name.trim(),
        type: values.type,
        currency: values.currency,
        initialBalance: toCents(values.initialBalance || 0),
        color: values.color,
        sortOrder: accounts.length,
      }
      if (editing) {
        await updateAccount(editing.id, input)
        message.success('已保存')
      } else {
        await addAccount(input)
        message.success('已添加账户')
      }
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  const handleDelete = async (account: Account) => {
    const ok = await removeAccount(account.id)
    if (ok) message.success('已删除')
    else message.warning('该账户存在关联流水，无法删除，请改为归档')
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          账户
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          新增账户
        </Button>
      </Row>

      {results.length === 0 ? (
        <Empty description="还没有账户，点击右上角新增" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {active.map(({ account, balance }) => {
              const meta = accountTypeMeta(account.type)
              return (
                <Col xs={24} sm={12} lg={8} key={account.id}>
                  <Card size="small">
                    <Row justify="space-between" align="middle">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{meta.icon}</span>
                        <div>
                          <Typography.Text strong>{account.name}</Typography.Text>
                          <div>
                            <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
                              {meta.label}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      <Statistic
                        title="余额"
                        value={formatMoney(balance, account.currency)}
                        valueStyle={{ fontSize: 18, color: balance < 0 ? '#f5222d' : undefined }}
                      />
                    </Row>
                    <Row justify="space-between" style={{ marginTop: 8 }}>
                      <Button size="small" type="link" onClick={() => openEdit(account)}>
                        编辑
                      </Button>
                      <Popconfirm
                        title={account.isArchived ? '恢复该账户？' : '归档该账户？'}
                        description={account.isArchived ? undefined : '归档后仍保留历史流水，可在下方恢复'}
                        onConfirm={() => void archiveAccount(account.id, !account.isArchived)}
                      >
                        <Button size="small" type="link" danger={!account.isArchived}>
                          {account.isArchived ? '恢复' : '归档'}
                        </Button>
                      </Popconfirm>
                      <Popconfirm
                        title="删除该账户？"
                        description="仅当无关联流水时可删除"
                        onConfirm={() => void handleDelete(account)}
                      >
                        <Button size="small" type="link" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    </Row>
                  </Card>
                </Col>
              )
            })}
          </Row>

          <Card size="small" style={{ marginTop: 16 }}>
            <Statistic title="净资产（全部账户）" value={formatMoney(netWorth(results))} />
          </Card>

          {archived.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Typography.Text type="secondary">已归档账户</Typography.Text>
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                {archived.map(({ account, balance }) => (
                  <Col xs={24} sm={12} lg={8} key={account.id}>
                    <Card size="small">
                      <Row justify="space-between" align="middle">
                        <Typography.Text>{account.name}</Typography.Text>
                        <Typography.Text type="secondary">
                          {formatMoney(balance, account.currency)}
                        </Typography.Text>
                      </Row>
                      <Row justify="space-between" style={{ marginTop: 8 }}>
                        <Button size="small" type="link" onClick={() => openEdit(account)}>
                          编辑
                        </Button>
                        <Popconfirm
                          title="恢复该账户？"
                          onConfirm={() => void archiveAccount(account.id, false)}
                        >
                          <Button size="small" type="link">恢复</Button>
                        </Popconfirm>
                        <Popconfirm
                          title="删除该账户？"
                          onConfirm={() => void handleDelete(account)}
                        >
                          <Button size="small" type="link" danger>删除</Button>
                        </Popconfirm>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </>
      )}

      <Modal
        title={editing ? '编辑账户' : '新增账户'}
        open={modalOpen}
        onOk={() => void handleSave()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="账户名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：招商银行卡" />
          </Form.Item>
          <Form.Item name="type" label="账户类型" rules={[{ required: true }]}>
            <Select
              options={ACCOUNT_TYPES.map((t) => ({
                value: t.value,
                label: `${t.icon} ${t.label}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="currency" label="币种" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'CNY', label: '人民币 CNY' },
                { value: 'USD', label: '美元 USD' },
                { value: 'EUR', label: '欧元 EUR' },
                { value: 'HKD', label: '港币 HKD' },
                { value: 'JPY', label: '日元 JPY' },
              ]}
            />
          </Form.Item>
          <Form.Item name="initialBalance" label="期初余额（元）">
            <InputNumber style={{ width: '100%' }} precision={2} />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker
              showText
              onChangeComplete={(c) => form.setFieldValue('color', c.toHexString())}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
