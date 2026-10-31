import type { CSSProperties } from "react";
import {
  ArrowDownRight,
  Gauge,
  MoveUpRight,
  Target,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ARSENAL_CATEGORIES, WEAPON_COUNT } from "@/game/data/arsenalCategories";
import {
  ARENAS,
  type ArenaGlyphKind,
  type ArenaSummary,
} from "@/game/data/arenas";
import { ActionLink } from "@/ui/components/ActionLink";

const FLOW_FEATURES = [
  {
    index: "01",
    title: "MOMENTUM",
    icon: Gauge,
    copy: "Carry speed through slides, wall-runs and clean landings. Every surface is a decision about what comes next.",
  },
  {
    index: "02",
    title: "VERTICALITY",
    icon: MoveUpRight,
    copy: "Walls are routes. Rooftops are lanes. The fastest path through an arena is rarely the one painted on the floor.",
  },
  {
    index: "03",
    title: "FLOW STATE",
    icon: Zap,
    copy: "Chain movement without breaking stride to charge a visible mastery meter. Movement rewards, never damage buffs.",
  },
] as const;

const HERO_STATS = [
  { value: WEAPON_COUNT.toString().padStart(2, "0"), label: "WEAPON SYSTEMS" },
  { value: "04", label: "LAUNCH ARENAS" },
  { value: "60", label: "HZ SIMULATION" },
] as const;

function SectorMap() {
  return (
    <svg
      viewBox="0 0 360 424"
      role="img"
      aria-label="Schematic arena map for SECTOR 09"
      className="h-full w-full"
    >
      <defs>
        <pattern
          id="sector-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M20 0H0V20"
            fill="none"
            stroke="rgba(216,255,69,0.07)"
            strokeWidth="0.7"
          />
        </pattern>
        <radialGradient id="sector-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(216,255,69,0.13)" />
          <stop offset="100%" stopColor="rgba(216,255,69,0)" />
        </radialGradient>
      </defs>

      <rect width="360" height="424" fill="url(#sector-grid)" />
      <rect width="360" height="424" fill="url(#sector-glow)" />

      <g
        fill="rgba(216,255,69,0.025)"
        stroke="rgba(216,255,69,0.48)"
        strokeWidth="1"
      >
        <path d="M28 46H286L332 92V330L286 382H62L24 338V102L28 46Z" />
        <path d="M60 120H126V184H60V120Z" />
        <path d="M137 86H235V142H137V86Z" />
        <path d="M248 108H305V183H248V108Z" />
        <path d="M56 223H143V303H56V223Z" />
        <path d="M177 207H252V292H177V207Z" />
        <path d="M263 241H316V319H263V241Z" />
        <path d="M98 330H164V368H98V330Z" />
        <path d="M226 322H294V369H226V322Z" />
      </g>

      <g
        fill="none"
        stroke="rgba(242,238,227,0.15)"
        strokeWidth="0.8"
        strokeDasharray="2 5"
      >
        <path d="M93 184V223M93 303V330M143 253H177M252 249H263M235 114H248M126 152H137" />
        <path d="M207 86V46H286L332 92V154" />
      </g>

      <g
        className="map-route"
        fill="none"
        stroke="var(--color-volt)"
        strokeWidth="1.2"
        strokeDasharray="5 7"
        opacity="0.8"
      >
        <path d="M46 95 93 152 186 114 276 138 300 219 219 249 289 325 262 354" />
        <path d="M46 95 93 152 93 260 130 349 202 345 289 325" />
      </g>

      <g fill="var(--color-volt)">
        <circle cx="46" cy="95" r="3" />
        <circle cx="186" cy="114" r="3.5" />
        <circle cx="300" cy="219" r="2.5" />
        <circle cx="219" cy="249" r="2.5" />
        <circle cx="289" cy="325" r="3" />
        <circle cx="93" cy="260" r="2.5" />
      </g>

      <g
        fill="none"
        stroke="var(--color-volt)"
        strokeWidth="1"
        opacity="0.9"
      >
        <circle cx="181" cy="219" r="31" />
        <circle cx="181" cy="219" r="40" strokeDasharray="1 8" />
        <path d="M181 179v-10M181 269v-10M141 219h-10M231 219h-10" />
      </g>
      <circle cx="181" cy="219" r="2.5" fill="var(--color-signal)" />

      <g
        className="map-label"
        fill="rgba(242,238,227,0.48)"
        fontSize="6.5"
        letterSpacing="1.1"
      >
        <text x="60" y="115">
          LABORATORIES
        </text>
        <text x="143" y="80">
          HANGARS
        </text>
        <text x="252" y="101">
          ADMIN SPIRE
        </text>
        <text x="77" y="216">
          TEST RANGE
        </text>
        <text x="198" y="200">
          COURTYARD
        </text>
        <text x="265" y="235">
          SOLAR FIELD
        </text>
        <text x="108" y="358">
          SUBLEVEL
        </text>
      </g>

      <g
        className="map-label"
        fill="rgba(216,255,69,0.35)"
        fontSize="5.5"
        letterSpacing="1.6"
      >
        <text x="29" y="39">
          36.2048 N / 115.1022 W
        </text>
        <text x="281" y="405">
          GRID 09
        </text>
      </g>

      <text
        x="181"
        y="225"
        textAnchor="middle"
        fill="rgba(216,255,69,0.07)"
        fontSize="60"
        fontFamily="var(--font-display)"
        fontWeight="600"
      >
        09
      </text>

      <g stroke="rgba(242,238,227,0.25)" strokeWidth="1">
        <path d="M344 68v18M335 77h18" />
        <path d="M14 361v18M5 370h18" />
      </g>
    </svg>
  );
}

function ArenaGlyph({ kind, accent }: { kind: ArenaGlyphKind; accent: string }) {
  const grid = (
    <g stroke="rgba(242,238,227,0.08)" strokeWidth="0.6">
      <path d="M0 45H320M0 90H320M0 135H320M53 0V180M107 0V180M160 0V180M213 0V180M267 0V180" />
    </g>
  );

  if (kind === "reactor") {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="h-full w-full">
        {grid}
        <g fill="none" stroke={accent} opacity="0.85">
          <circle cx="160" cy="90" r="24" />
          <circle cx="160" cy="90" r="42" strokeWidth="1.2" />
          <circle cx="160" cy="90" r="64" strokeDasharray="4 6" />
          <path d="M160 20v28M160 132v28M90 90h28M202 90h28" />
          <path d="M74 34 104 58M246 34 216 58M74 146 104 122M246 146 216 122" opacity=".5" />
        </g>
        <g fill={accent}>
          <circle cx="160" cy="90" r="3" />
          <rect x="184" y="66" width="5" height="5" />
          <rect x="96" y="112" width="5" height="5" />
          <rect x="230" y="118" width="5" height="5" />
        </g>
        <path
          d="M42 153h60V114h62v-32h84v47h30"
          fill="none"
          stroke="rgba(242,238,227,.25)"
          strokeDasharray="3 5"
        />
      </svg>
    );
  }

  if (kind === "breach") {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="h-full w-full">
        {grid}
        <g fill="none" stroke={accent} opacity="0.85">
          <path d="M46 126c28-54 77-74 124-70 44 4 77 26 97 63" strokeDasharray="18 10" />
          <path d="M72 146c20-34 52-50 92-52M206 88c22 2 43 15 59 38" opacity=".6" />
          <rect x="76" y="62" width="46" height="27" transform="rotate(-8 76 62)" />
          <rect x="194" y="106" width="58" height="24" transform="rotate(7 194 106)" />
          <path d="M132 80 167 96M250 80v-25" />
        </g>
        <g fill={accent}>
          <circle cx="167" cy="96" r="3" />
          <circle cx="76" cy="62" r="2.5" />
          <circle cx="252" cy="130" r="2.5" />
        </g>
        <g fill="none" stroke="rgba(242,238,227,.18)">
          <path d="M30 28h40M30 28v16M290 152h-40M290 152v-16" />
        </g>
      </svg>
    );
  }

  if (kind === "sector") {
    return (
      <svg viewBox="0 0 320 180" aria-hidden="true" className="h-full w-full">
        {grid}
        <g fill="rgba(216,255,69,.03)" stroke={accent} opacity="0.85">
          <path d="M43 31h80v39H43V31Z" />
          <path d="M139 22h64v58h-64V22Z" />
          <path d="M218 35h55v34h-55V35Z" />
          <path d="M58 91h51v48H58V91Z" />
          <path d="M127 96h72v43h-72V96Z" />
          <path d="M215 84h64v55h-64V84Z" />
          <path d="M36 152h56v17H36v-17Z" />
          <path d="M233 151h53v16h-53v-16Z" />
        </g>
        <g fill="none" stroke="rgba(242,238,227,.22)" strokeDasharray="2 5">
          <path d="M123 52h16M203 52h15M109 115h18M199 117h16M94 146v6M256 139v12" />
        </g>
        <g fill="none" stroke={accent}>
          <path d="M50 141 109 60 174 50 258 86 240 152" strokeDasharray="5 7" />
        </g>
        <g fill={accent}>
          <circle cx="109" cy="60" r="3" />
          <circle cx="174" cy="50" r="3" />
          <circle cx="258" cy="86" r="2.5" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 180" aria-hidden="true" className="h-full w-full">
      {grid}
      <g fill="rgba(121,230,210,.03)" stroke={accent} opacity="0.85">
        <path d="M47 150V84h40v66H47Z" />
        <path d="M93 150V55h32v95H93Z" />
        <path d="M132 150V102h48v48h-48Z" />
        <path d="M187 150V27l17-13 17 13v123h-34Z" />
        <path d="M229 150V72h42v78h-42Z" />
        <path d="M47 150h224" />
      </g>
      <g fill="none" stroke="rgba(121,230,210,.45)" strokeWidth="0.8">
        <path d="M67 84v-18M109 55V32M205 27V9M250 72V49" strokeDasharray="2 4" />
      </g>
      <g fill="none" stroke="rgba(242,238,227,.18)" strokeDasharray="3 6">
        <path d="M37 162c39-24 64-41 95-46 33-5 70 10 111-5 17-6 27-14 40-25" />
      </g>
      <g fill={accent}>
        <circle cx="205" cy="22" r="2.5" />
        <circle cx="109" cy="55" r="2.5" />
        <circle cx="67" cy="84" r="2.5" />
      </g>
    </svg>
  );
}

function ArenaCard({ arena }: { arena: ArenaSummary }) {
  return (
    <article
      className="hud-panel arena-card group relative overflow-hidden p-4 transition-colors duration-300 hover:border-bone/30 sm:p-5"
      style={{ "--arena-accent": arena.accent } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
          Arena / {arena.index}
        </span>
        <span className="border border-line px-2 py-1 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
          {arena.status}
        </span>
      </div>

      <div className="relative mt-5 aspect-[16/9] overflow-hidden border border-line/80 bg-void">
        <div className="absolute inset-0 map-grid opacity-50" />
        <div className="absolute inset-0 opacity-90 transition-transform duration-700 group-hover:scale-[1.03]">
          <ArenaGlyph kind={arena.glyph} accent={arena.accent} />
        </div>
        <span className="absolute top-2 left-2 font-mono text-[7px] tracking-[0.18em] text-bone/40 uppercase">
          Plan / schematic
        </span>
        <span className="absolute right-2 bottom-2 font-mono text-[7px] tracking-[0.18em] text-bone/40 uppercase">
          {arena.size}
        </span>
        <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl leading-none font-medium tracking-[0.04em] text-bone">
            {arena.name}
          </h3>
          <p className="mt-2 font-mono text-[8px] tracking-[0.18em] text-[var(--arena-accent)] uppercase">
            {arena.environment}
          </p>
        </div>
        <ArrowDownRight
          aria-hidden="true"
          className="mt-1 h-4 w-4 text-muted transition-colors group-hover:text-[var(--arena-accent)]"
        />
      </div>

      <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
        {arena.tagline}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {arena.zones.map((zone) => (
          <span
            key={zone}
            className="border border-line px-2 py-1 font-mono text-[7px] tracking-[0.14em] text-bone/50 uppercase"
          >
            {zone}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 font-mono text-[8px] tracking-[0.16em] text-muted uppercase">
        <span>Vertical {arena.vertical}</span>
        <span className="text-bone/35">File / {arena.index}</span>
      </div>
    </article>
  );
}

export default function LandingPage() {
  return (
    <>
      <section className="hero-stage relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="hero-aura absolute inset-0" />
        <div aria-hidden="true" className="hero-grid absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-[6%] hidden items-center overflow-hidden xl:flex"
        >
          <span className="font-display text-[24vw] leading-none font-semibold text-transparent [-webkit-text-stroke:1px_rgba(242,238,227,0.035)]">
            09
          </span>
        </div>

        <div className="shell relative grid min-h-[calc(100svh-74px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-16 lg:py-20">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[8px] tracking-[0.24em] text-muted uppercase sm:text-[9px]">
              <span
                aria-hidden="true"
                className="status-pulse h-1.5 w-1.5 bg-volt"
              />
              <span className="text-volt">Pre-season 00</span>
              <span className="h-3 w-px bg-line" aria-hidden="true" />
              <span>Arena network</span>
            </div>

            <h1 className="mt-8 font-display text-[clamp(4.4rem,9.9vw,9.2rem)] leading-[0.8] font-medium tracking-[-0.025em] text-bone uppercase">
              <span className="block">Move</span>{' '}
              <span className="hero-outline block">Like you</span>{' '}
              <span className="block">
                Mean it<span className="text-signal">.</span>
              </span>
            </h1>

            <p className="mt-7 max-w-[490px] text-[15px] leading-7 text-muted">
              VANTA is a competitive arena FPS built for players who treat
              movement as a weapon. Read the map. Chain the route. Take the
              point before anyone else knows you are there.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ActionLink to="/play">Enter the arena</ActionLink>
              <ActionLink to="/arsenal" variant="outline">
                Open arsenal
              </ActionLink>
            </div>

            <dl className="mt-12 grid max-w-xl grid-cols-3 border-t border-line pt-5">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="border-r border-line px-4 first:pl-0 last:border-r-0"
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-4xl leading-none font-medium text-bone md:text-5xl">
                    {stat.value}
                  </dd>
                  <dd className="mt-2 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[500px] lg:mr-0">
            <div
              aria-hidden="true"
              className="absolute inset-10 bg-volt/10 blur-[90px]"
            />
            <div className="hud-panel relative bg-carbon/80 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Target
                    aria-hidden="true"
                    className="h-3.5 w-3.5 text-volt"
                  />
                  <span className="font-mono text-[8px] tracking-[0.22em] text-bone uppercase">
                    Arena dossier
                  </span>
                </div>
                <span className="font-mono text-[8px] tracking-[0.18em] text-muted">
                  04 / 04
                </span>
              </div>

              <div className="relative mt-4 overflow-hidden border border-line bg-[#080b08]">
                <div className="absolute inset-0 map-grid opacity-60" />
                <div className="relative aspect-[360/424] max-h-[390px]">
                  <SectorMap />
                </div>
                <div
                  aria-hidden="true"
                  className="scanline-overlay absolute inset-0"
                />
                <div className="absolute top-3 left-3 border border-volt/25 bg-void/80 px-2 py-1 font-mono text-[7px] tracking-[0.18em] text-volt uppercase">
                  Sector 09 / schematic
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5 font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                  <span className="h-1 w-1 bg-signal" aria-hidden="true" />
                  Pre-build
                </div>
                <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between font-mono text-[7px] tracking-[0.16em] text-bone/40 uppercase">
                  <span>Scale / 1:2000</span>
                  <span>7 sectors</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3">
                <div className="px-3 first:pl-0">
                  <p className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                    Footprint
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-bone">
                    700 × 700 M
                  </p>
                </div>
                <div className="px-3">
                  <p className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                    Vertical
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-bone">
                    −60 / +90
                  </p>
                </div>
                <div className="px-3 last:pr-0">
                  <p className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                    Pickups
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-bone">
                    32—40
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[7px] tracking-[0.18em] text-muted uppercase">
                <span>Research campus / class A</span>
                <span className="text-volt">File active</span>
              </div>
            </div>

            <div className="absolute -top-3 -right-2 hidden border border-line bg-void px-3 py-2 font-mono text-[7px] tracking-[0.18em] text-muted uppercase sm:block">
              Build / 0.7.0
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-3 font-mono text-[7px] tracking-[0.22em] text-muted/60 uppercase lg:flex">
          <span>Scroll to brief</span>
          <span aria-hidden="true" className="h-px w-10 bg-line" />
        </div>
      </section>

      <div className="ticker border-b border-line bg-volt text-void">
        <div className="ticker-track flex w-max items-center py-3 font-mono text-[9px] font-medium tracking-[0.18em] whitespace-nowrap uppercase">
          <span className="flex items-center">
            Momentum is ammunition
            <span className="mx-6 opacity-40">◆</span>
            Wall-run
            <span className="mx-6 opacity-40">◆</span>
            Air dash
            <span className="mx-6 opacity-40">◆</span>
            Slide
            <span className="mx-6 opacity-40">◆</span>
            Claim the point
            <span className="mx-6 opacity-40">◆</span>
            Flow state
            <span className="mx-6 opacity-40">◆</span>
          </span>
          <span aria-hidden="true" className="flex items-center">
            Momentum is ammunition
            <span className="mx-6 opacity-40">◆</span>
            Wall-run
            <span className="mx-6 opacity-40">◆</span>
            Air dash
            <span className="mx-6 opacity-40">◆</span>
            Slide
            <span className="mx-6 opacity-40">◆</span>
            Claim the point
            <span className="mx-6 opacity-40">◆</span>
            Flow state
            <span className="mx-6 opacity-40">◆</span>
          </span>
        </div>
      </div>

      <section id="movement" className="shell scroll-mt-24 py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
          <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.22em] uppercase">
            <span className="text-volt">01</span>
            <span className="text-line">/</span>
            <span className="text-muted">Movement system</span>
          </div>
          <span className="hidden font-mono text-[8px] tracking-[0.18em] text-muted/60 uppercase sm:block">
            Flow / core loop
          </span>
        </div>

        <div className="mt-12 grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div>
            <h2 className="font-display text-[clamp(3.6rem,7vw,6.6rem)] leading-[0.83] font-medium tracking-[-0.02em] text-bone uppercase">
              Gravity is
              <br />{' '}
              a <span className="text-volt">suggestion.</span>
            </h2>
            <p className="mt-7 max-w-md text-sm leading-7 text-muted">
              Sprint into a slide. Kick off the wall. Read the gap before it
              arrives. VANTA never asks you to stand still and trade shots —
              the floor is a starting position, not a home.
            </p>
            <div className="mt-8 flex items-center gap-4 font-mono text-[8px] tracking-[0.18em] text-muted uppercase">
              <span className="flex h-9 w-9 items-center justify-center border border-volt/30 text-volt">
                FL
              </span>
              <span>
                Movement advantage only
                <br />
                <span className="text-bone/35">No damage or health buffs</span>
              </span>
            </div>
          </div>

          <div>
            {FLOW_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.index}
                  className="feature-row group grid grid-cols-[36px_1fr_auto] gap-4 border-t border-line py-6 last:border-b sm:gap-6"
                >
                  <span className="pt-1 font-mono text-[9px] tracking-[0.18em] text-muted">
                    {feature.index}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl leading-none font-medium tracking-[0.06em] text-bone transition-colors group-hover:text-volt sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                      {feature.copy}
                    </p>
                  </div>
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.25}
                    className="mt-1 h-5 w-5 text-muted/50 transition-colors group-hover:text-volt"
                  />
                </article>
              );
            })}

            <div className="mt-8 border border-line bg-carbon/40">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-mono text-[8px] tracking-[0.18em] text-muted uppercase">
                  Flow chain / model
                </span>
                <span className="font-mono text-[8px] tracking-[0.18em] text-volt uppercase">
                  Chain intact
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 px-4 py-5">
                <div>
                  <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                    01 / Build
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[0.06em] text-bone uppercase">
                    Accelerate
                  </p>
                </div>
                <span className="h-px w-5 bg-volt/40 sm:w-8" />
                <div>
                  <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                    02 / Link
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[0.06em] text-bone uppercase">
                    Chain
                  </p>
                </div>
                <span className="h-px w-5 bg-volt/40 sm:w-8" />
                <div>
                  <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                    03 / Hold
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[0.06em] text-volt uppercase">
                    Flow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-carbon/30">
        <div className="shell py-20 md:py-28">
          <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
            <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.22em] uppercase">
              <span className="text-volt">02</span>
              <span className="text-line">/</span>
              <span className="text-muted">The arsenal</span>
            </div>
            <span className="hidden font-mono text-[8px] tracking-[0.18em] text-muted/60 uppercase sm:block">
              Catalogue / {WEAPON_COUNT} systems
            </span>
          </div>

          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
            <div>
              <h2 className="font-display text-[clamp(3.6rem,7vw,6.6rem)] leading-[0.83] font-medium tracking-[-0.02em] text-bone uppercase">
                Sixty ways
                <br />{' '}
                to take <span className="text-signal">the point.</span>
              </h2>
              <p className="mt-7 max-w-lg text-sm leading-7 text-muted">
                Ten categories. Six systems each. No inventory screen, no
                pre-match loadout — weapons live in the arena and everybody
                knows where they spawn. What you carry is a map decision.
              </p>

              <div className="mt-10 grid gap-x-10 sm:grid-cols-2">
                {ARSENAL_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className="group border-t border-line py-4 transition-colors hover:border-volt/40"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="w-8 font-mono text-[8px] tracking-[0.16em] text-muted">
                        {category.code}
                      </span>
                      <h3 className="font-display text-2xl leading-none font-medium tracking-[0.05em] text-bone uppercase transition-colors group-hover:text-volt">
                        {category.name}
                      </h3>
                      <span className="ml-auto font-mono text-[8px] tracking-[0.14em] text-volt/70">
                        06
                      </span>
                    </div>
                    <p className="mt-2 pl-11 font-mono text-[7px] tracking-[0.14em] text-muted/60 uppercase">
                      {category.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="hud-panel sticky top-24 overflow-hidden bg-void p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -top-14 -right-4 font-display text-[13rem] leading-none font-semibold text-bone/[0.035]"
                >
                  60
                </div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
                      Arsenal protocol
                    </span>
                    <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
                  </div>

                  <p className="mt-10 font-display text-7xl leading-none font-medium text-volt">
                    {WEAPON_COUNT}
                    <span className="ml-2 font-mono text-[9px] tracking-[0.16em] text-muted">
                      TOTAL
                    </span>
                  </p>
                  <p className="mt-2 font-mono text-[8px] tracking-[0.2em] text-bone uppercase">
                    Ten classes / six each
                  </p>

                  <div className="my-8 h-px bg-line" />

                  <dl className="space-y-5">
                    <div className="grid grid-cols-[70px_1fr] gap-4">
                      <dt className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                        Acquisition
                      </dt>
                      <dd className="text-xs leading-5 text-bone/70">
                        Fixed map pickups. Predictable spawns. Public timers.
                      </dd>
                    </div>
                    <div className="grid grid-cols-[70px_1fr] gap-4">
                      <dt className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                        Identity
                      </dt>
                      <dd className="text-xs leading-5 text-bone/70">
                        Every system changes how a fight is fought. No reskins.
                      </dd>
                    </div>
                    <div className="grid grid-cols-[70px_1fr] gap-4">
                      <dt className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                        Status
                      </dt>
                      <dd className="text-xs leading-5 text-bone/70">
                        Specified. Production begins in the arsenal milestones.
                      </dd>
                    </div>
                  </dl>

                  <ActionLink
                    to="/arsenal"
                    variant="outline"
                    className="mt-10 w-full"
                  >
                    Open arsenal index
                  </ActionLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
          <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.22em] uppercase">
            <span className="text-volt">03</span>
            <span className="text-line">/</span>
            <span className="text-muted">The arenas</span>
          </div>
          <span className="hidden font-mono text-[8px] tracking-[0.18em] text-muted/60 uppercase sm:block">
            Four launch sites
          </span>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <h2 className="font-display text-[clamp(3.6rem,7vw,6.6rem)] leading-[0.83] font-medium tracking-[-0.02em] text-bone uppercase">
            Four places
            <br />{' '}
            to lose your <span className="text-[var(--color-cyan)]">footing.</span>
          </h2>
          <p className="max-w-md pb-1 text-sm leading-7 text-muted lg:justify-self-end">
            Each arena is built as a movement problem first: distinct
            silhouettes, authored FLOW chains and fixed weapon nodes that make
            map knowledge worth more than raw aim.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {ARENAS.map((arena) => (
            <ArenaCard key={arena.id} arena={arena} />
          ))}
        </div>
      </section>

      <section className="shell pb-20 md:pb-28">
        <div className="relative overflow-hidden bg-volt p-7 text-void sm:p-10 md:p-14">
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-20 font-display text-[28vw] leading-none font-semibold text-void/[0.05]"
          >
            V
          </div>
          <div className="relative grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:gap-16">
            <div>
              <div className="flex items-center gap-3 font-mono text-[8px] tracking-[0.24em] uppercase">
                <span className="h-1.5 w-1.5 bg-void" aria-hidden="true" />
                Next transmission
              </div>
              <h2 className="mt-7 font-display text-[clamp(3.4rem,7vw,6rem)] leading-[0.82] font-medium tracking-[-0.02em] uppercase">
                The arena is
                <br />{' '}
                taking shape.
              </h2>
            </div>

            <div className="flex flex-col justify-end">
              <p className="max-w-md text-sm leading-6 text-void/70">
                The interface, renderer and proving-grounds combat are live.
                FLOW movement, the arsenal, arenas, bots and online play follow
                in deliberate slices. No fake lobbies and no decorative
                systems.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/play"
                  className="inline-flex h-12 items-center gap-3 bg-void px-5 font-mono text-[10px] tracking-[0.16em] text-volt uppercase transition-colors hover:bg-carbon"
                >
                  Enter deployment
                  <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/arsenal"
                  className="inline-flex h-12 items-center gap-3 border border-void/30 px-5 font-mono text-[10px] tracking-[0.16em] text-void uppercase transition-colors hover:border-void hover:bg-void hover:text-volt"
                >
                  Open arsenal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
