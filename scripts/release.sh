#!/bin/bash

# 🚀 QuickNode CLI Release Script
# Usage: ./scripts/release.sh [patch|minor|major|prerelease]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo -e "${BLUE}🚀 Starting QuickNode CLI release process...${NC}"

# Check if we're on main or develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "develop" ]]; then
    echo -e "${RED}❌ Please run this script from main or develop branch${NC}"
    exit 1
fi

# Check if working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}❌ Working directory is not clean. Please commit or stash changes.${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin $CURRENT_BRANCH

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test

# Run linting
echo -e "${YELLOW}🔍 Running linting...${NC}"
npm run lint

# Build project
echo -e "${YELLOW}🏗️ Building project...${NC}"
npm run build

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Bump version
echo -e "${YELLOW}📈 Bumping ${RELEASE_TYPE} version...${NC}"
NEW_VERSION=$(npm version $RELEASE_TYPE --no-git-tag-version)
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"

# Update CHANGELOG if it exists
if [[ -f "CHANGELOG.md" ]]; then
    echo -e "${YELLOW}📝 Please update CHANGELOG.md manually and press Enter to continue...${NC}"
    read
fi

# Commit version bump
echo -e "${YELLOW}💾 Committing version bump...${NC}"
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"

# Push to current branch
echo -e "${YELLOW}📤 Pushing to ${CURRENT_BRANCH}...${NC}"
git push origin $CURRENT_BRANCH

if [[ "$CURRENT_BRANCH" == "develop" ]]; then
    echo -e "${BLUE}🔄 To publish, create a PR from develop to main${NC}"
    echo -e "${BLUE}📝 Or merge develop into main manually${NC}"
elif [[ "$CURRENT_BRANCH" == "main" ]]; then
    echo -e "${GREEN}🎉 Version ${NEW_VERSION} pushed to main!${NC}"
    echo -e "${GREEN}🤖 GitHub Actions will automatically publish to NPM${NC}"
    echo -e "${GREEN}🔗 Check: https://github.com/daksonfilho/quicknode/actions${NC}"
fi

echo -e "${GREEN}✅ Release process completed!${NC}"
