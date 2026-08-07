import { describe, expect, it, vi } from 'vitest';
import { createDepthLoader } from './wordbookData.js';

describe('wordbook depth loading', () => {
  it('deduplicates concurrent requests and refetches after a failure', async () => {
    const failure = new Error('temporary network failure');
    const fetcher = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue({
        ok: true,
        json: async () => ({ '말하다': { nuance: 'detail' } }),
      });
    const loadDepth = createDepthLoader({
      '../lib/wordbook-depth/a2.json': '/assets/a2-depth.json',
    }, fetcher);

    const first = loadDepth('a2');
    const duplicate = loadDepth('a2');
    await expect(first).rejects.toBe(failure);
    await expect(duplicate).rejects.toBe(failure);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(loadDepth('a2')).resolves.toEqual({ '말하다': { nuance: 'detail' } });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith('/assets/a2-depth.json');
  });

  it('rejects an unknown shard and surfaces a non-ok response as an error', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const loadDepth = createDepthLoader({
      '../lib/wordbook-depth/a2.json': '/assets/a2-depth.json',
    }, fetcher);
    await expect(loadDepth('zz')).rejects.toThrow('Missing wordbook depth shard');
    await expect(loadDepth('a2')).rejects.toThrow('404');
  });
});
