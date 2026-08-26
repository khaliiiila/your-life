# API untuk AI Agent

Base URL lokal: `http://localhost:13003` (prod: `https://yl.infoinfo.web.id`)

OpenAPI JSON: `GET /api/docs/openapi.json`

## Authentication

Set environment variable:

```env
AI_API_KEY=ganti-dengan-rahasia-panjang
```

AI request wajib mengirim salah satu:

```http
Authorization: Bearer ganti-dengan-rahasia-panjang
```

atau:

```http
X-AI-API-Key: ganti-dengan-rahasia-panjang
```

## AI routes

Semua route AI memakai prefix `/api/ai` dan memetakan ke CRUD aplikasi:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/ai/dashboard` | Ringkasan saldo, arus kas, aset, utang |
| GET/POST | `/api/ai/wallets` | Baca/tambah wallet |
| PATCH/DELETE | `/api/ai/wallets/:id` | Update/hapus wallet |
| GET/POST | `/api/ai/transactions` | Baca/tambah transaksi |
| GET/PATCH/DELETE | `/api/ai/transactions/:id` | Detail/update/hapus transaksi |
| POST | `/api/ai/transfers` | Transfer antar-wallet atomik |
| GET/POST | `/api/ai/debts` | Baca/tambah utang/piutang |
| PATCH/DELETE | `/api/ai/debts/:id` | Update/hapus utang |
| POST | `/api/ai/debts/:id/payments` | Catat pembayaran |
| GET/POST | `/api/ai/assets` | Baca/tambah aset (stock: `ticker` otomatis dari `name`) |
| PATCH/DELETE | `/api/ai/assets/:id` | Update valuasi/hapus aset; PATCH `{"ticker":"BBCA"}` untuk set ticker manual (non-stock) |
| POST | `/api/assets/sync` | Sync harga saham via BidBot (close × qty → `current_value`) |
| GET | `/api/assets/scanner?kind=tops\|topr\|topk` | Scanner saham BidBot (cache 15m) |
| GET | `/api/assets/analysis?ticker=BBCA` | Analisis saham: entry verdict, technical, pattern, fundamental (cache 1j) |
| GET | `/api/assets/history?period=1mo\|3mo\|6mo\|1y` | Histori nilai portofolio saham (agregasi close × qty, cache 1j) |
| POST | `/api/assets/insights/broadcast` | Broadcast insight harian saham pegangan ke Telegram (1 bubble/4 saham, header tanggal) |
| GET/POST | `/api/ai/upcoming-expenses` | Baca/tambah pengeluaran mendatang |
| PATCH/POST/DELETE | `/api/ai/upcoming-expenses/:id` | Update/bayar/hapus jadwal |
| GET/POST | `/api/ai/wishlists` | Baca/tambah wishlist |
| PATCH/DELETE | `/api/ai/wishlists/:id` | Update progress/hapus wishlist |
| GET | `/api/ai/reports/daily` | Generate teks laporan harian (target: `today` / `yesterday`) |
| POST | `/api/ai/reports/daily/send` | Generate & kirim laporan harian ke Telegram |
| POST | `/api/ai/telegram/send` | Kirim pesan bebas ke Telegram |

## DB Sync (Cloning Production → Dev)

Untuk meng-clone database production ke dev lokal via secure API endpoint (PostgreSQL):

### Server (production)

Set env di server (`/data/.env` atau Docker Compose environment):

```env
DB_SYNC_SECRET=rahasia-acak-64-karakter
```

Setelah deploy, endpoint tersedia:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/admin/db-export` | Dump PostgreSQL production sebagai SQL (TRUNCATE + INSERT, satu transaksi) |

```bash
curl -H "Authorization: Bearer $DB_SYNC_SECRET" \
  https://yl.infoinfo.web.id/api/admin/db-export \
  -o keuangan_prod.sql
```

### Lokal (dev)

Set env di `.env` lokal:

```env
DATABASE_URL=postgresql://your_life:your_life@127.0.0.1:15433/your_life
DB_SYNC_SECRET=rahasia-acak-64-karakter
PROD_APP_URL=https://yl.infoinfo.web.id
```

Jalankan pull:

```bash
npm run db:pull
```

Script akan:
1. Auto-backup DB lokal ke `backups/your-life-local_<timestamp>.dump` (pg_dump custom format)
2. Download dump SQL dari production via HTTPS dengan Bearer token
3. Jalankan SQL (TRUNCATE semua tabel + INSERT) langsung ke database lokal
4. Data lokal ditimpa total oleh data production

### Restore dari backup

```bash
npm run db:restore <path.dump>   # restore dari file dump pg_dump
```

```bash
npm run db:backup                # backup DB lokal ke data/backups/*.dump
```

### Catatan

- Dump memakai `TRUNCATE ... CASCADE` sehingga data lokal yang ada akan diganti seluruhnya.
- Restore tidak memerlukan `pg_dump`/`psql` di host — menggunakan driver `pg` langsung.
- `db:pull` membutuhkan Docker (container `your-life-db-1`) untuk membuat backup lokal via `pg_dump` yang versinya cocok. Override nama container dengan `DB_CONTAINER` jika berbeda.

## Assets — Integrasi BidBot

Ticker saham otomatis dari `name` (upper case). `crypto/other` manual via `ticker` (contoh `BTC-USD`). Harga di-sync dari `https://bidbot.web.id` via JWT `bidbot_token` (login `BIDBOT_EMAIL`/`BIDBOT_PASSWORD`, cache 25 hari, retry 401). Env:

```env
BIDBOT_EMAIL=khalilaelcuan@gmail.com
BIDBOT_PASSWORD=***
```

Alokasi donut & grafik historis di UI memakai `recharts` (sudah terinstal).

## Laporan Otomatis & Scheduler

Docker menjalankan service `scheduler` dengan zona waktu `Asia/Jakarta`:

| Jadwal | Perintah | Log |
| --- | --- | --- |
| 06:00 WIB | `send-scheduled-report.mjs yesterday` (laporan kemarin) | `data/logs/reports.log` |
| 06:05 WIB (Senin-Jumat) | `send-asset-insights.mjs` → `POST /api/assets/insights/broadcast` (broadcast 3-4 saham/bubble + header tanggal + rekomendasi AVG DOWN/TAMBAH/WAIT/CUTLOSS) | `data/logs/asset-insights.log` |
| 17:30 WIB | `sync-asset-prices.mjs` → `POST /api/assets/sync` (update `current_value` saham) | `data/logs/bidbot-sync.log` |
| 22:00 WIB | `send-scheduled-report.mjs today` (laporan hari ini) | `data/logs/reports.log` |

Cron di `docker-compose.yml` sekarang dibungkus `sh -c "mkdir -p /data/logs && ... >> log 2>&1"` + `crond -L /data/logs/cron.log` untuk hilangkan `redir error` BusyBox.

Untuk AI, request tanpa `target` memakai mode otomatis:

```bash
curl -H "Authorization: Bearer $AI_API_KEY" \
  http://localhost:3001/api/ai/reports/daily
```

- Sebelum 12:00 WIB: response berisi blok `today` dan `yesterday`.
- Mulai 12:00 WIB: response berisi laporan hari ini.

## Environment variabel

```env
TELEGRAM_BOT_TOKEN=8123456789:AAFxxx...
TELEGRAM_CHAT_ID=123456789
BIDBOT_EMAIL=khalilaelcuan@gmail.com
BIDBOT_PASSWORD=***
AI_API_KEY=ganti-dengan-rahasia-panjang
DB_SYNC_SECRET=rahasia-acak-64-karakter
```

## Pagination

Semua endpoint collection `GET` menerima:

```text
page=1&pageSize=20
```

- `page` minimum `1`
- `pageSize` default `20`, minimum `1`, maksimum `100`
- Pagination dilakukan langsung di PostgreSQL, bukan setelah seluruh data dimuat

Contoh:

```bash
curl -H "Authorization: Bearer $AI_API_KEY" \
  "http://localhost:3001/api/ai/transactions?page=2&pageSize=20"
```

Respons collection:

```json
{
  "transactions": [],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 53,
    "totalPages": 3
  }
}
```

Nama array mengikuti resource: `wallets`, `transactions`, `debts`, `assets`, `expenses`, atau `wishlists`. `dashboard` bukan collection dan tidak dipaginasi.

## Contoh

```bash
curl -H "Authorization: Bearer $AI_API_KEY" \
  http://localhost:3001/api/ai/dashboard
```

```bash
curl -X POST http://localhost:3001/api/ai/transactions \
  -H "Authorization: Bearer $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","walletId":"wallet_cash","amount":25000,"category":"makanan","description":"makan siang","date":"2026-08-04"}'
```

```bash
curl -X POST http://localhost:3001/api/ai/reports/daily/send \
  -H "Authorization: Bearer $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target":"today"}'
```

```bash
curl -X POST http://localhost:3001/api/ai/telegram/send \
  -H "Authorization: Bearer $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"<b>Notifikasi AI</b>\nPengeluaran terdeteksi melebihi batas."}'
```

Response error konsisten memakai:

```json
{"error":"Pesan error yang aman dibaca agent"}
```

Cache: `scanner` 15m, `analysis`/`history` 1j (in-memory Map), `bidbot_token` cache 25 hari. Report harian tidak di-cache, digenerate langsung dari PostgreSQL.
