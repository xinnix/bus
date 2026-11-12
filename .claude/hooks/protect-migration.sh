#!/bin/bash
# Hook: Protect Migration Files
# Prevents direct editing of Prisma migration SQL files
# Environment: FILE_PATH is available

if [[ "$FILE_PATH" == *prisma/migrations/* ]]; then
  echo "🚫 直接编辑迁移文件是危险操作！请使用 'npx prisma migrate dev' 生成迁移。"
  echo "如确实需要编辑，请在 Claude Code 中选择允许继续。"
  exit 2  # 非零退出码，Claude 会提示用户确认
fi

exit 0
