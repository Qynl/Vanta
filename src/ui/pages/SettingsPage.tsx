import type { CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

import { useSettingsStore } from "@/client/state/settings";
import { PageHeader } from "@/ui/components/PageHeader";

interface RangeSettingProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  output: string;
  onValueChange: (value: number) => void;
}

function RangeSetting({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  output,
  onValueChange,
}: RangeSettingProps) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div className="grid gap-5 border-b border-line py-6 last:border-b-0 md:grid-cols-[1fr_340px] md:items-center md:gap-8">
      <div>
        <label
          htmlFor={id}
          className="font-display text-xl leading-none tracking-[0.05em] text-bone uppercase"
        >
          {label}
        </label>
        <p className="mt-2 max-w-sm text-xs leading-5 text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
          className="range-control flex-1"
          style={
            {
              "--range-progress": `${progress}%`,
            } as CSSProperties
          }
        />
        <output
          htmlFor={id}
          className="w-[74px] border border-line bg-void px-2 py-2 text-center font-mono text-[9px] tracking-[0.1em] text-volt"
        >
          {output}
        </output>
      </div>
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleSetting({
  label,
  hint,
  checked,
  onCheckedChange,
}: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-6 last:border-b-0">
      <div>
        <p className="font-display text-xl leading-none tracking-[0.05em] text-bone uppercase">
          {label}
        </p>
        <p className="mt-2 max-w-sm text-xs leading-5 text-muted">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden font-mono text-[7px] tracking-[0.14em] text-muted uppercase sm:block">
          {checked ? "On" : "Off"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onCheckedChange(!checked)}
          className={`relative h-6 w-11 border transition-colors ${
            checked ? "border-volt/60 bg-volt/10" : "border-line bg-void"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 h-3.5 w-3.5 transition-transform ${
              checked
                ? "translate-x-[22px] bg-volt"
                : "translate-x-1 bg-muted/40"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettingsStore();
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  return (
    <div className="pb-20 md:pb-28">
      <PageHeader
        index="04"
        kicker="Operator calibration / local"
        title={
          <>
            Tune
            <br />{' '}
            the edge.
          </>
        }
        description="Input, view and motion preferences, stored in this browser. Sensitivity, invert Y, sprint mode, FOV and reduced motion are applied live to movement and combat."
        aside={
          <div className="inline-flex items-center gap-2 border border-line bg-carbon/60 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-muted uppercase">
            <span
              aria-hidden="true"
              className="status-pulse h-1.5 w-1.5 bg-volt"
            />
            Local profile / auto-saved
          </div>
        }
      />

      <div className="shell mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section
            aria-labelledby="input-settings"
            className="hud-panel bg-carbon/30 p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <h2
                id="input-settings"
                className="font-mono text-[8px] tracking-[0.22em] text-volt uppercase"
              >
                Input / pointer
              </h2>
              <span className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                Keyboard + mouse
              </span>
            </div>

            <RangeSetting
              id="sensitivity"
              label="Mouse sensitivity"
              hint="Base look speed before aim-down-sights modifiers."
              value={settings.sensitivity}
              min={0.2}
              max={2}
              step={0.05}
              output={settings.sensitivity.toFixed(2)}
              onValueChange={(value) =>
                updateSetting("sensitivity", value)
              }
            />

            <ToggleSetting
              label="Invert vertical look"
              hint="Push forward to look down. Persists across sessions."
              checked={settings.invertY}
              onCheckedChange={(checked) =>
                updateSetting("invertY", checked)
              }
            />

            <ToggleSetting
              label="Toggle sprint"
              hint="Press once to sprint rather than holding the key."
              checked={settings.toggleSprint}
              onCheckedChange={(checked) =>
                updateSetting("toggleSprint", checked)
              }
            />
          </section>

          <section
            aria-labelledby="view-settings"
            className="hud-panel bg-carbon/30 p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <h2
                id="view-settings"
                className="font-mono text-[8px] tracking-[0.22em] text-volt uppercase"
              >
                View / audio
              </h2>
              <span className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                Applied at runtime
              </span>
            </div>

            <RangeSetting
              id="fov"
              label="Field of view"
              hint="Horizontal weapon camera FOV. Sniper optics remain fixed."
              value={settings.fov}
              min={70}
              max={120}
              step={1}
              output={`${settings.fov}°`}
              onValueChange={(value) => updateSetting("fov", value)}
            />

            <RangeSetting
              id="master-volume"
              label="Master volume"
              hint="Stored for the match audio engine and menu mix."
              value={settings.masterVolume}
              min={0}
              max={100}
              step={1}
              output={`${settings.masterVolume}%`}
              onValueChange={(value) =>
                updateSetting("masterVolume", value)
              }
            />
          </section>

          <section
            aria-labelledby="accessibility-settings"
            className="hud-panel bg-carbon/30 p-5 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <h2
                id="accessibility-settings"
                className="font-mono text-[8px] tracking-[0.22em] text-volt uppercase"
              >
                Accessibility
              </h2>
              <span className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                Interface active now
              </span>
            </div>

            <ToggleSetting
              label="Reduced motion"
              hint="Stops marquees, route fades and ambient animation in this shell."
              checked={settings.reducedMotion}
              onCheckedChange={(checked) =>
                updateSetting("reducedMotion", checked)
              }
            />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="hud-panel bg-void p-5">
            <p className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
              Calibration file
            </p>

            <dl className="mt-5 space-y-4 border-b border-line pb-5">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                  Storage
                </dt>
                <dd className="text-right font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                  Local browser
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                  Cloud sync
                </dt>
                <dd className="text-right font-mono text-[8px] tracking-[0.1em] text-signal uppercase">
                  Not configured
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-mono text-[7px] tracking-[0.14em] text-muted uppercase">
                  Profile
                </dt>
                <dd className="text-right font-mono text-[8px] tracking-[0.1em] text-bone uppercase">
                  Foundation
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={resetSettings}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 border border-line font-mono text-[9px] tracking-[0.16em] text-muted uppercase transition-colors hover:border-signal/60 hover:text-signal"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reset defaults
            </button>
          </div>

          <div className="border border-line p-5">
            <p className="font-mono text-[8px] tracking-[0.22em] text-muted uppercase">
              Operator file
            </p>
            <p className="mt-3 text-xs leading-5 text-muted">
              Callsign and local identity live in the operator profile, not in
              calibration.
            </p>
            <Link
              to="/profile"
              className="mt-4 inline-flex font-mono text-[8px] tracking-[0.16em] text-volt uppercase underline decoration-volt/30 underline-offset-4 transition-colors hover:text-bone"
            >
              Open operator file
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
