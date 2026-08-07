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
| GET/POST | `/api/ai/transactions` | Baca/tambah transaksi |
| POST | `/api/ai/transfers` | Transfer antar-wallet atomik |
| GET/POST | `/api/ai/debts` | Baca/tambah utang/piutang |
| POST | `/api/ai/debts/:id/payments` | Catat pembayaran |
| GET/POST | `/api/ai/assets` | Baca/tambah aset |
| PATCH/DELETE | `/api/ai/assets/:id` | Update valuasi/hapus aset |
| GET/POST | `/api/ai/upcoming-expenses` | Baca/tambah pengeluaran mendatang |
| POST/DELETE | `/api/ai/upcoming-expenses/:id` | Bayar/hapus jadwal |
| GET/POST | `/api/ai/wishlists` | Baca/tambah wishlist |
| PATCH/DELETE | `/api/ai/wishlists/:id` | Update progress/hapus wishlist |
| GET | `/api/ai/reports/daily` | Generate teks laporan harian (target: `today` / `yesterday`) |
| POST | `/api/ai/reports/daily/send` | Generate & kirim laporan harian ke Telegram |
| POST | `/api/ai/telegram/send` | Kirim pesan bebas ke Telegram |

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
