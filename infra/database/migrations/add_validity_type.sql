-- 添加 valid_days 和 validityType 字段到 coupon_templates 表
-- 用于支持混合有效期模式（RELATIVE | ABSOLUTE）

-- 1. 添加 valid_days 字段（如果不存在）
ALTER TABLE coupon_templates
ADD COLUMN IF NOT EXISTS valid_days INTEGER DEFAULT 30;

-- 2. 添加 validity_type 字段（已添加，保留以防重复执行）
ALTER TABLE coupon_templates
ADD COLUMN IF NOT EXISTS validity_type VARCHAR(20) DEFAULT 'RELATIVE';

-- 3. 更新现有数据为 RELATIVE 类型
UPDATE coupon_templates
SET validity_type = 'RELATIVE'
WHERE validity_type IS NULL OR validity_type = '';

-- 4. 更新现有数据的 valid_days（如果为空）
UPDATE coupon_templates
SET valid_days = 30
WHERE valid_days IS NULL;

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_coupon_templates_validity_type
ON coupon_templates(validity_type);

-- 6. 验证
SELECT id, title, valid_days, validity_type, validFrom, validUntil
FROM coupon_templates
LIMIT 5;