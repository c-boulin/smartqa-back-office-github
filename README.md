# SmartQA Back Office

React 18 + Vite 5 + TypeScript SPA for SmartQA: projects, test book, runs, Overview dashboards, reports, and settings. Talks to the SmartQA API over SSO.

## Stack

| | |
|--|--|
| UI | React 18, Tailwind, lucide-react, react-hot-toast |
| Router | react-router-dom v6 |
| Charts / export | recharts, jspdf, html2canvas |
| Tooling | Vite 5, TypeScript, ESLint 9 |

## Areas

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/login`, `/callback` | SSO |
| `/overview/*` | Overview widgets, launches, tests (admin) |
| `/projects` | Projects hub |
| `/dashboard` | Project dashboard |
| `/test-cases`, `/shared-steps` | Test book |
| `/test-runs`, `/test-runs/:id`, `/test-runs-overview` | Runs & overview |
| `/test-plans`, `/test-plans/:id` | Plans |
| `/automated-execution/:projectId` | Automated execution (cases / steps) |
| `/reports`, `/templates` | Reports / templates |
| `/settings`, `/documentation`, `/documentation/:sectionId` | Settings & docs |
| `/upload` | Phone upload |

Header: Overview, Projects, Templates, Settings, Documentation.  
Project sidebar: Dashboard, Test Cases, Shared Steps, Test Runs, Test Plans, Reports.

## Setup

```bash
npm install
# ensure VITE_* in .env.dev (or matching mode file)
npm run dev          # vite --mode dev
```

| Variable | Role |
|----------|------|
| `VITE_API_BASE_URL` | SmartQA API base (required) |
| `VITE_ASSETS_CLOUDFRONT_DOMAIN` | Assets CDN |

Vite modes: `.env.dev` / `.env.stag` / `.env.prod` (`vite --mode …`).

Optional Docker: `docker compose up` → nginx on **:3000**, build-arg `VITE_API_BASE_URL` (default `http://localhost:8080/api`).

## Scripts

```bash
npm run dev           # local dev server
npm run build         # vite build --mode dev (alias of build-dev)
npm run build-dev     # vite build --mode dev
npm run build-stag
npm run build-prod
npm run lint
npm run preview
```

## Deploy

GitLab CI builds `dist/` (`npm run build-$STAGE`) → S3 sync + CloudFront invalidation.  
Manual job `release-version` runs `semantic-release` on `master`.

| Branch / tag | Stage |
|--------------|--------|
| `develop-*` | dev |
| `master` | stag |
| tags | prod |

Docker image: multi-stage Node build + `nginx:alpine` (SPA `try_files` → `index.html`).

## Layout

```
src/
  pages/          # route screens
  components/     # Layout, Overview, Project, TestCase, TestRun, Reports, …
  services/       # api.ts + domain clients
  context/        # Auth, Theme, Notifications, …
  config/, data/
  hooks/, types/, utils/, constants/
```

## License

Proprietary.
