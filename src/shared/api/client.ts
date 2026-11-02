/** Every network call of the app goes through this module (and `greetings.ts` beside it). */
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`The BFF answered ${status}`);
  }
}

interface Hooks {
  /** The Authorization header value, when there is one. */
  authorization(): Promise<string | undefined>;
  /** Called on a 401; true when a new token arrived and the call may be repeated once. */
  onUnauthorized(): Promise<boolean>;
}

let hooks: Hooks = { authorization: async () => undefined, onUnauthorized: async () => false };

export function configureApi(next: Hooks): void {
  hooks = next;
}

const baseUrl = (): string => process.env.NEXT_PUBLIC_BFF_URL ?? "";

async function call(path: string): Promise<Response> {
  const authorization = await hooks.authorization();
  return fetch(`${baseUrl()}${path}`, { headers: authorization ? { Authorization: authorization } : {} });
}

export async function apiGet<T>(path: string): Promise<T> {
  let response = await call(path);
  if (response.status === 401 && (await hooks.onUnauthorized())) response = await call(path);
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}
