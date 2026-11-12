#!/bin/bash
# Hook: after-edit
# Description: Runs after Claude edits a file
# Environment: FILE_PATH is available

# Auto-format based on file type
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.less)
    # 从 monorepo root 调用 prettier，避免子目录路径问题
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
