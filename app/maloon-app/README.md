# maloon-app

Cleaning-service management platform — SvelteKit 5 + Prisma + Railway.

## Developing

```sh
npm install
npm run dev
```

## Deploying

Use the deploy script from the monorepo root:

```sh
# Full deploy (build → git push → Railway)
app/maloon-app/scripts/deploy.sh -m "fix: your commit message"

# Skip Railway (rely on auto-deploy from git push)
app/maloon-app/scripts/deploy.sh --no-deploy -m "chore: css cleanup"

# Railway-only (already committed & pushed)
app/maloon-app/scripts/deploy.sh --no-build --no-push

# Just build to verify
app/maloon-app/scripts/deploy.sh --no-push --no-deploy
```

| Flag | Effect |
|------|--------|
| `--build` / `--no-build` | Run `npm run build` (default: on) |
| `--push` / `--no-push` | `git add -A && git commit -m "…" && git push` (default: on) |
| `--deploy` / `--no-deploy` | `railway up --detach` (default: on) |
| `-m "message"` | Git commit message (prompted if omitted) |
| `--dry-run` | Print what would happen without executing |
| `-h, --help` | Show full usage |

The script stops on the first failure, so you never deploy broken code.

For reference the manual steps are:

```sh
app/maloon-app/scripts/deploy.sh -m "describe your change"
```

That's it. Railway auto-deploys from git pushes on the deployed branch.

## Building (manual)

```sh
npm run build        # prisma generate + vite build
npm run preview      # preview production build locally
npm run db:push      # sync Prisma schema to database
```
