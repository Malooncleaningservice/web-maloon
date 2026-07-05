# Maloon Staff Portal — Implementation Overview

**Date deployed:** July 4, 2026  
**Status:** ✅ Live  
**URL:** https://discerning-nourishment-production-bba8.up.railway.app  

---

## What We Built

A cleaning service management platform with three interconnected modules, built as an MVP for a future SaaS product. The app runs as a SvelteKit application with a MariaDB backend on green infrastructure.

### Three Core Modules

#### 1. Quote Builder (`/quotes`)
Live phone-based quoting tool for sales staff:
- Square footage × rate calculation
- **9 seeded line items** with size modifiers (Small/Med/Large):
  - Bathroom ($25/$35/$50), Kitchen ($30/$40/$60), Break Room ($35), Office Area ($30), Hallway/Corridor ($20), Lobby/Reception ($35), Window Cleaning ($40/$50/$80), Floor Waxing ($50/$75/$120), Carpet Cleaning ($40/$60/$100)
- Custom add-ons with adjustable pricing
- Running total via `$derived` reactive state
- Saves directly to cloud database

#### 2. Jobs Section (`/jobs`, `/jobs/[id]`)
Job management for scheduling and worker execution:
- Job cards with status badges (pending, in-progress, complete)
- **Start-With prep tasks** — keycodes, alarm info, special instructions
- **Collapsible sections** — organizes tasks by area (Kitchen, Bathroom 1F, etc.)
- **Task checklists** — per-section tasks with photo-required flags
- **Worker assignments** — assign workers to jobs
- Quote-origin tracking — blue "QUOTE" badge on jobs created from quotes
- Reorder sections, mark tasks complete with comments

#### 3. Personnel Section (`/personnel`, `/personnel/[id]`)
Worker management:
- Worker profiles (name, email, phone, role, status)
- **W-9 tax tracking** — upload area, parsed fields (name, TIN, address), review status
- Editable profiles inline
- Assigned jobs history per worker
- Role support: worker, supervisor, admin

---

## Architecture

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | SvelteKit 2 + Svelte 5 | Runes syntax (`$state`, `$derived`, `$props`), mobile-first CSS |
| **API** | SvelteKit server routes | REST endpoints in `src/routes/api/` |
| **ORM** | Prisma 7 | MariaDB adapter, 11 data models |
| **Database** | MariaDB (Aiven free tier) | GCP `us-central1`, carbon-neutral |
| **Hosting** | Railway | SFO region, Node.js adapter, free tier |
| **Code** | GitHub | `Malooncleaningservice/web-maloon` → `app/maloon-app/` |

### Database Models (11 total)
Business, Quote, QuoteLineItem, QuoteAddon, LineItem, Job, JobSection, JobTask, TaskPhoto, StartWithTask, Worker, JobAssignment

### API Endpoints (12 endpoints)

| Endpoint | Methods |
|---|---|
| `/api/quotes` | GET (list), POST (create) |
| `/api/quotes/[id]` | GET, PATCH, DELETE |
| `/api/line-items` | GET (catalog), POST |
| `/api/jobs` | GET (list), POST (create) |
| `/api/jobs/[id]` | GET, PATCH, DELETE (cascading) |
| `/api/jobs/[id]/sections` | POST (add), PATCH (reorder) |
| `/api/sections/[id]/tasks` | POST (add), PATCH (complete) |
| `/api/jobs/[id]/start-with` | POST (add), PATCH (update) |
| `/api/jobs/[id]/assign` | GET, POST, DELETE |
| `/api/workers` | GET (list), POST (create) |
| `/api/workers/[id]` | GET, PATCH, DELETE |

---

## Green Hosting Commitment

- **Database:** Aiven MySQL on Google Cloud `us-central1` (Iowa) — GCP matches 100% renewable energy and is carbon-neutral
- **App hosting:** Railway (AWS `us-west-1`) — AWS is on track for 100% renewable by 2025
- **CA certificate:** Proper SSL via Aiven-signed CA (not just `rejectUnauthorized: false`)

---

## Future Roadmap

### Short-term
- [ ] File uploads (W-9 PDFs, task verification photos)
- [ ] Quote → Job conversion button in UI
- [ ] Email notifications for job assignments
- [ ] Custom domain (`staff.maloon.services`)

### SaaS Pivot
- [ ] Multi-tenant architecture — Business model already in schema
- [ ] Stripe subscription billing
- [ ] White-label branding per business
- [ ] Analytics dashboard (jobs completed, revenue, worker hours)
- [ ] Mobile app via Capacitor or PWA

---

## Deployment Notes

- **`railway.toml`** at the repo root (`web-maloon/railway.toml`) is **critical** — it tells Railway to build from `app/maloon-app/` instead of the repo root
- Without it, Railway auto-detects the static HTML site at the root and serves the public website instead of the Staff Portal
- The public site (`maloonservices.com`) links to the portal via a "🔐 Staff Portal" button in `assets/components/footer.html`
