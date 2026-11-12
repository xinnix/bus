#!/bin/bash
# Hook: Protect .env Files
# Blocks Claude from editing .env files to prevent secret leakage or config corruption

if echo "$FILE_PATH" | grep -qE '(\.env|\.env\.)'; then
  echo "BLOCKED: .env files should not be edited by Claude. Edit manually."
  exit 2
fi

exit 0
