import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { RouteGuard } from "@/ui/shell/RouteGuard";

function AuthDestination() {
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;

  return (
    <div>
      <h1>Auth gate</h1>
      <p>Return to {state?.returnTo ?? "nowhere"}</p>
    </div>
  );
}

function renderGuard(allowed: boolean) {
  return render(
    <MemoryRouter initialEntries={["/profile?tab=career"]}>
      <Routes>
        <Route
          path="/profile"
          element={
            <RouteGuard allowed={allowed} redirectTo="/auth">
              <h1>Protected profile</h1>
            </RouteGuard>
          }
        />
        <Route path="/auth" element={<AuthDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("route guard", () => {
  it("redirects a denied session to auth with its intended path", () => {
    renderGuard(false);

    expect(
      screen.getByRole("heading", { name: /auth gate/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/profile\?tab=career/)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /protected profile/i }),
    ).not.toBeInTheDocument();
  });

  it("renders protected content for an allowed session", () => {
    renderGuard(true);

    expect(
      screen.getByRole("heading", { name: /protected profile/i }),
    ).toBeInTheDocument();
  });
});
