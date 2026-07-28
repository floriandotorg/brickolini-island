#!/usr/bin/env bash
#
# sync-worktrees.sh
#
# Bring every linked worktree of this repo onto the same commit as `hd`.
#
# For each worktree (in order) it:
#   1. rebases the worktree's branch onto the current hd
#   2. goes back to the main worktree and merges the (now rebased) branch
#      into hd with a fast-forward
#
# Because hd advances after every merge, each subsequent worktree is
# rebased onto the freshly updated hd, so they all converge on one commit.

set -euo pipefail

MAIN_BRANCH="${MAIN_BRANCH:-hd}"

# --- locate the main worktree (the one checked out on $MAIN_BRANCH) -----------
main_dir=""
cur_dir=""
while IFS= read -r line; do
  case "$line" in
    worktree\ *) cur_dir="${line#worktree }" ;;
    branch\ refs/heads/*)
      branch="${line#branch refs/heads/}"
      if [ "$branch" = "$MAIN_BRANCH" ]; then
        main_dir="$cur_dir"
      fi
      ;;
  esac
done < <(git worktree list --porcelain)

if [ -z "$main_dir" ]; then
  echo "error: could not find a worktree on branch '$MAIN_BRANCH'" >&2
  exit 1
fi

echo "main worktree: $main_dir"

# --- collect the other worktrees (dir + branch), skipping main & detached ----
declare -a wt_dirs=()
declare -a wt_branches=()
cur_dir=""
cur_branch=""

flush() {
  if [ -n "$cur_dir" ] && [ "$cur_dir" != "$main_dir" ] && [ -n "$cur_branch" ]; then
    wt_dirs+=("$cur_dir")
    wt_branches+=("$cur_branch")
  fi
  cur_dir=""
  cur_branch=""
}

while IFS= read -r line; do
  case "$line" in
    worktree\ *)
      flush
      cur_dir="${line#worktree }"
      ;;
    branch\ refs/heads/*)
      cur_branch="${line#branch refs/heads/}"
      ;;
    detached)
      cur_branch=""
      ;;
  esac
done < <(git worktree list --porcelain)
flush

if [ "${#wt_dirs[@]}" -eq 0 ]; then
  echo "no other worktrees to sync."
  exit 0
fi

# --- safety: refuse to run with a dirty tree anywhere ------------------------
check_clean() {
  local dir="$1"
  if [ -n "$(git -C "$dir" status --porcelain)" ]; then
    echo "error: worktree '$dir' has uncommitted changes; commit or stash first." >&2
    exit 1
  fi
}

check_clean "$main_dir"
for dir in "${wt_dirs[@]}"; do
  check_clean "$dir"
done

# --- the loop ----------------------------------------------------------------
for n in "${!wt_dirs[@]}"; do
  dir="${wt_dirs[$n]}"
  branch="${wt_branches[$n]}"

  echo
  echo "==> rebasing '$branch' ($dir) onto '$MAIN_BRANCH'"
  git -C "$dir" rebase "$MAIN_BRANCH"

  echo "==> merging '$branch' into '$MAIN_BRANCH' (fast-forward)"
  git -C "$main_dir" merge --ff-only "$branch"
done

# --- final pass --------------------------------------------------------------
# Each merge above advanced hd, so every worktree except the last one is now
# behind. Rebase them all onto the final hd so everything sits on one commit.
# Their commits are already in hd, so these rebases just fast-forward.
echo
echo "==> final pass: bringing every worktree up to the final '$MAIN_BRANCH'"
for n in "${!wt_dirs[@]}"; do
  dir="${wt_dirs[$n]}"
  branch="${wt_branches[$n]}"
  echo "    rebasing '$branch' ($dir)"
  git -C "$dir" rebase "$MAIN_BRANCH"
done

echo
target="$(git -C "$main_dir" rev-parse --short "$MAIN_BRANCH")"
echo "done — $MAIN_BRANCH and all worktrees are on $target"
for n in "${!wt_dirs[@]}"; do
  dir="${wt_dirs[$n]}"
  printf '    %-40s %s\n' "$dir" "$(git -C "$dir" rev-parse --short HEAD)"
done
