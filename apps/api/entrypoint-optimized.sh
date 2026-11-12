#!/bin/sh
# 生产环境启动脚本（优化版）
echo "🚀 Starting Production Environment..."

cd /app

# ===== 数据库迁移 =====
echo "📡 Running Database Migrations..."

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migrations"
else
  cd /app/infra/database

  # 创建临时 .env 文件
  echo "DATABASE_URL=$DATABASE_URL" > .env
  echo "✅ Created .env file"

  # ===== 方案1: 使用 node_modules/.bin/prisma（最快）=====
  if [ -f "/app/node_modules/.bin/prisma" ]; then
    echo "✅ Found Prisma in node_modules/.bin"
    timeout 60 /app/node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || {
      echo "⚠️  Migration failed/timeout via .bin/prisma, trying fallback..."
    }
    MIGRATION_DONE=true
  fi

  # ===== 方案2: 直接查找 prisma CLI（避免 npx 慢）=====
  if [ "$MIGRATION_DONE" != "true" ]; then
    # 多种查找方式
    PRISMA_CLI=$(find /app/node_modules -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)

    if [ -n "$PRISMA_CLI" ]; then
      echo "✅ Found Prisma CLI: $PRISMA_CLI"
      timeout 60 node "$PRISMA_CLI" migrate deploy --schema=prisma/schema.prisma 2>&1 || {
        echo "⚠️  Migration failed/timeout, trying npx..."
      }
      MIGRATION_DONE=true
    fi
  fi

  # ===== 方案3: 使用 npx（最慢，但保底）=====
  if [ "$MIGRATION_DONE" != "true" ]; then
    echo "⚠️  Prisma CLI not found in node_modules, using npx (may be slow)..."
    # 设置更长的超时，因为 npx 需要解析包
    timeout 90 npx --yes prisma migrate deploy --schema=prisma/schema.prisma 2>&1 || {
      echo "⚠️  Migration failed/timeout via npx"
    }
  fi

  # 清理
  rm -f .env
  cd /app
  echo "✅ Migration phase completed"
fi

# ===== 启动服务 =====
echo ""
echo "🌟 Starting Server..."
node dist/main.js