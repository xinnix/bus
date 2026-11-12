#!/bin/bash
# Hook: Stop
# Runs when Claude Code session ends
# Checks for running dev servers and provides cleanup hints

# Resolve project root from git
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$PROJECT_ROOT" ]; then exit 0; fi

# Check for dev servers that might have been started by Claude
RUNNING_SERVERS=""

if lsof -i:3000 -sTCP:LISTEN &>/dev/null; then
  RUNNING_SERVERS="$RUNNING_SERVERS\n  - API server on port 3000"
fi

if lsof -i:5173 -sTCP:LISTEN &>/dev/null; then
  RUNNING_SERVERS="$RUNNING_SERVERS\n  - Admin UI on port 5173"
fi

if lsof -i:5174 -sTCP:LISTEN &>/dev/null; then
  RUNNING_SERVERS="$RUNNING_SERVERS\n  - Miniapp on port 5174"
fi

if [ -n "$RUNNING_SERVERS" ]; then
  echo "💡 检测到正在运行的 dev server："
  echo -e "$RUNNING_SERVERS"
  echo "如需停止，可运行: lsof -i:<port> -t | xargs kill"
fi

exit 0
