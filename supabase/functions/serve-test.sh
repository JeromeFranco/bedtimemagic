#!/usr/bin/env bash
set -euo pipefail

# Usage: ./serve-test.sh <function-name> [port]
# Example: ./serve-test.sh generate-story 9000

FN="${1:?Usage: serve-test.sh <function-name> [port]}"
PORT="${2:-9000}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
FN_DIR="$ROOT/$FN"

if [ ! -d "$FN_DIR" ]; then
  echo "❌ Function '$FN' not found. Available:"
  ls -1 "$ROOT" | grep -v -E '\.(sh|env|md|toml|json|lock)$' | grep -v 'test'
  exit 1
fi

# Load env.local if present
ENV_FILE="$ROOT/.env.local"
if [ -f "$ENV_FILE" ]; then
  echo "Loading $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
fi

echo "🚀 Serving $FN on http://localhost:$PORT"
echo "   Press Ctrl+C to stop"
echo ""
echo "Example curl:"
case "$FN" in
  generate-story)
    echo "   curl -X POST http://localhost:$PORT \\"
    echo "     -H 'Authorization: Bearer <jwt>' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"childId\":\"c1\",\"protagonistId\":\"barnaby\",\"childNickname\":\"Alex\",\"developmentalStage\":\"preschool\",\"tier1Challenge\":\"bedtime\",\"tier2Trigger\":\"leaving_bedroom\"}'"
    ;;
  generate-story-audio)
    echo "   curl -X POST http://localhost:$PORT \\"
    echo "     -H 'Authorization: Bearer <jwt>' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"story_text\":\"Once upon a time. A bear lived in a forest. He was very happy.\",\"max_sentences\":2}'"
    ;;
  generate-cover-image)
    echo "   curl -X POST http://localhost:$PORT \\"
    echo "     -H 'Authorization: Bearer <jwt>' \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"storyId\":\"<uuid>\",\"title\":\"Barnaby'\''s Big Night\",\"protagonist\":\"bear\",\"challenge\":\"bedtime\"}'"
    ;;
esac
echo ""

exec deno run \
  --allow-net \
  --allow-env \
  --allow-sys \
  --allow-read \
  "$FN_DIR/index.ts"
