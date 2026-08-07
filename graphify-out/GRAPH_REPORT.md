# Graph Report - .  (2026-08-04)

## Corpus Check
- Corpus is ~5,990 words - fits in a single context window. You may not need a graph.

## Summary
- 189 nodes · 241 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Finance UI Pages
- Package Metadata
- TypeScript Compiler Config
- Dev Dependencies
- Database & Dashboard API
- Upcoming Expenses API
- Transactions API
- Debts API
- Docker Deployment
- TypeScript File Includes
- OpenCode Plugin Config
- Root Layout
- Graphify Plugin
- Next Config
- Next Env Types

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `nowIso()` - 8 edges
3. `app service` - 8 edges
4. `db` - 7 edges
5. `scripts` - 7 edges
6. `include` - 6 edges
7. `AppNav()` - 5 edges
8. `getDashboardData()` - 5 edges
9. `idr` - 5 edges
10. `formatDate()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getDashboardData()`  [EXTRACTED]
  app/api/dashboard/route.ts → lib/dashboard.ts
- `Home()` --calls--> `getDashboardData()`  [EXTRACTED]
  app/page.tsx → lib/dashboard.ts
- `POST()` --calls--> `payDebt`  [EXTRACTED]
  app/api/debts/[id]/payments/route.ts → lib/debts.ts
- `GET()` --calls--> `listDebts()`  [EXTRACTED]
  app/api/debts/route.ts → lib/debts.ts
- `POST()` --calls--> `createDebt()`  [EXTRACTED]
  app/api/debts/route.ts → lib/debts.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **App container startup flow** — docker_compose_app, docker_compose_db_migrate, docker_compose_dev_server, docker_compose_healthcheck [EXTRACTED 1.00]

## Communities (16 total, 4 thin omitted)

### Community 0 - "Finance UI Pages"
Cohesion: 0.08
Nodes (23): blankDebt, Debt, DebtsWorkspace(), Wallet, dynamic, dynamic, Home(), dynamic (+15 more)

### Community 1 - "Package Metadata"
Cohesion: 0.08
Nodes (23): better-sqlite3, lucide-react, next, dependencies, better-sqlite3, lucide-react, next, react (+15 more)

### Community 2 - "TypeScript Compiler Config"
Cohesion: 0.10
Nodes (20): dom, dom.iterable, esnext, compilerOptions, allowJs, baseUrl, esModuleInterop, incremental (+12 more)

### Community 3 - "Dev Dependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tsx, @types/better-sqlite3, @types/node (+9 more)

### Community 4 - "Database & Dashboard API"
Cohesion: 0.17
Nodes (7): GET(), dynamic, getDashboardData(), TransactionRow, WalletRow, db, globalWithDb

### Community 5 - "Upcoming Expenses API"
Cohesion: 0.23
Nodes (12): Context, DELETE(), POST(), dynamic, GET(), POST(), createUpcomingExpense(), deleteUpcomingExpense() (+4 more)

### Community 6 - "Transactions API"
Cohesion: 0.26
Nodes (9): dynamic, GET(), POST(), POST(), createTransaction(), createTransfer, listTransactions(), TransactionInput (+1 more)

### Community 7 - "Debts API"
Cohesion: 0.31
Nodes (8): POST(), dynamic, GET(), POST(), nowIso(), createDebt(), listDebts(), payDebt

### Community 8 - "Docker Deployment"
Cohesion: 0.25
Nodes (11): app service, DATABASE_PATH /data/keuangan.db, ./data bind mount, npm run db:migrate pre-start step, Dockerfile deps build target, npm run dev -- --hostname 0.0.0.0, wget healthcheck on /api/health, SQLite data persisted on host via bind mount (+3 more)

### Community 9 - "TypeScript File Includes"
Cohesion: 0.22
Nodes (8): .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude, include

### Community 10 - "OpenCode Plugin Config"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **81 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `dynamic`, `dynamic`, `Context` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Database & Dashboard API` to `Upcoming Expenses API`, `Transactions API`, `Debts API`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `dynamic` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Finance UI Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Package Metadata` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._