#!/usr/bin/env bash
set -euo pipefail

LEGACY="/Users/florian/GitHub/isle"
MODEL="${ASK_LEGACY_MODEL:-openrouter/z-ai/glm-5.2}"
NOTES="${PWD}/docs/legacy/qa-log.md"

[ -d "$LEGACY" ] || { echo "legacy checkout missing: $LEGACY" >&2; exit 1; }
[ $# -ge 1 ] || { echo "usage: ask-legacy \"question\"" >&2; exit 2; }

Q="$*"
ANSWER=$(cd "$LEGACY" && pi -p "$Q" \
  --tools read,grep,find,ls,bash \
  --no-session \
  --model "$MODEL")

mkdir -p "$(dirname "$NOTES")"
printf '\n## %s\n_%s_\n\n%s\n' "$Q" "$(date -Iseconds)" "$ANSWER" >> "$NOTES"
printf '%s\n' "$ANSWER"
