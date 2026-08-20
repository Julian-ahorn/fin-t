# fin-t 记账

个人记账 Web 应用：完整记账（支出/收入/转账、多账户、多账本、分类标签）、统计报表、可视化图表、预算与目标管理、债务借贷台账、数据导入导出备份。

**纯前端、本地存储**：所有数据保存在浏览器 IndexedDB 中，无需服务器，数据完全归自己所有。

## 功能

- **记账**：支出/收入/转账三类；金额（元）、分类、账户、日期、商家/对方、备注、标签；全局快捷键 `N` 快速记一笔
- **账户**：现金/银行卡/信用卡/支付宝/微信/投资等类型，期初余额，余额实时计算，净资产汇总；可归档
- **流水**：按日期/类型/账户/分类/关键词筛选，编辑、删除、多选批量删除
- **统计报表**：近 6/12 个月收支趋势（折线）、本月环比/同比、分类占比（环形图）、分类对比（柱状图）、账户余额与收支明细、全年每日支出日历热力图
- **预算**：月度/年度、总预算或分类预算，实时进度条，超支红色警示；可结转未用额度
- **目标**：储蓄/攒钱目标，关联账户自动取余额或手动记录进度，截止日期与倒计时
- **借贷**：借出（应收）/借入（应付）台账、到期提醒、结清时可选联动记账
- **数据管理**：全量 JSON 备份导出/导入（含版本迁移）、当前账本流水 CSV 导出（Excel 可直接打开）、定期备份提醒、清空重置
- **多账本**：可创建多个账本并随时切换，各账本数据完全隔离
- **体验**：浅色/深色主题切换、示例数据一键生成

## 技术栈

- React 19 + TypeScript + Vite 6
- Ant Design 5（UI）+ dayjs（日期）
- Zustand（状态管理）+ Dexie.js（IndexedDB 封装）
- ECharts 5（按需引入的可视化图表）
- Vitest + React Testing Library（单元/组件测试）

## 快速开始

要求：Node.js ≥ 20、pnpm ≥ 9

```bash
pnpm install
pnpm dev        # 开发服务器 http://localhost:5173
```

其他命令：

```bash
pnpm build      # 类型检查 + 生产构建，产物在 dist/
pnpm preview    # 本地预览生产构建
pnpm test       # 运行测试
pnpm lint       # ESLint 检查
```

生产构建的 `dist/` 是纯静态文件，可部署到任意静态托管（GitHub Pages、Netlify、Nginx 等）。

## 部署到 GitHub Pages

项目已配置好自动部署（`.github/workflows/deploy.yml`），`base` 使用相对路径，部署在子路径下也能正常加载。步骤：

1. 安装 Git（<https://git-scm.com>）并登录 GitHub
2. 在 GitHub 新建仓库（如 `fin-t`，可设为私有）
3. 本地初始化并推送：

   ```bash
   git init
   git add .
   git commit -m "init fin-t"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/fin-t.git
   git push -u origin main
   ```

4. 打开仓库页面 → **Settings → Pages** → Source 选择 **GitHub Actions**（不要选 Branch）
5. 等待 Actions 跑完（约 1-2 分钟），访问 `https://<你的用户名>.github.io/fin-t/`

以后每次 `git push` 都会自动重新构建并发布。

> 说明：`.gitignore` 已排除 node_modules/dist 等（dist 由 Actions 构建，无需提交）。

## 数据说明

- 所有数据保存在浏览器本地 IndexedDB（数据库名 `fin-t`），**清除浏览器数据会导致丢失**
- 建议定期在「设置 → 数据管理」中导出 JSON 备份，妥善保存
- 导入备份会**整体替换**当前数据，导入前请先导出备份
- 金额内部以「分」为整数存储，避免浮点误差；界面展示为元

## 项目结构

```
src/
├─ db/                 # Dexie schema 与各实体仓储（CRUD）
├─ services/           # 纯函数业务逻辑：余额、统计聚合、预算进度、备份、示例数据
├─ store/              # Zustand：数据仓库（dataStore）+ UI 状态（uiStore）
├─ utils/              # 金额/日期工具
├─ charts/             # ECharts 按需引入与通用封装
├─ components/         # 布局、记一笔弹窗
├─ pages/              # 仪表盘/流水/报表/账户/预算/目标/借贷/设置
└─ test/               # 测试 setup（jsdom + fake-indexeddb）
```

## 路线图（可选增强）

- PWA 离线安装
- 云端同步（当前 JSON 备份即为迁移通道）
- 更多图表与导出格式（Excel xlsx）
- 多币种换算
