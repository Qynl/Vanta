import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "@/ui/shell/AppShell";

const LandingPage = lazy(() => import("@/ui/pages/LandingPage"));
const PlayPage = lazy(() => import("@/ui/pages/PlayPage"));
const ArsenalPage = lazy(() => import("@/ui/pages/ArsenalPage"));
const SettingsPage = lazy(() => import("@/ui/pages/SettingsPage"));
const ProfilePage = lazy(() => import("@/ui/pages/ProfilePage"));
const NotFoundPage = lazy(() => import("@/ui/pages/NotFoundPage"));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="arsenal" element={<ArsenalPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
