import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface RouteGuardProps {
  allowed: boolean;
  redirectTo: string;
  children: ReactNode;
}

/**
 * Generic auth-ready guard. M24 supplies the session predicate and owns the
 * /auth route; the return path is preserved for post-sign-in navigation.
 */
export function RouteGuard({
  allowed,
  redirectTo,
  children,
}: RouteGuardProps) {
  const location = useLocation();

  if (!allowed) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
