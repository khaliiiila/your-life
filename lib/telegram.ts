export async function sendTelegramMessage(message: string, chatId?: string, parseMode?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const id = chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum di-set.");
  if (!id) throw new Error("TELEGRAM_CHAT_ID belum di-set.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: id, text: message, parse_mode: parseMode || "HTML" }),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error(result.description || "Telegram menolak pesan.");
  return result.result;
}
