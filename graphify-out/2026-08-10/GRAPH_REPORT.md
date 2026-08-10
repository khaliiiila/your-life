# Graph Report - .  (2026-08-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 358 nodes · 568 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81b57549`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transactions-workspace.tsx
- scripts
- compilerOptions
- devDependencies
- dashboard.ts
- nowIso
- db.ts
- reports.ts
- app service
- assets.ts
- opencode.json
- layout.tsx
- graphify.js
- next.config.ts
- next-env.d.ts
- API untuk AI Agent
- backup-database.ts
- pull-db.ts
- ErrorBoundary
- wishlists/[id]/route.ts
- restore-database.ts
- Improvements
- proxy.ts
- create-wallets.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `nowIso()` - 16 edges
3. `db` - 15 edges
4. `useToast()` - 13 edges
5. `parsePagination()` - 13 edges
6. `paginationMeta()` - 13 edges
7. `scripts` - 11 edges
8. `buildDailyReportText()` - 10 edges
9. `idr` - 9 edges
10. `AppNav()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `paginationMeta()`  [EXTRACTED]
  app/api/assets/route.ts → lib/pagination.ts
- `GET()` --calls--> `parsePagination()`  [EXTRACTED]
  app/api/assets/route.ts → lib/pagination.ts
- `GET()` --calls--> `getDashboardData()`  [EXTRACTED]
  app/api/dashboard/route.ts → lib/dashboard.ts
- `POST()` --calls--> `sendTelegramMessage()`  [EXTRACTED]
  app/api/telegram/send/route.ts → lib/telegram.ts
- `GET()` --calls--> `paginationMeta()`  [EXTRACTED]
  app/api/upcoming-expenses/route.ts → lib/pagination.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **App container startup flow** — docker_compose_app, docker_compose_db_migrate, docker_compose_dev_server, docker_compose_healthcheck [EXTRACTED 1.00]

## Communities (28 total, 8 thin omitted)

### Community 0 - "transactions-workspace.tsx"
Cohesion: 0.06
Nodes (41): Asset, AssetsWorkspace(), blank, dynamic, blankDebt, Debt, DebtsWorkspace(), Wallet (+33 more)

### Community 1 - "scripts"
Cohesion: 0.07
Nodes (27): better-sqlite3, lucide-react, next, dependencies, better-sqlite3, lucide-react, next, react (+19 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+20 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tsx, @types/better-sqlite3, @types/node (+9 more)

### Community 4 - "dashboard.ts"
Cohesion: 0.31
Nodes (6): GET(), getDashboardData(), TransactionRow, WalletRow, before, createdAt

### Community 5 - "nowIso"
Cohesion: 0.16
Nodes (15): Context, DELETE(), PATCH(), POST(), dynamic, GET(), POST(), nowIso() (+7 more)

### Community 6 - "db.ts"
Cohesion: 0.07
Nodes (30): POST(), Context, dynamic, GET(), POST(), dynamic, GET(), POST() (+22 more)

### Community 7 - "reports.ts"
Cohesion: 0.19
Nodes (20): dynamic, GET(), GET(), POST(), resolveTarget(), POST(), buildDailyReportText(), categoryEmoji (+12 more)

### Community 8 - "app service"
Cohesion: 0.25
Nodes (11): app service, DATABASE_PATH /data/keuangan.db, ./data bind mount, npm run db:migrate pre-start step, Dockerfile deps build target, npm run dev -- --hostname 0.0.0.0, wget healthcheck on /api/health, SQLite data persisted on host via bind mount (+3 more)

### Community 9 - "assets.ts"
Cohesion: 0.26
Nodes (10): Context, DELETE(), PATCH(), dynamic, GET(), POST(), createAsset(), deleteAsset() (+2 more)

### Community 10 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 16 - "API untuk AI Agent"
Cohesion: 0.17
Nodes (11): AI routes, API untuk AI Agent, Authentication, Contoh, DB Sync (Cloning Production → Dev), Environment variabel Telegram, Laporan Otomatis, Lokal (dev) (+3 more)

### Community 17 - "backup-database.ts"
Cohesion: 0.29
Nodes (8): autoBackupBeforeMigration(), createBackup(), __dirname, __filename, getLatestBackup(), listBackups(), rootDir, latestBackup

### Community 18 - "pull-db.ts"
Cohesion: 0.39
Nodes (7): backupLocalDb(), BACKUPS_DIR, main(), pullFromProduction(), replaceLocalDb(), ROOT_DIR, verifyDatabase()

### Community 20 - "wishlists/[id]/route.ts"
Cohesion: 0.47
Nodes (5): Context, DELETE(), PATCH(), deleteWishlist(), updateWishlist()

### Community 21 - "restore-database.ts"
Cohesion: 0.47
Nodes (5): BACKUPS_DIR, listBackups(), main(), restoreFromFile(), ROOT_DIR

## Knowledge Gaps
- **130 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `Context`, `dynamic`, `Context` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `db.ts` to `assets.ts`, `dashboard.ts`, `nowIso`, `reports.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `idr` connect `transactions-workspace.tsx` to `nowIso`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `nowIso` to `assets.ts`, `wishlists/[id]/route.ts`, `db.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `Context` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transactions-workspace.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._