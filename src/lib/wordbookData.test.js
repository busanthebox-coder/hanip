import { describe, expect, it, vi } from 'vitest';
import { createDepthLoader } from './wordbookData.js';

describe('wordbook depth loading', () => {
  it('deduplicates concurrent requests and retries after a rejected import', async () => {
    const failure = new Error('temporary chunk failure');
    const loader = vi.fn()
      .mockRejectedValue(failure);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ '말하다': { nuance: 'detail' } }),
    });
    const loadDepth = createDepthLoader({
      '../lib/wordbook-depth/a2.json': loader,
    }, {
      '../lib/wordbook-depth/a2.json': '/assets/a2-depth.json',
    }, fetcher);

    const first = loadDepth('a2');
    const duplicate = loadDepth('a2');
    await expect(first).rejects.toBe(failure);
    await expect(duplicate).rejects.toBe(failure);
    await expect(loadDepth('a2')).resolves.toEqual({ '말하다': { nuance: 'detail' } });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/assets/a2-depth.json');
  });
});
