import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import { getGreeting } from "@/shared/api/greetings";
import { WebviewBridge } from "./WebviewBridge";
import { clearToken } from "./session";
import { fromNative, installHost, NATIVE, removeHost } from "./test-helpers";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const answer = (status: number, body: unknown = { message: "Hello, ana" }) => new Response(JSON.stringify(body), { status });
const tokenMessage = (accessToken: string, expiresAt = Math.floor(Date.now() / 1000) + 3600) => ({ version: 1, type: "auth.token", payload: { accessToken, expiresAt } }) as const;

function mount() {
  vi.stubEnv("NEXT_PUBLIC_WEBVIEW", "1");
  vi.stubEnv("NEXT_PUBLIC_NATIVE_ORIGIN", NATIVE);
  const host = installHost();
  render(<WebviewBridge />);
  return host;
}

afterEach(() => {
  removeHost();
  clearToken();
});

describe("Webview token", () => {
  it("sends the token as Authorization and never stores it", async () => {
    const { pluto } = mount();
    const fetchMock = vi.fn().mockResolvedValue(answer(200));
    vi.stubGlobal("fetch", fetchMock);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    act(() => fromNative(pluto, tokenMessage("tok-123")));

    await getGreeting("ana");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(init.headers).toEqual({ Authorization: "Bearer tok-123" });
    expect(String(url)).not.toContain("tok-123");
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.length + sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain("tok-123");
  });

  it("asks the shell for a token before the first call, and sends it, with no 401 on the way", async () => {
    const { pluto, sent } = mount();
    const fetchMock = vi.fn().mockResolvedValue(answer(200));
    vi.stubGlobal("fetch", fetchMock);
    const pending = getGreeting("ana");
    await vi.waitFor(() => expect(sent.some((m) => m.type === "auth.refresh.request")).toBe(true));
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => fromNative(pluto, tokenMessage("first")));
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({ Authorization: "Bearer first" });
  });

  it("asks again when the first token the shell sends is already expired", async () => {
    const { pluto, sent } = mount();
    const fetchMock = vi.fn().mockImplementation(async () => answer(200));
    vi.stubGlobal("fetch", fetchMock);
    const pending = getGreeting("ana");
    await vi.waitFor(() => expect(sent.filter((m) => m.type === "auth.refresh.request")).toHaveLength(1));
    act(() => fromNative(pluto, tokenMessage("dead", Math.floor(Date.now() / 1000) - 60)));
    await vi.waitFor(() => expect(sent.filter((m) => m.type === "auth.refresh.request")).toHaveLength(2));
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => fromNative(pluto, tokenMessage("fresh")));
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({ Authorization: "Bearer fresh" });
  });

  it("asks the shell only once when it has no token to give", async () => {
    vi.useFakeTimers();
    try {
      const { sent } = mount();
      const fetchMock = vi.fn().mockImplementation(async () => answer(200));
      vi.stubGlobal("fetch", fetchMock);
      const first = getGreeting("ana");
      await vi.advanceTimersByTimeAsync(5001);
      await first;
      expect(fetchMock.mock.calls[0]![1].headers).toEqual({});
      await getGreeting("bob");
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(sent.filter((m) => m.type === "auth.refresh.request")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("asks for a refresh on 401 and repeats the call once", async () => {
    const { pluto, sent } = mount();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(answer(401))
      .mockResolvedValueOnce(answer(200));
    vi.stubGlobal("fetch", fetchMock);
    act(() => fromNative(pluto, tokenMessage("old")));

    const pending = getGreeting("ana");
    await vi.waitFor(() => expect(sent.some((m) => m.type === "auth.refresh.request")).toBe(true));
    expect(sent.find((m) => m.type === "auth.refresh.request")).toEqual({ version: 1, type: "auth.refresh.request", payload: { reason: "unauthorized" } });
    act(() => fromNative(pluto, tokenMessage("new")));
    await expect(pending).resolves.toEqual({ message: "Hello, ana" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![1].headers).toEqual({ Authorization: "Bearer new" });

    // a second 401 is not repeated again
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(answer(401));
    const again = getGreeting("ana").catch((e: unknown) => e);
    await vi.waitFor(() => expect(sent.filter((m) => m.type === "auth.refresh.request")).toHaveLength(2));
    act(() => fromNative(pluto, tokenMessage("newer")));
    expect(await again).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks for a refresh when the token has expired", async () => {
    const { pluto, sent } = mount();
    const fetchMock = vi.fn().mockResolvedValue(answer(200));
    vi.stubGlobal("fetch", fetchMock);
    act(() => fromNative(pluto, tokenMessage("stale", Math.floor(Date.now() / 1000) - 10)));

    const pending = getGreeting("ana");
    await vi.waitFor(() => expect(sent.some((m) => m.type === "auth.refresh.request")).toBe(true));
    expect(sent.find((m) => m.type === "auth.refresh.request")).toEqual({ version: 1, type: "auth.refresh.request", payload: { reason: "expired" } });
    act(() => fromNative(pluto, tokenMessage("fresh")));
    await pending;
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({ Authorization: "Bearer fresh" });
  });

  it("goes without a header when no token arrives in time", async () => {
    vi.useFakeTimers();
    try {
      const { pluto } = mount();
      const fetchMock = vi.fn().mockResolvedValue(answer(200));
      vi.stubGlobal("fetch", fetchMock);
      act(() => fromNative(pluto, tokenMessage("stale", 1)));
      const pending = getGreeting("ana");
      await vi.advanceTimersByTimeAsync(5001);
      await pending;
      expect(fetchMock.mock.calls[0]![1].headers).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats a token that expires this second as expired", async () => {
    const { pluto, sent } = mount();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(200)));
    const now = Math.floor(Date.now() / 1000);
    act(() => fromNative(pluto, tokenMessage("edge", now)));
    const pending = getGreeting("ana");
    await vi.waitFor(() => expect(sent.some((m) => m.type === "auth.refresh.request")).toBe(true));
    act(() => fromNative(pluto, tokenMessage("fresh")));
    await pending;
  });
});
