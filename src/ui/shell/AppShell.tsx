import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useSettingsStore } from "@/client/state/settings";
import { RouteFallback } from "@/ui/components/RouteFallback";
import { ErrorBoundary } from "@/ui/shell/ErrorBoundary";
import { SiteFooter } from "@/ui/shell/SiteFooter";
import { SiteHeader } from "@/ui/shell/SiteHeader";

function SettingsEffects() {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion
      ? "reduced"
      : "full";
  }, [reducedMotion]);

  return null;
}

function ScrollManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function RouteContent() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-enter">
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div aria-hidden="true" className="site-grain" />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SettingsEffects />
      <ScrollManager />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <RouteContent />
      </main>
      <SiteFooter />
    </div>
  );
}
