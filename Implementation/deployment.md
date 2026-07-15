# Access & Deployment Guide

## Live URLs

| Resource | URL |
|---|---|
| **Staff Portal (app)** | https://discerning-nourishment-production-bba8.up.railway.app |
| **Business Website** | https://maloonservices.com |
| **Railway Dashboard** | https://railway.app → project `discerning-nourishment` |
| **Aiven Database Console** | https://console.aiven.io |

> **⚠️ Critical:** The Staff Portal link lives in the footer of `maloonservices.com` (`assets/components/footer.html`). If the footer link breaks, users on the public site have no way to reach the portal.

---

## Project Structure (Important!)

The repo has two separate sites:

```
web-maloon/
├── index.html              ← Public marketing site (maloonservices.com)
├── assets/                 ← Public site assets
├── railway.toml            ← Tells Railway to build from app/maloon-app/
└── app/maloon-app/         ← Staff Portal (SvelteKit + Prisma + MariaDB)
    ├── package.json
    ├── prisma/
    └── src/
```

Without `railway.toml` at the repo root, Railway auto-detects the static HTML site and serves that instead of the Staff Portal. **Do not delete `railway.toml`** — it tells Railway to build from the `app/maloon-app/` subdirectory.

---

## Local Development

### Prerequisites
- Node.js v26+
- npm 11+

### Setup

```bash
cd ~/Documents/web-maloon/app/maloon-app
npm install
```

### Run dev server

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

### Build for production

```bash
npm run build
npm run preview   # test production build locally
```

---

## Deploying Updates

The Staff Portal is deployed on Railway from the `app/maloon-app/` subdirectory. Railway is configured to **auto-deploy on push** from the `main` branch. A `git push` triggers the deploy pipeline automatically.

### Method 1: Deploy script (recommended)

```bash
cd ~/Documents/web-maloon/app/maloon-app
./deploy.sh
```

The script handles the full workflow: build verification → Prisma schema sync (prompts) → commit → push to GitHub → Railway auto-deploys.

**Options:**

| Flag | Effect |
|---|---|
| (none) | Full deploy: build → db push (prompts) → commit → push |
| `--direct` | Also runs `railway up --detach` after git push |
| `--skip-build` | Skip `npm run build` verification |
| `--skip-db` | Skip `prisma db push` |
| `--skip-push` | Skip git commit & push |
| `--db-only` | Only run `npm run db:push` |
| `-m "msg"` | Commit message (bypasses prompt) |
| `--dry-run` | Print what would happen, make no changes |
| `-h` | Show help |

**Examples:**

```bash
# Full deploy (build, db push prompt, commit, push)
./deploy.sh

# Full deploy + railway up direct trigger
./deploy.sh --direct

# Quick hotfix — skip build verification and DB push
./deploy.sh --skip-build --skip-db -m "Fix login redirect"

# Only sync the database schema
./deploy.sh --db-only

# Dry run to preview what will happen
./deploy.sh --dry-run -m "Update dispatch page"
```

### Method 2: Manual git push

```bash
git add -A
git commit -m "Description of changes"
git push origin main
```

Railway auto-detects the push and deploys within ~2-3 minutes.

### Method 3: Railway CLI (direct upload)

```bash
cd ~/Documents/web-maloon/app/maloon-app
railway up --detach
```

Uploads the project directly to Railway, bypassing GitHub. Useful if GitHub auto-deploy is disabled.

### Method 4: Railway Dashboard

1. Go to https://railway.app
2. Open project `discerning-nourishment`
3. Trigger a manual deploy

### Checking deployment status

```bash
cd ~/Documents/web-maloon/app/maloon-app
railway status
```

### Viewing logs

```bash
cd ~/Documents/web-maloon/app/maloon-app
railway logs
```

---

## Environment Variables

Set in Railway dashboard (already configured):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Aiven MySQL connection string |
| `AIVEN_CA_BASE64` | Base64-encoded CA certificate for SSL |

To update these:

```bash
cd ~/Documents/web-maloon/app/maloon-app
railway variables set KEY="value"
```

Or via Railway dashboard → project → Variables.

---

## Database Access

### Connection Details

| Field | Value |
|---|---|
| **Host** | `mysql-3fdcb96b-mcs.g.aivencloud.com` |
| **Port** | `21994` |
| **User** | `avnadmin` |
| **Database** | `defaultdb` |
| **SSL** | Required (CA cert in `prisma/aiven-ca.pem`) |

### Connecting with MySQL CLI

```bash
mysql -h mysql-3fdcb96b-mcs.g.aivencloud.com \
  -P 21994 \
  -u avnadmin \
  -p \
  --ssl-ca=prisma/aiven-ca.pem \
  defaultdb
```

### Running migrations

After schema changes (`prisma/schema.prisma`):

```bash
cd ~/Documents/web-maloon/app/maloon-app

# Push schema to database (no migration files — recommended)
npm run db:push

# Or use the deploy script for DB-only
./deploy.sh --db-only

# OR create migration files + apply (for versioned migrations)
npx prisma migrate dev
```

### Seeding line items

```bash
cd ~/Documents/web-maloon/app/maloon-app
node -e "
// Seed script — re-runs the 9 default line items
import('dotenv/config');
import('@prisma/client').then(({PrismaClient})=>{
  import('@prisma/adapter-mariadb').then(({PrismaMariaDb})=>{
    import('fs').then(fs=>{
      const dbUrl=new URL(process.env.DATABASE_URL);
      const adapter=new PrismaMariaDb({
        host:dbUrl.hostname,port:Number(dbUrl.port),
        user:dbUrl.username,password:dbUrl.password,
        database:dbUrl.pathname.replace('/',''),
        ssl:{ca:fs.readFileSync('prisma/aiven-ca.pem')},connectTimeout:10000
      });
      const p=new PrismaClient({adapter});
      const items=[{name:'Bathroom',basePrice:35,hasSizeMod:true,sizeSmall:25,sizeMedium:35,sizeLarge:50},{name:'Kitchen',basePrice:40,hasSizeMod:true,sizeSmall:30,sizeMedium:40,sizeLarge:60},{name:'Break Room',basePrice:35,hasSizeMod:false},{name:'Office Area',basePrice:30,hasSizeMod:false},{name:'Hallway / Corridor',basePrice:20,hasSizeMod:false},{name:'Lobby / Reception',basePrice:35,hasSizeMod:false},{name:'Window Cleaning',basePrice:50,hasSizeMod:true,sizeSmall:40,sizeMedium:50,sizeLarge:80},{name:'Floor Waxing',basePrice:75,hasSizeMod:true,sizeSmall:50,sizeMedium:75,sizeLarge:120},{name:'Carpet Cleaning',basePrice:60,hasSizeMod:true,sizeSmall:40,sizeMedium:60,sizeLarge:100}];
      p.business.findFirst().then(async b=>{
        let bid=b?.id;
        if(!bid){const nb=await p.business.create({data:{name:'Maloon Service',slug:'maloon-services'}});bid=nb.id;}
        await p.lineItem.deleteMany({where:{businessId:bid}});
        for(const i of items)await p.lineItem.create({data:{businessId:bid,...i}});
        console.log('Seeded',items.length,'items');
        await p.\$disconnect();
      });
    });
  });
});
"
```

---

## Railway Free Tier Limits

- **$5 credit** included (no credit card)
- ~500 hours/month runtime
- 512 MB RAM, shared CPU
- Auto-sleeps after inactivity (wakes on first request, ~2-3 second cold start)
- **To upgrade:** Add billing in Railway dashboard → Billing

---

## Troubleshooting

### Staff Portal shows the public website instead of the app
This means Railway is serving the static HTML at the repo root instead of the SvelteKit app. Check that:
- `railway.toml` exists at the repo root and has `root = "app/maloon-app"` under `[build]`
- Re-deploy: `./deploy.sh -m "fix railway.toml"`

### App shows "Internal Error"
Check Railway logs: `railway logs` — usually a database connection issue.

### Database connection timeout
- Verify Aiven service is running in the Aiven console
- Check that your IP is allowed (Aiven → service → Overview → Allowed IPs)
- Free tier may auto-pause after 5 days of inactivity

### Build fails on Railway
- `railway logs` to see build output
- Ensure `npm approve-scripts` ran for Prisma packages
- Check `.npmrc` has `@prisma/engines:install-scripts=true`

### Local dev can't connect
- Verify `.env` has correct `DATABASE_URL`
- CA cert exists at `prisma/aiven-ca.pem`
- Run `npx prisma generate` after `npm install`
