-- ============================================
-- 1. 创建权限数据
-- ============================================
INSERT INTO permissions (id, resource, action, description)
VALUES
  -- Admin CRUD
  ('p1', 'admin', 'create', '创建管理员'),
  ('p2', 'admin', 'read', '查看管理员'),
  ('p3', 'admin', 'update', '更新管理员'),
  ('p4', 'admin', 'delete', '删除管理员'),
  -- User CRUD
  ('p5', 'user', 'create', '创建用户'),
  ('p6', 'user', 'read', '查看用户'),
  ('p7', 'user', 'update', '更新用户'),
  ('p8', 'user', 'delete', '删除用户'),
  -- Role CRUD
  ('p9', 'role', 'create', '创建角色'),
  ('p10', 'role', 'read', '查看角色'),
  ('p11', 'role', 'update', '更新角色'),
  ('p12', 'role', 'delete', '删除角色'),
  -- Agent CRUD
  ('p13', 'agent', 'create', '创建 Agent'),
  ('p14', 'agent', 'read', '查看 Agent'),
  ('p15', 'agent', 'update', '更新 Agent'),
  ('p16', 'agent', 'delete', '删除 Agent'),
  -- WeCom CRUD
  ('p17', 'wecom', 'create', '创建企微配置'),
  ('p18', 'wecom', 'read', '查看企微配置'),
  ('p19', 'wecom', 'update', '更新企微配置'),
  ('p20', 'wecom', 'delete', '删除企微配置'),
  -- LLM 配置 CRUD（registry 已有，此前 seed 漏配——2026-10-14 补）
  ('p25', 'llmConfig', 'create', '创建模型配置'),
  ('p26', 'llmConfig', 'read', '查看模型配置'),
  ('p27', 'llmConfig', 'update', '更新模型配置'),
  ('p28', 'llmConfig', 'delete', '删除模型配置'),
  -- AI 工具与 Agent 运行
  ('p29', 'aiTool', 'read', '查看 AI 工具'),
  ('p30', 'agent', 'run', '运行 Agent'),
  -- AI 用量看板（ADR-007）
  ('p31', 'llmusage', 'read', '查看 AI 用量看板'),
  -- 平台参数中心（ADR-008）
  ('p39', 'settings', 'read', '查看平台参数'),
  ('p40', 'settings', 'update', '修改平台参数'),
  -- 变更日志（ADR-010）
  ('p48', 'changelog', 'read', '查看更新日志'),
  -- Agent 定时触发（ADR-009）
  ('p42', 'agentTrigger', 'create', '创建触发器'),
  ('p43', 'agentTrigger', 'read', '查看触发器'),
  ('p44', 'agentTrigger', 'update', '更新触发器'),
  ('p45', 'agentTrigger', 'delete', '删除触发器'),
  ('p46', 'agentTrigger', 'run', '手动执行触发器'),
  -- Menu visibility
  ('p32', 'menu', 'agents', 'Agent 管理菜单'),
  ('p33', 'menu', 'admins', '管理员管理菜单'),
  ('p34', 'menu', 'roles', '角色管理菜单'),
  ('p35', 'menu', 'wecom', '企业微信菜单'),
  ('p36', 'menu', 'llmConfigs', '模型配置菜单'),
  ('p37', 'menu', 'aiTools', 'AI 工具菜单'),
  ('p38', 'menu', 'llmUsage', 'AI 用量菜单'),
  ('p41', 'menu', 'settings', '平台参数菜单'),
  ('p47', 'menu', 'agentTriggers', '定时触发菜单'),
  ('p49', 'menu', 'changelog', '更新日志菜单'),
  -- P0 票务核心
  ('p50', 'line', 'create', '创建线路'),
  ('p51', 'line', 'read', '查看线路'),
  ('p52', 'line', 'update', '更新线路'),
  ('p53', 'line', 'delete', '删除线路'),
  ('p54', 'station', 'create', '创建站点'),
  ('p55', 'station', 'read', '查看站点'),
  ('p56', 'station', 'update', '更新站点'),
  ('p57', 'station', 'delete', '删除站点'),
  ('p58', 'scheduleTemplate', 'create', '创建班次模板'),
  ('p59', 'scheduleTemplate', 'read', '查看班次模板'),
  ('p60', 'scheduleTemplate', 'update', '更新班次模板'),
  ('p61', 'scheduleTemplate', 'delete', '删除班次模板'),
  ('p62', 'trip', 'create', '创建班次'),
  ('p63', 'trip', 'read', '查看班次'),
  ('p64', 'trip', 'update', '更新班次'),
  ('p65', 'trip', 'delete', '删除班次'),
  ('p66', 'order', 'read', '查看订单'),
  ('p67', 'order', 'update', '更新订单'),
  ('p82', 'order', 'refund', '订单退款'),
  ('p83', 'order', 'change', '订单改签'),
  ('p68', 'ticket', 'read', '查看车票'),
  ('p69', 'checkin', 'read', '查看核销记录'),
  ('p70', 'checkin', 'create', '执行核销'),
  ('p71', 'checker', 'create', '创建核销员'),
  ('p72', 'checker', 'read', '查看核销员'),
  ('p73', 'checker', 'update', '更新核销员'),
  ('p74', 'checker', 'delete', '删除核销员'),
  ('p75', 'menu', 'lines', '线路管理菜单'),
  ('p76', 'menu', 'stations', '站点管理菜单'),
  ('p77', 'menu', 'scheduleTemplates', '班次模板菜单'),
  ('p78', 'menu', 'trips', '班次管理菜单'),
  ('p79', 'menu', 'orders', '订单管理菜单'),
  ('p80', 'menu', 'checkins', '核销记录菜单'),
  ('p81', 'menu', 'checkers', '核销员菜单')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================
-- 2. 创建角色数据
-- ============================================
INSERT INTO roles (id, name, slug, description, level, "isSystem", "createdAt", "updatedAt")
VALUES
  ('r1', '超级管理员', 'super_admin', '系统超级管理员，拥有所有权限', 0, true, NOW(), NOW()),
  ('r2', '管理员', 'admin', '系统管理员', 100, true, NOW(), NOW()),
  ('r3', '访客', 'viewer', '只读权限管理员', 200, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. 分配权限给角色
-- ============================================
-- 超级管理员拥有所有权限
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT 'rp_' || permissions.id || '_r1', 'r1', permissions.id, NOW() FROM permissions
ON CONFLICT DO NOTHING;

-- 管理员拥有非删除权限
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT 'rp_' || permissions.id || '_r2', 'r2', permissions.id, NOW() FROM permissions
WHERE action != 'delete'
ON CONFLICT DO NOTHING;

-- 访客拥有读权限 + 菜单权限
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT 'rp_' || permissions.id || '_r3', 'r3', permissions.id, NOW() FROM permissions
WHERE action = 'read' OR resource = 'menu'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. 创建管理员用户
-- ============================================
-- 密码: password123 (bcrypt hash)
INSERT INTO admins (id, username, email, "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt")
VALUES
  ('a1', 'superadmin', 'superadmin@example.com', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', 'Super', 'Admin', true, NOW(), NOW()),
  ('a2', 'admin', 'admin@example.com', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', 'Admin', 'User', true, NOW(), NOW()),
  ('a3', 'viewer', 'viewer@example.com', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', 'Viewer', 'Admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 分配角色给管理员
INSERT INTO admin_roles (id, "adminId", "roleId", "assignedAt")
VALUES
  ('ar1', 'a1', 'r1', NOW()),
  ('ar2', 'a2', 'r2', NOW()),
  ('ar3', 'a3', 'r3', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. 创建小程序用户
-- ============================================
INSERT INTO users (id, username, email, "passwordHash", nickname, phone, "isActive", "createdAt", "updatedAt")
VALUES
  ('u1', 'user', 'user@example.com', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', '测试用户', '13800138000', true, NOW(), NOW()),
  ('u2', 'user2', 'user2@example.com', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', '测试用户2', NULL, true, NOW(), NOW())
-- users.email 无唯一约束（微信用户场景可选），用裸 ON CONFLICT 幂等
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. P0 演示线路 / 站点 / 班次 / 核销员
-- ============================================
INSERT INTO lines (id, name, "startCity", "endCity", "publishStatus", sort, "createdAt", "updatedAt")
VALUES
  ('l1', '明德理工学院-常宁宫地铁站', '西安', '太乙宫', 'PUBLISHED', 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO stations (id, name, address, lng, lat, sort, status, "createdAt", "updatedAt")
VALUES
  ('s1', '明德理工学院东门外50米路南', '东门外50米停车场', 108.788552, 34.045429, 1, 'ACTIVE', NOW(), NOW()),
  ('s2', '常宁宫地铁站D口', '常宁宫地铁站D口向东100米鱼包头街', 108.939964, 34.111774, 1, 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO line_stations (id, "lineId", "stationId", type, sort, "createdAt")
VALUES
  ('ls1', 'l1', 's1', 'BOARD', 1, NOW()),
  ('ls2', 'l1', 's2', 'ALIGHT', 1, NOW())
ON CONFLICT ("lineId", "stationId", type) DO NOTHING;

INSERT INTO schedule_templates (id, "lineId", name, "departureTime", "priceCents", "totalSeats", weekdays, status, "createdAt", "updatedAt")
VALUES
  ('st1', 'l1', '12:00 明德→常宁宫', '12:00', 10, 50, '1,2,3,4,5,6,7', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (id, "templateId", "lineId", "serviceDate", "departureTime", "priceCents", "totalSeats", "soldSeats", status, version, "createdAt", "updatedAt")
SELECT
  'trip_' || to_char(d, 'YYYYMMDD'),
  'st1',
  'l1',
  to_char(d, 'YYYY-MM-DD'),
  '12:00',
  10,
  50,
  0,
  'ON_SALE',
  0,
  NOW(),
  NOW()
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 7, '1 day') AS d
ON CONFLICT ("lineId", "serviceDate", "departureTime") DO NOTHING;

-- 演示核销员：手机号 13900000000，密码与演示管理员相同
INSERT INTO checkers (id, phone, "passwordHash", name, status, "createdAt", "updatedAt")
VALUES ('c1', '13900000000', '$2a$10$lkkKl9vU1py90sJ/IX25U.idJvyroYi2XkdAbBaxnX4oIY3BTAipa', '演示核销员', 'ACTIVE', NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

-- 第二条演示线路：反向返程线（l2）
INSERT INTO lines (id, name, "startCity", "endCity", "publishStatus", sort, "createdAt", "updatedAt")
VALUES ('l2', '常宁宫地铁站-明德理工学院', '太乙宫', '西安', 'PUBLISHED', 20, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO stations (id, name, address, lng, lat, sort, status, "createdAt", "updatedAt")
VALUES
  ('s3', '常宁宫地铁站D口（返程）', '常宁宫地铁站D口向东100米鱼包头街', 108.939964, 34.111774, 1, 'ACTIVE', NOW(), NOW()),
  ('s4', '明德理工学院东门（返程）', '东门外50米停车场', 108.788552, 34.045429, 1, 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO line_stations (id, "lineId", "stationId", type, sort, "createdAt")
VALUES
  ('ls3', 'l2', 's3', 'BOARD', 1, NOW()),
  ('ls4', 'l2', 's4', 'ALIGHT', 1, NOW())
ON CONFLICT ("lineId", "stationId", type) DO NOTHING;

INSERT INTO schedule_templates (id, "lineId", name, "departureTime", "priceCents", "totalSeats", weekdays, status, "createdAt", "updatedAt")
VALUES
  ('st2', 'l2', '17:30 常宁宫→明德', '17:30', 10, 50, '1,2,3,4,5,6,7', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (id, "templateId", "lineId", "serviceDate", "departureTime", "priceCents", "totalSeats", "soldSeats", status, version, "createdAt", "updatedAt")
SELECT
  'trip_l2_' || to_char(d, 'YYYYMMDD'),
  'st2',
  'l2',
  to_char(d, 'YYYY-MM-DD'),
  '17:30',
  10,
  50,
  0,
  'ON_SALE',
  0,
  NOW(),
  NOW()
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 7, '1 day') AS d
ON CONFLICT ("lineId", "serviceDate", "departureTime") DO NOTHING;
