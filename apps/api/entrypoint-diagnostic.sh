#!/bin/sh
# 生产环境启动脚本（带诊断功能）
# 用于排查数据库迁移卡住的问题

echo "🚀 Starting Production Environment..."

# 确保在正确的目录
cd /app

# ===== 数据库连接诊断 =====
echo ""
echo "🔍 Step 1: Environment Check"
echo "----------------------------------------"
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  exit 1
else
  echo "✅ DATABASE_URL is set"
  # 解析数据库连接信息（不显示密码）
  echo "   Database host: $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')"
  echo "   Database port: $(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')"
  echo "   Database name: $(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')"
fi

# ===== 数据库连通性测试 =====
echo ""
echo "🔍 Step 2: Database Connectivity Test"
echo "----------------------------------------"
# 提取数据库主机和端口
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  echo "Testing connection to $DB_HOST:$DB_PORT..."
  # 使用 nc 测试端口连通性（超时5秒）
  if timeout 5 nc -zv $DB_HOST $DB_PORT 2>&1 | grep -q "succeeded\|open"; then
    echo "✅ Database port is reachable"
  else
    echo "⚠️  Database port test timeout or failed (may be firewall blocking)"
    echo "   Continuing anyway..."
  fi
else
  echo "⚠️  Could not parse DATABASE_URL for connectivity test"
fi

# ===== Prisma CLI 检查 =====
echo ""
echo "🔍 Step 3: Prisma CLI Check"
echo "----------------------------------------"
cd /app/infra/database

# 检查 prisma.config.ts 是否存在
if [ -f "prisma.config.ts" ]; then
  echo "✅ prisma.config.ts exists"
else
  echo "❌ prisma.config.ts not found!"
  ls -la
  exit 1
fi

# 检查 schema.prisma 是否存在
if [ -f "prisma/schema.prisma" ]; then
  echo "✅ prisma/schema.prisma exists"
else
  echo "❌ prisma/schema.prisma not found!"
  ls -la prisma/
  exit 1
fi

# 创建 .env 文件
echo "DATABASE_URL=$DATABASE_URL" > .env
echo "✅ Created .env file in infra/database"

# ===== 尝试多种 Prisma CLI 调用方式 =====
echo ""
echo "🔍 Step 4: Running Prisma Migration"
echo "----------------------------------------"
echo "Attempting migration with timeout (60 seconds)..."

# 方式1: 使用 npx prisma（推荐）
MIGRATION_SUCCESS=false
echo ""
echo "Method 1: Using npx prisma..."
timeout 60 npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 && MIGRATION_SUCCESS=true || {
  echo "⚠️  Method 1 failed or timeout"
}

# 如果方式1失败，尝试方式2
if [ "$MIGRATION_SUCCESS" = false ]; then
  echo ""
  echo "Method 2: Using node direct path..."

  # 动态查找 Prisma CLI 路径（不硬编码）
  PRISMA_CLI_PATH=$(find /app/node_modules -name "prisma" -path "*/node_modules/prisma/build/index.js" | head -1)

  if [ -n "$PRISMA_CLI_PATH" ]; then
    echo "Found Prisma CLI at: $PRISMA_CLI_PATH"
    timeout 60 node $PRISMA_CLI_PATH migrate deploy --schema=prisma/schema.prisma 2>&1 && MIGRATION_SUCCESS=true || {
      echo "⚠️  Method 2 failed or timeout"
    }
  else
    echo "❌ Could not find Prisma CLI"
    ls -la /app/node_modules/.pnpm/*/node_modules/prisma/build/ 2>&1 || echo "Prisma build directory not found"
  fi
fi

# 清理 .env 文件
rm -f .env
echo ""
echo "🧹 Cleaned up .env file"

# ===== 启动应用 =====
cd /app

if [ "$MIGRATION_SUCCESS" = true ]; then
  echo ""
  echo "✅ Migration completed successfully"
  echo "🌟 Starting Server..."
  node dist/main.js
else
  echo ""
  echo "⚠️  Migration failed or timeout, but starting server anyway..."
  echo "   (Tables might already exist or migration will retry)"
  echo "🌟 Starting Server..."
  node dist/main.js
fi