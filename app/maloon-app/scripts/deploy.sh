#!/usr/bin/env bash
set -euo pipefail

GIT_ROOT=$(git -C "$(dirname "$0")/../.." rev-parse --show-toplevel 2>/dev/null || echo "/Users/starla/Documents/dmcg/web-maloon")
APP_DIR="$GIT_ROOT/app/maloon-app"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step()  { echo -e "${CYAN}==>${NC} $1"; }
ok()    { echo -e "${GREEN}  OK${NC} $1"; }
warn()  { echo -e "${YELLOW}  WARN${NC} $1"; }
fail()  { echo -e "${RED}  FAIL${NC} $1"; exit 1; }

DO_BUILD=true
DO_PUSH=true
DO_DEPLOY=true
COMMIT_MSG=""
DRY_RUN=false

usage() {
	cat <<EOF
deploy.sh — Build, push, and deploy the maloon-app

Usage:  scripts/deploy.sh [flags]

Flags:
  --build         Run npm run build          (default: enabled)
  --no-build      Skip the build step
  --push          Run git push               (default: enabled)
  --no-push       Skip git push
  --deploy        Run railway up --detach    (default: enabled)
  --no-deploy     Skip Railway deploy
  -m, --message    Commit message            (required when pushing)
  --dry-run       Show what would run without executing
  -h, --help      Show this help

Workflow:  build → push → deploy  (each optional; stops on first failure)
Railway auto-deploys from git pushes, so --deploy is optional extra insurance.

Examples:
  # Full deploy (build + push + railway)
  scripts/deploy.sh -m "fix: resolve nav bar issue"

  # Build and push only (rely on Railway auto-deploy)
  scripts/deploy.sh --no-deploy -m "feat: add delete buttons"

  # Railway deploy only (already committed + pushed)
  scripts/deploy.sh --no-build --no-push --deploy

  # Just build to verify it compiles
  scripts/deploy.sh --no-push --no-deploy

  # Preview what would run
  scripts/deploy.sh -m "test" --dry-run
EOF
	exit 0
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--build)       DO_BUILD=true;  shift ;;
		--no-build)    DO_BUILD=false; shift ;;
		--push)        DO_PUSH=true;   shift ;;
		--no-push)     DO_PUSH=false;  shift ;;
		--deploy)      DO_DEPLOY=true; shift ;;
		--no-deploy)   DO_DEPLOY=false; shift ;;
		--dry-run)     DRY_RUN=true;   shift ;;
		-h|--help)     usage ;;
		-m|--message)  COMMIT_MSG="$2"; shift 2 ;;
		--message=*)   COMMIT_MSG="${1#*=}"; shift ;;
		-*)            echo "Unknown flag: $1"; exit 1 ;;
		*)             COMMIT_MSG="$1"; shift ;;
	esac
done

if $DO_PUSH; then
	if $DO_PUSH && [ -z "$COMMIT_MSG" ]; then
		read -rp "Commit message: " COMMIT_MSG
		[ -z "$COMMIT_MSG" ] && fail "Commit message is required when pushing"
	fi
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}       maloon-app deploy script       ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Build:   ${GREEN}$DO_BUILD${NC}"
echo -e "  Push:    ${GREEN}$DO_PUSH${NC}  ${COMMIT_MSG:+($COMMIT_MSG)}"
echo -e "  Deploy:  ${GREEN}$DO_DEPLOY${NC}"
echo -e "  Dry-run: ${YELLOW}$DRY_RUN${NC}"
echo ""

# ---- Build ----
if $DO_BUILD; then
	step "Building app …"
	if $DRY_RUN; then
		warn "would run: npm run build (in $APP_DIR)"
	else
		npm run build --prefix "$APP_DIR" || fail "Build failed — fix errors before deploying"
		ok "Build succeeded"
	fi
fi

# ---- Git push ----
if $DO_PUSH; then
	step "Committing & pushing to git …"
	if $DRY_RUN; then
		warn "would run: git add -A && git commit -m \"$COMMIT_MSG\" && git push (in $GIT_ROOT)"
	else
		pushd "$GIT_ROOT" > /dev/null
		if [ -z "$(git status --porcelain)" ]; then
			ok "Nothing to commit — pushing anyway"
		else
			git add -A
			git commit -m "$COMMIT_MSG" || fail "Commit failed"
			ok "Committed: $COMMIT_MSG"
		fi
		git push || fail "Git push failed"
		popd > /dev/null
		ok "Push succeeded"
	fi
fi

# ---- Railway deploy ----
if $DO_DEPLOY; then
	step "Deploying to Railway …"
	if $DRY_RUN; then
		warn "would run: railway up --detach (in $APP_DIR)"
	else
		if ! command -v railway &>/dev/null; then
			fail "railway CLI not found — install from https://docs.railway.com/develop/cli"
		fi
		railway up --detach --cwd "$APP_DIR" || fail "Railway deploy failed"
		ok "Railway deploy triggered"
	fi
fi

echo ""
echo -e "${GREEN}Done.${NC}"
