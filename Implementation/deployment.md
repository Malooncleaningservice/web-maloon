# Access & Deployment Guide

## Live URLs

| Resource | URL |
|---|---|
| **Staff Portal (app)** | https://discerning-nourishment-production-bba8.up.railway.app |
| **Business Website** | https://maloonservices.com |
| **Railway Dashboard** | https://railway.app → project `discerning-nourishment` |
| **Aiven Database Console** | https://console.aiven.io |

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

The app is deployed on Railway. Any push to GitHub does **not** auto-deploy — you must manually trigger it.

### Method 1: Railway CLI (recommended)

```bash
cd ~/Documents/web-maloon/app/maloon-app
railway up --detach
```

This uploads the project, builds it on Railway, and deploys.

### Method 2: Railway Dashboard

1. Go to https://railway.app
2. Open project `discerning-nourishment`
3. Click "Deploy" → "Deploy from GitHub"

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

After schema changes:

```bash
cd ~/Documents/web-maloon/app/maloon-app
npx prisma db push          # push schema changes (no migration files)
# OR
npx prisma migrate dev      # create migration files + apply
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
        if(!bid){const nb=await p.business.create({data:{name:'Maloon Services',slug:'maloon-services'}});bid=nb.id;}
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
