import { describe, expect, it, vi } from 'vitest';
import { applyTheme, DARK_THEME_COLOR, LIGHT_THEME_COLOR, resolvedTheme } from './theme.js';

describe('theme synchronization', () => {
  // 2026-08-22: light is the app's ground state. The operating system does not
  // get a vote — only an explicit 'dark' turns the dark palette on.
  it('resolves anything that is not an explicit dark to light', () => {
    expect(resolvedTheme('dark')).toBe('dark');
    expect(resolvedTheme('light')).toBe('light');
    expect(resolvedTheme('auto')).toBe('light');
    expect(resolvedTheme(undefined)).toBe('light');
  });

  it('applies manual overrides and keeps the browser chrome color aligned', () => {
    const root = { dataset: {} };
    const meta = { setAttribute: vi.fn() };

    applyTheme('dark', root, meta);
    expect(root.dataset.theme).toBe('dark');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', DARK_THEME_COLOR);

    applyTheme('light', root, meta);
    expect(root.dataset.theme).toBe('light');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', LIGHT_THEME_COLOR);

    // a value that is no longer part of the contract must still land on light
    // rather than deleting the attribute and falling through to the OS
    applyTheme('auto', root, meta);
    expect(root.dataset.theme).toBe('light');
    expect(meta.setAttribute).toHaveBeenLastCalledWith('content', LIGHT_THEME_COLOR);
  });
});
