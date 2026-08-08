import { db } from "./db";

const categoryEmoji: Record<string, string> = {
  makanan: "🍽️", transport: "🚗", tagihan: "🛍️", kos: "🏠",
  donasi: "🤲", gaji: "💰", kesehatan: "🏥", hiburan: "🎮",
  family: "👨‍👩‍👧", utang: "💳", investasi: "📈", lainnya: "🛒",
};

export function formatRp(value: number) {
  return `Rp${new Intl.NumberFormat("id-ID").format(value)}`;
}

export function dateInWib() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shortDate(date: string, offset: number) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${shiftDate(date, offset)}T00:00:00Z`));
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNum] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, monthNum - 1 + offset, 1));
  return d.toISOString().slice(0, 7);
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function comparison(current: number, previous: number) {
  if (previous === 0 && current === 0) return "Tidak ada pengeluaran";
  if (previous === 0) return `Tidak ada data periode sebelumnya`;
  const diff = current - previous;
  const pct = ((diff / previous) * 100);
  if (diff === 0) return "Sama";
  return `${diff > 0 ? "Kenaikan" : "Turun"} ${formatRp(Math.abs(diff))} (${diff >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)}%)`;
}

type ExpenseRow = { description: string | null; category: string; amount: number };
type DebtRow = { name: string; remaining: number };

export type DailyReportData = {
  date: string;
  total: number;
  expenses: ExpenseRow[];
  yesterdayTotal: number;
  lastWeekTotal: number;
  monthTotal: number;
  monthActiveDays: number;
  monthAvg: number;
  lastMonthTotal: number;
  lastMonthActiveDays: number;
  lastMonthAvg: number;
  debts: DebtRow[];
};

export function getDailyReportData(date: string): DailyReportData {
  const expenses = db.prepare(`
    SELECT t.description, t.category, t.amount
    FROM transactions t
    WHERE t.date = ? AND t.type = 'expense' AND t.category <> 'transfer'
    ORDER BY t.created_at ASC
  `).all(date) as ExpenseRow[];

  const month = date.slice(0, 7);
  const monthTotal = (db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE substr(date,1,7) = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(month) as { total: number }).total;

  const monthActiveDays = (db.prepare(
    `SELECT COUNT(DISTINCT date) AS days FROM transactions WHERE substr(date,1,7) = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(month) as { days: number }).days;
  const monthAvg = monthActiveDays > 0 ? Math.round(monthTotal / monthActiveDays) : 0;

  const lastMonth = shiftMonth(month, -1);
  const lastMonthTotal = (db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE substr(date,1,7) = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(lastMonth) as { total: number }).total;

  const lastMonthActiveDays = (db.prepare(
    `SELECT COUNT(DISTINCT date) AS days FROM transactions WHERE substr(date,1,7) = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(lastMonth) as { days: number }).days;
  const lastMonthAvg = lastMonthActiveDays > 0 ? Math.round(lastMonthTotal / lastMonthActiveDays) : 0;

  const yesterdayDate = shiftDate(date, -1);
  const yesterdayTotal = (db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE date = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(yesterdayDate) as { total: number }).total;

  const lastWeekDate = shiftDate(date, -7);
  const lastWeekTotal = (db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE date = ? AND type = 'expense' AND category <> 'transfer'`
  ).get(lastWeekDate) as { total: number }).total;

  const debts = db.prepare(`
    SELECT d.name, d.principal_amount - COALESCE(SUM(p.amount), 0) AS remaining
    FROM debts d LEFT JOIN debt_payments p ON p.debt_id = d.id
    WHERE d.status = 'active' GROUP BY d.id HAVING remaining > 0 ORDER BY remaining DESC
  `).all() as DebtRow[];

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { date, total, expenses, yesterdayTotal, lastWeekTotal, monthTotal, monthActiveDays, monthAvg, lastMonthTotal, lastMonthActiveDays, lastMonthAvg, debts };
}

export function buildDailyReportText(data: DailyReportData, periodLabel = "Hari Ini") {
  const lines: string[] = [
    `<b>📊 Laporan Harian — ${data.date} WIB</b>`,
    "━━━━━━━━━━━━━━━━━━",
    "",
    `<b>💸 Pengeluaran ${periodLabel}</b>`,
  ];

  if (data.expenses.length === 0) {
    lines.push("• Tidak ada pengeluaran");
  } else {
    for (const e of data.expenses) {
      const emoji = categoryEmoji[e.category] || "🛒";
      const label = escapeHtml(e.description || e.category);
      lines.push(`• ${emoji} ${label} — ${formatRp(e.amount)}`);
    }
  }

  lines.push(`<b>🧾 Total: ${formatRp(data.total)}</b>`, "");
  lines.push("<b>📈 Perbandingan</b>");
  lines.push(`• Kemarin: ${formatRp(data.yesterdayTotal)} → ${comparison(data.total, data.yesterdayTotal)}`);
  lines.push(`• Minggu lalu (${shortDate(data.date, -7)}): ${formatRp(data.lastWeekTotal)} → ${comparison(data.total, data.lastWeekTotal)}`);
  lines.push("", "<b>📅 Ringkasan Bulanan</b>");
  lines.push(`• Bulan Ini: ${formatRp(data.monthTotal)} (Rata-rata: ${formatRp(data.monthAvg)}/hari aktif — ${data.monthActiveDays} hari)`);
  lines.push(`• Bulan Lalu: ${formatRp(data.lastMonthTotal)} (Rata-rata: ${formatRp(data.lastMonthAvg)}/hari aktif — ${data.lastMonthActiveDays} hari)`);
  lines.push("");
  lines.push("<b>💳 Utang Belum Dibayar</b>");

  if (data.debts.length === 0) {
    lines.push("• Tidak ada utang aktif");
  } else {
    for (const d of data.debts) lines.push(`• ${escapeHtml(d.name)}: ${formatRp(d.remaining)}`);
  }

  lines.push("", "━━━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}
