import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button, Loading, Message } from "../components/ui";
import { useAuth } from "./AuthProvider";
import { ROUTES } from "../constants/domain";
import { AuthPage, OnboardingPage } from "../pages/AuthPages";
import { DashboardPage, ChecklistPage, TrackerPage } from "../pages/CorePages";
import {
  CreatePage,
  ChallengePage,
  ReviewPage,
  CommitPage,
} from "../pages/ChallengePages";
import { PrebuiltPage, ProfilePage, StorePage } from "../pages/OtherPages";
import { SettingsPage } from "../pages/SettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, loading, refreshProfile } = useAuth();
  const location = useLocation();
  if (loading || (user && !profile && !profileError)) return <Loading />;
  if (profileError)
    return (
      <div className="route-error">
        <Message tone="error">
          Could not load your profile: {profileError}
        </Message>
        <Button onClick={() => void refreshProfile().catch(() => undefined)}>Try again</Button>
      </div>
    );
  if (!user)
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  if (!profile?.onboarding_completed && location.pathname !== ROUTES.onboarding)
    return <Navigate to={ROUTES.onboarding} replace />;
  if (profile?.onboarding_completed && location.pathname === ROUTES.onboarding)
    return <Navigate to={ROUTES.dashboard} replace />;
  return children;
}

function Public({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, loading } = useAuth();
  if (loading || (user && !profile && !profileError)) return <Loading />;
  if (profileError)
    return (
      <Message tone="error">
        Could not load your profile: {profileError}
      </Message>
    );
  if (user)
    return (
      <Navigate
        to={
          profile?.onboarding_completed ? ROUTES.dashboard : ROUTES.onboarding
        }
        replace
      />
    );
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
      <Route
        path={ROUTES.login}
        element={
          <Public>
            <AuthPage key="login" mode="login" />
          </Public>
        }
      />
      <Route
        path={ROUTES.signup}
        element={
          <Public>
            <AuthPage key="signup" mode="signup" />
          </Public>
        }
      />
      <Route
        path={ROUTES.onboarding}
        element={
          <Protected>
            <OnboardingPage />
          </Protected>
        }
      />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={ROUTES.tracker} element={<TrackerPage />} />
        <Route path={ROUTES.checklist} element={<ChecklistPage />} />
        <Route path={ROUTES.prebuilt} element={<PrebuiltPage />} />
        <Route path={ROUTES.store} element={<StorePage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
        <Route path={ROUTES.create} element={<CreatePage />} />
        <Route path="/challenge/:id" element={<ChallengePage />} />
        <Route path="/challenge/:id/review" element={<ReviewPage />} />
        <Route path="/challenge/:id/commit" element={<CommitPage />} />
      </Route>
      <Route
        path="*"
        element={
          <div className="not-found">
            <h1>Page not found</h1>
            <a href={ROUTES.dashboard}>Go to dashboard</a>
          </div>
        }
      />
    </Routes>
  );
}
