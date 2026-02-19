#!/bin/bash
# Pull updates from the original claude-devtools repo and review before merging.
# Usage: ./update-from-upstream.sh

set -euo pipefail

# Ensure upstream remote exists
if ! git remote get-url upstream &>/dev/null; then
  echo "Adding upstream remote..."
  git remote add upstream https://github.com/matt1398/claude-devtools.git
fi

git fetch upstream

echo "=== Changes incoming ==="
git diff --stat main...upstream/main
echo ""

echo "=== New/changed dependencies (review carefully) ==="
git diff main...upstream/main -- package.json pnpm-lock.yaml
echo ""

echo "=== Main process changes (highest risk — full Node.js access) ==="
git diff --name-only main...upstream/main -- src/main/ src/preload/
echo ""

echo "=== Build/packaging changes ==="
git diff --name-only main...upstream/main -- electron-builder.* build/ package.json
echo ""

read -p "Proceed with merge? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git checkout main
  git merge upstream/main
  pnpm install
  echo ""
  echo "=== Running dependency audit ==="
  pnpm audit || true
  echo ""
  echo "=== Running tests ==="
  pnpm test
  echo ""
  echo "Merge complete. Review any conflicts and run 'pnpm build' when ready."
else
  echo "Aborted."
fi
