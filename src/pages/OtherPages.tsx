import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Coins,
  Compass,
  LockKeyhole,
  Pencil,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { useChallengeSelection } from "../hooks/useChallenge";
import { ProfileBadge, StorePreview } from "../components/CosmeticArt";
import { BrandMark } from "../components/BrandMark";
import { themeKind } from "../constants/store";
import {
  Button,
  Empty,
  Loading,
  Message,
  PageHead,
  Panel,
} from "../components/ui";
import { ROUTES } from "../constants/domain";
import { catalogApi } from "../services/api";
import type { ShopItem, Template } from "../services/types";

export function PrebuiltPage() {
  const navigate = useNavigate();
  const { setSelectedChallengeId } = useChallengeSelection();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [accepted, setAccepted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    setLoading(true);
    setError("");
    void catalogApi
      .templates()
      .then(setTemplates)
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [reload]);
  useEffect(() => {
    if (!selected) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current
      ?.querySelector<HTMLButtonElement>(".dialog-close")
      ?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled)",
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [selected]);
  async function start() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const id = await catalogApi.startTemplate(selected.id);
      setSelectedChallengeId(id);
      navigate(ROUTES.dashboard);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start program.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title="Pre-built challenges"
        description="Choose a ready-made 21-day program and make it yours."
      />
      {error && <Message tone="error">{error}</Message>}
      {loading ? (
        <Loading />
      ) : error && templates.length === 0 ? (
        <Empty title="Programs could not load">
          Check your connection, then try again.
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>
            Retry loading
          </Button>
        </Empty>
      ) : templates.length === 0 ? (
        <Empty title="Programs are coming soon">
          There are no ready-made programs available right now.
          <Link className="button button-primary" to={ROUTES.create}>Create your own challenge</Link>
        </Empty>
      ) : (
        <div className="template-grid">
          {templates.map((template) => (
            <Panel key={template.id} className="template-card">
              <div className="template-icon">
                <Compass size={24} />
              </div>
              <span className="eyebrow">{template.category}</span>
              <h2>{template.name}</h2>
              <p>{template.description}</p>
              <div className="template-bottom">
                <span>
                  {template.prebuilt_challenge_habits.length} daily habits
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError("");
                    setAccepted(false);
                    setSelected(template);
                  }}
                >
                  View program <ArrowRight size={16} />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {selected && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div
            className="dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-title"
          >
            <button
              className="dialog-close"
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="eyebrow">21-day program</span>
            <h2 id="program-title">{selected.name}</h2>
            <p>{selected.description}</p>
            <div className="review-habits">
              {[...selected.prebuilt_challenge_habits].sort((a, b) => a.sort_order - b.sort_order).map((habit, index) => (
                <div key={habit.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{habit.name}</strong>
                </div>
              ))}
            </div>
            <Message tone="info">
              <LockKeyhole size={16} /> These habits lock when the program
              starts. Complete 75% each day and 17 days overall.
            </Message>
            <label className="accept-line template-accept">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                I understand and accept the 21-day rules for this program.
              </span>
            </label>
            {error && <Message tone="error">{error}</Message>}
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button disabled={busy || !accepted} onClick={() => void start()}>
                {busy ? "Starting…" : "Commit & start"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [stats, setStats] = useState<{
    completedChallenges: number;
    completedDays: number;
    bestStreak: number;
    rewards: { event_type: string; coins: number; created_at: string }[];
  } | null>(null);
  const [error, setError] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [reload, setReload] = useState(0);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [appearanceItems, setAppearanceItems] = useState<ShopItem[]>([]);
  const [ownedAppearanceIds, setOwnedAppearanceIds] = useState<string[]>([]);
  const [appearanceLoading, setAppearanceLoading] = useState(true);
  const [appearanceError, setAppearanceError] = useState("");
  const [appearanceNotice, setAppearanceNotice] = useState("");
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const [appearanceReload, setAppearanceReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    setError("");
    void catalogApi
      .profileStats()
      .then((value) => { if (active) setStats(value); })
      .catch((cause) => {
        if (!active) return;
        setStats(null);
        setError(cause instanceof Error ? cause.message : "Could not load profile statistics.");
      })
      .finally(() => { if (active) setLoadingStats(false); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    let active = true;
    setAppearanceLoading(true);
    setAppearanceError("");
    void Promise.all([catalogApi.shop(), catalogApi.owned()])
      .then(([shop, owned]) => {
        if (!active) return;
        setAppearanceItems(shop);
        setOwnedAppearanceIds(owned.map((item) => item.shop_item_id));
      })
      .catch((cause) => {
        if (active) setAppearanceError(cause instanceof Error ? cause.message : "Could not load your collection.");
      })
      .finally(() => { if (active) setAppearanceLoading(false); });
    return () => { active = false; };
  }, [appearanceReload]);

  async function setAppearance(id: string | null, category: "THEME" | "PROFILE") {
    if (appearanceBusy) return;
    setAppearanceBusy(true);
    setAppearanceError("");
    setAppearanceNotice("");
    try {
      if (category === "THEME") await catalogApi.setTheme(id);
      else await catalogApi.setCosmetic(id, "PROFILE");
      await refreshProfile();
      setAppearanceNotice(category === "THEME" ? "Profile banner updated." : id ? "Badge equipped." : "Badge removed.");
    } catch (cause) {
      setAppearanceError(cause instanceof Error ? cause.message : "Could not update your appearance.");
    } finally {
      setAppearanceBusy(false);
    }
  }

  const ownedThemes = appearanceItems.filter((item) => item.category === "THEME" && ownedAppearanceIds.includes(item.id));
  const ownedBadges = appearanceItems.filter((item) => item.category === "PROFILE" && ownedAppearanceIds.includes(item.id));
  return (
    <>
      <PageHead
        title="Your profile"
        description="Your progress, rewards, and collection in one place."
        action={<Link className="button button-secondary" to={ROUTES.settings}>Open settings</Link>}
      />
      {error && <Message tone="error">{error}</Message>}
      {error && <Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Retry statistics</Button>}
      <div className="profile-layout">
        <div className="profile-main">
          <Panel className="profile-card">
            <div className={`profile-banner store-preview-${themeKind(profile?.selected_theme)}`} aria-label="Your selected profile banner">
              <span className="profile-banner-orbit" aria-hidden="true" />
              <BrandMark className="profile-banner-mark" />
              <span>Your LockIn space</span>
            </div>
            <div className="profile-card-body">
              <div className="profile-identity">
                <span className="profile-avatar">
                  {profile?.display_name.charAt(0).toUpperCase() || "L"}
                  <ProfileBadge id={profile?.selected_profile_item_id} />
                </span>
                <div>
                  <h2>{profile?.display_name}<ProfileBadge id={profile?.selected_profile_item_id} inline /></h2>
                  <p>Your LockIn space</p>
                </div>
              </div>
              <div className="coin-line">
                <Coins size={21} />
                <strong>{profile?.super_coins ?? 0}</strong>
                <span>Super Coins</span>
              </div>
              <Button variant="secondary" className="profile-edit-button" aria-expanded={appearanceOpen} onClick={() => setAppearanceOpen((open) => !open)}>
                <Pencil size={15} /> {appearanceOpen ? "Close appearance editor" : "Edit badge & banner"}
              </Button>
            </div>
          </Panel>
          {!appearanceLoading && ownedBadges.length > 0 && <Panel className="profile-owned-badges">
            <div className="section-title">
              <h2>Your badges</h2>
              <Button variant="ghost" onClick={() => setAppearanceOpen(true)}>Edit badges</Button>
            </div>
            <div className="profile-owned-list">
              {ownedBadges.map((item) => <span key={item.id} className="profile-owned-badge">
                <ProfileBadge id={item.id} inline />
                <span>{item.name}</span>
                <small>{profile?.selected_profile_item_id === item.id ? "Equipped" : "Owned"}</small>
              </span>)}
            </div>
          </Panel>}
          {appearanceOpen && <Panel className="profile-appearance-editor">
            <h2>Edit your appearance</h2>
            {appearanceError && <Message tone="error">{appearanceError}</Message>}
            {appearanceNotice && <Message tone="success">{appearanceNotice}</Message>}
            {appearanceLoading ? <Loading label="Loading your collection…" /> : <>
              <div className="appearance-group">
                <h3>Profile banner</h3>
                <div className="appearance-options">
                  {[{ id: null, name: "LockIn original" }, ...ownedThemes].map((item) => {
                    const selected = item.id ? profile?.selected_theme === item.id : profile?.selected_theme === "default";
                    return <button type="button" key={item.id ?? "default"} className={`appearance-option${selected ? " selected" : ""}`} disabled={appearanceBusy || selected} onClick={() => void setAppearance(item.id, "THEME")}>
                      <span className={`appearance-swatch store-preview-${themeKind(item.id)}`} aria-hidden="true" />
                      <span>{item.name}</span>
                      {selected && <Check size={16} aria-label="Selected" />}
                    </button>;
                  })}
                </div>
              </div>
              <div className="appearance-group">
                <h3>Badge</h3>
                <div className="appearance-options">
                  <button type="button" className={`appearance-option${!profile?.selected_profile_item_id ? " selected" : ""}`} disabled={appearanceBusy || !profile?.selected_profile_item_id} onClick={() => void setAppearance(null, "PROFILE")}>
                    <span className="appearance-badge-empty" aria-hidden="true">—</span><span>No badge</span>
                    {!profile?.selected_profile_item_id && <Check size={16} aria-label="Selected" />}
                  </button>
                  {ownedBadges.map((item) => {
                    const selected = profile?.selected_profile_item_id === item.id;
                    return <button type="button" key={item.id} className={`appearance-option${selected ? " selected" : ""}`} disabled={appearanceBusy || selected} onClick={() => void setAppearance(item.id, "PROFILE")}>
                      <ProfileBadge id={item.id} inline /><span>{item.name}</span>
                      {selected && <Check size={16} aria-label="Selected" />}
                    </button>;
                  })}
                </div>
                {ownedBadges.length === 0 && <p>Badges you unlock in the store will appear here.</p>}
              </div>
              <Link className="inline-link" to={ROUTES.store}>Browse more styles <ArrowRight size={16} /></Link>
            </>}
            {appearanceError && !appearanceLoading && <Button variant="ghost" onClick={() => setAppearanceReload((value) => value + 1)}>Retry collection</Button>}
          </Panel>}
          {loadingStats ? <Loading label="Loading profile statistics…" /> : stats && (
            <Panel className="profile-metrics">
              <div>
                <strong>{stats.completedChallenges}</strong>
                <span>Challenges completed</span>
              </div>
              <div>
                <strong>{stats.completedDays}</strong>
                <span>Successful days</span>
              </div>
              <div>
                <strong>{stats.bestStreak}</strong>
                <span>Best streak</span>
              </div>
            </Panel>
          )}
        </div>
        <div className="profile-side">
          <Panel className="account-panel profile-store-link">
            <ShoppingBag size={22} />
            <h2>Store</h2>
            <p>Use your Super Coins to unlock themes, badges, and dashboard effects.</p>
            <Link className="button button-secondary" to={ROUTES.store}>
              Browse the store <ArrowRight size={16} />
            </Link>
          </Panel>
          <Panel className="account-panel">
            <h2>Recent rewards</h2>
            {loadingStats ? <Loading label="Loading recent rewards…" /> : stats?.rewards.length ? (
              <div className="reward-list">
                {stats.rewards.map((reward, index) => (
                  <div key={`${reward.created_at}-${index}`}>
                    <span>{reward.event_type.toLowerCase()} reward</span>
                    <strong>+{reward.coins}</strong>
                  </div>
                ))}
              </div>
            ) : !error ? (
              <p className="muted">Complete habits to earn your first coins.</p>
            ) : <p className="muted">Recent rewards are unavailable.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}

export function StorePage() {
  const { profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [category, setCategory] = useState<"ALL" | "THEME" | "PROFILE" | "INTERFACE">("ALL");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([catalogApi.shop(), catalogApi.owned()])
      .then(([shop, userItems]) => {
        if (!active) return;
        setItems(shop);
        setOwned(userItems.map((item) => item.shop_item_id));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load the store.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reload]);

  async function purchase(item: ShopItem) {
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await catalogApi.purchase(item.id);
      setOwned((current) => [...current, item.id]);
      try {
        if (item.category === "THEME") await catalogApi.setTheme(item.id);
        if (item.category === "PROFILE" || item.category === "INTERFACE")
          await catalogApi.setCosmetic(item.id, item.category);
      } catch {
        await refreshProfile();
        setNotice(`${item.name} unlocked. You can equip it from ${item.category === "INTERFACE" ? "the store" : "your profile or the store"}.`);
        return;
      }
      await refreshProfile();
      setNotice(`${item.name} unlocked and equipped.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete purchase.");
    } finally {
      setBusyId(null);
    }
  }

  async function applyTheme(id: string | null) {
    setBusyId(id ?? "default");
    setError("");
    setNotice("");
    try {
      await catalogApi.setTheme(id);
      await refreshProfile();
      setNotice("Theme applied.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not apply theme.");
    } finally {
      setBusyId(null);
    }
  }

  async function applyCosmetic(id: string | null, type: "PROFILE" | "INTERFACE") {
    setBusyId(id ?? type);
    setError("");
    setNotice("");
    try {
      await catalogApi.setCosmetic(id, type);
      await refreshProfile();
      setNotice(id ? "Item equipped." : "Item removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your item.");
    } finally {
      setBusyId(null);
    }
  }

  const balance = profile?.super_coins ?? 0;
  const visibleItems = category === "ALL" ? items : items.filter((item) => item.category === category);
  return (
    <div className="store-page">
      <PageHead title="Store" description="Make your space feel like yours. Earn coins by completing habits and days." />
      <section className="store-hero" aria-label="Your Super Coins balance">
        <div className="store-hero-copy">
          <span className="store-hero-icon"><Coins size={22} /></span>
          <span>Your balance</span>
          <strong>{balance} <small>Super Coins</small></strong>
          <p>Every item is cosmetic. Your challenge rules and progress stay the same.</p>
        </div>
        <div className="store-hero-art" aria-hidden="true"><Sparkles size={84} strokeWidth={1} /></div>
      </section>
      {error && <Message tone="error">{error}</Message>}
      {notice && <Message tone="success">{notice}</Message>}
      <div className="store-section-heading">
        <div><span className="eyebrow">Personalize your space</span><h2>The collection</h2></div>
        <span>{visibleItems.length + (category === "ALL" || category === "THEME" ? 1 : 0)} items</span>
      </div>
      <div className="store-filters" role="group" aria-label="Filter store items">
        {([ ["ALL", "All items"], ["THEME", "Themes"], ["PROFILE", "Badges"], ["INTERFACE", "Dashboard effects"] ] as const).map(([value, label]) => (
          <button key={value} type="button" className={category === value ? "active" : ""} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>
      {loading ? <Loading label="Loading the store…" /> : error && items.length === 0 ? (
        <Empty title="Store could not load">Check your connection and try again.<Button variant="secondary" onClick={() => setReload((value) => value + 1)}>Retry loading</Button></Empty>
      ) : visibleItems.length === 0 && category !== "ALL" && category !== "THEME" ? (
        <Empty title="The collection is empty">New items will appear here when they are available.</Empty>
      ) : (
        <div className="store-grid">
          {(category === "ALL" || category === "THEME") && <article className="store-item store-default">
            <div className="store-item-preview store-preview-default" aria-hidden="true"><span className="preview-orbit" /><span className="preview-lock"><LockKeyhole size={28} /></span></div>
            <div className="store-item-body"><span className="eyebrow">Included theme</span><h3>LockIn original</h3><p>The signature navy and violet look.</p><div className="store-item-foot"><span className="store-price">Free</span><Button variant="secondary" disabled={busyId !== null || profile?.selected_theme === "default"} onClick={() => void applyTheme(null)}>{profile?.selected_theme === "default" ? <><Check size={16} /> Applied</> : "Apply theme"}</Button></div></div>
          </article>}
          {visibleItems.map((item) => {
            const isOwned = owned.includes(item.id);
            const isApplied = item.category === "THEME" ? profile?.selected_theme === item.id : item.category === "PROFILE" ? profile?.selected_profile_item_id === item.id : item.category === "INTERFACE" ? profile?.selected_interface_item_id === item.id : false;
            const canAfford = balance >= item.price;
            return <article className="store-item" key={item.id}>
              <StorePreview id={item.id} assetUrl={item.asset_url} />
              <div className="store-item-body">
                <span className="eyebrow">{item.category.toLowerCase()}</span>
                <h3>{item.name}</h3>
                <p>{item.description || "A new look for your space."}</p>
                <div className="store-item-foot">
                  <span className="store-price">{isOwned ? <><Check size={16} /> Owned</> : <><Coins size={16} /> {item.price}</>}</span>
                  {isOwned && ["THEME", "PROFILE", "INTERFACE"].includes(item.category) ? <Button variant="secondary" disabled={busyId !== null || isApplied} onClick={() => void (item.category === "THEME" ? applyTheme(item.id) : applyCosmetic(item.id, item.category as "PROFILE" | "INTERFACE"))}>{isApplied ? <><Check size={16} /> Equipped</> : busyId === item.id ? "Equipping…" : "Equip item"}</Button> : isOwned ? <span className="owned"><Check size={16} /> Owned</span> : <Button disabled={busyId !== null || !canAfford} onClick={() => void purchase(item)}>{busyId === item.id ? "Buying…" : canAfford ? "Unlock item" : "More coins needed"}</Button>}
                </div>
              </div>
            </article>;
          })}
        </div>
      )}
      {(profile?.selected_profile_item_id || profile?.selected_interface_item_id) && <div className="store-equipped-actions">
        {profile.selected_profile_item_id && <Button variant="ghost" disabled={busyId !== null} onClick={() => void applyCosmetic(null, "PROFILE")}>Remove badge</Button>}
        {profile.selected_interface_item_id && <Button variant="ghost" disabled={busyId !== null} onClick={() => void applyCosmetic(null, "INTERFACE")}>Remove dashboard effect</Button>}
      </div>}
      <p className="store-footnote"><Coins size={17} /> Complete a habit to earn 1 coin and a successful day to earn 5 more.</p>
    </div>
  );
}
