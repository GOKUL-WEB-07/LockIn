import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bell, LogOut, Palette, UserRound } from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { Button, Loading, Message, PageHead, Panel } from "../components/ui";
import { ROUTES } from "../constants/domain";
import { authApi, catalogApi } from "../services/api";

type Preferences = Awaited<ReturnType<typeof catalogApi.preferences>>;

const notificationOptions: { key: keyof Preferences; label: string; help: string }[] = [
  { key: "habit_reminders_enabled", label: "Habit reminders", help: "Remind me about the habits in my challenge." },
  { key: "progress_reminders_enabled", label: "Progress reminders", help: "Keep my daily progress in view." },
  { key: "warning_notifications_enabled", label: "Miss warnings", help: "Let me know when an attempt is at risk." },
  { key: "daily_result_enabled", label: "Daily results", help: "Show how each challenge day ended." },
];

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState<"name" | "notifications" | "appearance" | "signout" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { setName(profile?.display_name ?? ""); }, [profile?.display_name]);
  useEffect(() => {
    let active = true;
    setLoadingPrefs(true);
    void catalogApi.preferences()
      .then((value) => { if (active) setPrefs(value); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load preferences."); })
      .finally(() => { if (active) setLoadingPrefs(false); });
    return () => { active = false; };
  }, [reload]);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>, success: string) {
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save changes.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="settings-page">
    <PageHead title="Settings" description="Choose how your space looks and which updates you want to see." />
    {error && <Message tone="error">{error}</Message>}
    {notice && <Message tone="success">{notice}</Message>}
    <div className="settings-grid">
      <div className="settings-column">
        <Panel className="settings-panel settings-section">
          <div className="settings-heading"><span><UserRound size={20} /></span><div><h2>Your details</h2><p>How your name appears throughout LockIn.</p></div></div>
          <form onSubmit={(event) => {
            event.preventDefault();
            const next = name.trim();
            if (!next) { setError("Enter a display name."); return; }
            void run("name", async () => { await authApi.updateProfile(next); await refreshProfile(); }, "Display name saved.");
          }}>
            <label className="field" htmlFor="settings-name"><span>Display name</span><input id="settings-name" value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} /></label>
            <Button type="submit" disabled={busy !== null || !name.trim() || name.trim() === profile?.display_name}>{busy === "name" ? "Saving…" : "Save name"}</Button>
          </form>
        </Panel>
        <Panel className="settings-panel settings-section">
          <div className="settings-heading"><span><Bell size={20} /></span><div><h2>Notifications</h2><p>Pick the updates you want when reminders are available.</p></div></div>
          {loadingPrefs ? <Loading label="Loading notification preferences…" /> : prefs ? <>
            <div className="settings-list">{notificationOptions.map(({ key, label, help }) => <label key={key} className="toggle-row settings-toggle"><span><strong>{label}</strong><small>{help}</small></span><input type="checkbox" checked={prefs[key]} disabled={busy !== null} onChange={(event) => setPrefs((current) => current ? { ...current, [key]: event.target.checked } : current)} /></label>)}</div>
            <Button disabled={busy !== null} onClick={() => void run("notifications", async () => { await catalogApi.savePreferences(prefs.habit_reminders_enabled, prefs.progress_reminders_enabled, prefs.warning_notifications_enabled, prefs.daily_result_enabled); setPrefs(await catalogApi.preferences()); }, "Notification preferences saved.")}>{busy === "notifications" ? "Saving…" : "Save preferences"}</Button>
          </> : <Button variant="secondary" onClick={() => { setError(""); setReload((value) => value + 1); }}>Retry loading preferences</Button>}
          <p className="settings-note">These choices are saved to your account. Push and email reminder delivery is not configured yet.</p>
        </Panel>
      </div>
      <div className="settings-column">
        <Panel className="settings-panel settings-section">
          <div className="settings-heading"><span><Palette size={20} /></span><div><h2>Appearance</h2><p>Your theme and cosmetics stay with your account.</p></div></div>
          <div className="settings-appearance"><span className="settings-theme-swatch" /><div><strong>{profile?.selected_theme === "default" ? "LockIn original" : "Custom theme"}</strong><small>Current theme</small></div></div>
          <div className="settings-actions"><Link className="button button-secondary" to={ROUTES.store}>Browse store <ArrowRight size={16} /></Link>{profile?.selected_theme !== "default" && <Button variant="ghost" disabled={busy !== null} onClick={() => void run("appearance", async () => { await catalogApi.setTheme(null); await refreshProfile(); }, "Default theme applied.")}>{busy === "appearance" ? "Applying…" : "Use default theme"}</Button>}</div>
        </Panel>
        <Panel className="settings-panel settings-section">
          <div className="settings-heading"><span><UserRound size={20} /></span><div><h2>Account</h2><p>Signed in as {user?.email ?? "your account"}.</p></div></div>
          <Button variant="secondary" disabled={busy !== null} onClick={() => void run("signout", async () => { await signOut(); navigate(ROUTES.login); }, "Signed out.")}><LogOut size={17} /> {busy === "signout" ? "Signing out…" : "Sign out"}</Button>
        </Panel>
      </div>
    </div>
  </div>;
}
