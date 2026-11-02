import { sendToNative } from "./native";

const REFRESH_TIMEOUT_MS = 5000;

interface Token {
  accessToken: string;
  expiresAt: number;
}

// The token lives in this variable only: not in storage, not in a cookie, not in a URL.
let token: Token | null = null;
let waiting: Array<(ok: boolean) => void> = [];
// The page calls the BFF as soon as it mounts, usually before the shell has sent a token: the first call asks the shell for one
// instead of going out bare and earning a 401. Asked once; a shell with nothing to give is not waited for again.
let askedForFirst = false;

export function setToken(next: Token): void {
  token = next;
  const done = waiting;
  waiting = [];
  for (const resolve of done) resolve(true);
}

export function clearToken(): void {
  token = null;
  askedForFirst = false;
}

const expired = (t: Token): boolean => t.expiresAt <= Math.floor(Date.now() / 1000);

/** Asks native for a new token and waits for `auth.token`. False when none arrives in time. */
export function requestRefresh(reason: "expired" | "unauthorized"): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), REFRESH_TIMEOUT_MS);
    waiting.push((ok) => {
      clearTimeout(timer);
      resolve(ok);
    });
    sendToNative({ version: 1, type: "auth.refresh.request", payload: { reason } });
  });
}

/** The Authorization header value, asking the shell first when there is no token yet (once) or the token has expired. */
export async function authorization(): Promise<string | undefined> {
  if (!token && !askedForFirst) {
    askedForFirst = true;
    await requestRefresh("expired");
  }
  // also when the token that just arrived is already dead (the shell may hold an old one): ask once more for a new one
  if (token && expired(token)) await requestRefresh("expired");
  return token && !expired(token) ? `Bearer ${token.accessToken}` : undefined;
}
