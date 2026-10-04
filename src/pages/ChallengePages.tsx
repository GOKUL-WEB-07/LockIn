import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, LockKeyhole, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Field,
  FlowSteps,
  Loading,
  Message,
  PageHead,
  Panel,
} from "../components/ui";
import {
  CHALLENGE_DURATION,
  MIN_SUCCESSFUL_DAYS,
  ROUTES,
} from "../constants/domain";
import { challengeApi } from "../services/api";
import { useChallengeSelection } from "../hooks/useChallenge";
import type { Attempt, Challenge, Habit } from "../services/types";

export function CreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = await challengeApi.create(name, description);
      navigate(`/challenge/${id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create challenge.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title="Create a challenge"
        description="Start with a name. You can shape the details before you commit."
      />
      <div className="flow-layout">
        <FlowSteps current={1} />
        <Panel className="flow-panel">
          <h2>What are you committing to?</h2>
          <p>Give this 21-day challenge a name you’ll recognize each day.</p>
          <form onSubmit={submit} className="stack-form">
            <Field
              id="challenge-name"
              label="Challenge name"
              placeholder="e.g. Morning routine"
              maxLength={80}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label className="field" htmlFor="challenge-description">
              <span>
                Description <small>(optional)</small>
              </span>
              <textarea
                id="challenge-description"
                rows={4}
                maxLength={500}
                placeholder="What will this commitment help you build?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            {error && <Message tone="error">{error}</Message>}
            <div className="form-actions">
              <Link className="button button-secondary" to={ROUTES.dashboard}>
                Cancel
              </Link>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Continue to habits"}{" "}
                <ArrowRight size={17} />
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}

function useDraft(id: string | undefined) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [next, nextHabits, nextAttempts] = await Promise.all([
        challengeApi.get(id),
        challengeApi.habits(id),
        challengeApi.attempts(id),
      ]);
      setChallenge(next);
      setHabits(nextHabits);
      setAttempts(nextAttempts);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load challenge.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { challenge, habits, attempts, loading, error, refresh };
}

export function ChallengePage() {
  const { id } = useParams();
  const { challenge, habits, attempts, loading, error, refresh } = useDraft(id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [habitName, setHabitName] = useState("");
  const [reminder, setReminder] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    if (challenge) {
      setName(challenge.name);
      setDescription(challenge.description);
    }
  }, [challenge]);
  if (loading) return <Loading />;
  if (!challenge)
    return <Message tone="error">{error || "Challenge not found."}</Message>;
  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setActionError("");
    try {
      await challengeApi.updateDraft(challenge!.id, name, description);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not save details.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveHabit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setActionError("");
    try {
      if (editId)
        await challengeApi.updateHabit(editId, habitName, reminder || null);
      else
        await challengeApi.addHabit(challenge!.id, habitName, reminder || null);
      setHabitName("");
      setReminder("");
      setEditId(null);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not save habit.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeHabit(habitId: string) {
    setBusy(true);
    setActionError("");
    try {
      await challengeApi.deleteHabit(habitId);
      await refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not remove habit.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (challenge.status !== "DRAFT")
    return (
      <>
        <PageHead
          title={challenge.name}
          description={`${challenge.status.toLowerCase()} challenge · ${challenge.type === "CUSTOM" ? "Custom" : "Pre-built"}`}
        />
        <div className="flow-layout">
          <Panel className="flow-panel">
            <div className="locked-heading">
              <LockKeyhole size={22} />
              <h2>Your habits are locked</h2>
            </div>
            <p>The commitment stays the same across attempts.</p>
            <div className="review-habits">
              {habits.map((habit, index) => (
                <div key={habit.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{habit.name}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="flow-panel">
            <h2>Attempt history</h2>
            <div className="attempt-list">
              {attempts.map((attempt) => (
                <div key={attempt.id}>
                  <strong>Attempt {attempt.attempt_number}</strong>
                  <span>
                    {attempt.status.toLowerCase()} · {attempt.successful_days}{" "}
                    successful days
                  </span>
                </div>
              ))}
            </div>
            {challenge.status === "UNSUCCESSFUL" && (
              <RetryButton id={challenge.id} />
            )}
          </Panel>
        </div>
      </>
    );
  return (
    <>
      <PageHead
        title="Shape your challenge"
        description="Make changes freely now. Your habits lock when you start."
      />
      <div className="flow-layout">
        <FlowSteps current={2} />
        {actionError && <Message tone="error">{actionError}</Message>}
        <details className="details-disclosure">
          <summary>Edit challenge details <span>{challenge.name}</span></summary>
          <form onSubmit={saveDetails} className="stack-form">
            <Field
              id="draft-name"
              label="Challenge name"
              maxLength={80}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label className="field" htmlFor="draft-description">
              <span>Description</span>
              <textarea
                id="draft-description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <Button type="submit" variant="secondary" disabled={busy}>
              Save details
            </Button>
          </form>
        </details>
        <Panel className="flow-panel">
          <div className="section-title">
            <div>
              <h2>Your habits</h2>
              <p>Choose actions you can repeat every day.</p>
            </div>
            <span>{habits.length} added</span>
          </div>
          <div className="draft-habits">
            {habits.map((habit) => (
              <div key={habit.id} className="draft-habit">
                <div>
                  <strong>{habit.name}</strong>
                  <small>
                    {habit.reminder_time
                      ? `Reminder at ${habit.reminder_time.slice(0, 5)}`
                      : "No reminder time"}
                  </small>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditId(habit.id);
                      setHabitName(habit.name);
                      setReminder(habit.reminder_time?.slice(0, 5) || "");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${habit.name}`}
                    disabled={busy}
                    onClick={() => void removeHabit(habit.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={saveHabit} className="habit-form">
            <Field
              id="habit-name"
              label={editId ? "Edit habit" : "Add a habit"}
              placeholder="e.g. Read 10 pages"
              maxLength={100}
              required
              value={habitName}
              onChange={(event) => setHabitName(event.target.value)}
            />
            <Field
              id="reminder"
              label="Reminder time (optional)"
              type="time"
              value={reminder}
              onChange={(event) => setReminder(event.target.value)}
            />
            <Button type="submit" disabled={busy}>
              <Plus size={17} /> {editId ? "Save habit" : "Add habit"}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setHabitName("");
                  setReminder("");
                }}
              >
                Cancel edit
              </Button>
            )}
          </form>
        </Panel>
        <div className="form-actions">
          <Link className="button button-secondary" to={ROUTES.dashboard}>
            <ArrowLeft size={17} /> Dashboard
          </Link>
          <Link
            className={`button button-primary ${habits.length === 0 ? "button-disabled" : ""}`}
            aria-disabled={habits.length === 0}
            tabIndex={habits.length === 0 ? -1 : undefined}
            to={habits.length ? `/challenge/${challenge.id}/review` : "#"}
          >
            Review challenge <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </>
  );
}

function RetryButton({ id }: { id: string }) {
  const navigate = useNavigate();
  const { setSelectedChallengeId } = useChallengeSelection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function retry() {
    setBusy(true);
    setError("");
    try {
      await challengeApi.retry(id);
      setSelectedChallengeId(id);
      navigate(ROUTES.dashboard);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="retry-action">
      {error && <Message tone="error">{error}</Message>}
      <Button disabled={busy} onClick={() => void retry()}>
        {busy ? "Starting…" : "Retry from Day 1"}
      </Button>
    </div>
  );
}

export function ReviewPage() {
  const { id } = useParams();
  const { challenge, habits, loading, error } = useDraft(id);
  if (loading) return <Loading />;
  if (!challenge)
    return <Message tone="error">{error || "Challenge not found."}</Message>;
  if (challenge.status !== "DRAFT")
    return <Message tone="warning">This challenge is already locked.</Message>;
  return (
    <>
      <PageHead
        title="Review your commitment"
        description="Take a moment to check what you’ll practice for 21 days."
      />
      <div className="flow-layout">
        <FlowSteps current={3} />
        <Panel className="flow-panel review-panel">
          <span className="eyebrow">Your challenge</span>
          <h2>{challenge.name}</h2>
          <p>
            {challenge.description ||
              "One focused commitment, practiced every day."}
          </p>
          <div className="review-divider" />
          <h3>{habits.length} daily habits</h3>
          <div className="review-habits">
            {habits.map((habit, index) => (
              <div key={habit.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{habit.name}</strong>
                {habit.reminder_time && (
                  <small>{habit.reminder_time.slice(0, 5)}</small>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <div className="form-actions">
          <Link
            className="button button-secondary"
            to={`/challenge/${challenge.id}`}
          >
            <ArrowLeft size={17} /> Edit habits
          </Link>
          <Link
            className="button button-primary"
            to={`/challenge/${challenge.id}/commit`}
          >
            Continue to rules <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </>
  );
}

export function CommitPage() {
  const { setSelectedChallengeId } = useChallengeSelection();
  const { id } = useParams();
  const { challenge, habits, loading, error } = useDraft(id);
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  if (loading) return <Loading />;
  if (!challenge)
    return <Message tone="error">{error || "Challenge not found."}</Message>;
  if (challenge.status !== "DRAFT")
    return (
      <Message tone="warning">This challenge has already started.</Message>
    );
  async function start() {
    setBusy(true);
    setActionError("");
    try {
      await challengeApi.start(challenge!.id);
      setSelectedChallengeId(challenge!.id);
      navigate(ROUTES.dashboard);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not start challenge.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title="Make the commitment"
        description={`These rules will guide ${challenge.name} for ${CHALLENGE_DURATION} days.`}
      />
      <div className="flow-layout">
        <FlowSteps current={4} />
        <Panel className="flow-panel rules-panel">
          <div className="rules-icon">
            <LockKeyhole size={26} />
          </div>
          <h2>A promise with clear rules.</h2>
          <p>
            You can change your habits until you start. After that, the
            structure stays fixed.
          </p>
          <div className="rules-list">
            <div>
              <span>01</span>
              <p>Habits become locked after your challenge starts.</p>
            </div>
            <div>
              <span>02</span>
              <p>Complete at least 75% of habits for a successful day.</p>
            </div>
            <div>
              <span>03</span>
              <p>
                Two consecutive missed days reset the attempt. Your history
                stays saved.
              </p>
            </div>
            <div>
              <span>04</span>
              <p>
                Complete at least {MIN_SUCCESSFUL_DAYS} of {CHALLENGE_DURATION}{" "}
                days to finish the challenge.
              </p>
            </div>
          </div>
          <label className="accept-line">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              I understand and accept these rules for my {habits.length} habits.
            </span>
          </label>
          {actionError && <Message tone="error">{actionError}</Message>}
          <div className="form-actions">
            <Link
              className="button button-secondary"
              to={`/challenge/${challenge.id}/review`}
            >
              <ArrowLeft size={17} /> Back to review
            </Link>
            <Button
              disabled={!accepted || busy || habits.length === 0}
              onClick={() => void start()}
            >
              {busy ? "Starting…" : "Commit & start"} <ArrowRight size={17} />
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
