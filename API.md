# API untuk AI Agent

Base URL lokal: `http://localhost:3001`

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
| GET/POST | `/api/ai/assets` | Baca/tambah aset |
| PATCH/DELETE | `/api/ai/assets/:id` | Update valuasi/hapus aset |
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

## Laporan Otomatis

Docker menjalankan service `scheduler` dengan zona waktu `Asia/Jakarta`:

| Jadwal | Target |
| --- | --- |
| 06:00 WIB | Pengeluaran kemarin |
| 22:00 WIB | Pengeluaran hari ini |

Log scheduler tersedia di `data/logs/reports.log`.

Untuk AI, request tanpa `target` memakai mode otomatis:

```bash
curl -H "Authorization: Bearer $AI_API_KEY" \
  http://localhost:3001/api/ai/reports/daily
```

- Sebelum 12:00 WIB: response berisi blok `today` dan `yesterday`.
- Mulai 12:00 WIB: response berisi laporan hari ini.

## Environment variabel Telegram

```env
TELEGRAM_BOT_TOKEN=8123456789:AAFxxx...
TELEGRAM_CHAT_ID=123456789
```

## Pagination

Semua endpoint collection `GET` menerima:

```text
page=1&pageSize=20
```

- `page` minimum `1`
- `pageSize` default `20`, minimum `1`, maksimum `100`
- Pagination dilakukan langsung di SQLite, bukan setelah seluruh data dimuat

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

Ponytail: tidak ada rate limit atau caching sisi server untuk report. Laporan digenerate ulang setiap request langsung dari SQLite.
