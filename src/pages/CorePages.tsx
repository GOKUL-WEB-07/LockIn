import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Circle,
  Coins,
  Flame,
  LockKeyhole,
  Target,
} from "lucide-react";
import { useAuth } from "../app/AuthProvider";
import { Empty, Loading, Message, PageHead, Panel } from "../components/ui";
import {
  CHALLENGE_DURATION,
  MIN_SUCCESSFUL_DAYS,
  ROUTES,
} from "../constants/domain";
import { cosmeticKind } from "../constants/store";
import { useChallenge } from "../hooks/useChallenge";
import { challengeApi } from "../services/api";
import type { Challenge, DailyProgress } from "../services/types";

function ChallengeSelector({ challenges, active, onChange, disabled = false }: {
  challenges: Challenge[];
  active: Challenge | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const options = challenges.filter((item) => item.status === "ACTIVE");
  if (options.length < 2) return null;
  return <label className="field challenge-selector">
    <span>Active challenge</span>
    <select value={active?.id ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </label>;
}

function dayStatus(day: number, current: number, days: DailyProgress[]) {
  const record = days.find((item) => item.day_number === day);
  if (record?.status === "COMPLETED") return "done";
  if (record?.status === "MISSED") return "missed";
  if (day === current) return "current";
  return "upcoming";
}

export function Timeline({
  current,
  days,
}: {
  current: number;
  days: DailyProgress[];
}) {
  return (
    <div className="timeline" aria-label="21 day progress">
      {Array.from({ length: CHALLENGE_DURATION }, (_, index) => {
        const day = index + 1;
        const status = dayStatus(day, current, days);
        return (
          <div
            key={day}
            className={`day-cell day-${status}`}
            title={`Day ${day}: ${status}`}
            aria-label={`Day ${day}, ${status}`}
          >
            <span>{day}</span>
            {status === "done" && <Check size={13} />}
            {status === "missed" && <span className="day-x">×</span>}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  const { active, attempt, habits, days, completions, challenges, loading, error, selectChallenge } =
    useChallenge();
  if (loading) return <Loading />;
  const todayDone =
    days.find((item) => item.day_number === attempt?.current_day)
      ?.completed_habits ?? 0;
  const todayPercent = habits.length ? Math.round((todayDone / habits.length) * 100) : 0;
  const completedIds = new Set(completions.map((item) => item.habit_id));
  const nextHabits = habits.filter((item) => !completedIds.has(item.id)).slice(0, 3);
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-overline">Your space for showing up</span>
          <h1>Welcome back, {profile?.display_name || "friend"}.</h1>
          <p>One focused day moves the whole journey forward.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="dashboard-date">
            {new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}
          </span>
          <Link className="dashboard-coins" to={ROUTES.profile} aria-label={`${profile?.super_coins ?? 0} Super Coins. Open profile`}>
            <Coins size={17} /> {profile?.super_coins ?? 0}
          </Link>
        </div>
      </header>
      <ChallengeSelector challenges={challenges} active={active} onChange={selectChallenge} />
      {error && <Message tone="error">{error}</Message>}
      {active && attempt ? (
        <div className="dashboard-board">
          <div className="dashboard-main-column">
            <Panel className={`hero-card dashboard-effect-${cosmeticKind(profile?.selected_interface_item_id) ?? "none"}`}>
              <div className="hero-top">
                <span className="status-chip">
                  <span /> Active challenge
                </span>
                <span className="hero-lock"><LockKeyhole size={15} /> Habits locked</span>
              </div>
              <h2>{active.name}</h2>
              <p>{active.description || "Your 21-day commitment is underway."}</p>
              <div className="hero-focus">
                <div className="hero-day">
                  <strong>{attempt.current_day.toString().padStart(2, "0")}</strong>
                  <span>Day of {CHALLENGE_DURATION}</span>
                </div>
                <div className="hero-focus-copy">Your next step is simple: finish today’s habits.</div>
              </div>
              <div className="hero-actions">
                <Link className="button button-primary" to={ROUTES.checklist}>
                  Open today’s checklist <ArrowRight size={17} />
                </Link>
                <Link className="hero-text-link" to={ROUTES.tracker}>
                  View tracker <ArrowRight size={15} />
                </Link>
              </div>
            </Panel>
            <Panel className="progress-panel">
              <div className="section-title">
                <div>
                  <span className="dashboard-overline">The journey</span>
                  <h2>Twenty-one days, one promise.</h2>
                  <p>Each square is a day you chose to show up.</p>
                </div>
                <span className="target-label">
                  {attempt.successful_days} of {MIN_SUCCESSFUL_DAYS} successful days
                </span>
              </div>
              <Timeline current={attempt.current_day} days={days} />
              <div className="timeline-legend">
                <span><i className="legend-done" /> Completed</span>
                <span><i className="legend-missed" /> Missed</span>
                <span><i className="legend-current" /> Today</span>
                <span><i className="legend-upcoming" /> Upcoming</span>
              </div>
            </Panel>
          </div>
          <div className="dashboard-side-column">
            <Panel className="dashboard-today-card">
              <div className="dashboard-card-heading">
                <span className="dashboard-overline">Daily objective</span>
                <Target size={19} />
              </div>
              <div className="dashboard-ring-wrap">
                <div className="dashboard-ring" style={{ background: `conic-gradient(var(--dash-highlight) ${todayPercent}%, #343853 0)` }} aria-label={`${todayPercent}% of today's habits complete`}>
                  <div><strong>{todayPercent}%</strong><span>done today</span></div>
                </div>
                <div className="dashboard-ring-copy">
                  <strong>{todayDone} of {habits.length}</strong>
                  <span>habits completed</span>
                </div>
              </div>
              <div className="dashboard-next">
                <h3>{nextHabits.length ? "Up next" : "All done for today"}</h3>
                {nextHabits.length ? (
                  <ul>{nextHabits.map((habit) => <li key={habit.id}>{habit.name}</li>)}</ul>
                ) : <p>Your daily objective is complete.</p>}
              </div>
              <Link className="dashboard-card-link" to={ROUTES.checklist}>
                Go to checklist <ArrowRight size={16} />
              </Link>
            </Panel>
            <div className="dashboard-momentum-heading">
              <h2>Momentum</h2>
              <span>Attempt {attempt.attempt_number}</span>
            </div>
            <div className="stat-grid">
              <Panel className="stat">
                <Flame size={21} />
                <strong>{attempt.current_streak}</strong>
                <span>Current streak</span>
              </Panel>
              <Panel className="stat">
                <Check size={21} />
                <strong>{attempt.successful_days}</strong>
                <span>Successful days</span>
              </Panel>
              <Panel className="stat">
                <Target size={21} />
                <strong>{Math.max(0, MIN_SUCCESSFUL_DAYS - attempt.successful_days)}</strong>
                <span>Days to target</span>
              </Panel>
            </div>
            {attempt.consecutive_misses === 1 && (
              <Message tone="warning">
                One missed day. Complete today’s habits to keep this attempt
                going.
              </Message>
            )}
            {attempt.attempt_number > 1 && attempt.current_day === 1 && (
              <Message tone="info">
                Attempt {attempt.attempt_number} has begun. Your earlier attempt
                is saved in history.
              </Message>
            )}
          </div>
        </div>
      ) : (
        <Empty
          variant="journey"
          title={
            challenges.some((item) => item.status === "COMPLETED")
              ? "Ready for your next 21 days?"
              : "Your journey starts here."
          }
        >
          Choose one commitment. Give it 21 days.
          <div className="empty-actions">
            <Link className="button button-primary" to={ROUTES.create}>
              Create challenge
            </Link>
            <Link className="button button-secondary" to={ROUTES.prebuilt}>
              Explore pre-built
            </Link>
          </div>
        </Empty>
      )}
      {!active && challenges.some((item) => item.status === "COMPLETED") && (
        <Panel className="retry-panel">
          <h2>Challenge complete</h2>
          <p>
            Your 21-day commitment is in your history. You can start another
            challenge whenever you’re ready.
          </p>
          <Link
            className="inline-link"
            to={`/challenge/${challenges.find((item) => item.status === "COMPLETED")?.id}`}
          >
            View completed challenge <ArrowRight size={15} />
          </Link>
        </Panel>
      )}
      {challenges.some((item) => item.status === "DRAFT") && (
        <Panel className="retry-panel">
          <h2>Continue your draft</h2>
          <p>Your habits are still flexible until you commit.</p>
          {challenges
            .filter((item) => item.status === "DRAFT")
            .map((item) => (
              <Link
                key={item.id}
                className="inline-link draft-link"
                to={`/challenge/${item.id}`}
              >
                {item.name} <ArrowRight size={15} />
              </Link>
            ))}
        </Panel>
      )}
      {!active && challenges.some((item) => item.status === "UNSUCCESSFUL") && (
        <Panel className="retry-panel">
          <h2>Ready for another attempt?</h2>
          <p>
            Your past attempts are saved. Pick up the same commitment from Day
            1.
          </p>
          <Link
            className="inline-link"
            to={`/challenge/${challenges.find((item) => item.status === "UNSUCCESSFUL")?.id}`}
          >
            View retryable challenge <ArrowRight size={15} />
          </Link>
        </Panel>
      )}
    </div>
  );
}

export function ChecklistPage() {
  const { refreshProfile } = useAuth();
  const {
    active,
    attempt,
    habits,
    completions,
    days,
    loading,
    error,
    refresh,
    challenges,
    selectChallenge,
  } = useChallenge();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  if (loading) return <Loading />;
  const completed = new Set(completions.map((item) => item.habit_id));
  const remaining = habits.filter((item) => !completed.has(item.id));
  const finished = habits.filter((item) => completed.has(item.id));
  async function complete(id: string) {
    setBusy(id);
    setActionError("");
    try {
      await challengeApi.completeHabit(id);
      await Promise.all([refresh(), refreshProfile()]);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not complete habit.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <PageHead
        title="Today’s checklist"
        description={
          active && attempt
            ? `${active.name} · Day ${attempt.current_day} of ${CHALLENGE_DURATION}`
            : "Your daily actions live here."
        }
      />
      {error && <Message tone="error">{error}</Message>}
      {actionError && <Message tone="error">{actionError}</Message>}
      <ChallengeSelector challenges={challenges} active={active} onChange={selectChallenge} disabled={busy !== null} />
      {active && attempt ? (
        <div className="narrow-content">
          <Panel className="checklist-summary">
            <div>
              <span className="eyebrow">Daily objective</span>
              <h2>
                {finished.length} of {habits.length} complete
              </h2>
              <p>Complete at least {Math.ceil(habits.length * 0.75)} habits for a successful day.</p>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${habits.length ? (finished.length / habits.length) * 100 : 0}%`,
                }}
              />
            </div>
          </Panel>
          <section className="checklist-section">
            <div className="section-title">
              <h2>To do</h2>
              <span>{remaining.length} left</span>
            </div>
            {remaining.length ? (
              <div className="habit-list">
                {remaining.map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    className="habit-action"
                    disabled={busy !== null}
                    onClick={() => void complete(habit.id)}
                  >
                    <span className="habit-circle">
                      <Circle size={24} />
                    </span>
                    <span className="habit-copy">
                      <strong>{habit.name}</strong>
                      <small>
                        {habit.reminder_time
                          ? `Reminder ${habit.reminder_time.slice(0, 5)}`
                          : "Any time today"}
                      </small>
                    </span>
                    <span className="habit-action-word">
                      {busy === habit.id ? "Saving…" : "Complete"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Message tone="success">All habits are done for today.</Message>
            )}
          </section>
          {finished.length > 0 && (
            <section className="checklist-section">
              <div className="section-title">
                <h2>Completed</h2>
                <span>{finished.length}</span>
              </div>
              <div className="habit-list">
                {finished.map((habit) => (
                  <div key={habit.id} className="habit-action habit-finished">
                    <span className="habit-circle">
                      <Check size={19} />
                    </span>
                    <span className="habit-copy">
                      <strong>{habit.name}</strong>
                      <small>Done today</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {attempt.consecutive_misses === 1 && (
            <Message tone="warning">
              You missed yesterday. Today is a chance to continue your attempt.
            </Message>
          )}
          {days.find((item) => item.day_number === attempt.current_day)
            ?.status === "COMPLETED" && (
            <Message tone="success">Daily objective complete.</Message>
          )}
        </div>
      ) : (
        <Empty title="No active challenge yet">
          Create a challenge to build your daily checklist.
          <Link className="button button-primary" to={ROUTES.create}>
            Create challenge
          </Link>
        </Empty>
      )}
    </>
  );
}

export function TrackerPage() {
  const { active, attempt, days, challenges, loading, error, selectChallenge } = useChallenge();
  if (loading) return <Loading />;
  return (
    <>
      <PageHead
        title="Your tracker"
        description="A clear view of the work you’ve done."
      />
      <ChallengeSelector challenges={challenges} active={active} onChange={selectChallenge} />
      {error && <Message tone="error">{error}</Message>}
      {active && attempt ? (
        <div className="tracker-layout">
          <Panel className="tracker-main">
            <div className="tracker-title">
              <div>
                <span className="eyebrow">{active.name}</span>
                <h2>
                  Day {attempt.current_day} of {CHALLENGE_DURATION}
                </h2>
              </div>
              <span className="status-chip status-chip-light">
                Attempt {attempt.attempt_number}
              </span>
            </div>
            <Timeline current={attempt.current_day} days={days} />
            <div className="tracker-target">
              <span>{attempt.successful_days} successful days</span>
              <span>{MIN_SUCCESSFUL_DAYS} needed</span>
              <div className="progress-track" aria-label={`${attempt.successful_days} of ${MIN_SUCCESSFUL_DAYS} successful days needed`}>
                <span style={{ width: `${Math.min(100, (attempt.successful_days / MIN_SUCCESSFUL_DAYS) * 100)}%` }} />
              </div>
            </div>
            <div className="timeline-legend">
              <span>
                <i className="legend-done" /> Completed
              </span>
              <span>
                <i className="legend-missed" /> Missed
              </span>
              <span>
                <i className="legend-current" /> Current
              </span>
              <span>
                <i className="legend-upcoming" /> Upcoming
              </span>
            </div>
          </Panel>
          <div className="tracker-stats">
            <Panel className="tracker-stat">
              <span>Successful days</span>
              <strong>
                {attempt.successful_days}
                <small> / {MIN_SUCCESSFUL_DAYS}</small>
              </strong>
              <p>Days needed to complete the challenge</p>
            </Panel>
            <Panel className="tracker-stat">
              <span>Current streak</span>
              <strong>{attempt.current_streak}</strong>
              <p>Consecutive successful days</p>
            </Panel>
            <Panel className="tracker-stat">
              <span>Best streak</span>
              <strong>{attempt.best_streak}</strong>
              <p>Your longest run this attempt</p>
            </Panel>
          </div>
        </div>
      ) : (
        <Empty title="Nothing to track yet">
          Your 21-day timeline appears when you start a challenge.
          <Link className="button button-primary" to={ROUTES.create}>
            Create challenge
          </Link>
        </Empty>
      )}
      {challenges.length > 0 && (
        <section className="history">
          <h2>Challenge history</h2>
          <div className="history-list">
            {challenges
              .filter((item) => item.status !== "DRAFT")
              .map((item) => (
                <Link
                  key={item.id}
                  className="history-row"
                  to={`/challenge/${item.id}`}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.type === "PREBUILT"
                        ? "Pre-built"
                        : "Custom challenge"}
                    </small>
                  </span>
                  <span className="history-status">
                    {item.status.toLowerCase()}
                  </span>
                  <ArrowRight size={17} />
                </Link>
              ))}
          </div>
        </section>
      )}
    </>
  );
}
