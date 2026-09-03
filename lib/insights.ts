export type InsightInput = {
  verdict: string;
  exit_warning: boolean;
  trend_score: number;
  leader_trend: string;
  diff_pct: number;
  gain_pct: number;
};

export function computeRecommendation(input: InsightInput): string {
  const { verdict, exit_warning, trend_score, leader_trend, diff_pct, gain_pct } = input;
  if (exit_warning) return "⚠️ WASPADA — sinyal exit, pertimbangkan CUTLOSS sebagian";
  if (verdict === "ENTRY OK" && gain_pct < -5 && leader_trend === "BUILDING" && Math.abs(diff_pct) < 5) return "🔵 AVG DOWN pertimbangkan — bandar akumulasi di dekat avg mereka";
  if (verdict === "ENTRY OK" && gain_pct >= 0 && trend_score > 0.6) return "🟢 TAMBAH PORSI — trend bagus & posisi profit";
  if (verdict === "ENTRY OK" && gain_pct < -8) return "🟡 WAIT / AVG DOWN hati-hati — tunggu konfirmasi, jangan buru-buru";
  if (verdict === "WATCHLIST") return "🟡 WAIT — belum sinyal entry kuat";
  if (gain_pct < -12 && trend_score < 0.4) return "🔴 CUTLOSS evaluasi — downtrend & loss dalam";
  return "🟡 WAIT — pantau";
}

export function runRecommendationChecks() {
  const cases: Array<[InsightInput, string]> = [
    [{ verdict: "ENTRY OK", exit_warning: true, trend_score: 0.9, leader_trend: "BUILDING", diff_pct: 1, gain_pct: 5 }, "exit"],
    [{ verdict: "ENTRY OK", exit_warning: false, trend_score: 0.3, leader_trend: "BUILDING", diff_pct: 2, gain_pct: -8 }, "avg down"],
    [{ verdict: "ENTRY OK", exit_warning: false, trend_score: 0.8, leader_trend: "BUILDING", diff_pct: 9, gain_pct: 3 }, "tambah porsi"],
    [{ verdict: "ENTRY OK", exit_warning: false, trend_score: 0.5, leader_trend: "BUILDING", diff_pct: 9, gain_pct: -10 }, "AVG DOWN hati-hati"],
    [{ verdict: "WATCHLIST", exit_warning: false, trend_score: 0.5, leader_trend: "BUILDING", diff_pct: 9, gain_pct: -2 }, "belum sinyal"],
    [{ verdict: "NO", exit_warning: false, trend_score: 0.2, leader_trend: "BUILDING", diff_pct: 9, gain_pct: -15 }, "cutloss"],
    [{ verdict: "NO", exit_warning: false, trend_score: 0.7, leader_trend: "BUILDING", diff_pct: 9, gain_pct: 1 }, "pantau"],
  ];
  const out: string[] = [];
  for (const [input, expect] of cases) {
    const got = computeRecommendation(input);
    const pass = got.toLowerCase().includes(expect.toLowerCase()) || (expect === "exit" && got.toLowerCase().includes("exit"));
    out.push(`${pass ? "PASS" : "FAIL"} ${expect}: ${got}`);
  }
  return out;
}

if (typeof process !== "undefined" && process.argv[1] && process.argv[1].endsWith("insights.ts")) {
  for (const line of runRecommendationChecks()) console.log(line);
}
