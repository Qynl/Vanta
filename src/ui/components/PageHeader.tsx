import type { ReactNode } from "react";

interface PageHeaderProps {
  index: string;
  kicker: string;
  title: ReactNode;
  description: string;
  aside?: ReactNode;
}

export function PageHeader({
  index,
  kicker,
  title,
  description,
  aside,
}: PageHeaderProps) {
  return (
    <header className="shell pt-10 md:pt-14">
      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
        <span className="h-1.5 w-1.5 bg-volt" aria-hidden="true" />
        <span className="text-volt">{index}</span>
        <span className="text-line">/</span>
        <span>{kicker}</span>
      </div>

      <div className="mt-8 grid gap-7 border-b border-line pb-10 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-end lg:gap-14">
        <h1 className="font-display text-[clamp(3.7rem,9vw,8rem)] leading-[0.82] font-medium tracking-[-0.02em] text-bone uppercase">
          {title}
        </h1>
        <div className="pb-1">
          <p className="max-w-sm text-sm leading-6 text-muted">{description}</p>
          {aside && <div className="mt-6">{aside}</div>}
        </div>
      </div>
    </header>
  );
}
