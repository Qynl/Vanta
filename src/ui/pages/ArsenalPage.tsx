import { Boxes, Crosshair, Layers3, LockKeyhole } from "lucide-react";

import {
  ARSENAL_CATEGORIES,
  WEAPON_COUNT,
} from "@/game/data/arsenalCategories";
import { ActionLink } from "@/ui/components/ActionLink";
import { PageHeader } from "@/ui/components/PageHeader";

const ACQUISITION_NOTES = [
  {
    title: "FIXED PICKUPS",
    icon: Crosshair,
    copy: "Every weapon node has a fixed identity and public respawn timer. Map knowledge is the loadout screen.",
  },
  {
    title: "NO RESKINS",
    icon: Layers3,
    copy: "Each system must change firing behaviour, handling or ammo economy in a way that matters in a fight.",
  },
  {
    title: "ALL SIXTY REACHABLE",
    icon: Boxes,
    copy: "Every system appears on at least two launch arenas and is available in the Proving Grounds.",
  },
] as const;

export default function ArsenalPage() {
  return (
    <div className="pb-20 md:pb-28">
      <PageHeader
        index="02"
        kicker="Field catalogue / foundation build"
        title={
          <>
            Sixty
            <br />{' '}
            systems.
          </>
        }
        description="Ten weapon classes, six distinct systems per class. The catalogue is specified; field-ready implementations are entering production class by class."
        aside={
          <div className="inline-flex items-center gap-2 border border-line bg-carbon/60 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
            <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
            Loadouts not yet online
          </div>
        }
      />

      <div className="shell mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <div>
          <div className="border-t border-line">
            {ARSENAL_CATEGORIES.map((category, index) => (
              <article
                key={category.id}
                className="group grid gap-4 border-b border-line py-6 transition-colors hover:bg-bone/[0.025] sm:grid-cols-[54px_minmax(0,1fr)_110px] sm:gap-6 sm:py-7"
              >
                <span className="font-mono text-[9px] tracking-[0.18em] text-muted sm:pt-1">
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-3xl leading-none font-medium tracking-[0.04em] text-bone uppercase transition-colors group-hover:text-volt sm:text-4xl">
                      {category.name}
                    </h2>
                    <span className="border border-line px-2 py-1 font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                      {category.code}
                    </span>
                  </div>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                    {category.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:justify-between">
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                      Slot
                    </p>
                    <p className="mt-1 font-mono text-[8px] tracking-[0.12em] text-bone/60">
                      {category.slot}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                      Systems
                    </p>
                    <p className="mt-1 font-display text-xl leading-none text-volt">
                      0{category.systems}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-14">
            <div className="flex items-center gap-3 border-b border-line pb-4 font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
              <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
              Acquisition doctrine
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {ACQUISITION_NOTES.map((note) => {
                const Icon = note.icon;
                return (
                  <article
                    key={note.title}
                    className="border border-line bg-carbon/30 p-5"
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.25}
                      className="h-5 w-5 text-volt"
                    />
                    <h3 className="mt-5 font-display text-xl tracking-[0.06em] text-bone uppercase">
                      {note.title}
                    </h3>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      {note.copy}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside>
          <div className="hud-panel sticky top-24 overflow-hidden bg-void p-6">
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-2 font-display text-[10rem] leading-none font-semibold text-bone/[0.035]"
            >
              60
            </div>

            <div className="relative">
              <p className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
                Catalogue status
              </p>
              <p className="mt-6 flex items-baseline gap-2 font-display text-7xl leading-none font-medium text-bone">
                {WEAPON_COUNT}
                <span className="font-mono text-[8px] tracking-[0.16em] text-muted">
                  TOTAL
                </span>
              </p>

              <div className="mt-6 space-y-3 border-y border-line py-5">
                <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.14em] text-muted uppercase">
                  <span>Classes</span>
                  <span className="text-bone">10</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.14em] text-muted uppercase">
                  <span>Systems / class</span>
                  <span className="text-bone">06</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.14em] text-muted uppercase">
                  <span>Field-ready</span>
                  <span className="text-signal">00</span>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal"
                />
                <p className="text-xs leading-5 text-muted">
                  The complete 60-system specification exists. Weapons become
                  playable as their production milestones land.
                </p>
              </div>

              <ActionLink
                to="/play"
                variant="outline"
                className="mt-6 w-full"
              >
                Deployment status
              </ActionLink>
              <p className="mt-4 text-center font-mono text-[7px] tracking-[0.14em] text-muted/60 uppercase">
                Fixed spawns / public timers
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
