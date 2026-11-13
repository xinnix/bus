#!/bin/sh
# 灌入 seed-base.sql 到 DATABASE_URL 指向的库（默认读根 .env）
set -e
cd "$(dirname "$0")/.."
BASE_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
if [ -z "$BASE_URL" ]; then
  echo "错误：.env 中未找到 DATABASE_URL" >&2
  exit 1
fi
echo "Seeding -> $BASE_URL"
node --env-file=.env -e "
const { readFileSync } = require('fs');
const { createRequire } = require('module');
const req = createRequire('$(pwd)/apps/api/package.json');
const { Pool } = req('pg');
const sql = readFileSync('infra/database/prisma/seed-base.sql', 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(sql).then(() => { console.log('✅ seed 完成'); return pool.end(); }).catch((e) => { console.error('❌', e.message); process.exit(1); });
"
