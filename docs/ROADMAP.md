# 三秦巴士 ROADMAP

进度台账：**只记阶段状态、关键产物与日期**。任务明细见 [product/backlog.md](product/backlog.md)，功能规格见 [product/prd.md](product/prd.md)。完成后立即回写本表（不靠回忆）。

## 阶段总览

| 阶段 | 主题                            | 状态                                    | 完成时间   |
| ---- | ------------------------------- | --------------------------------------- | ---------- |
| M1   | 基础设施与核心特性              | ✅ 完成                                 | 2026-07    |
| M2   | 抽象层与模块标准化              | ✅ 完成                                 | 2026-09    |
| M3   | 全端 API 生成覆盖与工程化       | ✅ 完成                                 | 2026-10    |
| M4   | 运行时 AI 演进（AI 原生第一批） | 🔨 进行中                               | —          |
| P0   | 买票 → 核销最小闭环             | 🔨 试点部署完成，待回调验证与 50 单验收 | 2026-11-13 |

## 各阶段详情

### M1 — 基础设施与核心特性 ✅

Monorepo 脚手架骨架 + 核心能力全部就绪：双用户认证、RBAC、微信支付、文件存储、Admin/Web/Miniapp/Landing 多端应用壳、genModule 初版。

### M2 — 抽象层与模块标准化 ✅

- 三大标准组件落地并以 Todo 模块示范（[ADR-003](adr/003-standardized-ui-pattern.md)，2026-07-20）
- 架构治理就位：模块健康检查清单、ADR 机制、依赖/清理规则（2026-07-20）
- 全部业务模块完成标准化改造（[ADR-004](adr/004-module-standardization-push.md)，2026-09）
- 期间产物：Permission Registry 类型安全权限、LLM 抽象层（D6）、Todo 全端示范、createCrudRouter search/filter、抽象层 118 组件用例、上传模块三策略修复

### M3 — 全端 API 生成覆盖与工程化 ✅

生成器覆盖外部端 API 面与 Admin 三件套全量、端到端测试体系、核心包类型安全。范围定界见 PRD D7（Web/miniapp 页面个性化高，不生成，各端手写）。

- E1 测试体系最小版：Playwright E2E 主路径（Admin CRUD / Web 登录→Todo）+ API 集成测试跑真实 PostgreSQL（2026-10-13）
- E2 strict 类型安全：api/admin strict 全绿，tRPC 端到端类型打通（2026-10-13）
- E4 genModule 扩展：REST Controller（userId 隔离 + 信封契约）+ Admin 三件套补全 DetailPage + Web/miniapp API client + `--fields`/`--meta`/`--no-rest` CLI + deleteModule 清理闭环（2026-10-13）
- 期间产物（2026-10）：AI 三层架构（ADR-005，pi 底座：LlmConfig 加密配置 / YML 工具 / YML Agent 编排 + Playground，2026-10-12）

### M4 — 运行时 AI 演进（AI 原生第一批）🔨

方向与顺序见 [ai-native-roadmap.md](product/ai-native-roadmap.md) 第 3/4 步。实施前先补 ADR。

- 第 3 步完成：用户端 REST 消费 + 会话持久化（[ADR-006](adr/006-runtime-ai-user-consumption-session.md)：YML audience 可见性 / AgentSession+AgentMessage 两表 / SSE 零变更 / 历史注入首个节点 / Web 聊天示范页，2026-10-13）
- 期间产物：LLM 调用观测层（[ADR-007](adr/007-llm-call-observability.md)：LlmCallLog 请求级流水 + 双路径埋点（旁听 result() 零行为改变）+ 双缓冲写入管线 + Admin「AI 用量」看板 `/ai/usage` + LlmConfig 单价成本归因，回哺自 weSale，2026-10-14）
- 期间产物：平台参数中心（[ADR-008](adr/008-settings-platform-parameters.md)：SettingsService DB→env→derived 三层 + 最小字段目录 + Admin `/settings` 配置页 + 配置注入铁律文档，回哺自 weSale，2026-10-14）
- 期间产物：Agent 定时触发（[ADR-009](adr/009-agent-scheduled-trigger.md)：泛化 cron→run(agentSlug) + CAS 抢占 dispatcher + YML triggers.cron 运行时生效 + Admin `/ai/agent-triggers`，打开 ADR-005 MVP 边界预留项，回哺自 weSale，2026-10-14）
- 期间产物：变更日志机制（[ADR-010](adr/010-changelog.md)：CHANGELOG.md 文件真理源 + Admin `/changelog` 展示页 + 每次改动必登记的开发规范，2026-10-14）
- 期间产物：Landing 官网部署迁移 GitHub Pages（`landing-pages.yml` 子路径 `/loom` 自动部署 + `NEXT_PUBLIC_BASE_PATH` 支持，移除 Docker/nginx 旧链路，2026-11-04）
- 期间产物：Landing 浅色改版 + 框架原生 AI 板块 + `/changelog` 更新日志页（构建期解析根 CHANGELOG.md 静态渲染，与 ADR-010 文件真理源同源；移除赞助栏，2026-11-04）
- 待做：第 4 步写操作工具 + human-in-the-loop 审批链（另立 ADR）

### P0 — 买票 → 核销最小闭环 🔨

范围与验收见 [P0-买票核销最小闭环方案](P0-买票核销最小闭环方案.md)。2026-11-12 开发完成，2026-11-13 补齐缺口并通过全部检查。

- P0 数据模型落地：Line / Station / LineStation / ScheduleTemplate / Trip / Order / Ticket / Payment / Checker / CheckIn（迁移 `init_p0` + `order_idempotency_key`），金额全 Int 分，库存/核销走原子条件更新（2026-11-12）
- Admin 票务管理 7 页 + 订单详情页（乘客/票/支付流水）：线路、上下车点、班次模板、班次生成（按模板×星期×天数幂等生成）、订单、核销记录、核销员，菜单走 Permission Registry p50–p81（2026-11-12）
- 小程序乘客链路：微信登录/手机号授权 → 线路/班次查询 → 选站下单（Idempotency-Key 幂等 + 原子库存锁）→ JSAPI 支付 → 电子票（HMAC 二维码 + 6 位核销码）→ 我的订单（状态 Tab + 待支付重支付）（2026-11-12）
- 小程序「车票」tabbar 页（tabbar 扩为 购票/车票/我的）：已购车票视角「待出行/已完成」过滤、票状态与核销码展示、点卡片直达电子票详情；「我的订单」入口保留（2026-11-13）
- 核销端：手机号+密码登录（独立 checkerToken 会话）、扫码/输码核销、防重复核销（返回首次核销信息）、核销记录按班次/日期过滤、接口限核销员 JWT（2026-11-13）
- 核销员身份绑定（手机号一致性）：管理端录入核销员手机号后，乘客登录绑定手机即自动按手机号匹配回填 openid（`GET /api/checker/identity`），小程序首页对核销员展示「验票工作台」入口，进入核销页免密直达（`POST /api/checker/openid-login`，密码登录保留后备）（2026-11-13）
- 订单超时任务（每分钟关闭+释放库存）、支付回调幂等（transactionId + 金额校验 + rawNotify 留痕）、关闭后回调竞态兜底（2026-11-13）
- 测试：单测 167 绿（含 token 签名/过期 5 例）、集成测试 8 例（下单→支付→出票→核销闭环 / 50 并发不超卖 / 幂等 / 超时 / 竞态 / 金额不符）、Admin E2E 3 例（P0 线路 CRUD + 票务全页面可达 + LlmConfig 回归）（2026-11-13）
- E2E 揪出并修复通用 CRUD 审计字段注入缺陷（对无 createdById 列的模型盲目注入致创建 500，Prisma 7 `_dmmf` 已移除致 update 守卫失效），改为按 `Prisma.dmmf.datamodel` 探测按需注入（2026-11-13）
- Seed 两条演示线路（去程/返程）+ 核销员 + 票务权限，`pnpm db:seed` / `./scripts/test-db.sh` 接入脚本（2026-11-13）
- 试点部署完成：docker-compose.prod.yml（api 3010 + admin 8082，GHCR 镜像）+ 1Panel 反代 `chuxing-admin.classmaster.cn` / `chuxing-api.classmaster.cn`；公网探活全通过——admin 站 200、API 返回线路数据、支付回调端点对无效签名返回 FAIL（路由与验签在线，非 404）、admin `/trpc` 代理应答 tRPC 错误帧（2026-11-13）
- 待办：真实支付回调端到端验证（一笔 ¥0.1：支付 → 回调验签 → 出票；小程序生产包已构建 `apps/miniapp/dist/build/mp-weixin` 待传体验版）、试点 2–3 条线路 50 笔真实订单（P0 §7 末条）

## 回写规则

| 事件             | 动作                                                          |
| ---------------- | ------------------------------------------------------------- |
| 功能完成         | 对应阶段补关键产物 + 日期；epic 从 backlog 移入其「已完成」节 |
| 阶段全部完成     | 状态改 ✅ 并写完成时间；下一阶段从 ⬜ 改 🔨                   |
| 实现与规划有出入 | 以实现为准，同时检查 backlog/PRD 是否需要联动修订             |
