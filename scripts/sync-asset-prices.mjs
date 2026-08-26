const res = await fetch("http://app:3000/api/assets/sync", { method: "POST" });
const data = await res.json();
if (!res.ok) throw new Error(data.error || `Sync failed ${res.status}`);
console.log(new Date().toISOString(), `sync ${data.ok}/${data.total}`, JSON.stringify(data.results));
