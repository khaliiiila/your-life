import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.message?.trim()) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    const result = await sendTelegramMessage(body.message.trim(), body.chatId, body.parseMode);
    return NextResponse.json({ ok: true, message_id: result.message_id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pesan tidak dapat dikirim." }, { status: 500 });
  }
}
