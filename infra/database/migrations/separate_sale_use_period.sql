-- 重命名优惠券模板的时间字段，分离销售期和使用期
-- 适用于全新系统，无需兼容旧数据

-- 1. 删除旧字段（如果存在）
ALTER TABLE coupon_templates
DROP COLUMN IF EXISTS valid_from,
DROP COLUMN IF EXISTS valid_until,
DROP COLUMN IF EXISTS validity_type;

-- 2. 添加新字段：销售期
ALTER TABLE coupon_templates
ADD COLUMN IF NOT EXISTS sale_from TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sale_until TIMESTAMP NOT NULL DEFAULT NOW();

-- 3. 添加新字段：使用期
ALTER TABLE coupon_templates
ADD COLUMN IF NOT EXISTS use_from TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS use_until TIMESTAMP NOT NULL DEFAULT NOW();

-- 4. 更新现有数据：设置默认的销售期和使用期
-- 假设销售期和使用期相同（可以后续根据业务需求调整）
UPDATE coupon_templates
SET
  sale_from = NOW() - INTERVAL '7 days',
  sale_until = NOW() + INTERVAL '30 days',
  use_from = NOW() + INTERVAL '0 days',  -- 立即可用
  use_until = NOW() + INTERVAL '60 days'
WHERE sale_from IS NULL OR sale_until IS NULL;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_coupon_templates_sale_period
ON coupon_templates(sale_from, sale_until);

CREATE INDEX IF NOT EXISTS idx_coupon_templates_use_period
ON coupon_templates(use_from, use_until);

-- 6. 验证结果
SELECT id, title, sale_from, sale_until, use_from, use_until, valid_days
FROM coupon_templates
LIMIT 5;