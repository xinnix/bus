#!/bin/sh
# 集成测试库（sanqin_bus_test）操作脚本。
# 用法：
#   ./scripts/test-db.sh migrate   # 对测试库应用迁移
#   ./scripts/test-db.sh seed      # 对测试库灌入 seed-base.sql
#   ./scripts/test-db.sh url       # 打印测试库连接串
set -e
cd "$(dirname "$0")/.."

# 从根 .env 读 DATABASE_URL（统一库实例），库名改写为 sanqin_bus_test
if [ -f .env ]; then
  BASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
else
  BASE_URL="postgresql://postgres:sanqin_dev_2026@127.0.0.1:5433/sanqin_bus"
fi

TEST_URL=$(node -e "
const u = new URL(process.argv[1] || '$BASE_URL');
u.pathname = '/sanqin_bus_test';
console.log(u.toString());
" "$BASE_URL")

case "$1" in
  url)
    echo "$TEST_URL"
    ;;
  migrate)
    echo "Applying migrations to $TEST_URL"
    DATABASE_URL="$TEST_URL" pnpm -C infra/database exec prisma migrate deploy
    ;;
  seed)
    DB_NAME=$(node -e "console.log(new URL(process.argv[1]).pathname.slice(1))" "$TEST_URL")
    # 容器内主机名用 docker 网络视图：直接用 docker exec psql 落到同名库
    docker exec -i sanqin-postgres psql -U postgres -d "$DB_NAME" < infra/database/prisma/seed-base.sql
    ;;
  *)
    echo "用法: ./scripts/test-db.sh {migrate|seed|url}"
    exit 1
    ;;
esac
