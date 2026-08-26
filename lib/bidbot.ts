const BASE = "https://bidbot.web.id";
let cache: { token: string; exp: number } | null = null;

function creds() {
  const email = process.env.BIDBOT_EMAIL;
  const password = process.env.BIDBOT_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function parseTokenExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.exp ? payload.exp * 1000 : Date.now() + 25 * 864e5;
  } catch {
    return Date.now() + 25 * 864e5;
  }
}

async function login(): Promise<string> {
  const c = creds();
  if (!c) throw new Error("BIDBOT_EMAIL/PASSWORD belum diisi.");
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(c),
  });
  if (!res.ok) throw new Error(`Bidbot login gagal (${res.status}).`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/bidbot_token=([^;]+)/);
  const token = m?.[1] ?? "";
  if (!token) throw new Error("Token bidbot tidak ditemukan.");
  cache = { token, exp: parseTokenExp(token) };
  return token;
}

async function getToken(): Promise<string> {
  // ponytail: in-memory cache, re-login on 401; persist to DB if multi-instance needed
  if (cache && cache.exp - Date.now() > 60_000) return cache.token;
  return login();
}

async function bidbotFetch(path: string, retry = true): Promise<Response> {
  const token = await getToken();
  let res = await fetch(`${BASE}${path}`, { headers: { Cookie: `bidbot_token=${token}` } });
  if ((res.status === 401 || res.status === 403) && retry) {
    cache = null;
    const t2 = await login();
    res = await fetch(`${BASE}${path}`, { headers: { Cookie: `bidbot_token=${t2}` } });
  }
  return res;
}

export async function fetchPrice(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/technical/series?period=1d&mode=range`);
  if (!res.ok) throw new Error(`Harga ${ticker} gagal (${res.status})`);
  const data = (await res.json()) as { bars: { close: number; time: string }[] };
  const last = data.bars?.[data.bars.length - 1];
  if (!last?.close) throw new Error(`Bar ${ticker} kosong`);
  return { close: Math.round(last.close), date: last.time.slice(0, 10) };
}

export async function fetchEntry(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/entry`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTechnical(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/technical`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPattern(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/pattern`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchFundamental(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/fundamental`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchInsight(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/insight`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchScanner(kind: string) {
  const res = await bidbotFetch(`/api/scanner/${kind}`);
  if (!res.ok) throw new Error(`Scanner ${kind} gagal (${res.status})`);
  return res.json();
}

export async function fetchBrokers(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/brokers`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSmartMoney(ticker: string, days = 30) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/smart-money?days=${days}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchFlowCharts(ticker: string) {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/flow/charts`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchSeries(ticker: string, period: string = "3mo") {
  const res = await bidbotFetch(`/api/stocks/${encodeURIComponent(ticker)}/technical/series?period=${period}&mode=range`);
  if (!res.ok) return null;
  const data = (await res.json()) as { bars: { time: string; close: number }[] };
  return data.bars ?? null;
}

export async function fetchAnalysis(ticker: string) {
  const [entry, technical, pattern, fundamental] = await Promise.all([fetchEntry(ticker), fetchTechnical(ticker), fetchPattern(ticker), fetchFundamental(ticker)]);
  return { entry, technical, pattern, fundamental };
}

export function hasBidbotCreds() {
  return !!creds();
}
