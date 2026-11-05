#!/usr/bin/env bash
# Prints `<where>: <item> <pin> -> <latest>` for each mise tool, package.json dependency, GitHub
# Actions pin, and github: devDependency's tag behind its latest, and each peer range that doesn't
# admit its package's latest release, and exits 1 if any; prints nothing when all are current.
# Reads the network.
# An action pin, <owner>/<repo>[/path]@vX.Y.Z, and a github: devDependency's tag are compared
# against the repository's highest vX.Y.Z tag in `git ls-remote --tags`, which needs no GitHub
# token. Each trails only when that tag is strictly higher; an action pin in any other form is
# reported as one this script can't compare.
# Adapted from spike-html-apps-foundation (d5037b4): scripts/currency.sh; from spike-html-hosting
# (6f1155d): scripts/currency.sh, its action scan over the repository's tags; and from
# spike-html-apps-components (51d2b92): scripts/currency.sh, its github: devDependencies, the peer
# range, and the typescript hold, each tag read from ls-remote.
set -euo pipefail
cd "$(dirname "$0")/.."

# Errors only: mise warns on every run that a GitHub release has no assets.
outdated=$(MISE_LOG_LEVEL=error mise outdated --bump --local --json)
trailing=$(node -p '
  Object.entries(JSON.parse(process.argv[1]))
    .map(([tool, { requested, bump }]) => "mise.toml: " + [tool, requested, "->", bump].join(" "))
    .join("\n")
' "$outdated")

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

pins=$(node -p '
  const { dependencies, devDependencies } = require("./package.json");
  Object.entries({ ...dependencies, ...devDependencies })
    .map(([name, pin]) => name + " " + pin)
    .join("\n")
')
typescript_eslint=$(node -p 'require("./package.json").devDependencies["typescript-eslint"]')
while read -r package pin; do
  # A github: devDependency (the foundation, the tooling) is pinned to its repository's release
  # tag, which the registry doesn't hold: its tag against that repository's highest tag.
  if [[ $pin == github:* ]]; then
    spec=${pin#github:}
    latest_tag "${spec%%#*}"
    if [[ -n "$latest" ]] && behind "${spec#*#}" "$latest"; then
      trailing+=$'\n'"package.json: $package ${spec#*#} -> $latest"
    fi
    # A peer (the foundation) is by a caret range, which must admit that latest release, so a
    # consumer can declare it beside the components: by the release test's own rule.
    range=$(node -p 'require("./package.json").peerDependencies?.[process.argv[1]] ?? ""' "$package")
    if [[ -n $range && -n $latest ]] && ! node --input-type=module -e '
      import { caretAdmits } from "./test/unit/release.ts";
      process.exit(caretAdmits(...process.argv.slice(1)) ? 0 : 1);
    ' "$range" "$latest"; then
      trailing+=$'\n'"package.json: peer $package $range -> ^${latest#v}"
    fi
    continue
  fi
  latest=$(pnpm view "$package" version)
  # typescript is held to the newest version typescript-eslint's peer range accepts.
  if [[ $package == typescript ]]; then
    range=$(pnpm view "typescript-eslint@$typescript_eslint" peerDependencies.typescript)
    accepted=$(pnpm view "typescript@$range" version --json)
    latest=$(node -p '[].concat(JSON.parse(process.argv[1])).join("\n")' "$accepted" |
      sort -V | tail -n 1)
  fi
  if [[ $pin != "$latest" ]]; then
    trailing+=$'\n'"package.json: $package $pin -> $latest"
  fi
done <<<"$pins"

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
