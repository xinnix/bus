#!/bin/bash
# Hook: Schema Change
# Triggers prisma generate + shared build when schema.prisma is modified

if [[ "$FILE_PATH" == *"schema.prisma"* ]]; then
  echo "🔄 Schema change detected, running sync..."
  (cd infra/database && npx prisma generate 2>/dev/null) && \
  pnpm -C infra/shared build 2>/dev/null && \
  echo "✅ Sync complete" || \
  echo "⚠️ Sync had issues (non-blocking)"
fi

exit 0
