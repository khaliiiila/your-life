import { NextResponse } from "next/server";

export async function GET() {
  const paginationParameters = [
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
  ];
  
  return NextResponse.json({
    openapi: "3.0.3",
    info: { title: "Dompetku AI API", version: "1.0.0", description: "CRUD API keuangan personal untuk agent AI." },
    servers: [{ url: "/" }],
    security: [{ BearerAuth: [] }],
    paths: {
      "/api/ai/dashboard": { 
        get: { summary: "Ringkasan keuangan", responses: { "200": { description: "Dashboard data" } } } 
      },
      "/api/ai/wallets": { 
        get: { summary: "Daftar wallet", parameters: paginationParameters, responses: { "200": { description: "Wallet list" } } },
        post: { summary: "Tambah wallet", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WalletInput" } } } }, responses: { "201": { description: "Wallet created" } } } 
      },
      "/api/ai/wallets/{id}": {
        patch: { summary: "Update wallet", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WalletUpdateInput" } } } }, responses: { "200": { description: "Wallet updated" } } },
        delete: { summary: "Hapus wallet", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Wallet deleted" } } }
      },
      "/api/ai/transactions": { 
        get: { summary: "Daftar transaksi", parameters: [...paginationParameters, { name: "type", in: "query", schema: { type: "string" } }, { name: "walletId", in: "query", schema: { type: "string" } }, { name: "category", in: "query", schema: { type: "string" } }, { name: "from", in: "query", schema: { type: "string", format: "date" } }, { name: "to", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Transaction list" } } },
        post: { summary: "Tambah transaksi", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionInput" } } } }, responses: { "201": { description: "Transaction created" } } }
      },
      "/api/ai/transactions/{id}": {
        get: { summary: "Detail transaksi", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Transaction detail" } } },
        patch: { summary: "Update transaksi", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransactionUpdateInput" } } } }, responses: { "200": { description: "Transaction updated" } } },
        delete: { summary: "Hapus transaksi", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Transaction deleted" } } }
      },
      "/api/ai/transfers": { 
        post: { summary: "Transfer antar-wallet", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TransferInput" } } } }, responses: { "201": { description: "Transfer created" } } } 
      },
      "/api/ai/debts": { 
        get: { summary: "Daftar utang/piutang", parameters: paginationParameters, responses: { "200": { description: "Debts list" } } },
        post: { summary: "Tambah utang", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DebtInput" } } } }, responses: { "201": { description: "Debt created" } } } 
      },
      "/api/ai/debts/{id}": {
        patch: { summary: "Update utang", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DebtUpdateInput" } } } }, responses: { "200": { description: "Debt updated" } } },
        delete: { summary: "Hapus utang", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Debt deleted" } } }
      },
      "/api/ai/debts/{id}/payments": { 
        post: { summary: "Bayar utang", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PaymentInput" } } } }, responses: { "201": { description: "Payment recorded" } } } 
      },
      "/api/ai/assets": { 
        get: { summary: "Daftar aset", parameters: paginationParameters, responses: { "200": { description: "Assets list" } } },
        post: { summary: "Tambah aset", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssetInput" } } } }, responses: { "201": { description: "Asset created" } } } 
      },
      "/api/ai/assets/{id}": {
        patch: { summary: "Update valuasi aset", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssetValueInput" } } } }, responses: { "200": { description: "Asset value updated" } } },
        delete: { summary: "Hapus aset", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Asset deleted" } } }
      },
      "/api/ai/upcoming-expenses": { 
        get: { summary: "Daftar pengeluaran mendatang", parameters: paginationParameters, responses: { "200": { description: "Upcoming expenses list" } } },
        post: { summary: "Tambah jadwal", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpcomingExpenseInput" } } } }, responses: { "201": { description: "Schedule created" } } } 
      },
      "/api/ai/upcoming-expenses/{id}": {
        patch: { summary: "Update jadwal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpcomingExpenseUpdateInput" } } } }, responses: { "200": { description: "Schedule updated" } } },
        post: { summary: "Bayar jadwal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpcomingExpensePayInput" } } } }, responses: { "200": { description: "Payment created" } } },
        delete: { summary: "Hapus jadwal", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Schedule deleted" } } }
      },
      "/api/ai/wishlists": { 
        get: { summary: "Daftar wishlist", parameters: paginationParameters, responses: { "200": { description: "Wishlists list" } } },
        post: { summary: "Tambah wishlist", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WishlistInput" } } } }, responses: { "201": { description: "Wishlist created" } } } 
      },
      "/api/ai/wishlists/{id}": {
        patch: { summary: "Update progress", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WishlistUpdateInput" } } } }, responses: { "200": { description: "Wishlist updated" } } },
        delete: { summary: "Hapus wishlist", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Wishlist deleted" } } }
      },
      "/api/ai/reports/daily": { 
        get: { summary: "Laporan harian", parameters: [{ name: "target", in: "query", schema: { type: "string", enum: ["auto", "today", "yesterday"], default: "auto" } }, { name: "date", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Daily report data" } } } 
      },
      "/api/ai/reports/daily/send": { 
        post: { summary: "Kirim laporan ke Telegram", requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/ReportSendInput" } } } }, responses: { "200": { description: "Report sent to Telegram" } } } 
      },
      "/api/ai/telegram/send": { 
        post: { summary: "Kirim pesan ke Telegram", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TelegramSendInput" } } } }, responses: { "200": { description: "Message sent" } } } 
      }
    },
    components: { 
      securitySchemes: { BearerAuth: { type: "http", scheme: "bearer" } }, 
      schemas: { 
        WalletInput: { 
          type: "object", 
          required: ["name", "type", "startingBalance"], 
          properties: { 
            name: { type: "string" }, 
            type: { type: "string", enum: ["cash", "bank", "ewallet", "credit"] }, 
            startingBalance: { type: "integer" } 
          } 
        },
        WalletUpdateInput: {
          type: "object",
          required: ["name", "type", "startingBalance"],
          properties: {
            name: { type: "string" },
            type: { type: "string", enum: ["cash", "bank", "ewallet", "credit"] },
            startingBalance: { type: "integer" }
          }
        },
        TransactionInput: { 
          type: "object", 
          required: ["type", "walletId", "amount", "category", "date"], 
          properties: { 
            type: { type: "string", enum: ["income", "expense"] }, 
            walletId: { type: "string" }, 
            amount: { type: "integer", minimum: 1 }, 
            category: { type: "string" }, 
            description: { type: "string" }, 
            date: { type: "string", format: "date" }, 
            note: { type: "string" } 
          } 
        },
        TransactionUpdateInput: {
          type: "object",
          required: ["type", "walletId", "amount", "category", "date"],
          properties: {
            type: { type: "string", enum: ["income", "expense"] },
            walletId: { type: "string" },
            amount: { type: "integer", minimum: 1 },
            category: { type: "string" },
            description: { type: "string" },
            date: { type: "string", format: "date" },
            note: { type: "string" }
          }
        },
        TransferInput: { 
          type: "object", 
          required: ["sourceWalletId", "destinationWalletId", "amount", "date"], 
          properties: { 
            sourceWalletId: { type: "string" }, 
            destinationWalletId: { type: "string" }, 
            amount: { type: "integer", minimum: 1 }, 
            fee: { type: "integer", minimum: 0 }, 
            date: { type: "string", format: "date" }, 
            description: { type: "string" } 
          } 
        },
        DebtInput: { 
          type: "object", 
          required: ["name", "direction", "principalAmount"], 
          properties: { 
            name: { type: "string" }, 
            direction: { type: "string", enum: ["owed_by_me", "owed_to_me"] }, 
            principalAmount: { type: "integer", minimum: 1 }, 
            dueDate: { type: "string", format: "date" },
            description: { type: "string" }
          } 
        },
        DebtUpdateInput: {
          type: "object",
          required: ["name", "direction", "principalAmount"],
          properties: {
            name: { type: "string" },
            direction: { type: "string", enum: ["owed_by_me", "owed_to_me"] },
            principalAmount: { type: "integer", minimum: 1 },
            dueDate: { type: "string", format: "date" },
            description: { type: "string" }
          }
        },
        PaymentInput: { 
          type: "object", 
          required: ["walletId", "amount", "date"], 
          properties: { 
            walletId: { type: "string" }, 
            amount: { type: "integer", minimum: 1 }, 
            date: { type: "string", format: "date" }, 
            note: { type: "string" } 
          } 
        },
        AssetInput: { 
          type: "object", 
          required: ["name", "category", "assetType", "quantity", "purchaseValue", "currentValue"], 
          properties: { 
            name: { type: "string" }, 
            category: { type: "string" }, 
            assetType: { type: "string" }, 
            quantity: { type: "number" }, 
            purchaseValue: { type: "integer", minimum: 0 }, 
            currentValue: { type: "integer", minimum: 0 },
            valuationDate: { type: "string", format: "date" },
            note: { type: "string" }
          } 
        },
        AssetValueInput: {
          type: "object",
          required: ["currentValue", "valuationDate"],
          properties: {
            currentValue: { type: "integer", minimum: 0 },
            valuationDate: { type: "string", format: "date" }
          }
        },
        UpcomingExpenseInput: { 
          type: "object", 
          required: ["name", "amount", "category", "dueDate", "recurrence"], 
          properties: { 
            name: { type: "string" }, 
            amount: { type: "integer", minimum: 1 }, 
            walletId: { type: "string" }, 
            category: { type: "string" }, 
            dueDate: { type: "string", format: "date" }, 
            recurrence: { type: "string", enum: ["once", "weekly", "monthly", "yearly"] }, 
            note: { type: "string" } 
          } 
        },
        UpcomingExpenseUpdateInput: {
          type: "object",
          required: ["name", "amount", "category", "dueDate", "recurrence"],
          properties: {
            name: { type: "string" },
            amount: { type: "integer", minimum: 1 },
            walletId: { type: "string" },
            category: { type: "string" },
            dueDate: { type: "string", format: "date" },
            recurrence: { type: "string", enum: ["once", "weekly", "monthly", "yearly"] },
            note: { type: "string" }
          }
        },
        UpcomingExpensePayInput: {
          type: "object",
          properties: {
            walletId: { type: "string" }
          }
        },
        WishlistInput: { 
          type: "object", 
          required: ["name", "targetAmount"], 
          properties: { 
            name: { type: "string" }, 
            targetAmount: { type: "integer", minimum: 1 }, 
            description: { type: "string" },
            savedAmount: { type: "integer", minimum: 0 }
          } 
        },
        WishlistUpdateInput: {
          type: "object",
          properties: {
            savedAmount: { type: "integer", minimum: 0 },
            status: { type: "string", enum: ["active", "purchased", "cancelled"] }
          }
        },
        ReportSendInput: { 
          type: "object", 
          properties: { 
            target: { type: "string", enum: ["auto", "today", "yesterday"], default: "auto" } 
          } 
        },
        TelegramSendInput: { 
          type: "object", 
          required: ["message"], 
          properties: { 
            message: { type: "string" } 
          } 
        }
      }
    }
  });
}
