# 任务：P0 买票核销最小闭环

## 元信息

- **状态**：`active`（开发完成并通过全部检查，待试点部署验收）
- **分支**：`main`
- **创建**：2026-11-12
- **标签**：`feature`
- **关联**：`docs/P0-买票核销最小闭环方案.md`

## 目标

在 loom 项目内跑通「管理员维护线路/站点/班次 → 乘客小程序下单微信支付 → 电子票二维码 → 核销员扫码核销」的 P0 最小闭环。

## 检查清单

- [x] 初始化 loom 项目并清理 todo 示例（含小程序 Vitesse-Uni 残留页面）
- [x] 定义 P0 Prisma schema：Line / Station / LineStation / ScheduleTemplate / Trip / Order / Ticket / Payment / CheckIn / Checker（迁移 `init_p0` + `order_idempotency_key`）
- [x] 后端：线路、站点、班次模板、班次管理 tRPC API（trip.generate 幂等生成）
- [x] 后端：微信登录、线路/班次查询、下单（Idempotency-Key 幂等 + 原子库存锁）、支付（回调幂等 + 金额校验 + rawNotify 留痕）、订单、电子票 REST API（含 `GET /api/trips/:id`）
- [x] 后端：核销员登录、核销校验（限 checker JWT、防重复核销）、核销记录 REST API
- [x] 管理端：线路/站点/班次模板/班次/订单/核销记录页面 + 订单详情（乘客/票/支付流水）
- [x] 小程序：首页、班次列表/选站、下单、支付、我的订单（状态 Tab + 待支付重支付）、电子票
- [x] 核销端：登录（独立 checkerToken 会话）、扫码/核销码核销、核销记录
- [x] 核销员身份绑定（手机号一致性）：`GET /api/checker/identity` 识别 + 回填 openid、`POST /api/checker/openid-login` 免密签发；小程序登录后自动检查身份、首页「验票工作台」入口、核销页免密直达（2026-11-13，1.1.0）
- [x] 小程序「车票」tabbar 页：已购车票（待出行/已完成）视角、票状态 chip + 核销码、点卡片直达电子票；「我的订单」入口保留（2026-11-13，1.2.0）
- [x] 电子票二维码显示修复：子组件 props 运行时传递失效 → 页面内直算矩阵渲染（`utils/qr.ts`，格子自适应 + 失败降级）；核销页预留小程序码 scene 直达自动核销挂点（2026-11-13，1.2.1）
- [x] 电子票微信小程序码（E17）：`GET /api/orders/:id/tickets/:ticketId/wxacode`（WxacodeService 双层缓存、scene=核销码、WXACODE_ENV_VERSION 按环境）；电子票优先展示小程序码、失败回退矩阵码；核销端扫码兼容 HMAC 码/核销码/小程序码 path scene（2026-11-13，1.3.0）
- [x] 订单完成态流转：全部票核销后自动 PAID→COMPLETED（原 COMPLETED 从未赋值导致已核销订单滞留待出行）；车票页已完成仅按订单完成态归类（2026-11-13，1.3.1）
- [x] 下单页票数选择错位修复：picker change 返回下标误当数值（选 2 实际下单 1 张）（2026-11-13，1.3.2）
- [x] 班次停售规则：发车后 30 分钟停止售票（shared 规则源 + 下单硬校验 + 班次列表 purchasable 标注 + 前端「已停售」禁选）；购票页乘车日期选择下限为当天（2026-11-13，1.4.0）
- [x] 数据库迁移与 seed（1 个管理员、1 个核销员、2 条演示线路；`pnpm db:seed` 脚本化）
- [x] 集成测试：下单→支付回调→出票→核销；并发库存测试（50 并发抢 5 座不超卖）等 8 例全绿
- [x] 文档更新：ROADMAP、CHANGELOG（1.0.0）、PRD 项目化、P0 方案落点记录
- [ ] 试点部署：微信支付商户配置联调、真实小额购票 50 单验收（P0 方案 §7 末条）

## 当前状态

> **做到哪了：** 2026-11-12 主体闭环开发完成；2026-11-13 补齐缺口（下单幂等、班次详情接口、QR token 过期、核销 JWT 类型校验、支付/超时竞态防护、订单详情页、订单状态 Tab、seed 脚本化）并通过全部检查——type-check 三端绿、单测 167 绿、集成测试 8/8、Admin E2E 3/3（含发现并修复 tRPC 审计字段注入缺陷）。同日追加核销员身份绑定（手机号一致性 → openid 回填），首页「验票工作台」入口 + 免密直达核销页，集成测试增至 10/10（CHANGELOG 1.1.0）；随后新增小程序「车票」tabbar 页（已购车票视角，CHANGELOG 1.2.0）；再修复电子票二维码运行时不显示（uni-app 子组件 props 传递缺陷，改为页面内直算矩阵渲染，CHANGELOG 1.2.1），并预留核销页小程序码 scene 挂点（wxacode 出图列入 backlog E17）。
> **卡在哪：** 仅剩需要真实环境的验收项：微信支付商户号/证书联调、HTTPS 域名部署、试点 50 单。
> **下一步：** 按 P0 方案 §9 启动清单接入真实 AppID/商户号 → `start-all` 联调 → 试点部署。
> **决策上下文：** P0 只做买票与核销；单租户、单品牌小程序、单微信支付商户；退票/改签放 P0.5。REST 路径以实际实现为准（`/api/*`，见 P0 方案 §11）。

## 变更文件清单

| 文件                                                                                                       | 变更      | 原因                                                    |
| ---------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| `docs/P0-买票核销最小闭环方案.md`                                                                          | 新增      | P0 范围与执行计划（§11 落点记录）                       |
| `docs/三秦巴士-系统重建方案.md`                                                                            | 新增      | 整体重建方案                                            |
| `docs/product/prd.md`                                                                                      | 重写      | PRD 项目化（loom 模板 → 三秦巴士 F1–F6）                |
| `docs/ROADMAP.md`                                                                                          | 更新      | P0 阶段产物台账                                         |
| `CHANGELOG.md`                                                                                             | 更新      | 1.0.0 版本登记（ADR-010）                               |
| `infra/database/prisma/schema.prisma`                                                                      | 修改      | P0 业务模型 + Order.idempotencyKey                      |
| `infra/database/prisma/seed-base.sql`                                                                      | 修改      | 第二条演示线路 + 脚本化                                 |
| `apps/api/src/modules/{line,station,schedule,order,payment,checkin}`                                       | 新增      | P0 业务模块                                             |
| `apps/api/src/trpc/trpc.helper.ts`                                                                         | 修复      | 审计字段按 dmmf 探测注入                                |
| `apps/api/src/modules/checkin/{checkin.service,checkin.controller}.ts`                                     | 修改      | 核销员身份绑定：identity / openid-login（1.1.0）        |
| `apps/miniapp/src/utils/checkerIdentity.ts`                                                                | 新增      | 登录后身份检查 + storage（1.1.0）                       |
| `apps/miniapp/src/pages/tickets/index.vue`、`src/static/tab/pass-*.png`                                    | 新增      | 「车票」tabbar 页：已购车票视角（1.2.0）                |
| `apps/miniapp/src/utils/qr.ts`、`src/pages/orders/detail.vue`                                              | 修改/删除 | 电子票页面内直算二维码矩阵，删除 QrCode 子组件（1.2.1） |
| `apps/miniapp/src/pages/checker/index.vue`                                                                 | 修改      | 核销页 onLoad 解析 scene/code 自动核销挂点（1.2.1）     |
| `apps/api/src/modules/wechat/{wxacode.service,wxacode.service.spec}.ts`                                    | 新增      | 小程序码出图 + 内存/磁盘缓存（1.3.0）                   |
| `apps/api/src/modules/{order/order.controller,order/module,wechat/wechat.service,wechat/wechat.module}.ts` | 修改      | 出图端点 + env_version/check_path 支持（1.3.0）         |
| `apps/api/src/test/integration/p0-ticketing.spec.ts`                                                       | 新增      | 闭环 + 并发库存集成测试                                 |
| `apps/admin/src/modules/ticketing/`                                                                        | 新增      | 管理端票务模块（含订单详情页）                          |
| `apps/miniapp/pages.config.ts`、`src/pages/*`                                                              | 修改      | 页面登记唯一真理源 + 乘客/核销端页面                    |
| `apps/e2e/tests/admin-ticketing.spec.ts`                                                                   | 新增      | Admin 票务 E2E                                          |
| `package.json`、`scripts/test-db.sh`                                                                       | 修改      | db:seed / db:migrate:test 脚本 + test 排除 e2e          |

## 备注

- 详细范围以 `docs/P0-买票核销最小闭环方案.md` 为准；REST 路径偏差见其 §11。
- 旧系统只读调研完成，历史数据迁移不在 P0。
