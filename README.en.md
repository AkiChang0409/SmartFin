# SmartFin

[简体中文](./README.md) | [English](./README.en.md)

SmartFin is a financial operations platform for Singapore SMEs, covering AR document workflows, project profitability analysis, employee cost allocation, and tax summaries.

## Core Features

- AR document upload and archival, including single-file and ZIP batch processing
- OCR/LLM-powered document classification and structured extraction (external providers supported)
- Customer invoice generator (draft re-edit, A4 preview, text-based PDF)
- Project profitability analysis (revenue, procurement, labor, and expense layers)
- Tax modules (GST quarterly summary, Corporate Tax, Individual Tax estimation)
- Dashboard analytics and report export capabilities

## Tech Stack

- `SvelteKit` (full-stack app)
- `Cloudflare Workers` (runtime)
- `Cloudflare D1 + Drizzle ORM` (database)
- `Cloudflare R2` (object storage)
- `Cloudflare KV` (config storage)
- `Cloudflare Queues` (asynchronous OCR processing)

## Project Structure (Key Directories)

```text
src/
  routes/
    (app)/                   # Business pages (AR / Projects / Employees / Tax / Reports)
    api/                     # Backend APIs (upload/ocr/invoices/projects/tax/dashboard)
  lib/
    server/                  # DB, R2, KV, OCR, tax and service layer
workers/
  ocr-consumer.ts            # OCR queue consumer
drizzle/
  migrations/                # Database migrations
  seeds/                     # Local seed data
```

## Quick Start (Local)

```bash
npm install
npm run gen
npm run db:migrate:local
npm run db:seed:local
npm run dev:cf
```

Suggested pages to explore after startup:

- `/dashboard`
- `/ar/customer-invoices`
- `/ar/customer-invoices/generate`
- `/ar/document-upload/project`
- `/projects`
- `/tax`

## Common Commands

```bash
# Development and checks
npm run dev:cf
npm run check
npm run build

# Migrations and data
npm run db:generate
npm run db:migrate:local
npm run db:migrate:remote
npm run db:seed:local
npm run db:seed:mock:local
npm run db:test:mock:local
```

## Deployment

Main app (SvelteKit Worker):

```bash
npm run build
wrangler deploy
```

OCR consumer (separate Worker):

```bash
npm run deploy:ocr-consumer
```

## Environment Variables

Required local variables:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`

Optional (OCR / LLM):

- `OCR_API_URL`
- `OCR_API_KEY`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_PROVIDER`
- `OCR_PROVIDER`

## Current Limitations

- `Generate & send` already supports generation and storage flow; email sending is not integrated yet
- OCR/LLM quality depends on external provider performance and quota
- Minor layout differences may still occur between preview and final PDF under extreme content cases

## Roadmap (Short)

- [ ] Complete email delivery flow (template, attachments, status writeback)
- [ ] Make invoice templates configurable (multi-template, versioned)
- [ ] Improve OCR queue observability and retry strategy
- [ ] Add end-to-end regression coverage (upload, extraction, generation, tax)
