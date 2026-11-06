#!/usr/bin/env bash
# Fails naming mise run install when a tool a task needs is missing: the node_modules tooling, the
# dependencies the build reads, lit and the foundation and the icons at their tags, and with
# `browser`, the pinned chrome-headless-shell.
# Adapted from spike-html-apps-components (51d2b92): scripts/preflight.sh, without marked.
set -euo pipefail

fail() {
  echo "preflight: $1 isn't installed; run mise run install" >&2
  exit 1
}

for bin in eslint prettier; do
  [[ -x node_modules/.bin/$bin ]] || fail "$bin (devDependencies)"
done
[[ -f node_modules/lit/package.json ]] || fail "lit (dependencies)"
# The foundation and the icons are peers, which the repository's devDependencies install at their
# tags.
for peer in spike-html-apps-foundation spike-html-hosting-icons; do
  [[ -f node_modules/@jaimestill/$peer/package.json ]] ||
    fail "@jaimestill/$peer (devDependencies)"
done

[[ "${1:-}" == browser ]] || exit 0
shell=$(mise which chrome-headless-shell 2>/dev/null) || fail "chrome-headless-shell"
# mise caches downloads by checksum: a version bumped without its sha256 installs the old build.
pin=$(mise current http:chrome-headless-shell)
if [[ "$("$shell" --version)" != *" $pin" ]]; then
  echo "preflight: $shell isn't chrome-headless-shell $pin; give the pin its own sha256" >&2
  exit 1
fi
