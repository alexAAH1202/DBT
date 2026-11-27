import { useEffect, useState } from 'react';

/** Tiny hash router: '#/patterns/day/2026-11-27' → ['patterns', 'day', '2026-11-27']. */
const parse = () =>
  decodeURIComponent(location.hash.replace(/^#\/?/, ''))
    .split('/')
    .filter(Boolean);

let depth = 0;

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string, opts: { replace?: boolean } = {}) {
  const hash = '#' + (path.startsWith('/') ? path : '/' + path);
  if (opts.replace) {
    location.replace(hash);
  } else {
    depth++;
    location.hash = hash;
  }
}

/** Back within the app; never leaves it (e.g. when opened from a notification). */
export function back(fallback = '/') {
  if (depth > 0) {
    depth--;
    history.back();
  } else {
    go(fallback, { replace: true });
  }
}
