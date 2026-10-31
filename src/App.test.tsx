import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { AppRoutes } from "@/App";
import { DEFAULT_SETTINGS, useSettingsStore } from "@/client/state/settings";
import { useOperatorStore } from "@/client/state/operator";

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("application shell", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState(DEFAULT_SETTINGS);
    useOperatorStore.setState({ callsign: null, joinedAt: null });
  });

  it("loads the landing route and navigates through the header", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /move\s*like you\s*mean it/i,
      }),
    ).toBeInTheDocument();

    const primaryNav = screen.getByRole("navigation", {
      name: /primary navigation/i,
    });

    await user.click(
      within(primaryNav).getByRole("link", { name: "SETTINGS" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /tune\s*the edge/i,
      }),
    ).toBeInTheDocument();
  });

  it("mounts the gameplay canvas and reports a safe WebGL fallback", async () => {
    renderRoute("/play");

    const canvas = await screen.findByRole("img", {
      name: /VANTA/i,
    });

    expect(canvas.tagName).toBe("CANVAS");
    expect(canvas).toHaveAttribute("id", "game-viewport");
    expect(canvas).toHaveAttribute("data-quality", "high");

    await waitFor(() => {
      expect(canvas).toHaveAttribute("data-renderer-state", "unavailable");
    });

    expect(
      screen.getByRole("heading", { name: /combat live\.\s*match local/i }),
    ).toBeInTheDocument();
  });

  it("changes the persistent render quality from the viewport", async () => {
    const user = userEvent.setup();
    renderRoute("/play");

    const qualityGroup = await screen.findByRole("group", {
      name: /render quality/i,
    });
    const ultraButton = within(qualityGroup).getByRole("button", {
      name: /maximum quality/i,
    });
    const canvas = screen.getByRole("img", { name: /VANTA/i });

    await user.click(ultraButton);

    expect(ultraButton).toHaveAttribute("aria-pressed", "true");
    expect(canvas).toHaveAttribute("data-quality", "ultra");
    expect(useSettingsStore.getState().quality).toBe("ultra");
  });

  it("applies the reduced-motion preference from the settings route", async () => {
    const user = userEvent.setup();
    renderRoute("/settings");

    const toggle = await screen.findByRole("switch", {
      name: /reduced motion/i,
    });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    await waitFor(() => {
      expect(document.documentElement.dataset.motion).toBe("reduced");
    });
  });

  it("renders the branded not-found route", async () => {
    renderRoute("/no-such-sector");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /lost\s*the route/i,
      }),
    ).toBeInTheDocument();
  });
});
