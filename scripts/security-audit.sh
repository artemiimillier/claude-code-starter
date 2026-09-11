#!/usr/bin/env bash
# Scan all tracked index blobs, including scripts/hooks/tests. Stage intended
# changes before local release checks. CI checkout populates the index from Git.
# Heuristics only: no history, personal-data, dependency or exhaustive leak audit.
# Exit 0 = no matching findings, 1 = findings, 2/nonzero = incomplete/error.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
python3 -m unittest discover -s tests -p 'test_*.py' -v
exec python3 "$ROOT/scripts/check_secrets.py" --tracked