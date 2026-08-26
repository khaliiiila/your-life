import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { fetchEntry, fetchInsight, fetchSmartMoney, fetchTechnical } from "@/lib/bidbot";
import { sendTelegramMessage } from "@/lib/telegram";
import { idr } from "@/lib/formatters";

export const dynamic = "force-dynamic";

function rec(entry: Record<string, unknown> | null, tech: Record<string, unknown> | null, smart: Record<string, unknown> | null, gainPct: number) {
  const verdict = (entry as { verdict?: string })?.verdict ?? "";
  const exitW = (tech as { exit_warning?: boolean })?.exit_warning ?? (entry as { tech?: { exit_warning?: boolean } })?.tech?.exit_warning ?? false;
  const trend = (tech as { trend_score?: number })?.trend_score ?? (entry as { tech?: { trend_score?: number } })?.tech?.trend_score ?? 0;
  const leaderTrend = (smart as { leader_trend?: string })?.leader_trend ?? (entry as { smart?: { leader_trend?: string } })?.smart?.leader_trend ?? "";
  const diff = (smart as { diff_pct?: number })?.diff_pct ?? (entry as { smart?: { diff_pct?: number } })?.smart?.diff_pct ?? 99;
  if (exitW) return "⚠️ WASPADA — sinyal exit, pertimbangkan CUTLOSS sebagian";
  if (verdict === "ENTRY OK" && gainPct < -5 && leaderTrend === "BUILDING" && Math.abs(diff) < 5) return "🔵 AVG DOWN pertimbangkan — bandar akumulasi di dekat avg mereka";
  if (verdict === "ENTRY OK" && gainPct >= 0 && trend > 0.6) return "🟢 TAMBAH PORSI — trend bagus & posisi profit";
  if (verdict === "ENTRY OK" && gainPct < -8) return "🟡 WAIT / AVG DOWN hati-hati — tunggu konfirmasi, jangan buru-buru";
  if (verdict === "WATCHLIST") return "🟡 WAIT — belum sinyal entry kuat";
  if (gainPct < -12 && trend < 0.4) return "🔴 CUTLOSS evaluasi — downtrend & loss dalam";
  return "🟡 WAIT — pantau";
}

function fmt(n: number) { return idr.format(Math.round(n)); }

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const chatId = body.chatId as string | undefined;
    const rows = (await query<{ id: string; name: string; quantity: string; purchase_value: string; current_value: string; ticker: string | null; asset_type: string }>("SELECT id,name,quantity,purchase_value,current_value,ticker,asset_type FROM assets WHERE asset_type='stock' ORDER BY current_value DESC")).rows;
    if (!rows.length) return NextResponse.json({ ok: true, sent: 0, msg: "Tidak ada saham pegangan" });
    const dateStr = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
    const blocks: string[] = [];
    const results: { ticker: string; ok: boolean; verdict?: string; rec?: string; error?: string }[] = [];
    for (const r of rows) {
      const ticker = r.ticker?.trim() || r.name.trim().toUpperCase();
      const qty = Number(r.quantity);
      const avgBuy = qty ? Number(r.purchase_value) / qty : 0;
      const gain = Number(r.current_value) - Number(r.purchase_value);
      const gainPctTotal = Number(r.purchase_value) ? (gain / Number(r.purchase_value)) * 100 : 0;
      try {
        const [entry, tech, insight, smart] = await Promise.all([fetchEntry(ticker), fetchTechnical(ticker), fetchInsight(ticker), fetchSmartMoney(ticker)]);
        if (!entry && !tech && !insight) throw new Error("Data bidbot kosong");
        const e = entry as { verdict?: string; verdict_icon?: string; total?: number; current_price?: number; flow?: { pattern?: string; composite_pct?: number; top1_code?: string; top1_net_pct?: number }; smart?: { leader?: string; leader_trend?: string; leader_avg_cost?: number; diff_pct?: number }; tech?: { trend_score?: number; chg_pct?: number; exit_warning?: boolean } } | null;
        const cur = (e?.current_price ?? (tech as { close?: number })?.close ?? 0) as number;
        const priceGainPct = avgBuy ? ((cur - avgBuy) / avgBuy) * 100 : 0;
        const verdict = e?.verdict ?? "—";
        const icon = e?.verdict_icon ?? "▫️";
        const total = e?.total ?? "—";
        const flowPat = e?.flow?.pattern ?? (insight as { daily_bandar_type?: string })?.daily_bandar_type ?? "—";
        const top1 = e?.flow?.top1_code ? `${e.flow.top1_code} ${e.flow.top1_net_pct?.toFixed(1)}%` : "—";
        const comp = e?.flow?.composite_pct ? `${e.flow.composite_pct.toFixed(1)}%` : "—";
        const leader = e?.smart?.leader ?? (smart as { top_accumulators?: { broker_code: string }[] })?.top_accumulators?.[0]?.broker_code ?? "—";
        const lTrend = e?.smart?.leader_trend ?? (smart as { top_accumulators?: { trend: string }[] })?.top_accumulators?.[0]?.trend ?? "—";
        const lAvg = e?.smart?.leader_avg_cost ?? (smart as { top_accumulators?: { avg_cost: number }[] })?.top_accumulators?.[0]?.avg_cost ?? 0;
        const diff = e?.smart?.diff_pct ?? 0;
        const trend = (tech as { trend_score?: number })?.trend_score ?? e?.tech?.trend_score ?? 0;
        const chg = (tech as { chg_pct?: number })?.chg_pct ?? e?.tech?.chg_pct ?? 0;
        const wy = (insight as { wyckoff?: { phase_label?: string } })?.wyckoff?.phase_label ?? "—";
        const recText = rec(entry as Record<string, unknown> | null, tech as Record<string, unknown> | null, (smart as Record<string, unknown>) ?? (entry as Record<string, unknown>)?.smart as Record<string, unknown> | null, priceGainPct);
        const block =
          `<b>${icon} ${ticker} — ${verdict} (${total}/97)</b>\n` +
          `Harga: ${cur ? fmt(cur) : "—"} (${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%) | Trend ${Number(trend).toFixed(2)} | Wyckoff ${wy}\n` +
          `Flow: ${flowPat} ${comp} | Top1 ${top1}\n` +
          `Smart: ${leader} ${lTrend} avg ${lAvg ? fmt(lAvg) : "—"} (${diff >= 0 ? "+" : ""}${Number(diff).toFixed(1)}% vs close)\n` +
          `Posisi: ${qty} lot avg ${fmt(avgBuy)} | ${priceGainPct >= 0 ? "+" : ""}${priceGainPct.toFixed(2)}% (${gain >= 0 ? "+" : ""}${fmt(gain)} total, ${gainPctTotal >= 0 ? "+" : ""}${gainPctTotal.toFixed(1)}%)\n` +
          `<b>Rekom: ${recText}</b>\n` +
          `<a href="https://bidbot.web.id/stock/${ticker}">Buka di BidBot →</a>`;
        blocks.push(block);
        results.push({ ticker, ok: true, verdict, rec: recText });
      } catch (err) {
        results.push({ ticker, ok: false, error: err instanceof Error ? err.message : String(err) });
        blocks.push(`<b>▫️ ${ticker} — gagal ambil data</b>\n${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const batches: string[][] = [];
    let idx = 0; let rem = blocks.length;
    while (rem > 0) {
      if (rem === 5) { batches.push(blocks.slice(idx, idx + 3)); idx += 3; rem -= 3; continue; }
      if (rem === 6) { batches.push(blocks.slice(idx, idx + 3)); idx += 3; rem -= 3; continue; }
      if (rem <= 4) { batches.push(blocks.slice(idx)); break; }
      batches.push(blocks.slice(idx, idx + 4)); idx += 4; rem -= 4;
    }
    const sentIds: number[] = [];
    for (let i = 0; i < batches.length; i++) {
      const header = `📊 <b>Report Insight Saham — ${dateStr}</b> (${i + 1}/${batches.length}) — ${rows.length} saham\n\n`;
      const body = batches[i].join("\n\n━━━━━━━━━━━━━━\n\n");
      const sent = await sendTelegramMessage(header + body, chatId);
      sentIds.push(sent.message_id);
      if (i < batches.length - 1) await new Promise((res) => setTimeout(res, 400));
    }
    return NextResponse.json({ ok: true, sent: sentIds.length, total: rows.length, bubbles: batches.length, perBubble: batches.map((b) => b.length), results, message_ids: sentIds });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Broadcast gagal" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const chatId = new URL(request.url).searchParams.get("chatId") || undefined;
  return POST(new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId }) } as RequestInit));
}
