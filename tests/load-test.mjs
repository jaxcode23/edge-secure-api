const TARGET = process.env.TARGET ??"https://edge-secure-api.vercel.app/api/logs";
const CONCURRENCY = 60;

async function main() {
  const startedAt = Date.now();

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      fetch(TARGET).then((r) => r.status)
    )
  );

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const count200 = results.filter((s) => s === 200).length;
  const count429 = results.filter((s) => s === 429).length;
  const other = results.filter((s) => s !== 200 && s !== 429);

  console.log(`200 : ${count200}`);
  console.log(`429 : ${count429}`);
  if (other.length) console.log(`other : ${JSON.stringify(other)}`);
  console.log(`Elapsed: ${elapsed} seconds`);
}

main().catch(console.error);
