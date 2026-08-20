import { Button, Layout, Menu, Select, Switch, Tooltip, Typography, theme } from 'antd'
import {
  AccountBookOutlined,
  BarChartOutlined,
  DollarOutlined,
  HomeOutlined,
  MoneyCollectOutlined,
  PieChartOutlined,
  PlusOutlined,
  SettingOutlined,
  SwapOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUiStore } from '../store/uiStore'
import { useDataStore } from '../store/dataStore'
import { useEntryShortcut } from '../hooks/useEntryShortcut'
import EntryModal from './EntryModal'

const { Sider, Header, Content } = Layout

const MENU_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: '仪表盘' },
  { key: '/transactions', icon: <AccountBookOutlined />, label: '流水' },
  { key: '/reports', icon: <BarChartOutlined />, label: '统计报表' },
  { key: '/accounts', icon: <WalletOutlined />, label: '账户' },
  { key: '/budgets', icon: <PieChartOutlined />, label: '预算' },
  { key: '/goals', icon: <DollarOutlined />, label: '目标' },
  { key: '/debts', icon: <SwapOutlined />, label: '借贷' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const themeMode = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const openEntry = useUiStore((s) => s.openEntry)
  const activeLedgerId = useUiStore((s) => s.activeLedgerId)
  const ledgers = useDataStore((s) => s.ledgers)
  const switchLedger = useDataStore((s) => s.switchLedger)
  const { token } = theme.useToken()

  useEntryShortcut(openEntry)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200} style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 18,
            color: token.colorPrimary,
          }}
        >
          <MoneyCollectOutlined />
          <span>fin-t 记账</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
            paddingInline: 24,
          }}
        >
          {ledgers.length > 1 && (
            <Select
              size="middle"
              style={{ width: 140 }}
              value={activeLedgerId ?? undefined}
              onChange={(v) => void switchLedger(v)}
              options={ledgers.map((l) => ({ value: l.id, label: l.name }))}
            />
          )}
          <Tooltip title="快捷键 N">
            <Button type="primary" icon={<PlusOutlined />} onClick={openEntry}>
              记一笔
            </Button>
          </Tooltip>
          <Tooltip title={themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
            <Switch
              checked={themeMode === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </Tooltip>
        </Header>
        <Content style={{ padding: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Content>
        <EntryModal />
      </Layout>
    </Layout>
  )
}

// 供各页占位使用
export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      <Typography.Text type="secondary">该模块正在开发中，敬请期待。</Typography.Text>
    </div>
  )
}
