#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, and
# GitHub Actions pin behind its latest, and exits 1 if any; prints nothing when all are current.
# Reads the network.
# Adapted from spike-html-apps-foundation (d5037b4): scripts/currency.sh, without the typescript
# hold and the github: branch, which nothing here uses.
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

# Each action a workflow uses, against its repository's latest release.
uses=$(grep -ho 'uses: *[^ ]*@[^ ]*' .github/workflows/*.yml | sed 's/uses: *//' | sort -u)
while read -r action; do
  repo=$(cut -d/ -f1,2 <<<"${action%@*}")
  latest=$(gh api "repos/$repo/releases/latest" --jq .tag_name)
  if [[ ${action#*@} != "$latest" ]]; then
    trailing+=$'\n'".github/workflows: ${action%@*} ${action#*@} -> $latest"
  fi
done <<<"$uses"

if [[ -n ${trailing//$'\n'/} ]]; then
  sed '/^$/d' <<<"$trailing"
  exit 1
fi
