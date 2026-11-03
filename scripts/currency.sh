#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, and
# GitHub Actions pin behind its latest, and exits 1 if any; prints nothing when all are current.
# Reads the network.
# An action pin, <owner>/<repo>[/path]@vX.Y.Z, is compared against the repository's highest
# vX.Y.Z tag in `git ls-remote --tags`, which needs no GitHub token. It trails only when that tag
# is strictly higher; a pin in any other form is reported as one this script can't compare.
# Adapted from spike-html-apps-foundation (d5037b4): scripts/currency.sh, without the typescript
# hold and the github: branch, which nothing here uses; and from spike-html-hosting (6f1155d):
# scripts/currency.sh, its action scan over the repository's tags.
set -euo pipefail
cd "$(dirname "$0")/.."

# Errors only: mise warns on every run that a GitHub release has no assets.
outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json)
trailing=$(node -p '
  Object.entries(JSON.parse(process.argv[1]))
    .map(([tool, { requested, bump }]) => "mise.toml: " + [tool, requested, "->", bump].join(" "))
    .join("\n")
' "$outdated")

pins=$(node -p '
  const { dependencies, devDependencies } = require("./package.json");
  Object.entries({ ...dependencies, ...devDependencies })
    .map(([name, pin]) => name + " " + pin)
    .join("\n")
')
while read -r package pin; do
  latest=$(pnpm view "$package" version)
  if [[ $pin != "$latest" ]]; then
    trailing+=$'\n'"package.json: $package $pin -> $latest"
  fi
done <<<"$pins"

# behind A B: whether version A sorts strictly below version B, by version sort.
behind() {
  [[ "$1" != "$2" && "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -n 1)" == "$1" ]]
}

# latest_tag OWNER/REPO: sets latest to the repository's highest vX.Y.Z tag, or to nothing if it
# has none; only plain vX.Y.Z tags count. Each repository is listed once; latest_tag sets a
# variable rather than echoing, because a $(...) subshell would drop the cache.
declare -A latest_tags=()
latest_tag() {
  local repo=$1 refs
  if [[ -z "${latest_tags[$repo]+set}" ]]; then
    refs=$(git ls-remote --tags --refs "https://github.com/$repo.git")
    latest_tags[$repo]=$(sed -nE 's#^[0-9a-f]+\trefs/tags/(v[0-9]+\.[0-9]+\.[0-9]+)$#\1#p' <<<"$refs" |
      sort -V | tail -n 1)
  fi
  latest=${latest_tags[$repo]}
}

# Each action a workflow uses, once, against its repository's tags: the repository is the
# action's first two path segments.
uses=$(grep -ho 'uses: *[^ ]*' .github/workflows/*.yml | sed 's/uses: *//' | sort -u)
while read -r action; do
  [[ -n "$action" ]] || continue
  if [[ $action =~ ^([^/@]+/[^/@]+)[^@]*@(v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
    pin=${BASH_REMATCH[2]}
    latest_tag "${BASH_REMATCH[1]}"
    if [[ -n "$latest" ]] && behind "$pin" "$latest"; then
      trailing+=$'\n'".github/workflows: ${action%@*} $pin -> $latest"
    fi
  else
    trailing+=$'\n'".github/workflows: $action -> can't compare this form of pin"
  fi
done <<<"$uses"

if [[ -n ${trailing//$'\n'/} ]]; then
  sed '/^$/d' <<<"$trailing"
  exit 1
fi
