import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "@/ui/shell/ErrorBoundary";

function FaultyPanel(): never {
  throw new Error("Synthetic interface fault");
}

describe("error boundary", () => {
  it("renders the recovery surface when a child fails", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <FaultyPanel />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: /control link\s*lost/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry interface/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reload shell/i }),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
