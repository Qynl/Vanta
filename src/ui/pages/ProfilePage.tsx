import { useState, type FormEvent } from "react";
import { Database, Fingerprint, Settings2, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";

import {
  normalizeCallsign,
  useOperatorStore,
  validateCallsign,
} from "@/client/state/operator";
import { PageHeader } from "@/ui/components/PageHeader";

function formatJoinedAt(joinedAt: string | null) {
  if (!joinedAt) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(joinedAt))
    .toUpperCase();
}

export default function ProfilePage() {
  const callsign = useOperatorStore((state) => state.callsign);
  const joinedAt = useOperatorStore((state) => state.joinedAt);
  const setCallsign = useOperatorStore((state) => state.setCallsign);

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeCallsign(draft);
    const validationError = validateCallsign(normalized);

    if (validationError) {
      setError(validationError);
      setSaved(false);
      return;
    }

    setCallsign(normalized);
    setDraft("");
    setError(null);
    setSaved(true);
  };

  return (
    <div className="pb-20 md:pb-28">
      <PageHeader
        index="03"
        kicker="Operator file / local identity"
        title={
          <>
            Make a
            <br />{' '}
            name.
          </>
        }
        description="This foundation build stores a local operator callsign in your browser. Online identity, match history and progression arrive with the account layer."
        aside={
          <div className="inline-flex items-center gap-2 border border-line bg-carbon/60 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
            <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
            Local session active
          </div>
        }
      />

      <div className="shell mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section className="hud-panel relative overflow-hidden bg-void p-6 sm:p-8 md:p-10">
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 h-full w-24 border-l border-line/50 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_7px,rgba(242,238,227,0.04)_7px,rgba(242,238,227,0.04)_8px)] opacity-60"
          />
          <div
            aria-hidden="true"
            className="absolute right-10 bottom-10 h-28 w-28 rounded-full border border-volt/10"
          />
          <div
            aria-hidden="true"
            className="absolute right-[74px] bottom-10 h-28 w-px bg-volt/10"
          />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
                VANTA / Operator
              </span>
              <span className="font-mono text-[7px] tracking-[0.16em] text-signal uppercase">
                Local only
              </span>
            </div>

            <div className="mt-16 sm:mt-24">
              <p className="font-mono text-[8px] tracking-[0.2em] text-muted uppercase">
                Callsign
              </p>
              <h2 className="mt-2 max-w-full break-all font-display text-[clamp(3.2rem,8vw,6.8rem)] leading-[0.85] font-medium tracking-[0.01em] text-bone uppercase">
                {callsign ?? "Unassigned"}
              </h2>
              <p className="mt-4 font-mono text-[8px] tracking-[0.18em] text-volt uppercase">
                Foundation operator / no rank
              </p>
            </div>

            <div className="mt-16 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                  Identity
                </p>
                <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-bone uppercase">
                  Local guest
                </p>
              </div>
              <div>
                <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                  Joined
                </p>
                <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-bone uppercase">
                  {formatJoinedAt(joinedAt)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[7px] tracking-[0.16em] text-muted uppercase">
                  Career
                </p>
                <p className="mt-2 font-mono text-[9px] tracking-[0.08em] text-bone uppercase">
                  Not recorded
                </p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
              <span className="font-mono text-[7px] tracking-[0.14em] text-muted/60 uppercase">
                File / VNTA-OPS-001
              </span>
              <span className="font-mono text-[7px] tracking-[0.14em] text-muted/60 uppercase">
                Build 0.7.0
              </span>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="hud-panel bg-carbon/30 p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <Fingerprint
                aria-hidden="true"
                className="h-4 w-4 text-volt"
                strokeWidth={1.5}
              />
              <h2 className="font-mono text-[8px] tracking-[0.2em] text-bone uppercase">
                {callsign ? "Change callsign" : "Establish callsign"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <label
                htmlFor="callsign"
                className="font-mono text-[7px] tracking-[0.18em] text-muted uppercase"
              >
                Call sign / 2—16 characters
              </label>
              <input
                id="callsign"
                name="callsign"
                type="text"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value.toUpperCase());
                  setSaved(false);
                  setError(null);
                }}
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
                placeholder={callsign ?? "VANTA-01"}
                aria-describedby={error ? "callsign-error" : "callsign-hint"}
                aria-invalid={Boolean(error)}
                className="mt-2 h-12 w-full border border-line bg-void px-3 font-mono text-sm tracking-[0.12em] text-bone uppercase transition-colors placeholder:text-muted/30 focus:border-volt focus:outline-none"
              />
              {error ? (
                <p
                  id="callsign-error"
                  role="alert"
                  className="mt-2 font-mono text-[8px] leading-4 tracking-[0.08em] text-signal"
                >
                  {error}
                </p>
              ) : (
                <p
                  id="callsign-hint"
                  className="mt-2 font-mono text-[8px] leading-4 tracking-[0.08em] text-muted/70"
                >
                  Letters, numbers, underscores or hyphens. Stored only in this
                  browser.
                </p>
              )}

              <button
                type="submit"
                className="mt-4 inline-flex h-11 w-full items-center justify-center bg-volt px-5 font-mono text-[9px] tracking-[0.16em] text-void uppercase transition-colors hover:bg-bone"
              >
                {callsign ? "Update callsign" : "Establish callsign"}
              </button>

              {saved && (
                <p
                  role="status"
                  className="mt-3 border border-volt/30 bg-volt/5 px-3 py-2 font-mono text-[8px] leading-4 tracking-[0.08em] text-volt"
                >
                  Callsign saved to this browser.
                </p>
              )}
            </form>
          </section>

          <section className="border border-line p-5 sm:p-6">
            <h2 className="font-mono text-[8px] tracking-[0.2em] text-muted uppercase">
              Service status
            </h2>
            <div className="mt-4 divide-y divide-line">
              <div className="flex items-start gap-3 py-3">
                <WifiOff
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"
                />
                <div>
                  <p className="font-mono text-[8px] tracking-[0.12em] text-bone uppercase">
                    Online identity
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Not connected. No account or credentials are created.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <Database
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"
                />
                <div>
                  <p className="font-mono text-[8px] tracking-[0.12em] text-bone uppercase">
                    Persistence
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Local browser storage only. Clearing site data removes the
                    profile.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <Settings2
                  aria-hidden="true"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted"
                />
                <div>
                  <p className="font-mono text-[8px] tracking-[0.12em] text-bone uppercase">
                    Calibration
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Input and view settings are managed separately.
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/settings"
              className="mt-3 inline-flex font-mono text-[8px] tracking-[0.16em] text-volt uppercase underline decoration-volt/30 underline-offset-4 transition-colors hover:text-bone"
            >
              Open calibration
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
