// Depth shards ship as ONE raw JSON asset each (Vite `?url` glob) and load by
// fetch. They used to load as dynamic-import JS modules with the raw asset as
// a retry fallback — which bundled every shard twice (~430kB gz of duplicate
// offline payload). Asset URLs are content-hashed, so a retry after a
// transient failure refetches the same immutable URL; the service worker
// treats /assets/ JSON like any lazy chunk (stale-while-revalidate).
export function createDepthLoader(urls, fetcher = (...args) => fetch(...args)) {
  const pending = new Map();

  return function loadDepth(shard) {
    if (!pending.has(shard)) {
      const url = urls[`../lib/wordbook-depth/${shard}.json`];
      if (!url) return Promise.reject(new Error(`Missing wordbook depth shard: ${shard}`));

      const request = Promise.resolve()
        .then(async () => {
          const response = await fetcher(url);
          if (!response.ok) throw new Error(`Wordbook depth fetch failed: ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          pending.delete(shard);
          throw error;
        });
      pending.set(shard, request);
    }
    return pending.get(shard);
  };
}
