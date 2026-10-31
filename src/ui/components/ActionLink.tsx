import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

type ActionVariant = "primary" | "outline" | "quiet";

interface ActionLinkProps {
  to: string;
  children: ReactNode;
  variant?: ActionVariant;
  size?: "md" | "sm";
  arrow?: boolean;
  className?: string;
}

const variantClasses: Record<ActionVariant, string> = {
  primary:
    "border border-volt bg-volt text-void hover:border-bone hover:bg-bone",
  outline:
    "border border-line bg-carbon/60 text-bone hover:border-volt/70 hover:text-volt",
  quiet:
    "border border-transparent bg-transparent text-muted hover:text-volt",
};

export function ActionLink({
  to,
  children,
  variant = "primary",
  size = "md",
  arrow = true,
  className = "",
}: ActionLinkProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center justify-center gap-3 font-mono uppercase tracking-[0.16em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-volt ${
        size === "md" ? "h-12 px-5 text-[10px]" : "h-9 px-3.5 text-[9px]"
      } ${variantClasses[variant]} ${className}`}
    >
      <span>{children}</span>
      {arrow && (
        <ArrowUpRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      )}
    </Link>
  );
}
