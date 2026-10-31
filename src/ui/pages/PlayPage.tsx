import { ArrowRight, CircleDashed, Map, Radio, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { ActionLink } from "@/ui/components/ActionLink";
import { ArenaCanvasMount } from "@/ui/components/ArenaCanvasMount";
import { PageHeader } from "@/ui/components/PageHeader";

const ONLINE_SYSTEMS = [
  "Pointer-locked first-person movement with sensitivity-aware aim",
  "Physics-driven sprint, crouch, jump and 60 Hz interpolation",
  "Three target dummies with head, torso and leg hit volumes",
  "VK-7 prototype hit-scan rifle with live ammo and reload",
  "Shield-first health, eliminations, killfeed and respawn",
  "Range HUD, hitmarkers, damage direction and spread crosshair",
  "Persisted input and view settings plus WebGL2 recovery",
] as const;

const PENDING_SYSTEMS = [
  { label: "FLOW movement suite", milestone: "M6" },
  { label: "Arsenal runtime", milestone: "M7" },
  { label: "Bot opponents", milestone: "M18" },
  { label: "Direct-link multiplayer", milestone: "M21" },
] as const;

export default function PlayPage() {
  return (
    <div className="pb-20 md:pb-28">
      <PageHeader
        index="01"
        kicker="Proving grounds / combat integration"
        title={
          <>
            Take
            <br />{' '}
            the shot.
          </>
        }
        description="The proving grounds are live: pointer-locked movement, a prototype hit-scan rifle, three real target dummies and a shield-first damage loop. Shoot for headshots, test the damage-calibration pad, die and respawn. Bots and online sessions remain later; direct play is designed as host-authoritative WebRTC, not a game server."
        aside={
          <div className="inline-flex items-center gap-2 border border-line bg-carbon/60 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
            <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
            Combat range / local live
          </div>
        }
      />

      <div className="shell mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <ArenaCanvasMount />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="border border-line bg-carbon/40 p-4">
              <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <Radio aria-hidden="true" className="h-3 w-3 text-volt" />
                Build channel
              </div>
              <p className="mt-3 font-display text-2xl tracking-[0.04em] text-bone uppercase">
                Combat core
              </p>
              <p className="mt-1 font-mono text-[8px] tracking-[0.14em] text-muted">
                0.7.0 / PLAYABLE SLICE
              </p>
            </div>
            <div className="border border-line bg-carbon/40 p-4">
              <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <Map aria-hidden="true" className="h-3 w-3 text-muted" />
                Active arena
              </div>
              <p className="mt-3 font-display text-2xl tracking-[0.04em] text-bone uppercase">
                Proving Grounds 01
              </p>
              <p className="mt-1 font-mono text-[8px] tracking-[0.14em] text-muted">
                SECTOR 09 / TRAINING
              </p>
            </div>
            <div className="border border-line bg-carbon/40 p-4">
              <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3 w-3 text-muted"
                />                Planned authority
              </div>
              <p className="mt-3 font-display text-2xl tracking-[0.04em] text-bone uppercase">
                Host / P2P
              </p>
              <p className="mt-1 font-mono text-[8px] tracking-[0.14em] text-muted">
                PLANNED / M21
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 border border-line bg-carbon/30 p-5 sm:p-6 md:grid-cols-2">
            <div>
              <p className="font-mono text-[8px] tracking-[0.2em] text-volt uppercase">
                Live in this build
              </p>
              <ul className="mt-4 space-y-3">
                {ONLINE_SYSTEMS.map((system) => (
                  <li
                    key={system}
                    className="flex items-start gap-3 text-xs leading-5 text-bone/70"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 bg-volt"
                    />
                    {system}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-line md:border-l md:pl-6">
              <p className="font-mono text-[8px] tracking-[0.2em] text-muted uppercase">
                Next systems
              </p>
              <ul className="mt-4 space-y-3">
                {PENDING_SYSTEMS.map((system) => (
                  <li
                    key={system.label}
                    className="flex items-center justify-between gap-4 border-b border-line/70 pb-3 text-xs text-muted last:border-b-0 last:pb-0"
                  >
                    <span className="flex items-center gap-3">
                      <CircleDashed
                        aria-hidden="true"
                        className="h-3 w-3 text-muted/50"
                      />
                      {system.label}
                    </span>
                    <span className="font-mono text-[7px] tracking-[0.14em] text-muted/50">
                      {system.milestone}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="hud-panel bg-void p-5">
            <p className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
              Deployment status
            </p>
            <h2 className="mt-5 font-display text-4xl leading-[0.9] font-medium tracking-[0.02em] text-bone uppercase">
              <span className="block">Combat live.</span>{' '}
              <span className="block">Match local.</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              A solo proving-ground match runs at a fixed 60 Hz with live
              shields, target hit zones, rifle ammo, elimination and respawn.
              Bots and online sessions are not implemented, so no opponent or
              network claim is made.
            </p>
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <span>Players</span>
                <span className="text-bone/50">1 / 1 / LOCAL</span>
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <span>Tick</span>
                <span className="text-volt/70">60 HZ / FIXED</span>
              </div>
              <div className="mt-4 flex items-center justify-between font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                <span>Game server</span>
                <span className="text-volt/70">NOT REQUIRED</span>
              </div>
            </div>
          </div>

          <div className="border border-line p-5">
            <p className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
              Available now
            </p>
            <div className="mt-4 flex flex-col">
              <Link
                to="/arsenal"
                className="group flex items-center justify-between border-b border-line py-3 text-sm text-bone transition-colors hover:text-volt"
              >
                Arsenal index
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/settings"
                className="group flex items-center justify-between border-b border-line py-3 text-sm text-bone transition-colors hover:text-volt"
              >
                Control settings
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                to="/profile"
                className="group flex items-center justify-between py-3 text-sm text-bone transition-colors hover:text-volt"
              >
                Local operator
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>

          <ActionLink to="/" variant="outline" className="w-full">
            Return to arena
          </ActionLink>
        </aside>
      </div>
    </div>
  );
}
