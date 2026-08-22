export const LIGHT_THEME_COLOR = '#FAF6EE';
export const DARK_THEME_COLOR = '#17150F';

// 2026-08-22 (사용자 요청): light is the ground state. `prefers-color-scheme`
// used to decide when the preference was 'auto', which meant a learner on a
// dark phone got a dark app they never asked for. Dark is now reachable only
// by choosing it in settings — anything else resolves to light.
export function resolvedTheme(theme) {
  return theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme, root, meta) {
  const documentRoot = root || (typeof document === 'undefined' ? null : document.documentElement);
  const themeMeta = meta || (typeof document === 'undefined' ? null : document.querySelector('meta[name="theme-color"]'));
  if (!documentRoot) return;

  // always stamped, never deleted: an absent attribute would hand the decision
  // back to the OS media query
  const resolved = resolvedTheme(theme);
  documentRoot.dataset.theme = resolved;

  const color = resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  themeMeta?.setAttribute('content', color);
}
