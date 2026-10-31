import { Link } from "react-router-dom";

import { Logo } from "@/ui/components/Logo";

const NAV_LINKS = [
  { to: "/", label: "Arena" },
  { to: "/play", label: "Deployment" },
  { to: "/arsenal", label: "Arsenal" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-carbon/50">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_0.7fr_0.9fr] md:py-16">
        <div>
          <Link
            to="/"
            aria-label="VANTA home"
            className="inline-flex text-bone transition-colors hover:text-volt"
          >
            <Logo />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted">
            A competitive arena FPS built around momentum, map knowledge and
            sixty distinct weapon systems.
          </p>
        </div>

        <div>
          <p className="font-mono text-[9px] tracking-[0.24em] text-muted uppercase">
            Navigate
          </p>
          <ul className="mt-5 space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="font-mono text-[10px] tracking-[0.16em] text-bone/70 uppercase transition-colors hover:text-volt"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-line md:border-l md:pl-8">
          <p className="font-mono text-[9px] tracking-[0.24em] text-muted uppercase">
            Build channel
          </p>
          <div className="mt-5 inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-bone uppercase">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 bg-volt"
            />
            Combat / 0.7.0
          </div>
          <p className="mt-4 max-w-[230px] text-xs leading-5 text-muted">
            Proving-grounds combat is online. FLOW movement, arsenal production,
            bots and direct sessions are in development.
          </p>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="shell flex flex-col gap-2 py-5 font-mono text-[8px] tracking-[0.18em] text-muted/70 uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} VANTA Systems</span>
          <span>Keyboard + mouse / WebGL2</span>
          <span>No pay-to-win. Ever.</span>
        </div>
      </div>
    </footer>
  );
}
