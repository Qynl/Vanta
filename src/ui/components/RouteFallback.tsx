import { Logo } from "@/ui/components/Logo";

export function RouteFallback() {
  return (
    <div
      className="shell flex min-h-[62vh] flex-col items-center justify-center py-20"
      role="status"
      aria-live="polite"
    >
      <Logo className="text-volt" />
      <div className="mt-8 h-px w-40 overflow-hidden bg-line">
        <div className="route-loader-bar h-px w-1/2 bg-volt" />
      </div>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
        Calibrating interface
      </p>
    </div>
  );
}
