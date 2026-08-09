import { NextResponse } from "next/server";
import { buildDailyReportText, dateInWib, getDailyReportData, shiftDate } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = dateInWib();

  // Deteksi otomatis: jika belum jam 12 siang WIB, anggap "pagi" → kemarin relevan
  const nowWib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const isMorning = nowWib.getHours() < 12;

  // Override manual: ?target=today|yesterday|auto|date=YYYY-MM-DD
  const target = url.searchParams.get("target") || "auto";
  const explicitDate = url.searchParams.get("date");

  if (explicitDate) {
    const data = await getDailyReportData(explicitDate);
    return NextResponse.json({ date: explicitDate, target: "date", text: buildDailyReportText(data), data });
  }

  if (target === "today") {
    const data = await getDailyReportData(today);
    return NextResponse.json({ date: today, target, text: buildDailyReportText(data), data });
  }

  if (target === "yesterday") {
    const yesterday = shiftDate(today, -1);
    const data = await getDailyReportData(yesterday);
    return NextResponse.json({ date: yesterday, target, text: buildDailyReportText(data, "Kemarin"), data });
  }

  // auto: sertakan kemarin jika sebelum jam 12 siang
  if (isMorning) {
    const yesterday = shiftDate(today, -1);
    const dataToday = await getDailyReportData(today);
    const dataYesterday = await getDailyReportData(yesterday);
    return NextResponse.json({
      target: "auto_morning",
      isMorning: true,
      today: { date: today, text: buildDailyReportText(dataToday, "Hari Ini"), data: dataToday },
      yesterday: { date: yesterday, text: buildDailyReportText(dataYesterday, "Kemarin"), data: dataYesterday },
    });
  }

  const data = await getDailyReportData(today);
  return NextResponse.json({ date: today, target: "auto_evening", isMorning: false, text: buildDailyReportText(data), data });
}
