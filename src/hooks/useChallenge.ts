import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { challengeApi } from "../services/api";
import type {
  Attempt,
  Challenge,
  Completion,
  DailyProgress,
  Habit,
} from "../services/types";

export interface ChallengeData {
  challenges: Challenge[];
  active: Challenge | null;
  attempt: Attempt | null;
  habits: Habit[];
  days: DailyProgress[];
  completions: Completion[];
}
const initial: ChallengeData = {
  challenges: [],
  active: null,
  attempt: null,
  habits: [],
  days: [],
  completions: [],
};

export function useChallengeSelection() {
  return useOutletContext<{
    selectedChallengeId: string | null;
    setSelectedChallengeId: (id: string) => void;
  }>();
}

export function useChallenge() {
  const { selectedChallengeId, setSelectedChallengeId } = useChallengeSelection();
  const request = useRef(0);
  const [data, setData] = useState<ChallengeData>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setError("");
    try {
      let challenges = await challengeApi.list();
      const pending = challenges.filter((item) => item.status === "ACTIVE");
      for (const item of pending) {
        await challengeApi.reconcile(item.id);
      }
      if (pending.length) challenges = await challengeApi.list();
      const activeChallenges = challenges.filter((item) => item.status === "ACTIVE");
      const active = activeChallenges.find((item) => item.id === selectedChallengeId)
        ?? activeChallenges[0] ?? null;
      const attempt = active?.active_attempt_id
        ? ((await challengeApi.attempts(active.id)).find(
            (item) => item.id === active!.active_attempt_id,
          ) ?? null)
        : null;
      const [habits, days, completions] = await Promise.all([
        active ? challengeApi.habits(active.id) : Promise.resolve([]),
        attempt ? challengeApi.days(attempt.id) : Promise.resolve([]),
        attempt
          ? challengeApi.completions(attempt.id, attempt.current_day)
          : Promise.resolve([]),
      ]);
      if (version !== request.current) return;
      setData({
        challenges,
        active: active?.status === "ACTIVE" ? active : null,
        attempt,
        habits,
        days,
        completions,
      });
    } catch (cause) {
      if (version !== request.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load your challenge.",
      );
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [selectedChallengeId]);
  useEffect(() => {
    const requests = request;
    setLoading(true);
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      requests.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  return { ...data, loading, error, refresh, selectChallenge: setSelectedChallengeId };
}
