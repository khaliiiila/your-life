import { numbers, query } from "./db";

function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function shiftMonth(month: string, offset: number) { const [year, monthNum] = month.split("-").map(Number); return dateKey(new Date(Date.UTC(year, monthNum - 1 + offset, 1))).slice(0, 7); }
function startOfWeek(d: Date): Date { const date = new Date(d); date.setDate(date.getDate() - date.getDay()); return date; }
function endOfWeek(d: Date): Date { const date = new Date(d); date.setDate(date.getDate() + (6 - date.getDay())); return date; }
function startOfYear(d: Date): Date { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date): Date { return new Date(d.getFullYear(), 11, 31); }

export async function getDailyExpenses() {
  const today = dateKey(new Date()); const month = today.slice(0, 7); const lastMonth = shiftMonth(month, -1);
  const result = await query<{ today_total: string; month_total: string; month_days: string; last_total: string; last_days: string; all_total: string; all_days: string }>(`SELECT COALESCE(SUM(amount) FILTER (WHERE date=$1),0) today_total,COALESCE(SUM(amount) FILTER (WHERE to_char(date,'YYYY-MM')=$2),0) month_total,COUNT(DISTINCT date) FILTER (WHERE to_char(date,'YYYY-MM')=$2) month_days,COALESCE(SUM(amount) FILTER (WHERE to_char(date,'YYYY-MM')=$3),0) last_total,COUNT(DISTINCT date) FILTER (WHERE to_char(date,'YYYY-MM')=$3) last_days,COALESCE(SUM(amount),0) all_total,COUNT(DISTINCT date) all_days FROM transactions WHERE type='expense' AND category<>'transfer'`, [today, month, lastMonth]);
  const r = result.rows[0]; const monthTotal=Number(r.month_total), monthDays=Number(r.month_days), lastTotal=Number(r.last_total), lastDays=Number(r.last_days), allTotal=Number(r.all_total), allDays=Number(r.all_days);
  return { today, todayTotal:Number(r.today_total), monthAvg:monthDays ? Math.round(monthTotal/monthDays):0, lastMonthAvg:lastDays ? Math.round(lastTotal/lastDays):0, allAvg:allDays ? Math.round(allTotal/allDays):0 };
}

export async function getBalanceHistory(days = 366) {
  const target = new Date(); target.setDate(target.getDate()-days); const targetKey=dateKey(target);
  const [startResult, priorResult, rowsResult] = await Promise.all([query<{ value:string }>("SELECT COALESCE(SUM(starting_balance),0) value FROM wallets"),query<{ value:string }>("SELECT COALESCE(SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END),0) value FROM transactions WHERE date<$1",[targetKey]),query<{ date:string; value:string }>("SELECT date::text,SUM(CASE WHEN type IN ('income','adjustment') THEN amount ELSE -amount END) value FROM transactions WHERE date>=$1 GROUP BY date ORDER BY date",[targetKey])]);
  const map=new Map(rowsResult.rows.map(r=>[r.date,Number(r.value)])); let balance=Number(startResult.rows[0].value)+Number(priorResult.rows[0].value); const cursor=new Date(target),last=new Date(),points=[];
  while(cursor<=last){const key=dateKey(cursor);balance+=map.get(key)??0;points.push({date:key,balance});cursor.setDate(cursor.getDate()+1);} return points;
}

export async function getAnalytics(period: "daily" | "weekly" | "monthly" | "yearly") {
  const now = new Date();
  
  let from: Date, to: Date;
  
  switch (period) {
    case "daily":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = from;
      break;
    case "weekly":
      from = startOfWeek(now);
      to = endOfWeek(now);
      break;
    case "monthly":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "yearly":
      from = startOfYear(now);
      to = endOfYear(now);
      break;
  }
  
  const fromKey = dateKey(from);
  const toKey = dateKey(to);
  const daysInPeriod = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const oneYearAgoFrom = new Date(from); oneYearAgoFrom.setFullYear(oneYearAgoFrom.getFullYear() - 1);
  const twoYearAgoFrom = new Date(from); twoYearAgoFrom.setFullYear(twoYearAgoFrom.getFullYear() - 2);
  const prevTo = new Date(to); prevTo.setFullYear(prevTo.getFullYear() - 1);
  
  const [currResult, prevResult, catResult, distResult, dayResult, topDay] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount) FILTER (WHERE type='income' AND date>=$1 AND date<=$2),0) income,COALESCE(SUM(amount) FILTER (WHERE type='expense' AND date>=$1 AND date<=$2 AND category<>'transfer'),0) expense,COUNT(*) FILTER (WHERE type IN ('income','adjustment') AND date>=$1 AND date<=$2) tx_count FROM transactions`, [fromKey, toKey]),
    query(`SELECT COALESCE(SUM(amount) FILTER (WHERE type='income' AND date>=$1 AND date<=$2),0) income,COALESCE(SUM(amount) FILTER (WHERE type='expense' AND date>=$1 AND date<=$2 AND category<>'transfer'),0) expense FROM transactions WHERE date>=$3 AND date<=$4`, [oneYearAgoFrom.toISOString().split("T")[0], prevTo.toISOString().split("T")[0], oneYearAgoFrom.toISOString().split("T")[0], prevTo.toISOString().split("T")[0]]),
    query(`SELECT category,SUM(amount) total FROM transactions WHERE type='expense' AND date>=$1 AND date<=$2 AND category<>'transfer' GROUP BY category ORDER BY total DESC LIMIT 5`, [fromKey, toKey]),
    query(`SELECT type,SUM(amount) total,COUNT(*) cnt FROM transactions WHERE date>=$1 AND date<=$2 GROUP BY type`, [fromKey, toKey]),
    query(`SELECT date::text,type,SUM(amount) total FROM transactions WHERE date>=$1 AND date<=$2 GROUP BY date,type ORDER BY date`, [fromKey, toKey]),
    query(`SELECT date::text,SUM(amount) total FROM transactions WHERE type='expense' AND date>=$1 AND date<=$2 AND category<>'transfer' GROUP BY date ORDER BY total DESC LIMIT 1`, [fromKey, toKey])
  ]);
  
  const r = currResult.rows[0]; const p = prevResult.rows[0];
  const currIncome = Number(r.income), currExpense = Number(r.expense);
  const prevIncome = Number(p.income), prevExpense = Number(p.expense);
  
  const categories = catResult.rows.map(row => ({ category: row.category, total: Number(row.total) }));
  const distribution = distResult.rows.map(row => ({ type: row.type, total: Number(row.total), count: Number(row.cnt) }));
  const dailyBreakdown = dayResult.rows.map(row => ({ date: row.date, type: row.type, total: Number(row.total) }));
  const worstDay = topDay.rows.length > 0 ? { date: topDay.rows[0].date, amount: Number(topDay.rows[0].total) } : null;
  
  const avgDaysPrev = daysInPeriod;
  const dailyIncomeAvg = prevIncome !== 0 ? Math.round(currIncome / (prevIncome / avgDaysPrev)) : currIncome;
  const dailyExpenseAvg = prevExpense !== 0 ? Math.round(currExpense / (prevExpense / avgDaysPrev)) : currExpense;
  
  const netFlow = currIncome - currExpense;
  const prevNetFlow = prevIncome - prevExpense;
  const savingsRate = currIncome > 0 ? Math.round(((currIncome - currExpense) / currIncome) * 100) : 0;
  const prevSavingsRate = prevIncome > 0 ? Math.round(((prevIncome - prevExpense) / prevIncome) * 100) : 0;
  
  return {
    period,
    label: `${new Intl.DateTimeFormat("id-ID", { month: "long" }).format(from).toUpperCase()} ${new Intl.DateTimeFormat("id-ID").format(from).slice(-4)}`,
    summary: { currentPeriod: currIncome, previousPeriod: prevIncome },
    averages: { dailyIncome: Math.round(currIncome / daysInPeriod), dailyExpense: Math.round(currExpense / daysInPeriod), incomeAvg: dailyIncomeAvg, expenseAvg: dailyExpenseAvg },
    categories,
    distribution,
    dailyBreakdown,
    worstDay,
    dates: Array.from({ length: daysInPeriod }, (_, i) => ({ date: dateKey(new Date(from.getTime() + i * (24 * 60 * 60 * 1000))) })),
  };
}

function formatDate(d: Date): string {
  return `${d.getDate()} ${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d).toUpperCase()}`;
}

export async function getDashboardData() {
  const month=new Date().toISOString().slice(0,7);
  const [walletsResult,flowResult,transactionsResult,upcomingResult,investmentsResult,debtsResult,daily]=await Promise.all([
    query("SELECT w.id,w.name,w.type,w.starting_balance+COALESCE(SUM(CASE WHEN t.type IN ('income','adjustment') THEN t.amount ELSE -t.amount END),0) balance FROM wallets w LEFT JOIN transactions t ON t.wallet_id=w.id GROUP BY w.id ORDER BY balance DESC"),
    query("SELECT COALESCE(SUM(amount) FILTER (WHERE type='income'),0) income,COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) expenses FROM transactions WHERE to_char(date,'YYYY-MM')=$1 AND category<>'transfer'",[month]),
    query("SELECT t.id,t.type,w.name wallet_name,t.amount,t.category,t.description,t.date::text FROM transactions t JOIN wallets w ON w.id=t.wallet_id ORDER BY t.date DESC,t.created_at DESC LIMIT 8"),
    query("SELECT e.id,e.name,e.amount,e.due_date::text,e.category,w.name wallet_name FROM upcoming_expenses e LEFT JOIN wallets w ON w.id=e.wallet_id WHERE e.status='scheduled' ORDER BY e.due_date LIMIT 4"),
    query("SELECT COALESCE(SUM(current_value),0) value,COALESCE(SUM(current_value-purchase_value),0) gain FROM assets"),
    query("SELECT COALESCE(SUM(d.principal_amount-COALESCE(p.paid,0)) FILTER (WHERE d.direction='owed_by_me'),0) owed,COALESCE(SUM(d.principal_amount-COALESCE(p.paid,0)) FILTER (WHERE d.direction='owed_to_me'),0) receivable FROM debts d LEFT JOIN (SELECT debt_id,SUM(amount) paid FROM debt_payments GROUP BY debt_id) p ON p.debt_id=d.id WHERE d.status='active'"),getDailyExpenses()]);
  const wallets=walletsResult.rows.map(r=>numbers(r,["balance"])); const flow=numbers(flowResult.rows[0],["income","expenses"]); const transactions=transactionsResult.rows.map(r=>numbers(r,["amount"])); const upcoming=upcomingResult.rows.map(r=>numbers(r,["amount"])); const investments=numbers(investmentsResult.rows[0],["value","gain"]); const debts=numbers(debtsResult.rows[0],["owed","receivable"]); const totalBalance=wallets.reduce((sum,w)=>sum+Number(w.balance),0); const netWorth=totalBalance+Number(investments.value)+Number(debts.receivable)-Number(debts.owed);
  return {wallets,flow,transactions,upcoming,investments,debts,totalBalance,netWorth,month,daily};
}
