import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Button,
  Card,
  ColorPicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Alert,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useDataStore } from '../store/dataStore'
import { useUiStore } from '../store/uiStore'
import { getSetting } from '../db/repositories/settings'
import { SETTING_LAST_BACKUP } from '../types'
import {
  downloadFile,
  exportBackup,
  isBackupFile,
  transactionsToCsv,
} from '../services/backup'
import { formatDate } from '../utils/date'
import type { Category, CategoryKind, Ledger } from '../types'
import type { CategoryInput } from '../db/repositories/categories'

const EMOJI_PRESETS = ['🍜', '🚌', '🛍️', '🏠', '🎮', '💊', '📚', '🎁', '💼', '💵', '💰', '🧧', '📈', '🛒', '✈️', '🐱', '📱', '🎬', '☕', '🍺']

export default function Settings() {
  return (
    <div>
      <Typography.Title level={3}>设置</Typography.Title>
      <Tabs
        items={[
          { key: 'categories', label: '分类管理', children: <CategoryManager /> },
          { key: 'ledgers', label: '账本管理', children: <LedgerManager /> },
          { key: 'data', label: '数据管理', children: <DataManager /> },
        ]}
      />
    </div>
  )
}

/* ---------------- 分类管理 ---------------- */

interface CategoryFormValues {
  name: string
  kind: CategoryKind
  icon: string
  color: string
}

function CategoryManager() {
  const { message } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form] = Form.useForm<CategoryFormValues>()

  const categories = useDataStore((s) => s.categories)
  const transactions = useDataStore((s) => s.transactions)
  const addCategory = useDataStore((s) => s.addCategory)
  const updateCategory = useDataStore((s) => s.updateCategory)
  const removeCategory = useDataStore((s) => s.removeCategory)

  const usageCount = (categoryId: string) =>
    transactions.filter((t) => t.categoryId === categoryId).length

  const openAdd = (kind: CategoryKind) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ kind, color: '#1677ff', icon: '📦' })
    setModalOpen(true)
  }
  const openEdit = (category: Category) => {
    setEditing(category)
    form.setFieldsValue({
      name: category.name,
      kind: category.kind,
      icon: category.icon ?? '',
      color: category.color,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const input: CategoryInput = {
        name: values.name.trim(),
        kind: values.kind,
        icon: values.icon || undefined,
        color: values.color,
        sortOrder: categories.length,
      }
      if (editing) {
        await updateCategory(editing.id, input)
        message.success('已保存')
      } else {
        await addCategory(input)
        message.success('已添加分类')
      }
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  const columns: ColumnsType<Category> = [
    {
      title: '分类',
      dataIndex: 'name',
      render: (name: string, cat) => (
        <Space>
          <span style={{ fontSize: 18 }}>{cat.icon}</span>
          <span>{name}</span>
          {cat.isArchived && <Tag>已归档</Tag>}
        </Space>
      ),
    },
    { title: '颜色', dataIndex: 'color', width: 100, render: (color: string) => <Tag color={color}>{color}</Tag> },
    { title: '使用次数', width: 100, render: (_, cat) => usageCount(cat.id) },
    {
      title: '操作',
      width: 180,
      render: (_, cat) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => openEdit(cat)}>编辑</Button>
          {cat.isArchived ? (
            <Button type="link" size="small" onClick={() => void updateCategory(cat.id, { isArchived: false })}>
              恢复
            </Button>
          ) : (
            <Button type="link" size="small" onClick={() => void updateCategory(cat.id, { isArchived: true })}>
              归档
            </Button>
          )}
          <Popconfirm
            title="删除该分类？"
            description="已使用该分类的流水将显示为「未分类」"
            onConfirm={() => void removeCategory(cat.id)}
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const renderGroup = (kind: CategoryKind, label: string) => {
    const list = categories.filter((c) => c.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder)
    return (
      <Card
        size="small"
        title={label}
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openAdd(kind)}>
            添加
          </Button>
        }
      >
        {list.length === 0 ? (
          <Empty description="暂无分类" />
        ) : (
          <Table<Category> rowKey="id" size="small" columns={columns} dataSource={list} pagination={false} />
        )}
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {renderGroup('expense', '支出分类')}
      {renderGroup('income', '收入分类')}

      <Modal
        title={editing ? '编辑分类' : '添加分类'}
        open={modalOpen}
        onOk={() => void handleSave()}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：咖啡" />
          </Form.Item>
          <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
            <Radio.Group
              options={[
                { value: 'expense', label: '支出' },
                { value: 'income', label: '收入' },
              ]}
            />
          </Form.Item>
          <Form.Item name="icon" label="图标（emoji）">
            <Input placeholder="选择一个 emoji 或手动输入" />
          </Form.Item>
          <Form.Item label="快捷图标">
            <Row gutter={[8, 8]}>
              {EMOJI_PRESETS.map((emoji) => (
                <Button key={emoji} size="small" onClick={() => form.setFieldValue('icon', emoji)}>
                  {emoji}
                </Button>
              ))}
            </Row>
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <ColorPicker showText onChangeComplete={(c) => form.setFieldValue('color', c.toHexString())} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

/* ---------------- 账本管理 ---------------- */

function LedgerManager() {
  const { message, modal } = App.useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [renaming, setRenaming] = useState<Ledger | null>(null)
  const [form] = Form.useForm<{ name: string; currency: string }>()
  const [renameForm] = Form.useForm<{ name: string }>()

  const ledgers = useDataStore((s) => s.ledgers)
  const activeLedgerId = useUiStoreActiveLedgerId()
  const addLedger = useDataStore((s) => s.addLedger)
  const switchLedger = useDataStore((s) => s.switchLedger)
  const removeLedger = useDataStore((s) => s.removeLedger)
  const updateLedger = useDataStore((s) => s.updateLedger)

  const handleAdd = async () => {
    try {
      const values = await form.validateFields()
      const ledger = await addLedger(values.name.trim(), values.currency)
      await switchLedger(ledger.id)
      message.success('已创建并切换到新账本')
      setModalOpen(false)
    } catch {
      /* 校验失败 */
    }
  }

  const handleRename = async () => {
    if (!renaming) return
    const values = await renameForm.validateFields()
    await updateLedger(renaming.id, { name: values.name.trim() })
    message.success('已重命名')
    setRenaming(null)
  }

  const handleDelete = async (ledger: Ledger) => {
    if (ledgers.length <= 1) {
      message.warning('至少保留一个账本')
      return
    }
    modal.confirm({
      title: `删除账本「${ledger.name}」？`,
      content: '该账本下的账户、分类、流水、预算、目标与借贷记录将一并删除，且不可恢复。建议先导出备份。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await removeLedger(ledger.id)
        if (activeLedgerId === ledger.id && ledgers.length > 1) {
          const remaining = ledgers.find((l) => l.id !== ledger.id)
          if (remaining) await switchLedger(remaining.id)
        }
        message.success('已删除账本')
      },
    })
  }

  const columns: ColumnsType<Ledger> = [
    {
      title: '账本',
      dataIndex: 'name',
      render: (name: string, ledger) => (
        <Space>
          <span>{name}</span>
          {ledger.id === activeLedgerId && <Tag color="blue">当前</Tag>}
        </Space>
      ),
    },
    { title: '币种', dataIndex: 'currency', width: 100 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 140,
      render: (t: number) => formatDate(dayjs(t).format('YYYY-MM-DD')),
    },
    {
      title: '操作',
      width: 220,
      render: (_, ledger) => (
        <Space size={0}>
          {ledger.id !== activeLedgerId && (
            <Button type="link" size="small" onClick={() => void switchLedger(ledger.id)}>
              切换
            </Button>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => {
              setRenaming(ledger)
              renameForm.setFieldsValue({ name: ledger.name })
            }}
          >
            重命名
          </Button>
          <Popconfirm
            title="删除该账本？"
            description="账本内所有数据将一并删除"
            onConfirm={() => void handleDelete(ledger)}
          >
            <Button type="link" size="small" danger disabled={ledgers.length <= 1}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        size="small"
        title="我的账本"
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ currency: 'CNY' }); setModalOpen(true) }}>
            新增账本
          </Button>
        }
      >
        <Table<Ledger> rowKey="id" size="small" columns={columns} dataSource={ledgers} pagination={false} />
      </Card>

      <Modal
        title="新增账本"
        open={modalOpen}
        onOk={() => void handleAdd()}
        onCancel={() => setModalOpen(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ currency: 'CNY' }}>
          <Form.Item name="name" label="账本名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：家庭账本" />
          </Form.Item>
          <Form.Item name="currency" label="默认币种" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'CNY', label: '人民币 CNY' },
                { value: 'USD', label: '美元 USD' },
                { value: 'EUR', label: '欧元 EUR' },
                { value: 'HKD', label: '港币 HKD' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名账本"
        open={!!renaming}
        onOk={() => void handleRename()}
        onCancel={() => setRenaming(null)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item name="name" label="账本名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function useUiStoreActiveLedgerId() {
  return useUiStore((s) => s.activeLedgerId)
}

/* ---------------- 数据管理 ---------------- */

function DataManager() {
  const { message, modal } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null)

  const ledgers = useDataStore((s) => s.ledgers)
  const accounts = useDataStore((s) => s.accounts)
  const categories = useDataStore((s) => s.categories)
  const transactions = useDataStore((s) => s.transactions)
  const importBackup = useDataStore((s) => s.importBackup)
  const clearAllData = useDataStore((s) => s.clearAllData)
  const setLastBackupAtStore = useDataStore((s) => s.setLastBackupAt)

  const refreshLastBackup = useCallback(async () => {
    const value = await getSetting(SETTING_LAST_BACKUP)
    setLastBackupAt(value ?? null)
  }, [])

  useEffect(() => {
    void refreshLastBackup()
  }, [refreshLastBackup])

  const handleExport = async () => {
    const backup = await exportBackup()
    downloadFile(
      `fin-t-backup-${dayjs().format('YYYYMMDD-HHmmss')}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    await setLastBackupAtStore()
    await refreshLastBackup()
    message.success('已导出备份')
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      if (!isBackupFile(parsed)) {
        message.error('备份文件格式不正确或版本不兼容')
        return
      }
      modal.confirm({
        title: '导入备份？',
        content: '导入将替换当前全部数据（含所有账本），此操作不可撤销。建议先导出当前数据备份。',
        okText: '导入并覆盖',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: async () => {
          await importBackup(parsed)
          message.success('导入成功')
        },
      })
    } catch {
      message.error('文件解析失败，请确认是有效的 fin-t 备份文件')
    }
  }

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      message.info('当前账本没有流水可导出')
      return
    }
    const csv = transactionsToCsv(transactions, accounts, categories)
    downloadFile(`fin-t-流水-${dayjs().format('YYYYMMDD')}.csv`, csv, 'text/csv;charset=utf-8')
    message.success('已导出 CSV')
  }

  const handleClearAll = () => {
    modal.confirm({
      title: '清空全部数据？',
      content: '将删除所有账本、账户、流水、预算、目标与借贷记录，并重新创建默认账本。强烈建议先导出备份！',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await clearAllData()
        message.success('已清空并重置')
      },
    })
  }

  const dataSummary = useMemo(() => {
    const counts = [transactions.length, accounts.length, categories.length, ledgers.length]
    return counts
  }, [transactions, accounts, categories, ledgers])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="数据安全提示"
        description={`所有数据仅保存在浏览器本地（IndexedDB）。建议定期导出备份文件妥善保存，防止误删或浏览器数据丢失。${
          lastBackupAt ? `上次备份：${dayjs(lastBackupAt).format('YYYY-MM-DD HH:mm')}` : '尚未备份过'
        }`}
      />

      <Card size="small" title="导出">
        <Space wrap>
          <Button icon={<CloudDownloadOutlined />} onClick={() => void handleExport()}>
            导出全量备份（JSON）
          </Button>
          <Button icon={<CloudDownloadOutlined />} onClick={handleExportCsv}>
            导出当前账本流水（CSV）
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          当前账本：{transactions.length} 条流水 · {accounts.length} 个账户 · {categories.length} 个分类；共 {ledgers.length} 个账本（{dataSummary[3]}）
        </Typography.Paragraph>
      </Card>

      <Card size="small" title="导入">
        <Button icon={<CloudUploadOutlined />} onClick={() => fileInputRef.current?.click()}>
          导入备份（JSON，覆盖当前数据）
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImportFile(file)
            e.target.value = ''
          }}
        />
      </Card>

      <Card size="small" title="危险操作">
        <Popconfirm
          title="确定清空全部数据？"
          description="所有数据将被删除并重置为默认账本"
          onConfirm={() => void handleClearAll()}
        >
          <Button danger icon={<DeleteOutlined />}>
            清空全部数据
          </Button>
        </Popconfirm>
      </Card>
    </Space>
  )
}
