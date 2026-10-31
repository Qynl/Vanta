import { ActionLink } from "@/ui/components/ActionLink";

export default function NotFoundPage() {
  return (
    <div className="shell relative flex min-h-[68vh] items-center overflow-hidden py-20">
      <div
        aria-hidden="true"
        className="absolute -top-10 left-1/2 -z-10 -translate-x-1/2 font-display text-[clamp(15rem,34vw,34rem)] leading-none font-semibold text-transparent [-webkit-text-stroke:1px_rgba(242,238,227,0.04)]"
      >
        404
      </div>

      <div className="max-w-2xl">
        <div className="flex items-center gap-3 font-mono text-[9px] tracking-[0.24em] text-signal uppercase">
          <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
          Error / out of bounds
        </div>
        <h1 className="mt-8 font-display text-[clamp(4rem,10vw,8rem)] leading-[0.82] font-medium uppercase">
          Lost
          <br />{' '}
          the route.
        </h1>
        <p className="mt-6 max-w-md text-sm leading-7 text-muted">
          This sector is not on the map. Return to the arena network, or head
          straight to deployment control.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ActionLink to="/">Return to arena</ActionLink>
          <ActionLink to="/play" variant="outline">
            Deployment
          </ActionLink>
        </div>
      </div>
    </div>
  );
}
