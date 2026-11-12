#!/bin/sh
# 移除 set -e，避免迁移失败导致容器重启循环
echo "🚀 Starting Production Environment..."

# 确保在正确的目录
cd /app

# 运行数据库迁移
echo "📡 Running Database Migrations..."

if [ -n "$DATABASE_URL" ]; then
  # 切换到 infra/database 目录以便 Prisma CLI 能找到 prisma.config.ts
  cd /app/infra/database

  # 创建临时的 .env 文件供 Prisma CLI 使用
  echo "DATABASE_URL=$DATABASE_URL" > .env
  echo "✅ Created .env file with DATABASE_URL"

  # 动态查找 Prisma CLI（避免硬编码版本路径）
  PRISMA_CLI=$(find /app/node_modules -name "prisma" -path "*/node_modules/prisma/build/index.js" | head -1)

  if [ -z "$PRISMA_CLI" ]; then
    echo "⚠️  Could not find Prisma CLI, falling back to npx..."
    # 使用 npx 并设置超时（避免无限等待）
    timeout 120 npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || echo "⚠️  Migration failed or timeout, continuing..."
  else
    echo "✅ Found Prisma CLI at: $PRISMA_CLI"
    # 使用找到的 CLI 并设置超时
    timeout 120 node $PRISMA_CLI migrate deploy --schema=prisma/schema.prisma 2>&1 || echo "⚠️  Migration failed or timeout, continuing..."
  fi

  # 清理
  rm -f .env
  echo "✅ Cleaned up .env file"

  # 切换回根目录
  cd /app
else
  echo "⚠️  DATABASE_URL not set, skipping migrations"
fi

echo "🌟 Starting Server..."
# 使用 node 直接运行编译后的代码
node dist/main.js
