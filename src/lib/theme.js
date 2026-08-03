export const LIGHT_THEME_COLOR = '#FAF6EE';
export const DARK_THEME_COLOR = '#17150F';

export function resolvedTheme(theme, systemDark = false) {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

export function applyTheme(theme, systemDark = false, root, meta) {
  const documentRoot = root || (typeof document === 'undefined' ? null : document.documentElement);
  const themeMeta = meta || (typeof document === 'undefined' ? null : document.querySelector('meta[name="theme-color"]'));
  if (!documentRoot) return;

  if (theme === 'auto') delete documentRoot.dataset.theme;
  else documentRoot.dataset.theme = theme;

  const color = resolvedTheme(theme, systemDark) === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  themeMeta?.setAttribute('content', color);
}
