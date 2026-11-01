// JWT persistence. sessionStorage gives each tab its own login, so author and
// admin tabs can sit side by side, and keeps it across reloads of that tab. The
// XSS trade-off is discussed in the README.
const TOKEN_KEY = 'bookleaf.token';

export const tokenStorage = {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage unavailable (private mode): session lasts for this page only.
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
