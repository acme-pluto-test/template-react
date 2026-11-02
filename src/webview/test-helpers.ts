import { vi } from "vitest";
import { encode, type NativeToWebMessage, type WebToNativeMessage, parseWebToNative } from "@/bridge/bridge";

export const NATIVE = "app://native";

type Pluto = { postMessage: (text: string) => void; onmessage?: ((e: { data: unknown; origin?: string }) => void) | null; receive?: (text: string) => void };

/** Installs the Android-style host object and records what the page sends. */
export function installHost(): { sent: WebToNativeMessage[]; pluto: Pluto } {
  const sent: WebToNativeMessage[] = [];
  const pluto: Pluto = { postMessage: vi.fn((text: string) => void sent.push(parseWebToNative(text))) };
  (window as unknown as { pluto?: Pluto }).pluto = pluto;
  return { sent, pluto };
}

export function removeHost(): void {
  delete (window as unknown as { pluto?: Pluto }).pluto;
}

export const fromNative = (pluto: Pluto, message: NativeToWebMessage | string, origin = NATIVE): void => {
  pluto.onmessage?.({ data: typeof message === "string" ? message : encode(message), origin });
};
