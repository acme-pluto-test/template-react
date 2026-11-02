import { vi } from "vitest";
import { encode, MAX_MESSAGE_BYTES, type NativeToWebMessage } from "@/bridge/bridge";
import { listenToNative } from "./native";
import { installHost, NATIVE, removeHost } from "./test-helpers";

const sized = (bytes: number): string => {
  const base = JSON.stringify({ version: 1, type: "auth.token", payload: { accessToken: "", expiresAt: 1 } });
  return JSON.stringify({ version: 1, type: "auth.token", payload: { accessToken: "a".repeat(bytes - new TextEncoder().encode(base).length), expiresAt: 1 } });
};

afterEach(removeHost);

describe("Webview listener", () => {
  function listen() {
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", NATIVE);
    const { pluto } = installHost();
    const handler = vi.fn<(m: NativeToWebMessage) => void>();
    listenToNative(handler);
    return { pluto, handler };
  }

  it("hands over a message of exactly the size cap and drops one byte more, the other direction and a foreign origin", () => {
    const { pluto, handler } = listen();
    expect(new TextEncoder().encode(sized(MAX_MESSAGE_BYTES)).length).toBe(MAX_MESSAGE_BYTES);

    pluto.onmessage?.({ data: sized(MAX_MESSAGE_BYTES), origin: NATIVE });
    expect(handler).toHaveBeenCalledTimes(1);

    pluto.onmessage?.({ data: sized(MAX_MESSAGE_BYTES + 1), origin: NATIVE });
    pluto.onmessage?.({ data: '{"version":1,"type":"navigation.ready","payload":{"route":"/x"}}', origin: NATIVE });
    pluto.onmessage?.({ data: '{"version":1,"type":"auth.refresh.request","payload":{}}', origin: NATIVE });
    pluto.onmessage?.({ data: encode({ version: 1, type: "theme.changed", payload: { mode: "dark" } }), origin: "https://evil.example" });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("accepts a reply that carries no origin, as the Android listener sends it, but only for a configured shell", () => {
    const { pluto, handler } = listen();
    const theme = encode({ version: 1, type: "theme.changed", payload: { mode: "dark" } });
    pluto.onmessage?.({ data: theme });
    expect(handler).toHaveBeenCalledTimes(1);
    pluto.onmessage?.({ data: theme, origin: "https://evil.example" });
    pluto.onmessage?.({ data: theme, origin: "" });
    expect(handler).toHaveBeenCalledTimes(1);

    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", "");
    const silent = vi.fn<(m: NativeToWebMessage) => void>();
    const host = installHost();
    listenToNative(silent);
    host.pluto.onmessage?.({ data: theme });
    host.pluto.onmessage?.({ data: theme, origin: NATIVE });
    expect(silent).not.toHaveBeenCalled();
  });

  it("compares the origin exactly: lookalikes are dropped", () => {
    const { pluto, handler } = listen();
    const theme = encode({ version: 1, type: "theme.changed", payload: { mode: "dark" } });
    for (const origin of [`${NATIVE}.evil.com`, "app://nativ", `${NATIVE}/`, NATIVE.toUpperCase(), ` ${NATIVE}`, ""]) pluto.onmessage?.({ data: theme, origin });
    expect(handler).not.toHaveBeenCalled();
    pluto.onmessage?.({ data: theme, origin: NATIVE });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
