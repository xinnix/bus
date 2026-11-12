#!/bin/bash
# Hook: Shared Package Change
# Triggers shared package rebuild when source files are modified
# Environment: FILE_PATH is available

if [[ "$FILE_PATH" == infra/shared/src/* ]]; then
  echo "🔄 Shared package change detected, rebuilding..."
  pnpm -C infra/shared build 2>/dev/null && echo "✅ Shared build complete" || echo "⚠️ Shared build had issues (non-blocking)"
fi

exit 0
