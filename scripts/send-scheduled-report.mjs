const target = process.argv[2];

if (!['today', 'yesterday'].includes(target)) {
  throw new Error('Target must be today or yesterday.');
}

const response = await fetch('http://app:3000/api/ai/reports/daily/send', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ target }),
});
const result = await response.json();

if (!response.ok) throw new Error(result.error || `Report API returned ${response.status}.`);
console.log(new Date().toISOString(), result);
