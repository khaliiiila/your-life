import { NextResponse } from "next/server";
import { buildDailyReportText, dateInWib, getDailyReportData, shiftDate } from "@/lib/reports";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const today = dateInWib();
    const nowWib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const isMorning = nowWib.getHours() < 12;

    let target: string = body.target || "auto";
    let date = today;

    if (target === "yesterday") {
      date = shiftDate(today, -1);
    } else if (target === "auto") {
      target = isMorning ? "auto_morning" : "auto_evening";
      date = isMorning ? shiftDate(today, -1) : today;
    } else if (body.date) {
      date = body.date;
      target = "date";
    }

    const chatId: string | undefined = body.chatId;
    const data = getDailyReportData(date);
    const text = buildDailyReportText(data, target === "yesterday" || target === "auto_morning" ? "Kemarin" : "Hari Ini");

    if (target === "auto_morning") {
      const todayData = getDailyReportData(today);
      const todayText = buildDailyReportText(todayData, "Hari Ini");
      const combined = `${text}\n\n━━━━━━━━━━━━━━━━━━\n\n<b>📅 Pratinjau Hari Ini (${today})</b>\n\n${todayText}`;
      const result = await sendTelegramMessage(combined, chatId);
      return NextResponse.json({ ok: true, date, target, message_id: result.message_id, sent: ["yesterday", "today"] });
    }

    const result = await sendTelegramMessage(text, chatId);
    return NextResponse.json({ ok: true, date, target, message_id: result.message_id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Laporan tidak dapat dikirim." }, { status: 500 });
  }
}
