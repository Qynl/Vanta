import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { ActionLink } from "@/ui/components/ActionLink";
import { Logo } from "@/ui/components/Logo";

const NAV_ITEMS = [
  { to: "/", label: "ARENA", end: true },
  { to: "/arsenal", label: "ARSENAL", end: false },
  { to: "/profile", label: "PROFILE", end: false },
  { to: "/settings", label: "SETTINGS", end: false },
] as const;

function navLinkClass(active: boolean) {
  return `relative py-2 font-mono text-[9px] tracking-[0.22em] transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-volt after:transition-transform ${
    active
      ? "text-volt after:scale-x-100"
      : "text-muted hover:text-bone hover:after:scale-x-100"
  }`;
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-void/90 backdrop-blur-xl">
      <div className="shell flex h-[74px] items-center justify-between gap-6">
        <Link
          to="/"
          aria-label="VANTA home"
          className="text-bone transition-colors hover:text-volt"
          onClick={closeMobile}
        >
          <Logo />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="mr-2 hidden items-center gap-2 font-mono text-[8px] tracking-[0.2em] text-muted xl:flex">
            <span
              aria-hidden="true"
              className="status-pulse h-1.5 w-1.5 bg-volt"
            />
            <span>COMBAT CORE / 0.7</span>
          </div>
          <ActionLink
            to="/play"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Enter arena
          </ActionLink>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex h-10 w-10 items-center justify-center border border-line text-bone transition-colors hover:border-volt hover:text-volt md:hidden"
          >
            {mobileOpen ? (
              <X aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Menu aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-line bg-void md:hidden"
        >
          <nav
            aria-label="Mobile navigation"
            className="shell flex flex-col py-4"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between border-b border-line/60 py-4 font-display text-2xl font-medium tracking-[0.06em] uppercase transition-colors ${
                    isActive ? "text-volt" : "text-bone hover:text-volt"
                  }`
                }
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[9px] tracking-[0.2em] text-muted"
                >
                  ↗
                </span>
              </NavLink>
            ))}
            <ActionLink to="/play" className="mt-6 w-full">
              Enter arena
            </ActionLink>
          </nav>
        </div>
      )}
    </header>
  );
}
