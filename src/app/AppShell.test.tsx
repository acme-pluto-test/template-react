import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("Layout", () => {
  it("shows Home and About links outside webview mode", () => {
    render(<AppShell>content</AppShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toHaveTextContent("Home");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", expect.stringMatching(/^\/about\/?$/));
    expect(screen.getByRole("main")).toHaveTextContent("content");
  });

  it("shows no navigation in webview mode", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBVIEW", "1");
    render(<AppShell>content</AppShell>);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("content");
  });
});
