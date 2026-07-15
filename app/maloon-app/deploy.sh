#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# deploy.sh — Deploy Maloon App to Railway via GitHub
#
# Steps performed (by default):
#   1. Verify build compiles (npm run build)
#   2. Push Prisma schema to DB (npm run db:push)
#   3. Commit & push to GitHub → Railway auto-deploys
#
# Options:
#   --skip-build       Skip build verification step
#   --skip-db          Skip database schema push (prisma db push)
#   --skip-push        Skip git push (commit & push)
#   --db-only          Only push database schema, skip git
#   --direct           Also run `railway up --detach` after git push
#   -m, --message MSG  Commit message (prompts if not provided)
#   --dry-run          Show what would happen without executing
#   -h, --help         Show this help
# ---------------------------------------------------------------------------

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$APP_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Flags ---
SKIP_BUILD=false
SKIP_DB=false
SKIP_PUSH=false
DB_ONLY=false
DIRECT=false
DRY_RUN=false
COMMIT_MSG=""

usage() {
    echo "Usage: deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --skip-build       Skip build verification"
    echo "  --skip-db          Skip database schema push"
    echo "  --skip-push        Skip git commit & push"
    echo "  --db-only          Only push database schema (skip git entirely)"
    echo "  --direct           Also run \`railway up --detach\` after git push"
    echo "  -m, --message MSG  Commit message (required unless --skip-push or --db-only)"
    echo "  --dry-run          Print what would happen without executing"
    echo "  -h, --help         Show this help"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                          # Full deploy: build, db push, commit, push"
    echo "  ./deploy.sh --direct                 # Same + railway up for direct trigger"
    echo "  ./deploy.sh --skip-db                # Skip DB push, but build and push"
    echo "  ./deploy.sh --db-only               # Only push database schema"
    echo "  ./deploy.sh -m \"Fix login redirect\"  # Custom commit message"
    echo "  ./deploy.sh --skip-build -m \"hotfix\"  # Skip build, quick push"
    exit 0
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-build) SKIP_BUILD=true ;;
        --skip-db)    SKIP_DB=true ;;
        --skip-push)  SKIP_PUSH=true ;;
        --db-only)    DB_ONLY=true ;;
        --direct)     DIRECT=true ;;
        --dry-run)    DRY_RUN=true ;;
        -m|--message)
            shift
            COMMIT_MSG="$1"
            ;;
        -h|--help)    usage ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
    shift
done

# --- Helpers ---
step()  { echo -e "\n${BLUE}▸ $1${NC}"; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }
run()   { echo -e "  $ $1"; [[ "$DRY_RUN" == false ]] && eval "$1"; }

# --- Banner ---
echo "╔══════════════════════════════════════════╗"
echo "║   Maloon App — Deploy to Railway        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --- DB-only mode ---
if [[ "$DB_ONLY" == true ]]; then
    step "Pushing Prisma schema to database..."
    run "cd '$APP_DIR' && npm run db:push"
    ok "Database schema synced"
    exit 0
fi

# --- Validate state ---
cd "$APP_DIR"

if [[ "$DRY_RUN" == true ]]; then
    warn "DRY RUN — no changes will be made"
fi

# 1. Build verification
if [[ "$SKIP_BUILD" == false ]]; then
    step "Verifying build compiles..."
    if [[ "$DRY_RUN" == false ]]; then
        npm run build || fail "Build failed. Fix errors before deploying."
    else
        echo "  $ npm run build"
    fi
    ok "Build succeeded"
else
    warn "Skipping build verification"
fi

# 2. Database push
if [[ "$SKIP_DB" == false ]]; then
    echo ""
    echo -e "${YELLOW}Push Prisma schema to production database?${NC}"

    if [[ "$DRY_RUN" == false ]]; then
        read -p "  [y/N] " -n 1 -r REPLY
        echo
        if [[ "$REPLY" =~ ^[Yy]$ ]]; then
            step "Pushing Prisma schema..."
            npm run db:push || fail "Schema push failed"
            ok "Database schema synced"
        else
            warn "Skipping database push"
        fi
    else
        echo "  [dry-run] Would prompt for db push"
    fi
else
    warn "Skipping database push"
fi

# 3. Git status
echo ""
step "Checking git status..."
cd "$ROOT_DIR"
CHANGES=$(git status --porcelain)

if [[ -z "$CHANGES" ]]; then
    warn "No changes to commit."
    if [[ "$SKIP_PUSH" == false ]]; then
        echo ""
        echo -e "${YELLOW}Push latest commit to origin?${NC}"
        if [[ "$DRY_RUN" == false ]]; then
            read -p "  [y/N] " -n 1 -r REPLY
            echo
            if [[ "$REPLY" =~ ^[Yy]$ ]]; then
                BRANCH=$(git branch --show-current)
                step "Pushing to origin/$BRANCH..."
                run "git push origin '$BRANCH'"
                ok "Pushed to GitHub → Railway auto-deploys"

                if [[ "$DIRECT" == true ]]; then
                    if command -v railway &> /dev/null; then
                        step "Deploying directly via railway up..."
                        run "cd '$ROOT_DIR' && railway up --detach"
                        ok "Railway up triggered"
                    else
                        warn "Railway CLI not installed. Skipping --direct."
                        warn "Install with: npm i -g @railway/cli && railway link"
                    fi
                fi
            else
                warn "Skipping push"
            fi
        else
            echo "  [dry-run] Would prompt to push existing HEAD"
        fi
    fi
else
    echo "Changes detected:"
    git status --short

    if [[ "$SKIP_PUSH" == false ]]; then
        # Commit message
        if [[ -z "$COMMIT_MSG" ]]; then
            if [[ "$DRY_RUN" == false ]]; then
                echo ""
                read -p "  Commit message: " COMMIT_MSG
            fi
        fi

        if [[ -z "$COMMIT_MSG" ]]; then
            fail "Commit message is required"
        fi

        step "Staging all changes..."
        run "git add -A"

        step "Committing: $COMMIT_MSG"
        run "git commit -m '$COMMIT_MSG'"

        BRANCH=$(git branch --show-current)
        step "Pushing to origin/$BRANCH..."
        run "git push origin '$BRANCH'"

        ok "Pushed to GitHub → Railway auto-deploys"

        if [[ "$DIRECT" == true ]]; then
            if command -v railway &> /dev/null; then
                step "Deploying directly via railway up..."
                run "cd '$APP_DIR' && railway up --detach"
                ok "Railway up triggered"
            else
                warn "Railway CLI not installed. Skipping --direct."
                warn "Install with: npm i -g @railway/cli && railway link"
            fi
        fi
    else
        warn "Skipping commit & push (--skip-push)"
    fi
fi

# --- Railway status ---
if [[ "$DRY_RUN" == false && "$SKIP_PUSH" == false ]]; then
    if command -v railway &> /dev/null; then
        echo ""
        step "Railway deployment status..."
        railway status 2>/dev/null || warn "Railway CLI connected but status check failed"
        echo ""
        echo "App URL: https://discerning-nourishment-production-bba8.up.railway.app"
    else
        echo ""
        warn "Railway CLI not installed. Install with: npm i -g @railway/cli"
        echo "  Then run: railway link"
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
