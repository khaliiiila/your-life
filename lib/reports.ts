import { numbers, query } from "./db";

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

export async function getDailyReportData(date: string): Promise<DailyReportData> {
  const month = date.slice(0, 7), lastMonth = shiftMonth(month, -1), yesterday = shiftDate(date, -1), lastWeek = shiftDate(date, -7);
  const [expenseResult, summaryResult, debtResult] = await Promise.all([
    query<ExpenseRow>("SELECT description,category,amount FROM transactions WHERE date=$1 AND type='expense' AND category<>'transfer' ORDER BY created_at", [date]),
    query<{ month_total:string; month_days:string; last_total:string; last_days:string; yesterday:string; last_week:string }>(`SELECT COALESCE(SUM(amount) FILTER (WHERE to_char(date,'YYYY-MM')=$1),0) month_total,COUNT(DISTINCT date) FILTER (WHERE to_char(date,'YYYY-MM')=$1) month_days,COALESCE(SUM(amount) FILTER (WHERE to_char(date,'YYYY-MM')=$2),0) last_total,COUNT(DISTINCT date) FILTER (WHERE to_char(date,'YYYY-MM')=$2) last_days,COALESCE(SUM(amount) FILTER (WHERE date=$3),0) yesterday,COALESCE(SUM(amount) FILTER (WHERE date=$4),0) last_week FROM transactions WHERE type='expense' AND category<>'transfer'`, [month,lastMonth,yesterday,lastWeek]),
    query<DebtRow>("SELECT d.name,d.principal_amount-COALESCE(SUM(p.amount),0) remaining FROM debts d LEFT JOIN debt_payments p ON p.debt_id=d.id WHERE d.status='active' GROUP BY d.id HAVING d.principal_amount-COALESCE(SUM(p.amount),0)>0 ORDER BY remaining DESC")
  ]);
  const expenses=expenseResult.rows.map(row=>numbers(row,["amount"])); const summary=summaryResult.rows[0]; const monthTotal=Number(summary.month_total),monthActiveDays=Number(summary.month_days),lastMonthTotal=Number(summary.last_total),lastMonthActiveDays=Number(summary.last_days); const debts=debtResult.rows.map(row=>numbers(row,["remaining"]));
  return {date,total:expenses.reduce((sum,e)=>sum+e.amount,0),expenses,yesterdayTotal:Number(summary.yesterday),lastWeekTotal:Number(summary.last_week),monthTotal,monthActiveDays,monthAvg:monthActiveDays?Math.round(monthTotal/monthActiveDays):0,lastMonthTotal,lastMonthActiveDays,lastMonthAvg:lastMonthActiveDays?Math.round(lastMonthTotal/lastMonthActiveDays):0,debts};
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
