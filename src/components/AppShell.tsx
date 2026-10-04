import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  CalendarDays,
  CheckSquare,
  Compass,
  LayoutDashboard,
  LockKeyhole,
  ShoppingBag,
  Settings,
  UserRound,
} from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { ProfileBadge } from "./CosmeticArt";
import { ROUTES } from "../constants/domain";

const links = [
  { to: ROUTES.dashboard, label: "Dashboard", Icon: LayoutDashboard },
  { to: ROUTES.tracker, label: "Tracker", Icon: CalendarDays },
  { to: ROUTES.checklist, label: "Checklist", Icon: CheckSquare },
  { to: ROUTES.prebuilt, label: "Pre-built", Icon: Compass },
  { to: ROUTES.store, label: "Store", Icon: ShoppingBag },
  { to: ROUTES.profile, label: "Profile", Icon: UserRound },
];

export function AppShell() {
  const { profile } = useAuth();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  return (
    <div className="app-shell dark-shell">
      <aside className="sidebar">
        <NavLink className="brand" to={ROUTES.dashboard}>
          <span className="brand-mark">
            <LockKeyhole size={17} strokeWidth={2.2} />
          </span>
          <span>
            LockIn<span className="brand-period">.</span>
          </span>
        </NavLink>
        <div className="nav-caption">Today and beyond</div>
        <nav aria-label="Main navigation" className="side-nav">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to={ROUTES.settings} className={({ isActive }) => `nav-link settings-nav-link ${isActive ? "active" : ""}`}><Settings size={19} strokeWidth={1.9} /><span>Settings</span></NavLink>
        <NavLink className="sidebar-foot" to={ROUTES.profile} aria-label="Open your profile">
          <span className="avatar">
            {profile?.display_name?.charAt(0).toUpperCase() || "L"}
            <ProfileBadge id={profile?.selected_profile_item_id} />
          </span>
          <span>
            <strong>{profile?.display_name || "Your profile"}</strong>
            <small>Keep showing up</small>
          </span>
        </NavLink>
      </aside>
      <div className="main-area">
        <header className="mobile-header">
          <NavLink className="brand" to={ROUTES.dashboard}>
            <span className="brand-mark">
              <LockKeyhole size={17} strokeWidth={2.2} />
            </span>
            <span>
              LockIn<span className="brand-period">.</span>
            </span>
          </NavLink>
          <NavLink to={ROUTES.profile} className="mobile-avatar" aria-label="Open your profile">
            {profile?.display_name?.charAt(0).toUpperCase() || "L"}
            <ProfileBadge id={profile?.selected_profile_item_id} />
          </NavLink>
        </header>
        <main className="content">
          <Outlet context={{ selectedChallengeId, setSelectedChallengeId }} />
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="bottom-nav">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={21} strokeWidth={1.9} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
