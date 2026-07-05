# Architecture & Code Reference

## Project Structure

```
app/maloon-app/
├── prisma/
│   ├── schema.prisma          # Database models (11 models)
│   ├── aiven-ca.pem           # SSL certificate (gitignored)
│   └── migrations/            # Prisma migrations (if using migrate dev)
├── src/
│   ├── app.css                # Global styles + design system
│   ├── app.html               # HTML shell
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton
│   └── routes/
│       ├── +layout.svelte     # Root layout with navigation
│       ├── +page.svelte       # Dashboard homepage
│       ├── quotes/
│       │   └── +page.svelte   # Quote Builder UI
│       ├── jobs/
│       │   ├── +page.svelte   # Jobs list
│       │   └── [id]/
│       │       └── +page.svelte  # Job detail (sections, tasks, assignments)
│       ├── personnel/
│       │   ├── +page.svelte   # Workers list
│       │   └── [id]/
│       │       └── +page.svelte  # Worker detail (profile, W-9, assignments)
│       └── api/
│           ├── quotes/
│           │   ├── +server.ts       # GET all, POST create
│           │   └── [id]/+server.ts  # GET, PATCH, DELETE single
│           ├── line-items/
│           │   └── +server.ts       # GET catalog, POST create
│           ├── jobs/
│           │   ├── +server.ts       # GET all, POST create
│           │   └── [id]/
│           │       ├── +server.ts        # GET, PATCH, DELETE single
│           │       ├── sections/+server.ts  # POST add, PATCH reorder
│           │       ├── start-with/+server.ts # POST add, PATCH update
│           │       └── assign/+server.ts     # GET, POST, DELETE assignments
│           ├── workers/
│           │   ├── +server.ts       # GET all, POST create
│           │   └── [id]/+server.ts  # GET, PATCH, DELETE single
│           └── sections/
│               └── [id]/
│                   └── tasks/+server.ts  # POST add, PATCH complete
├── static/
│   └── robots.txt
├── package.json
├── prisma.config.ts           # Prisma 7 config (datasource URL)
├── vite.config.ts             # Vite + SvelteKit adapter config
├── tsconfig.json
├── .env                       # Environment variables (gitignored)
├── .npmrc                     # Allow Prisma install scripts
└── .gitignore
```

---

## Database Schema

### Business
- `id`, `name`, `slug`
- Top-level tenant — one "Maloon Services" auto-created on first API call
- Future SaaS: one row per customer business

### Quote
- `id`, `businessId`, `clientName`, `clientPhone`, `clientEmail`
- `address`, `squareFootage`, `ratePerSqFt`, `workerCount`
- `total` (calculated), `notes`, `status` (draft/sent/accepted/declined)
- Relations: `lineItems: QuoteLineItem[]`, `addons: QuoteAddon[]`

### QuoteLineItem
- `id`, `quoteId`, `name`, `price`, `size` (Small/Med/Large), `quantity`
- Belongs to a Quote

### QuoteAddon
- `id`, `quoteId`, `name`, `price`
- Custom add-ons not in the catalog

### LineItem
- `id`, `businessId`, `name`, `description`
- `basePrice`, `hasSizeMod`, `sizeSmall`, `sizeMedium`, `sizeLarge`
- `isActive` (for soft-delete from catalog)
- The seeded catalog of services available for quotes

### Job
- `id`, `businessId`, `quoteId` (optional — links to originating quote)
- `clientName`, `clientPhone`, `clientEmail`, `address`
- `status` (pending/in-progress/complete/cancelled)
- `scheduledDate`, `notes`
- `total` (from quote if applicable)
- Relations: `sections: JobSection[]`, `startWithTasks: StartWithTask[]`, `assignments: JobAssignment[]`

### JobSection
- `id`, `jobId`, `name`, `sortOrder`
- Relations: `tasks: JobTask[]`
- Organizes tasks by area within a job

### JobTask
- `id`, `sectionId`, `description`, `sortOrder`
- `completed`, `requiredPhoto`, `comment`
- `completedBy`, `completedAt`
- Relations: `photos: TaskPhoto[]`

### TaskPhoto
- `id`, `taskId`, `url`, `caption`
- For task verification — worker takes photo, uploads as proof

### StartWithTask
- `id`, `jobId`, `description`, `sortOrder`
- `completed`, `completedBy`, `completedAt`
- Prep tasks shown at top of job (keycodes, alarms, special instructions)

### Worker
- `id`, `businessId`, `firstName`, `lastName`
- `email`, `phone`, `role` (worker/supervisor/admin)
- `status` (active/inactive), `notes`
- W-9 fields: `w9Uploaded`, `w9FileName`, `w9FileUrl`, `w9ParsedName`, `w9ParsedTin`, `w9ParsedAddress`, `w9Reviewed`, `w9ReviewedAt`
- Relations: `assignments: JobAssignment[]`

### JobAssignment
- `id`, `jobId`, `workerId`, `assignedAt`
- Many-to-many join between Job and Worker

---

## Key Design Decisions

### Prisma 7 + MariaDB Adapter
Prisma 7 requires a driver adapter for direct database connections. We use `@prisma/adapter-mariadb` which configures the underlying MySQL connection including SSL. The connection is configured inline in `src/lib/prisma.ts` rather than through a URL string, giving us control over SSL certificate handling.

### In-Memory → API Pattern
All frontend pages originally used hardcoded placeholder data with `$state()`. They've been updated to fetch from API routes on mount (`onMount → fetch → parse JSON → assign to reactive state`).

### Single Business for MVP
All API endpoints auto-create "Maloon Services" as the first business if none exists. This keeps the MVP simple — future multi-tenant SaaS will require auth and tenant scoping.

### Cascade Deletes
- Deleting a Job → removes sections, tasks, task photos, start-with tasks, assignments
- Deleting a Worker → removes their assignments
- Deleting a Quote → removes line items, add-ons; unlinks from any associated jobs

### SSL Certificate Handling
- Local dev: reads `prisma/aiven-ca.pem` from disk
- Railway production: reads from `AIVEN_CA_BASE64` environment variable (base64-decoded at runtime)
- This keeps the cert out of the Git repo while supporting both environments

### Svelte 5 Runes
All components use the new Svelte 5 reactive primitives:
- `$state()` — reactive variables
- `$derived()` — computed values
- `$props()` — component props
- `$effect()` — side effects

---

## Pricing Model

Placeholder values for MVP — easily adjustable:

| Mechanism | Value |
|---|---|
| Base sqft rate | $0.15/sqft |
| Line items | $20–$120 depending on service + size |
| Size modifiers | Small (-30%), Medium (base), Large (+50%) |
| Worker count | Multiplier on labor estimates |

Pricing is per-quote and adjustable in the Quote Builder at quote time.

---

## Adding New Features

### Adding a new seeded line item
1. Add to the seed script in `deployment.md`
2. Or: `POST /api/line-items` with the new item

### Adding a new API endpoint
1. Create `src/routes/api/your-resource/+server.ts`
2. Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
3. Import prisma from `$lib/prisma`
4. Use Prisma queries — types are auto-generated from schema

### Adding a new database field
1. Add field to `prisma/schema.prisma`
2. Run `npx prisma db push` to apply to Aiven
3. Update API handlers that read/write the model
4. Update frontend forms if needed

### Adding a new page
1. Create `src/routes/your-page/+page.svelte`
2. Import `../../app.css` (adjust depth as needed)
3. Use `onMount` for data fetching
4. Add to navigation in `+layout.svelte`
