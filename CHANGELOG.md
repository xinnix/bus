# 更新日志（Changelog）

本项目的版本变更日志（ADR-010：文件真理源，管理端「更新日志」页只读展示）。

**登记规则**：每次改动必须在此登记——含用户可见变化的改动递增版本号（新能力 → 次版本号，修复 → 修订号），纯内部调整并入当前版本的「变更」组；条目按类型分组（新增/变更/修复/移除/安全），新版本在最上方。写法约束见 `docs/adr/010-changelog.md`。

## [1.4.0] - 2026-11-13

### 新增

- 班次停售规则：发车时间已过 30 分钟停止售票。规则收敛在 `@sanqin/shared`（`TRIP_SALE_GRACE_MINUTES` / `isTripPurchasable`）：`POST /api/orders` 下单硬校验拒绝超时班次；班次列表接口每班次下发 `purchasable`，小程序「选择班次」页展示「已停售」标签并禁止选择（点击提示）。PRD F3 同步；集成测试新增停售拒绝用例（11/11）
- 购票页乘车日期选择下限为当天（`picker :start`），不能选过去日期；日期默认值改本地时区格式化（原 `toISOString` 在东八区深夜会退回前一天）

## [1.3.2] - 2026-11-13

### 修复

- 下单页票数选择错位：uni-app `picker` 单列 `change` 的 `detail.value` 是选中项**下标**而非数值，选「2 张」实际按 1 张下单（选 3→2、选 4→3）。改为按选项数组映射取值，合计金额同步修正

## [1.3.1] - 2026-11-13

### 修复

- 订单「已完成」状态从未流转：schema 定义了 `COMPLETED` 但核销链路无任何赋值，已核销订单永远停在待出行。现核销事务内检查订单剩余未用票，全部核销/取消后自动从 `PAID` 流转 `COMPLETED`（仅从 PAID 流转，不覆盖关闭等态；集成测试补断言）；车票页「已完成」Tab 即为该状态，仅按订单完成态归类，票未核销即使过了发车时间也留在「待出行」

## [1.3.0] - 2026-11-13

### 新增

- 电子票微信小程序码（backlog E17）：`GET /api/orders/:id/tickets/:ticketId/wxacode`（乘客 JWT + 订单归属校验）按票出图——scene=6 位核销码、page=核销页（`WXACODE_PAGE`）、目标版本 `WXACODE_ENV_VERSION`（release/trial/develop，发布前联调改 trial；`check_path` 固定 false 允许未发布出图）；`WxacodeService` 内存+磁盘（`apps/api/.cache/wxacode/`）双层缓存，每票只调一次微信 `getwxacodeunlimit`（返回实际为 JPEG，按魔数嗅探 dataURL MIME）。电子票页优先展示小程序码，接口失败静默回退本地 HMAC 矩阵码；核销页扫本小程序码带回 `path?scene=` 时自动按核销码核销（扫 HMAC 码/6 位码亦兼容，未识别提示手输）。微信「扫一扫」直达核验需小程序发布后对普通用户生效

## [1.2.1] - 2026-11-13

### 修复

- 电子票二维码不显示（QR 区域空白，仅剩票号与核销码文字）：QrCode 子组件经 uni-app mp-weixin 编译后 props（`u-p`）运行时传递失效，组件内矩阵为空。改为电子票页内直算二维码矩阵（新增 `apps/miniapp/src/utils/qr.ts`，uqrcodejs 保留），模板直接渲染 0/1 格子——不再经过子组件 props 通道；格子尺寸按模块数自适应（总宽 480rpx），生成失败降级为提示出示核销码

### 变更

- 核销页预留「微信扫小程序码直达核验」挂点：`onLoad` 解析 `scene`（URL 编码，wxacode 预定承载核销码）与 `?code=` 参数，核销员身份就绪（免密登录/密码登录成功）后自动核销；小程序码后端出图（getwxacodeunlimit + scene=核销码）列入 backlog E17

## [1.2.0] - 2026-11-13

### 新增

- 小程序新增「车票」tabbar 页（tabbar 扩为 购票/车票/我的 三项）：已购车票视角，页内「待出行（已支付）/ 已完成」过滤，卡片展示乘客、票状态（待使用/已核销/已取消）与核销码，点卡片直达电子票详情；「我的订单」页保留，仍看含待支付的全部订单

## [1.1.0] - 2026-11-13

### 新增

- 核销员身份检查与绑定（手机号一致性）：管理端录入核销员（手机号+姓名），用户微信登录并绑定手机后，后端按手机号匹配自动回填 `openid` 完成绑定——`GET /api/checker/identity`（识别+绑定，限乘客 JWT）、`POST /api/checker/openid-login`（已绑定者免密签发核销员 JWT）；小程序登录后自动检查身份，首页对核销员展示「验票工作台」入口，进入核销页免密直达工作台（原手机号+密码登录保留为后备）

## [1.0.0] - 2026-11-13

### 新增

- P0「买票 → 核销」最小闭环（PRD F1–F6，[P0 方案](docs/P0-买票核销最小闭环方案.md)）：Admin 线路/上下车点/班次模板/班次生成/订单/核销记录/核销员 7 页 + 订单详情；小程序微信登录、选站下单（Idempotency-Key 幂等 + 原子库存锁）、JSAPI 支付、电子票（HMAC 签名二维码含过期时间 + 6 位核销码）、我的订单（状态 Tab + 待支付重支付）；核销端登录/扫码/输码核销、防重复核销、按班次/日期查记录，接口限核销员 JWT
- 订单超时自动关闭（每分钟，释放库存）；支付回调 transactionId 幂等 + 金额校验 + 原始报文留痕；「回调晚于订单关闭」竞态兜底（支付流水留痕、不重开订单，退款走 P0.5）
- `GET /api/trips/:id` 班次详情接口（余票 + 上下车站点）
- 测试三件套：ticket-token 单测 5 例；P0 集成测试 8 例（下单→支付→出票→核销闭环、50 并发抢 5 座不超卖、幂等键、QR 过期拒绝、超时关闭释放库存、已支付不关单、关闭后回调竞态、金额不符拒付）；Admin E2E 票务主路径（新建线路→删除 + 票务全页面可达），e2e baseURL 支持 `ADMIN_BASE_URL`/`WEB_BASE_URL` 覆盖
- Seed：`pnpm db:seed`（seed-base.sql 直灌演示数据：2 条演示线路含返程、核销员、票务权限 p50–p81）；`pnpm db:migrate:test` + `./scripts/test-db.sh`（sanqin_bus_test 集成测试库迁移/灌数据）

### 变更

- 根 `pnpm test` 排除 e2e（对齐 CI 0.8.1 决策：e2e 需三服务 + 浏览器环境，走手动 `e2e.yml`）
- 小程序页面登记改为 `pages.config.ts` 唯一真理源（uni-pages `mergePages: false`），并清理 Vitesse-Uni 脚手架残留页面与组件（hi/coupon/handler/merchant/news/qrcode/redemption/scan/wallet）；修复死页面因旧 `pages.json` 合并回流的问题
- 我的订单支持状态筛选与待支付「去支付」；订单详情待支付/已关闭状态横幅提示；核销端会话独立存储 `checkerToken`（不再覆盖乘客登录态）；下单请求携带 Idempotency-Key
- `POST /api/orders` 返回结构统一为扁平订单（含 tickets），幂等命中与新建一致

### 修复

- tRPC 通用 CRUD 对无 `createdById`/`updatedById` 列的模型盲目注入审计字段导致创建 500（P0 票务各模型均中招）；且 Prisma 7 已移除 `_dmmf`，update 侧旧守卫静默失效。改为按 `Prisma.dmmf.datamodel` 探测字段按需注入（E2E 发现）
- 电子票二维码 token 增加过期时间校验（原 token 永不过期），密钥改读 `TICKET_TOKEN_SECRET`/`JWT_SECRET`
- 核销 verify/records 原先接受任意类型 JWT（乘客 token 可达并 500），现强制 `type=checker`

## [0.9.0] - 2026-11-04

### 新增

- Landing「更新日志」页（`/changelog`）：构建期解析根 `CHANGELOG.md`（移植 API 端 changelog.reader 三正则状态机，零新依赖）静态渲染版本时间线，类型徽章颜色语义对齐管理端；首页导航与页脚接入入口（GitHub Pages 实测 clean URL 可直达 `changelog.html`）
- Landing「框架原生 AI」板块：LLM 调用抽象 / YML 声明式工具 / YML Agent 编排三层卡片（OpenAI 兼容多厂商、apiKey AES-256-GCM 加密、token 预算熔断等真实能力，ADR-005~007/009）+ 用户端会话 / 用量看板 / Playground 纵深条

### 变更

- Landing 整体改版为浅色简洁风：`globals.css` 设计令牌全量换浅色色板（mint 绿品牌色保留），正文 Inter 化、mono 收缩到代码与标签，CLI 终端窗口刻意保留深色身份；首页版本徽章 `v0.1` → `v0.8`（过期信息修正）
- `apps/landing/next.config.ts` 补 `outputFileTracingRoot`（monorepo 追踪根，Turbopack NFT 提示缓解）

### 移除

- Landing 底部赞助/捐款栏（微信/支付宝二维码占位）及「生态网络」导航项；页脚「开源社区」改指 GitHub 仓库

## [0.8.1] - 2026-11-04

### 修复

- `.scaffold-config.json` 格式撕裂：`init-project.sh` 曾生成裸数组 `[...]`，而 CI（`jq '.apps'` → null，deploy 重启列表静默为空）与 `toggle-app.sh`（python 对 list 调 `.get` 报错）都按 `{"apps":[...]}` 包装结构读取。统一为包装格式（根因修复 init-project.sh 生成逻辑），CI 解析兼容两种历史格式，`toggle-app.sh` 默认创建列表同步移除已迁 Pages 的 landing
- CI test 长期红根因：`@sanqin/e2e` 在 CI 无浏览器且无 API/Admin/Web/PostgreSQL 服务环境，秒级失败并因 pnpm 递归 fail-fast 连带 api/admin/shared 单测一并中止。test job 排除 e2e 只跑单测（快车道），新建 `e2e.yml`（手动触发）自建完整环境跑 E2E（PG 18 service + migrate + SQL seed + 三服务 + Playwright chromium，失败时上传报告与日志）
- E2E 环境搭建三处修正：seed-base.sql 的 users 段幂等改用裸 `ON CONFLICT`（users.email 无唯一约束，历史写法在全新库上报错）；API 探活弃用不存在的 `/health` 路由（deployment.md 文档同步修正）；dev server 探活判据改为「双栈（127.0.0.1/[::1]）任一有 HTTP 响应即就绪」（web 无根路由恒 404，且 localhost 绑定栈随 runner 漂移）

## [0.8.0] - 2026-11-04

### 新增

- Landing 官网 GitHub Pages 自动部署：`landing-pages.yml` workflow（push main 触及 `apps/landing/**` 时静态导出并发布到 https://xinnix.github.io/loom/）+ `next.config.ts` 子路径支持（`NEXT_PUBLIC_BASE_PATH` 注入 `basePath`/`assetPrefix`）+ `public/.nojekyll`

### 移除

- Landing 旧 Docker/nginx 部署链路：`Dockerfile.landing`、`nginx.landing.conf`、docker-compose（local/prod）landing 服务、CI 中 landing 镜像构建与推送

## [0.7.0] - 2026-10-14

### 新增

- 变更日志机制（ADR-010）：根目录 `CHANGELOG.md` 文件真理源 + API 解析服务 + 管理端「更新日志」展示页（`/changelog`，类型筛选与搜索）；本条目即首次实践
- 每次改动登记 changelog 写入 AGENTS/CLAUDE 开发规范（开发后必做清单）

### 修复

- 管理端四个新页面的类型错误（触发器表单字段类型、用量看板 Statistic 属性、参数页视图类型），`pnpm type-check` 三端全绿

## [0.6.0] - 2026-10-14

### 新增

- LLM 调用观测层（ADR-007）：`LlmCallLog` 请求级用量流水（双缓冲写入、背压丢弃、30 天保留）+ chat/loop 双路径埋点（旁听 pi `result()`，零行为改变）+ 管理端「AI 用量」看板（`/ai/usage`，四维透视与成本归因）+ `LlmConfig` 单价字段与成本三链归因
- 平台参数中心（ADR-008）：`SettingsService` 三层读取链（数据库 → 环境变量 → 派生）+ 最小字段目录 + 管理端「平台参数」配置页（`/settings`，脱敏展示与来源标注）+ 配置注入铁律文档
- Agent 定时触发（ADR-009）：泛化 cron → run(agentSlug) 触发器、CAS 原子抢占调度（多实例幂等）、YML `triggers.cron` 运行时生效（双源：YML 管存在性、DB 管启停）、灰度门控键、管理端触发器页（`/ai/agent-triggers`）
- 管理端 StandardListPage 深链能力（`autoOpenEditParam`：URL 参数直达编辑弹窗）与前端 PermissionGuard super_admin 直通

### 变更

- LLM 静态兜底链与用量看板价格兜底切换为平台参数中心读取（数据库优先于环境变量）
- 吸收 weSale 文档方法论：`docs/README.md` 增补优先级约定与反模式清单；backlog 引入「拍板 + 触发条件」记录惯例

## [0.5.0] - 2026-10-13

### 新增

- 用户端 AI 会话（ADR-006）：用户身份 REST 触发 Agent（audience 可见性控制）、AgentSession/AgentMessage 持久化、会话历史注入、Web 聊天示范页
- 端到端测试体系最小版（E1）：Playwright 主路径（Admin CRUD / Web 登录→Todo）+ API 集成测试接入真实 PostgreSQL
- genModule 全端生成扩展（E4）：REST Controller（userId 隔离）、Admin 三件套补全、Web/小程序 API client、`--fields`/`--meta`/`--no-rest` CLI

### 变更

- API 与 Admin 开启 TS strict，端到端类型打通（E2）
- M3 关闭、M4（运行时 AI 演进）开启

## [0.4.0] - 2026-10-12

### 新增

- 框架原生 AI 三层架构（ADR-005）：pi 底座 LLM 配置层（AES-256-GCM 加密落库）+ YML 声明式工具层 + YML Agent 编排运行时（chat/loop 节点、token 预算熔断、AgentRun 审计）+ 管理端模型配置 / Agent 详情与 Playground / 工具页

## [0.3.0] - 2026-09-27

### 变更

- Landing 深色版重设计整合：替换浅色页面与字体体系，介绍更新为多 Agent 定位

## [0.2.0] - 2026-09-24

### 新增

- 多 Agent 工具支持：技能多端分发（Codex/OpenCode/ZCode，`sync-agents.sh` 镜像 + 漂移校验）

### 变更

- 文档体系按分层框架重建（vision/prd/mvp/backlog/ROADMAP 单向引用），修复全仓幽灵引用
- CI 恢复全绿：消除 miniapp lint/format 规则冲突，全仓 TypeScript 统一 5.9.3

### 修复

- 上传模块 local 模式缺陷与 OSS 凭证/URL 问题；上传组件按存储配置自动选择直传或服务端中转

## [0.1.0] - 2026-07-13

### 新增

- 脚手架基座：pnpm monorepo、双用户认证体系（Admin tRPC + User REST/微信登录）、RBAC 权限（类型安全 registry）、Todo 参考模块全端覆盖、三端标准组件（StandardListPage/StandardForm/StandardDetailPage）
- 持久化任务追踪系统与架构治理（ADR 目录、模块健康检查清单、依赖治理）
- 模块标准化推广与 genModule 代码生成（ADR-004）
