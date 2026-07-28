---
name: ask-legacy
description: Ask questions about the original 1997 brick-island C++ codebase at ~/GitHub/isle. Use whenever you need to confirm how the original game implemented a feature, data format, actor, entity, cutscene, or behavior before implementing its TypeScript recreation. Runs a non-interactive pi session against the legacy checkout and appends the Q&A to docs/legacy/qa-log.md.
---

# ask-legacy

Query the original C++ codebase to ground the TypeScript port in faithful behavior.

## When to use

Use whenever you are about to implement a feature and need to confirm the original implementation:

- How an actor, entity, building, or character behaves in the original game
- Binary asset formats (`wdb`, `dta`, animation, model, mesh, tex)
- Cutscene / action structure and sequencing
- World setup, lights, boundaries, player movement
- Any "how did the original do X?" question

Implement the spec, but stay faithful to the original codebase. Run this skill first, then code to match.

## Usage

```bash
./.agents/skills/ask-legacy/ask-legacy.sh "how does the hospital world handle the pizza delivery mission?"
```

Pass the question as a single argument. The script:

1. Runs `pi -p` against `$LEGACY_ROOT` (default `~/GitHub/isle`) with read-only tools
2. Uses model `$ASK_LEGACY_MODEL` (default `openrouter/z-ai/glm-5.2`)
3. Appends the question, timestamp, and answer to `docs/legacy/qa-log.md`
4. Prints the answer to stdout

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ASK_LEGACY_MODEL` | `openrouter/z-ai/glm-5.2` | Model used for the query |

`LEGACY_ROOT` is hardcoded to `/Users/florian/GitHub/isle`.

## Notes

- The legacy session is ephemeral (`--no-session`); it does not pollute your project sessions.
- Only read-only tools (`read,grep,find,ls,bash`) are exposed to the legacy query.
- Append every Q&A to `docs/legacy/qa-log.md` so decisions are traceable.
