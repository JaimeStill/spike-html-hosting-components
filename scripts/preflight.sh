#!/usr/bin/env bash
# Fails naming mise run install when a tool a task needs is missing: the node_modules tooling.
# Adapted from spike-html-apps-foundation (d5037b4): scripts/preflight.sh, prettier only and
# without the browser check.
set -euo pipefail

fail() {
  echo "preflight: $1 isn't installed; run mise run install" >&2
  exit 1
}

[[ -x node_modules/.bin/prettier ]] || fail "prettier (devDependencies)"
