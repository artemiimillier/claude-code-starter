#!/usr/bin/env bash
# Daily/weekly analysis via Claude Code account (no API key needed)
# Usage: ./scripts/analyze.sh [daily|weekly]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/second-brain"
mkdir -p "$LOG_DIR"

MODE="${1:-daily}"
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
LOGFILE="$LOG_DIR/${MODE}-${TIMESTAMP}.log"

echo "[$(date)] Starting $MODE analysis..." | tee -a "$LOGFILE"

# Check claude is available
if ! command -v claude &> /dev/null; then
  echo "ERROR: claude CLI not found. Install from https://claude.ai/code" | tee -a "$LOGFILE"
  exit 1
fi

PROMPT_FILE="$SCRIPT_DIR/prompts/${MODE}-analysis.md"
if [[ "$MODE" == "weekly" ]]; then
  PROMPT_FILE="$SCRIPT_DIR/prompts/weekly-digest.md"
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: Prompt file not found: $PROMPT_FILE" | tee -a "$LOGFILE"
  exit 1
fi

# Run Claude Code non-interactively
cd "$PROJECT_DIR"
claude \
  --print \
  --allowedTools "Bash,Read,Write" \
  -p "$(cat "$PROMPT_FILE")" \
  2>&1 | tee -a "$LOGFILE"

EXIT_CODE=${PIPESTATUS[0]}
echo "[$(date)] Analysis finished with exit code $EXIT_CODE" | tee -a "$LOGFILE"
exit $EXIT_CODE
