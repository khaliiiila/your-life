import { query } from "./db";
import { getFinancialHealthSettings } from "./settings-db";

export type AssetItem = {
  name: string;
  type: string;
  category: string;
  value: number;
};

export type Insight = {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
};

export type FinancialHealthData = {
  score: number;
  label: "Sangat Baik" | "Baik" | "Perlu Perhatian" | "Kritis";
  breakdown: {
    savingsRate: { score: number; value: number; weight: number };
    emergencyFund: { score: number; monthsCovered: number; targetMonths: number; weight: number };
    dtiRatio: { score: number; ratio: number; threshold: number; weight: number };
    netWorthGrowth: { score: number; yoyGrowth: number; weight: number };
    cashFlowStability: { score: number; volatility: number; weight: number };
  };
  assets: {
    liquid: { total: number; items: AssetItem[] };
    nonLiquid: { total: number; items: AssetItem[] };
    total: number;
  };
  upcomingImpact: {
    totalNext30Days: number;
    totalNext90Days: number;
    recurringMonthly: number;
    scoreImpact: number;
  };
  insights: Insight[];
};

const LIQUID_ASSET_TYPES = new Set([
  "cash",
  "bank",
  "savings",
  "money_market",
  "deposit",
  "emoney",
  "ewallet",
]);

function isLiquidAsset(assetType: string, category: string): boolean {
  const type = assetType.toLowerCase();
  const cat = category.toLowerCase();
  return LIQUID_ASSET_TYPES.has(type) || LIQUID_ASSET_TYPES.has(cat);
}

function calculateSavingsRateScore(savingsRate: number): number {
  if (savingsRate >= 0.5) return 100;
  if (savingsRate >= 0.3) return 75;
  if (savingsRate >= 0.2) return 50;
  if (savingsRate >= 0.1) return 25;
  return 0;
}

function calculateEmergencyFundScore(monthsCovered: number, targetMonths: number): number {
  if (monthsCovered >= targetMonths) return 100;
  if (monthsCovered <= 0) return 0;
  return Math.round((monthsCovered / targetMonths) * 100);
}

function calculateDTIScore(dtiRatio: number, threshold: number): number {
  if (dtiRatio <= 0) return 100;
  if (dtiRatio <= 0.2) return 80;
  if (dtiRatio <= 0.3) return 60;
  if (dtiRatio <= threshold / 100) return 40;
  if (dtiRatio <= 0.5) return 20;
  return 0;
}

function calculateNetWorthGrowthScore(yoyGrowth: number): number {
  if (yoyGrowth >= 0.2) return 100;
  if (yoyGrowth >= 0.1) return 75;
  if (yoyGrowth >= 0) return 50;
  if (yoyGrowth >= -0.1) return 25;
  return 0;
}

function calculateCashFlowStabilityScore(volatility: number): number {
  if (volatility < 0.3) return 100;
  if (volatility < 0.5) return 75;
  if (volatility < 0.8) return 50;
  if (volatility < 1.2) return 25;
  return 0;
}

function getLabel(score: number): "Sangat Baik" | "Baik" | "Perlu Perhatian" | "Kritis" {
  if (score >= 80) return "Sangat Baik";
  if (score >= 60) return "Baik";
  if (score >= 40) return "Perlu Perhatian";
  return "Kritis";
}

async function getMonthlyIncomeExpense() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  
  const result = await query<{ income: string; expenses: string; prevIncome: string; prevExpenses: string }>(
    `SELECT 
      COALESCE(SUM(amount) FILTER (WHERE type='income' AND to_char(date,'YYYY-MM')=$1),0) income,
      COALESCE(SUM(amount) FILTER (WHERE type='expense' AND to_char(date,'YYYY-MM')=$1 AND category<>'transfer'),0) expenses,
      COALESCE(SUM(amount) FILTER (WHERE type='income' AND to_char(date,'YYYY-MM')=$2),0) "prevIncome",
      COALESCE(SUM(amount) FILTER (WHERE type='expense' AND to_char(date,'YYYY-MM')=$2 AND category<>'transfer'),0) "prevExpenses"
    FROM transactions`,
    [month, lastMonth]
  );
  
  const r = result.rows[0];
  return {
    income: Number(r.income),
    expenses: Number(r.expenses),
    prevIncome: Number(r.prevIncome),
    prevExpenses: Number(r.prevExpenses),
  };
}

async function getDailyCashflow(days: number) {
  const target = new Date();
  target.setDate(target.getDate() - days);
  const targetKey = target.toISOString().split("T")[0];
  
  const result = await query<{ date: string; type: string; total: string }>(
    `SELECT date::text, type, SUM(amount) AS total 
     FROM transactions 
     WHERE date >= $1 AND category <> 'transfer' AND category <> 'utang'
     GROUP BY date, type ORDER BY date`,
    [targetKey]
  );
  
  const dailyMap = new Map<string, { income: number; expense: number }>();
  const cursor = new Date(target);
  const last = new Date();
  while (cursor <= last) {
    const key = cursor.toISOString().split("T")[0];
    dailyMap.set(key, { income: 0, expense: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  
  for (const row of result.rows) {
    const entry = dailyMap.get(row.date);
    if (entry) {
      if (row.type === "income") entry.income = Number(row.total);
      else entry.expense = Number(row.total);
    }
  }
  
  return Array.from(dailyMap.entries()).map(([date, v]) => ({
    date,
    netFlow: v.income - v.expense,
  }));
}

async function getDebtPayments() {
  const result = await query<{ monthly_payment: string }>(
    `SELECT COALESCE(SUM((d.principal_amount - COALESCE(p.paid, 0)) / NULLIF(GREATEST((d.due_date - CURRENT_DATE) / 30, 1), 0)), 0) AS monthly_payment
     FROM debts d
     LEFT JOIN (
       SELECT debt_id, SUM(amount) paid FROM debt_payments GROUP BY debt_id
     ) p ON p.debt_id = d.id
     WHERE d.status = 'active' AND d.direction = 'owed_by_me' AND d.due_date IS NOT NULL`
  );
  
  return Number(result.rows[0]?.monthly_payment || 0);
}

async function getNetWorthHistory() {
  const result = await query<{ month: string; net_worth: string }>(
    `WITH monthly AS (
      SELECT 
        to_char(date, 'YYYY-MM') AS month,
        SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END) AS net_flow
      FROM transactions
      WHERE category <> 'transfer'
      GROUP BY to_char(date, 'YYYY-MM')
    ),
    cumulative AS (
      SELECT 
        month,
        SUM(net_flow) OVER (ORDER BY month) + (
          SELECT COALESCE(SUM(starting_balance), 0) FROM wallets
        ) + (
          SELECT COALESCE(SUM(current_value), 0) FROM assets
        ) - (
          SELECT COALESCE(SUM(principal_amount - COALESCE(p.paid, 0)), 0)
          FROM debts d
          LEFT JOIN (SELECT debt_id, SUM(amount) paid FROM debt_payments GROUP BY debt_id) p ON p.debt_id = d.id
          WHERE d.status = 'active' AND d.direction = 'owed_by_me'
        ) + (
          SELECT COALESCE(SUM(principal_amount - COALESCE(p.paid, 0)), 0)
          FROM debts d
          LEFT JOIN (SELECT debt_id, SUM(amount) paid FROM debt_payments GROUP BY debt_id) p ON p.debt_id = d.id
          WHERE d.status = 'active' AND d.direction = 'owed_to_me'
        ) AS net_worth
      FROM monthly
    )
    SELECT month, net_worth::text FROM cumulative ORDER BY month`
  );
  
  return result.rows.map(r => ({ month: r.month, netWorth: Number(r.net_worth) }));
}

async function getUpcomingExpenses() {
  const now = new Date();
  const next30 = new Date(now);
  next30.setDate(next30.getDate() + 30);
  const next90 = new Date(now);
  next90.setDate(next90.getDate() + 90);
  
  const result = await query<{ amount: string; due_date: string; recurrence: string }>(
    `SELECT amount, due_date::text, recurrence 
     FROM upcoming_expenses 
     WHERE status IN ('scheduled','overdue') AND due_date <= $1
     ORDER BY due_date`,
    [next90.toISOString().split("T")[0]]
  );
  
  let totalNext30Days = 0;
  let totalNext90Days = 0;
  let recurringMonthly = 0;
  
  for (const row of result.rows) {
    const amount = Number(row.amount);
    const dueDate = new Date(row.due_date);
    totalNext90Days += amount;
    if (dueDate <= next30) totalNext30Days += amount;
    
    if (row.recurrence !== "once") {
      if (row.recurrence === "monthly") recurringMonthly += amount;
      else if (row.recurrence === "weekly") recurringMonthly += amount * 52 / 12;
      else if (row.recurrence === "yearly") recurringMonthly += amount / 12;
    }
  }
  
  return { totalNext30Days, totalNext90Days, recurringMonthly };
}

async function getAssets() {
  const result = await query<{ name: string; asset_type: string; category: string; current_value: string }>(
    "SELECT name, asset_type, category, current_value FROM assets"
  );
  
  const liquid: AssetItem[] = [];
  const nonLiquid: AssetItem[] = [];
  
  for (const row of result.rows) {
    const value = Number(row.current_value);
    const item = { name: row.name, type: row.asset_type, category: row.category, value };
    if (isLiquidAsset(row.asset_type, row.category)) {
      liquid.push(item);
    } else {
      nonLiquid.push(item);
    }
  }
  
  const liquidTotal = liquid.reduce((sum, a) => sum + a.value, 0);
  const nonLiquidTotal = nonLiquid.reduce((sum, a) => sum + a.value, 0);
  
  return { liquid: { total: liquidTotal, items: liquid }, nonLiquid: { total: nonLiquidTotal, items: nonLiquid }, total: liquidTotal + nonLiquidTotal };
}

export async function getFinancialHealthData(): Promise<FinancialHealthData> {
  const settings = await getFinancialHealthSettings();
  
  const [
    monthlyData,
    dailyCashflow,
    monthlyDebtPayment,
    netWorthHistory,
    upcomingData,
    assetsData,
  ] = await Promise.all([
    getMonthlyIncomeExpense(),
    getDailyCashflow(90),
    getDebtPayments(),
    getNetWorthHistory(),
    getUpcomingExpenses(),
    getAssets(),
  ]);
  
  const { income, expenses, prevIncome, prevExpenses } = monthlyData;
  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  const avgMonthlyExpense = expenses > 0 ? expenses : (prevExpenses > 0 ? prevExpenses : 1);
  
  const emergencyFundMonths = assetsData.liquid.total / avgMonthlyExpense;
  const emergencyFundScore = calculateEmergencyFundScore(emergencyFundMonths, settings.emergencyFundMonths);
  const savingsRateScore = calculateSavingsRateScore(savingsRate);
  
  const monthlyIncome = income > 0 ? income : (prevIncome > 0 ? prevIncome : 1);
  const dtiRatio = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : 0;
  const dtiScore = calculateDTIScore(dtiRatio, settings.dtiThresholdPercent);
  
  const netWorthGrowth = netWorthHistory.length >= 13
    ? (netWorthHistory[netWorthHistory.length - 1].netWorth - netWorthHistory[netWorthHistory.length - 13].netWorth) / Math.abs(netWorthHistory[netWorthHistory.length - 13].netWorth)
    : 0;
  const netWorthGrowthScore = calculateNetWorthGrowthScore(netWorthGrowth);
  
  const netFlows = dailyCashflow.map(d => d.netFlow);
  const meanFlow = netFlows.reduce((a, b) => a + b, 0) / netFlows.length || 1;
  const variance = netFlows.reduce((sum, v) => sum + Math.pow(v - meanFlow, 2), 0) / netFlows.length;
  const stdDev = Math.sqrt(variance);
  const volatility = Math.abs(meanFlow) > 0 ? stdDev / Math.abs(meanFlow) : 1;
  const cashFlowStabilityScore = calculateCashFlowStabilityScore(volatility);
  
  const weights = { savingsRate: 25, emergencyFund: 25, dtiRatio: 20, netWorthGrowth: 15, cashFlowStability: 15 };
  const weightedSum = 
    savingsRateScore * weights.savingsRate / 100 +
    emergencyFundScore * weights.emergencyFund / 100 +
    dtiScore * weights.dtiRatio / 100 +
    netWorthGrowthScore * weights.netWorthGrowth / 100 +
    cashFlowStabilityScore * weights.cashFlowStability / 100;
  
  let upcomingDeduction = 0;
  if (assetsData.liquid.total > 0) {
    const next30Ratio = upcomingData.totalNext30Days / assetsData.liquid.total;
    const next90Ratio = upcomingData.totalNext90Days / assetsData.liquid.total;
    const recurringRatio = monthlyIncome > 0 ? upcomingData.recurringMonthly / monthlyIncome : 0;
    
    if (next30Ratio > 0.8) upcomingDeduction += 20;
    else if (next30Ratio > 0.5) upcomingDeduction += 10;
    
    if (next90Ratio > 1.5) upcomingDeduction += 15;
    else if (next90Ratio > 1.0) upcomingDeduction += 10;
    
    if (recurringRatio > 0.5) upcomingDeduction += 10;
    else if (recurringRatio > 0.3) upcomingDeduction += 5;
  }
  
  const finalScore = Math.max(0, Math.min(100, Math.round(weightedSum - upcomingDeduction)));
  const label = getLabel(finalScore);
  
  const insights: Insight[] = [];
  
  if (emergencyFundMonths < settings.emergencyFundMonths) {
    insights.push({
      priority: "high",
      title: "Dana Darurat Kurang",
      description: `Dana likuid hanya mencakupi ${emergencyFundMonths.toFixed(1)} bulan pengeluaran (target: ${settings.emergencyFundMonths} bulan)`,
    });
  }
  
  if (dtiRatio > settings.dtiThresholdPercent / 100) {
    insights.push({
      priority: "high",
      title: "DTI Melebihi Batas",
      description: `Rasio hutang ke pendapatan ${(dtiRatio * 100).toFixed(1)}% melebihi ambang ${settings.dtiThresholdPercent}%`,
    });
  }
  
  if (savingsRate < 0.2) {
    insights.push({
      priority: "medium",
      title: "Tabungan Rendah",
      description: `Tingkat tabungan ${(savingsRate * 100).toFixed(1)}% di bawah rekomendasi 20%`,
    });
  }
  
  if (netWorthGrowth < 0) {
    insights.push({
      priority: "medium",
      title: "Net Worth Menurun",
      description: `Net worth turun ${Math.abs(netWorthGrowth * 100).toFixed(1)}% YoY`,
    });
  }
  
  if (upcomingData.totalNext30Days > assetsData.liquid.total * 0.5) {
    insights.push({
      priority: "high",
      title: "Pengeluaran Mendatang Tinggi",
      description: `Pengeluaran 30 hari ke depan (Rp ${upcomingData.totalNext30Days.toLocaleString()}) > 50% dana likuid`,
    });
  }
  
  if (assetsData.liquid.total === 0 && assetsData.nonLiquid.total > 0) {
    insights.push({
      priority: "medium",
      title: "Tidak Ada Aset Likuid",
      description: "Semua aset bersifat non-likuid, pertimbangkan menyisihkan dana darurat",
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      priority: "low",
      title: "Kondisi Finansial Sehat",
      description: "Semua indikator utama berada dalam zona aman",
    });
  }
  
  return {
    score: finalScore,
    label,
    breakdown: {
      savingsRate: { score: savingsRateScore, value: savingsRate, weight: weights.savingsRate },
      emergencyFund: { score: emergencyFundScore, monthsCovered: emergencyFundMonths, targetMonths: settings.emergencyFundMonths, weight: weights.emergencyFund },
      dtiRatio: { score: dtiScore, ratio: dtiRatio, threshold: settings.dtiThresholdPercent, weight: weights.dtiRatio },
      netWorthGrowth: { score: netWorthGrowthScore, yoyGrowth: netWorthGrowth, weight: weights.netWorthGrowth },
      cashFlowStability: { score: cashFlowStabilityScore, volatility, weight: weights.cashFlowStability },
    },
    assets: assetsData,
    upcomingImpact: {
      totalNext30Days: upcomingData.totalNext30Days,
      totalNext90Days: upcomingData.totalNext90Days,
      recurringMonthly: upcomingData.recurringMonthly,
      scoreImpact: upcomingDeduction,
    },
    insights,
  };
}