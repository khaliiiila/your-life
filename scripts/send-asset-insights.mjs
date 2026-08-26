const res = await fetch("http://app:3000/api/assets/insights/broadcast", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY || ""}` },
  body: JSON.stringify({}),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error || `Insight broadcast failed ${res.status}`);
console.log(new Date().toISOString(), `insights sent ${data.sent}/${data.total}`, JSON.stringify(data.results?.map((r) => ({ t: r.ticker, v: r.verdict, rec: r.rec?.slice(0, 20) }))));
