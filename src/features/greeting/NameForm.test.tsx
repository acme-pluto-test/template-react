import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { GreetingPage } from "./GreetingPage";

const answer = (name: string) => new Response(JSON.stringify({ message: `Hello, ${name}` }), { status: 200 });

function renderPage() {
  const fetchMock = vi.fn((url: string) => Promise.resolve(answer(url.split("/").pop()!)));
  vi.stubGlobal("fetch", fetchMock);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GreetingPage />
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe("Name form", () => {
  it("requests the greeting for the submitted name", async () => {
    const fetchMock = renderPage();
    expect(await screen.findByText("Hello, ana")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "bob");
    await userEvent.click(screen.getByRole("button", { name: "Greet" }));
    expect(await screen.findByText("Hello, bob")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["/v1/greetings/ana", "/v1/greetings/bob"]);
  });

  it("refuses an empty name, a name with a space and 65 characters without a call", async () => {
    const fetchMock = renderPage();
    await screen.findByText("Hello, ana");
    const calls = fetchMock.mock.calls.length;
    const field = screen.getByLabelText("Name");
    const submit = screen.getByRole("button", { name: "Greet" });

    await userEvent.click(submit);
    expect(screen.getByText("Enter a name")).toBeInTheDocument();

    await userEvent.type(field, "ana maria");
    await userEvent.click(submit);
    expect(screen.getByText("Use letters and digits only")).toBeInTheDocument();
    expect(screen.queryByText("Enter a name")).not.toBeInTheDocument();

    await userEvent.clear(field);
    await userEvent.type(field, "a".repeat(65));
    await userEvent.click(submit);
    expect(screen.getByText("Use letters and digits only")).toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(calls);

    // 64 characters is the largest valid name
    await userEvent.clear(field);
    await userEvent.type(field, "a".repeat(64));
    await userEvent.click(submit);
    expect(screen.queryByText("Use letters and digits only")).not.toBeInTheDocument();
    expect(await screen.findByText(`Hello, ${"a".repeat(64)}`)).toBeInTheDocument();
  });
});
