import { sendToNative } from "./native";

const REFRESH_TIMEOUT_MS = 5000;

interface Token {
  accessToken: string;
  expiresAt: number;
}

// The token lives in this variable only: not in storage, not in a cookie, not in a URL.
let token: Token | null = null;
let waiting: Array<(ok: boolean) => void> = [];

export function setToken(next: Token): void {
  token = next;
  const done = waiting;
  waiting = [];
  for (const resolve of done) resolve(true);
}

export function clearToken(): void {
  token = null;
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

/** The Authorization header value, asking for a refresh first when the token has expired. */
export async function authorization(): Promise<string | undefined> {
  if (token && expired(token)) await requestRefresh("expired");
  return token && !expired(token) ? `Bearer ${token.accessToken}` : undefined;
}
