#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FAILURES=0

for fn in "$ROOT"/*/; do
  [ -f "$fn/index.test.ts" ] || continue
  name="$(basename "$fn")"
  echo "=== Testing $name ==="
  if (cd "$fn" && deno test --no-check --allow-env --allow-sys); then
    echo "✅ $name passed"
  else
    echo "❌ $name failed"
    FAILURES=$((FAILURES + 1))
  fi
  echo
done

if [ $FAILURES -eq 0 ]; then
  echo "All tests passed ✅"
else
  echo "$FAILURES function(s) had test failures"
  exit 1
fi
