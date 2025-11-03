// Basic polyfills for libraries expecting Node globals in the browser
(function initPolyfills() {
  try {
    const g: any = (globalThis as any);
    if (typeof g.global === 'undefined') {
      g.global = g;
    }
    if (typeof g.process === 'undefined') {
      g.process = { env: {} };
    }
    // Sync auth tokens across storage (helps when invite opens in new tab)
    try {
      const ls = window.localStorage;
      const ss = window.sessionStorage;
      // Promote session token to localStorage if missing there
      const ssToken = ss.getItem('token');
      const lsToken = ls.getItem('token');
      if (!lsToken && ssToken) {
        ls.setItem('token', ssToken);
      }
      // Promote userId similarly
      const ssUid = ss.getItem('userId');
      const lsUid = ls.getItem('userId');
      if (!lsUid && ssUid) {
        ls.setItem('userId', ssUid);
      }
    } catch { /* ignore storage issues */ }
  } catch {
    // ignore
  }
})();
