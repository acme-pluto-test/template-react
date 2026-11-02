import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { Greeting } from "./Greeting";

function renderGreeting(name = "ana") {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <Greeting name={name} />
    </QueryClientProvider>,
  );
}

const answer = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Greeting", () => {
  it("shows Hello, ana when the BFF answers 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(200, { message: "Hello, ana" }));
    vi.stubGlobal("fetch", fetchMock);
    renderGreeting();
    expect(await screen.findByText("Hello, ana")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toBe("/v1/greetings/ana");
  });

  it("shows Loading greeting while the call is pending", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    renderGreeting();
    expect(screen.getByRole("status")).toHaveTextContent("Loading greeting");
  });

  it("shows the alert and a Try again button on 404 and on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer(404)));
    const first = renderGreeting();
    expect(await screen.findByRole("alert")).toHaveTextContent("The greeting could not be loaded");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    first.unmount();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    renderGreeting("bob");
    expect(await screen.findByRole("alert")).toHaveTextContent("The greeting could not be loaded");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("calls the BFF again when Try again is clicked", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(answer(404)).mockResolvedValueOnce(answer(200, { message: "Hello, ana" }));
    vi.stubGlobal("fetch", fetchMock);
    renderGreeting();
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Hello, ana")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
