#!/usr/bin/env bash
# cursor-cn 安装 / 恢复 / 修复校验（macOS / Linux）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:-}"
case "$ACTION" in
  restore|--restore) ACTION="--restore" ;;
  fix|--fix|--fix-checksum) ACTION="--fix-checksum" ;;
  -h|--help) ACTION="--help" ;;
  *) ACTION="" ;;
esac

command -v node >/dev/null 2>&1 || { echo "[错误] 未找到 Node.js 24 或更高版本。"; exit 1; }
cd "$SCRIPT_DIR"
exec node "$SCRIPT_DIR/cursor-cn.ts" $ACTION
