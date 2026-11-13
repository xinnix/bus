# 新增 tabbar「车票」页展示已购车票

## Context

小程序 tabbar 现只有「购票」「我的」两个 tab，查看已购车票需要「我的 → 我的订单 → 待出行」三级跳。目标：新增第三个 tab「车票」，以**车票视角**直接展示已购（已支付）订单的票（乘客、核销码、出行时间），点卡片进电子票详情。「我的订单」页保留不动，仍看含待支付的全部订单。

## 现状要点（已探明）

- tabbar 唯一真理源：`apps/miniapp/pages.config.ts`（mergePages 已关，pages.json 由 dev 脚本 `rm -f src/pages.json && unh dev` 自动重生成，不手改）
- 数据就绪：`GET /api/orders`（userId 隔离完备，含 `tickets[] + line + trip`），无 status 查询参数 → 沿用现有做法**前端过滤** `orderStatus`
- 复用参考：`apps/miniapp/src/pages/orders/index.vue`（列表卡片/登录守卫/`orderApi.list`）、`pages/orders/detail.vue`（电子票）、`src/api/ticketing.ts` 的 `Order/Ticket` 类型与 `orderApi`
- 登录守卫模式兼容 tab 页：无 token → `uni.navigateTo('/pages/login?redirect=...')`，登录页 `navigateBack` 回 tab 页后 `onShow` 重触发
- 图标：`src/static/tab/` 现有 4 个 PNG 双态图标，「购票」已占用 ticket 图标，新 tab 需新图标

## 改动清单

### 1. 生成新 tab 图标（2 个 PNG）

- 新增 `apps/miniapp/src/static/tab/pass-{gray,active}.png`（81×81，透明底，双色 `#7a8b9a` / `#00aeef`，与现有图标同风格：粗描边圆角矩形，做「叠放双票券」造型以区别于购票 tab 的单票）
- 用一次性 Node 脚本纯 JS 绘制生成（zlib PNG 编码，无新依赖），脚本放 `/tmp` 不进仓库

### 2. 新页面 `apps/miniapp/src/pages/tickets/index.vue`

- `definePage`: 默认导航栏 `navigationBarTitleText: '我的车票'`，背景 `#F5FAFF`（与 orders 页一致）
- `onShow` 登录守卫：无 token → `navigateTo('/pages/login?redirect=' + encodeURIComponent('/pages/tickets/index'))`
- `orderApi.list()` 拉取后前端过滤：页内状态 Tab「待出行」(`orderStatus==='PAID'`，默认) / 「已完成」(`COMPLETED`)
- 卡片内容：`line.name`、`trip.serviceDate + departureTime`、`totalAmountCents/100`、每张票 `passengerName` + 票状态 chip（`UNUSED` 待使用 / `CHECKED_IN` 已核销 / `CANCELLED` 已取消）、`checkCode` 核销码
- 点卡片 → `uni.navigateTo('/pages/orders/detail?id=...')`（电子票二维码页）
- 空态「还没有车票」→ `uni.switchTab('/pages/index')` 去购票；样式沿用 orders/index.vue 卡片风格（主题 #00aeef / #1f4e79，字色 #1f2d3d/#7a8b9a）

### 3. 注册 `apps/miniapp/pages.config.ts`

- `pages` 数组新增 `pages/tickets/index`（title「我的车票」，背景 #F5FAFF）
- `tabBar.list` 在「购票」「我的」之间插入 `{ pagePath: 'pages/tickets/index', text: '车票', iconPath: 'static/tab/pass-gray.png', selectedIconPath: 'static/tab/pass-active.png' }`（微信原生 tabBar 支持 2–5 项，2→3 无问题）

### 4. 流程文档（AGENTS.md 开发后必做）

- `CHANGELOG.md`：新能力 → 次版本号递增，「新增」组登记小程序新增车票 tab
- `docs/task/active/` 建简短任务文档，完成后移入 `completed/`；`docs/ROADMAP.md` 回写产物 + 日期

## 验证

1. `pnpm --filter miniapp type-check`（vue-tsc）通过
2. `pnpm --filter miniapp dev:mp-weixin`（P0 工作流只跑 mp-weixin dev）：
   - 编译无错，`src/pages.json` 自动重生成且 tabBar.list 含 3 项、pages 含 tickets 页
   - `dist/dev/mp-weixin` 产物中含新页面与图标
3. 提示用户在微信开发者工具确认：三 tab 展示与切换、登录态下拉出车票列表、点卡片进电子票、H5 dev（localhost）如需快速看 UI 可选跑
