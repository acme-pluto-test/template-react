import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { WebviewBridge } from "./WebviewBridge";
import { clearToken } from "./session";
import { fromNative, installHost, NATIVE, removeHost } from "./test-helpers";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function mount() {
  vi.stubEnv("NEXT_PUBLIC_WEBVIEW", "1");
  vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", NATIVE);
  const host = installHost();
  const view = render(<WebviewBridge />);
  return { ...host, view };
}

afterEach(() => {
  removeHost();
  clearToken();
  pathname = "/";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
});

describe("Webview theme", () => {
  it("sets data-theme and the accent for theme.changed", () => {
    const { pluto } = mount();
    act(() => fromNative(pluto, { version: 1, type: "theme.changed", payload: { mode: "dark", accentColor: "#0A84FF" } }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#0A84FF");
  });

  it("sets light without an accent override", () => {
    const { pluto } = mount();
    act(() => fromNative(pluto, { version: 1, type: "theme.changed", payload: { mode: "dark", accentColor: "#0A84FF" } }));
    act(() => fromNative(pluto, { version: 1, type: "theme.changed", payload: { mode: "light" } }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("");
  });
});

describe("Webview safe area", () => {
  it("sets the four variables in pixels", () => {
    const { pluto } = mount();
    act(() => fromNative(pluto, { version: 1, type: "safe-area.changed", payload: { top: 47, right: 0, bottom: 34, left: 0 } }));
    const style = document.documentElement.style;
    expect([style.getPropertyValue("--safe-area-top"), style.getPropertyValue("--safe-area-right"), style.getPropertyValue("--safe-area-bottom"), style.getPropertyValue("--safe-area-left")]).toEqual(["47px", "0px", "34px", "0px"]);
  });
});

describe("Webview navigation", () => {
  it("sends navigation.ready once per route", () => {
    const { sent, view } = mount();
    expect(sent).toEqual([{ version: 1, type: "navigation.ready", payload: { route: "/" } }]);
    view.rerender(<WebviewBridge />);
    expect(sent).toHaveLength(1);
    pathname = "/about/";
    view.rerender(<WebviewBridge />);
    view.rerender(<WebviewBridge />);
    expect(sent.map((m) => (m.type === "navigation.ready" ? m.payload.route : m.type))).toEqual(["/", "/about/"]);
  });
});

describe("Webview listener", () => {
  const theme = { version: 1, type: "theme.changed", payload: { mode: "dark" } } as const;

  it("ignores invalid, oversized, wrong-direction and foreign-origin messages", () => {
    const { pluto } = mount();
    const attempts: Array<[string, () => void]> = [
      ["navigation.ready sent by native", () => fromNative(pluto, '{"version":1,"type":"navigation.ready","payload":{"route":"/x"}}')],
      ["65537 bytes", () => fromNative(pluto, JSON.stringify({ version: 1, type: "auth.token", payload: { accessToken: "a".repeat(65537), expiresAt: 1 } }))],
      ["not JSON", () => fromNative(pluto, "this is not json")],
      ["foreign origin", () => fromNative(pluto, theme, "https://evil.example")],
      ["not a string", () => pluto.onmessage?.({ data: { not: "text" }, origin: NATIVE })],
    ];
    for (const [what, attempt] of attempts) {
      act(attempt);
      expect(document.documentElement.dataset.theme, what).toBeUndefined();
      expect(document.documentElement.getAttribute("style") ?? "", what).toBe("");
    }
    act(() => fromNative(pluto, theme));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("accepts no message while the native origin is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBVIEW", "1");
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", "");
    const { pluto } = installHost();
    render(<WebviewBridge />);
    act(() => fromNative(pluto, theme, ""));
    act(() => fromNative(pluto, theme, NATIVE));
    act(() => pluto.receive?.(JSON.stringify(theme)));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("takes messages that native pushes through window.pluto.receive on iOS", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBVIEW", "1");
    vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", NATIVE);
    const sent: string[] = [];
    (window as unknown as { webkit: unknown }).webkit = { messageHandlers: { pluto: { postMessage: (t: string) => sent.push(t) } } };
    render(<WebviewBridge />);
    act(() => (window as unknown as { pluto: { receive: (t: string) => void } }).pluto.receive(JSON.stringify(theme)));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(sent).toHaveLength(1);
    delete (window as unknown as { webkit?: unknown }).webkit;
  });
});
