#!/bin/sh
# 生产环境启动脚本（优化版）
# 特性：
# - 数据库连接预检查（5秒快速失败）
# - 多级 Prisma CLI 查找（优先本地 CLI，避免 npx 下载）
# - 无 timeout 限制（让迁移自然完成，适应慢速生产环境）
# - 可选跳过迁移（SKIP_MIGRATION=true）
# - 详细日志输出

echo "🚀 Starting Production Environment..."
cd /app

# ===== 环境检查 =====
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "⚠️  Skipping migrations and starting server anyway..."
  node dist/main.js
  exit 0
fi

echo "✅ DATABASE_URL configured"

# ===== 数据库连接预检查（5秒快速失败）=====
echo ""
echo "🔍 Pre-check: Database connectivity..."

# 解析数据库连接信息
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# 使用 timeout + nc 快速测试端口（5秒超时）
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  if timeout 5 nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
    echo "✅ Database port reachable ($DB_HOST:$DB_PORT)"
  else
    echo "⚠️  Database port unreachable after 5s"
    echo "   Possible causes:"
    echo "   - Database server down"
    echo "   - Firewall blocking"
    echo "   - Wrong host/port in DATABASE_URL"
    echo ""
    echo "⚠️  Skipping migrations and starting server..."
    node dist/main.js
    exit 0
  fi
fi

# ===== 检查是否跳过迁移 =====
if [ "$SKIP_MIGRATION" = "true" ]; then
  echo "⚠️  SKIP_MIGRATION=true, skipping database migrations"
  node dist/main.js
  exit 0
fi

# ===== 执行迁移 =====
echo ""
echo "📡 Running Database Migrations..."
cd /app/infra/database

# 创建临时 .env 文件
echo "DATABASE_URL=$DATABASE_URL" > .env

MIGRATION_SUCCESS=false

# ===== 方案1: node_modules/.bin/prisma（推荐）=====
if [ -x "/app/node_modules/.bin/prisma" ]; then
  echo "✅ Method 1: Using node_modules/.bin/prisma"
  echo "   Running migration (this may take time for slow connections)..."

  # 不使用 timeout，让迁移自然完成（生产环境可能需要几分钟）
  /app/node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma 2>&1 && {
    MIGRATION_SUCCESS=true
    echo "✅ Migration completed successfully"
  } || {
    echo "⚠️  Method 1 failed"
  }
fi

# ===== 方案2: 直接查找 prisma CLI（备选）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  PRISMA_CLI=$(find /app/node_modules -name "index.js" -path "*/prisma/build/*" 2>/dev/null | head -1)

  if [ -n "$PRISMA_CLI" ]; then
    echo "✅ Method 2: Found Prisma CLI at $PRISMA_CLI"
    echo "   Running migration (this may take time for slow connections)..."

    node "$PRISMA_CLI" migrate deploy --schema=prisma/schema.prisma 2>&1 && {
      MIGRATION_SUCCESS=true
      echo "✅ Migration completed successfully"
    } || {
      echo "⚠️  Method 2 failed"
    }
  fi
fi

# ===== 方案3: npx（最后备选）=====
if [ "$MIGRATION_SUCCESS" = "false" ]; then
  echo "⚠️  Method 3: Falling back to npx..."
  echo "   This will download Prisma CLI first (5-30s), then run migration..."

  npx --yes prisma migrate deploy --schema=prisma/schema.prisma 2>&1 && {
    MIGRATION_SUCCESS=true
    echo "✅ Migration completed successfully"
  } || {
    echo "⚠️  Method 3 failed"
  }
fi

# ===== 清理 =====
rm -f .env
cd /app

echo ""
if [ "$MIGRATION_SUCCESS" = "true" ]; then
  echo "✅ Database migrations completed successfully"
else
  echo "⚠️  Database migrations failed after all methods"
  echo "   Server will start anyway (tables might already exist)"
fi

# ===== 启动服务 =====
echo ""
echo "🌟 Starting API Server..."
echo "   tRPC endpoint: http://localhost:3000/trpc"
echo "   REST API: http://localhost:3000/api"
echo "   API docs: http://localhost:3000/api/docs"
echo ""

node dist/main.js