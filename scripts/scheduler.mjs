import cron from "node-cron";
import fs from "node:fs";
import path from "node:path";

const LOG_DIR = process.env.LOG_DIR || "/data/logs";
fs.mkdirSync(LOG_DIR, { recursive: true });

const AUTH = `Bearer ${process.env.AI_API_KEY || ""}`;

function log(file, message) {
  const ts = new Date().toISOString();
  const line = `${ts} ${message}\n`;
  console.log(line.trim());
  fs.appendFileSync(path.join(LOG_DIR, file), line);
}

async function run(file, task) {
  try {
    await task();
  } catch (err) {
    log(file, `ERROR ${err.message}`);
  }
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `${url} returned ${res.status}`);
  return data;
}

const jobs = [
  cron.schedule("0 6 * * *", () =>
    run("reports.log", async () => {
      const data = await post("http://app:3000/api/ai/reports/daily/send", {
        target: "yesterday",
      });
      log("reports.log", JSON.stringify(data));
    })
  ),
  cron.schedule("0 22 * * *", () =>
    run("reports.log", async () => {
      const data = await post("http://app:3000/api/ai/reports/daily/send", {
        target: "today",
      });
      log("reports.log", JSON.stringify(data));
    })
  ),
  cron.schedule("30 17 * * *", () =>
    run("bidbot-sync.log", async () => {
      const data = await post("http://app:3000/api/assets/sync");
      log("bidbot-sync.log", `sync ${data.ok}/${data.total} ${JSON.stringify(data.results)}`);
    })
  ),
  cron.schedule("5 6 * * 1-5", () =>
    run("asset-insights.log", async () => {
      const data = await post("http://app:3000/api/assets/insights/broadcast", {});
      log("asset-insights.log", `insights sent ${data.sent}/${data.total}`);
    })
  ),
];

console.log(`scheduler started (TZ=${process.env.TZ || "UTC"}) — ${jobs.length} jobs registered`);

const shutdown = () => {
  console.log("shutting down scheduler");
  jobs.forEach((j) => j.stop());
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
