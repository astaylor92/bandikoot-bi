import { useAppStore, type View } from './appStore';

/** Hash URLs (GitHub Pages can't rewrite real paths): #/, #/board, #/car/440, … */
export function viewToHash(view: View): string {
  switch (view.name) {
    case 'events':
      return '#/';
    case 'car':
      return `#/car/${encodeURIComponent(view.car)}`;
    default:
      return `#/${view.name}`;
  }
}

export function hashToView(hash: string): View | null {
  const path = hash.replace(/^#\/?/, '');
  if (path === '') return { name: 'events' };
  const [name, arg] = path.split('/');
  switch (name) {
    case 'board':
    case 'strategy':
    case 'plan':
    case 'rival':
    case 'settings':
      return { name };
    case 'car':
      return arg ? { name: 'car', car: decodeURIComponent(arg) } : null;
    default:
      return null;
  }
}

const SESSION_VIEWS = new Set<View['name']>(['board', 'car', 'strategy', 'plan', 'rival']);

/**
 * Where browser Back/Forward may go. In a race, Back never drops you out to
 * the event list (a stray swipe mid-race) — use Exit. Outside a race, session
 * screens from old history entries fall back to the event list.
 */
export function resolvePop(target: View | null, inSession: boolean): View | 'block' {
  const t = target ?? { name: 'events' };
  if (inSession && t.name === 'events') return 'block';
  if (!inSession && SESSION_VIEWS.has(t.name)) return { name: 'events' };
  return t;
}

/** Position of the current entry within this app's history (0 = first page we loaded). */
function currentIndex(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx : 0;
}

/**
 * In-app "Back" link: behaves like the browser's Back when there's an app
 * screen behind this one, otherwise goes to `fallback` (e.g. after a reload).
 */
export function goBack(fallback: View): void {
  if (currentIndex() > 0) window.history.back();
  else useAppStore.getState().navigate(fallback);
}

/** Keep appStore.view and browser history in sync. Call once at startup. */
export function installHistorySync(): () => void {
  const store = useAppStore;
  let fromPop = false;
  const push = (hash: string) => window.history.pushState({ idx: currentIndex() + 1 }, '', hash);

  // Deep links can't restore a race, so only non-session screens survive a reload.
  const initial = resolvePop(hashToView(window.location.hash), false);
  const start = initial === 'block' ? store.getState().view : initial;
  window.history.replaceState({ idx: 0 }, '', viewToHash(start));
  if (viewToHash(start) !== viewToHash(store.getState().view)) {
    fromPop = true;
    store.setState({ view: start });
  }

  const unsubscribe = store.subscribe((s, prev) => {
    if (s.view === prev.view) return;
    if (fromPop) {
      fromPop = false;
      return;
    }
    const hash = viewToHash(s.view);
    if (hash !== window.location.hash) push(hash);
  });

  const onPop = () => {
    const { view, mode } = store.getState();
    const next = resolvePop(hashToView(window.location.hash), mode !== null);
    if (next === 'block') {
      push(viewToHash(view));
      return;
    }
    if (viewToHash(next) !== window.location.hash) {
      window.history.replaceState({ idx: currentIndex() }, '', viewToHash(next));
    }
    fromPop = true;
    store.setState({ view: next });
  };
  window.addEventListener('popstate', onPop);

  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPop);
  };
}
