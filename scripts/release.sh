#!/bin/bash

# 🚀 QuickNode CLI Release Script
# Usage: ./scripts/release.sh [patch|minor|major|prerelease]
#
# On develop: bumps the version and pushes the commit (merge to main later).
# On main:    bumps the version, creates the annotated tag vX.Y.Z and pushes both.
#             Pushing the tag is what publishes to npm (.github/workflows/publish.yml).

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

RELEASE_TYPE=${1:-patch}
case "$RELEASE_TYPE" in
    patch|minor|major|prerelease) ;;
    *) echo -e "${RED}❌ Unknown release type: ${RELEASE_TYPE} (use patch, minor, major or prerelease)${NC}"; exit 1 ;;
esac

echo -e "${BLUE}🚀 Starting QuickNode CLI release process...${NC}"

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "develop" ]]; then
    echo -e "${RED}❌ Please run this script from main or develop branch${NC}"
    exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull --ff-only origin "$CURRENT_BRANCH"

echo -e "${YELLOW}🔍 Running linting...${NC}"
npm run lint

echo -e "${YELLOW}🧪 Building and running tests...${NC}"
npm test

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

if [[ "$CURRENT_BRANCH" == "main" && "$RELEASE_TYPE" == "prerelease" ]]; then
    echo -e "${YELLOW}ℹ️  Prereleases are published to the npm dist-tag \"next\"${NC}"
fi

echo -e "${YELLOW}📈 Bumping ${RELEASE_TYPE} version...${NC}"
NEW_VERSION=$(npm version "$RELEASE_TYPE" --no-git-tag-version)
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"

if [[ -f "CHANGELOG.md" ]]; then
    echo -e "${YELLOW}📝 Please update CHANGELOG.md manually and press Enter to continue...${NC}"
    read -r
    git add CHANGELOG.md
fi

echo -e "${YELLOW}💾 Committing version bump...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"

if [[ "$CURRENT_BRANCH" == "develop" ]]; then
    git push origin develop
    echo -e "${BLUE}🔄 Next: open a PR develop → main. After merging, tag the release on main:${NC}"
    echo -e "${BLUE}   git checkout main && git pull --ff-only && git tag -a ${NEW_VERSION} -m \"Release ${NEW_VERSION}\" && git push origin ${NEW_VERSION}${NC}"
else
    git tag -a "$NEW_VERSION" -m "Release ${NEW_VERSION}"
    git push --atomic origin main "$NEW_VERSION"
    echo -e "${GREEN}🎉 ${NEW_VERSION} tagged and pushed!${NC}"
    echo -e "${GREEN}🤖 The publish workflow will publish it to npm with provenance and create the GitHub Release${NC}"
    echo -e "${GREEN}🔗 Check: https://github.com/DaksonC/QuickNode/actions/workflows/publish.yml${NC}"
fi

echo -e "${GREEN}✅ Release process completed!${NC}"
