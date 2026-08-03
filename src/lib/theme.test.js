import { describe, expect, it, vi } from 'vitest';
import { applyTheme, DARK_THEME_COLOR, LIGHT_THEME_COLOR, resolvedTheme } from './theme.js';

describe('theme synchronization', () => {
  it('resolves automatic mode from the operating-system preference', () => {
    expect(resolvedTheme('auto', false)).toBe('light');
    expect(resolvedTheme('auto', true)).toBe('dark');
    expect(resolvedTheme('light', true)).toBe('light');
    expect(resolvedTheme('dark', false)).toBe('dark');
  });

  it('applies manual overrides and keeps the browser chrome color aligned', () => {
    const root = { dataset: {} };
    const meta = { setAttribute: vi.fn() };

    applyTheme('dark', false, root, meta);
    expect(root.dataset.theme).toBe('dark');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', DARK_THEME_COLOR);

    applyTheme('light', true, root, meta);
    expect(root.dataset.theme).toBe('light');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', LIGHT_THEME_COLOR);

    applyTheme('auto', true, root, meta);
    expect(root.dataset).not.toHaveProperty('theme');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', DARK_THEME_COLOR);
  });
});
