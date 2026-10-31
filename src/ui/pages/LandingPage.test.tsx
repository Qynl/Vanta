import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import LandingPage from "@/ui/pages/LandingPage";

describe("landing page", () => {
  it("renders the hero and the real deployment link", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /move\s*like you\s*mean it/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /enter the arena/i }),
    ).toHaveAttribute("href", "/play");
  });

  it("shows all ten arsenal classes and all four arenas", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    for (const category of [
      "ASSAULT",
      "SUB-MACHINE",
      "SHOTGUN",
      "SNIPER",
      "MARKSMAN",
      "PISTOL",
      "ENERGY",
      "HEAVY",
      "EXPERIMENTAL",
      "MELEE",
    ]) {
      expect(screen.getByRole("heading", { name: category })).toBeInTheDocument();
    }

    for (const arena of ["VERTEX", "REACTOR", "BREACH", "SECTOR 09"]) {
      expect(screen.getByRole("heading", { name: arena })).toBeInTheDocument();
    }

    expect(screen.getAllByText("60").length).toBeGreaterThan(0);
  });

  it("offers a secondary route into the arsenal index", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    const arsenalLinks = screen.getAllByRole("link", {
      name: /open arsenal/i,
    });

    expect(arsenalLinks.length).toBeGreaterThan(0);

    for (const link of arsenalLinks) {
      expect(link).toHaveAttribute("href", "/arsenal");
    }
  });
});
