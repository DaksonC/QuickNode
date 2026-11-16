#!/bin/bash

# 🚀 QuickNode CLI release helper
#
#   ./scripts/release.sh patch|minor|major|prerelease   (npm run release:<type>)
#       On develop (or any branch but main): runs the release checks, bumps the version,
#       commits and pushes. main only changes through a PR, so merge develop → main next.
#
#   ./scripts/release.sh tag                             (npm run release:tag)
#       On main, after that merge: runs the release checks, creates the annotated tag
#       vX.Y.Z for the current version and pushes it. Pushing the tag is what publishes
#       to npm (.github/workflows/publish.yml).
#
# The checks (npm run verify) are the same as the publish workflow's verify job, so a
# tag that passes here is not burned by a failing publish.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

fail() { echo -e "${RED}❌ $*${NC}"; exit 1; }

ACTION=${1:-patch}
case "$ACTION" in
    patch|minor|major|prerelease|tag) ;;
    *) fail "Unknown action: ${ACTION} (use patch, minor, major, prerelease or tag)" ;;
esac

CURRENT_BRANCH=$(git branch --show-current)
[[ -z $(git status --porcelain) ]] || fail "Working directory is not clean. Please commit or stash changes."

if [[ "$ACTION" == "tag" ]]; then
    [[ "$CURRENT_BRANCH" == "main" ]] || fail "Tags are created on main (current: ${CURRENT_BRANCH})"
else
    [[ "$CURRENT_BRANCH" != "main" ]] || fail "main only changes through a PR: bump on develop, merge, then run: npm run release:tag"
fi

echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull --ff-only origin "$CURRENT_BRANCH"

echo -e "${YELLOW}🧪 Running the release checks (npm run verify)...${NC}"
npm run verify

if [[ "$ACTION" == "tag" ]]; then
    TAG="v$(node -p "require('./package.json').version")"
    git fetch --tags --quiet origin
    if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
        fail "Tag ${TAG} already exists. Bump the version on develop first (npm run release:<type>)."
    fi
    git tag -a "$TAG" -m "Release ${TAG}"
    git push origin "$TAG"
    echo -e "${GREEN}🎉 ${TAG} pushed!${NC}"
    echo -e "${GREEN}🤖 The publish workflow will publish it to npm with provenance and create the GitHub Release${NC}"
    echo -e "${GREEN}🔗 https://github.com/DaksonC/QuickNode/actions/workflows/publish.yml${NC}"
    exit 0
fi

echo -e "${BLUE}📦 Current version: $(node -p "require('./package.json').version")${NC}"
NEW_VERSION=$(npm version "$ACTION" --no-git-tag-version)
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"
[[ "$ACTION" != "prerelease" ]] || echo -e "${YELLOW}ℹ️  Prereleases are published to the npm dist-tag \"next\"${NC}"

if [[ -f "CHANGELOG.md" ]]; then
    echo -e "${YELLOW}📝 Please update CHANGELOG.md manually and press Enter to continue...${NC}"
    read -r
    git add CHANGELOG.md
fi

# The docs site states the version it applies to; a test fails when it is older than the package.
echo -e "${YELLOW}📚 Updating the docs site version...${NC}"
node -e '
  const fs = require("fs");
  const file = "docs-src/site.mjs";
  const version = require("./package.json").version;
  const source = fs.readFileSync(file, "utf8");
  const updated = source.replace(/^(  version: )'"'"'[^'"'"']*'"'"',$/m, `$1'"'"'${version}'"'"',`);
  if (updated === source && !source.includes(`version: '"'"'${version}'"'"'`)) { console.error(`SITE.version not found in ${file}`); process.exit(1) }
  fs.writeFileSync(file, updated);
'
npm run docs:build
git add package.json package-lock.json docs-src/site.mjs docs
git commit -m "chore: bump version to ${NEW_VERSION}"
git push origin "$CURRENT_BRANCH"

echo -e "${BLUE}🔄 Next: open a PR ${CURRENT_BRANCH} → main. After it is merged:${NC}"
echo -e "${BLUE}   git checkout main && npm run release:tag${NC}"
