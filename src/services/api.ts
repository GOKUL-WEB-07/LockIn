import { db } from "../lib/supabase/client";
import type {
  Attempt,
  Challenge,
  Completion,
  DailyProgress,
  Habit,
  Profile,
  ShopItem,
  Template,
} from "./types";

function dataOrThrow<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export const authApi = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await db().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },
  signUp: async (email: string, password: string) =>
    dataOrThrow(await db().auth.signUp({ email, password })),
  signOut: async () => {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  },
  profile: async (id: string) =>
    dataOrThrow(
      await db().from("profiles").select("*").eq("id", id).single(),
    ) as Profile,
  updateProfile: async (name: string, onboarding = false) =>
    dataOrThrow(
      await db().rpc("update_profile", {
        p_name: name,
        p_onboarding: onboarding,
      }),
    ) as Profile,
};

export const challengeApi = {
  list: async () =>
    dataOrThrow(
      await db()
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false }),
    ) as Challenge[],
  get: async (id: string) =>
    dataOrThrow(
      await db().from("challenges").select("*").eq("id", id).single(),
    ) as Challenge,
  create: async (name: string, description: string) =>
    dataOrThrow(
      await db().rpc("create_challenge", {
        p_name: name,
        p_description: description,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
    ) as string,
  updateDraft: async (id: string, name: string, description: string) => {
    dataOrThrow(
      await db().rpc("update_draft_challenge", {
        p_id: id,
        p_name: name,
        p_description: description,
      }),
    );
  },
  habits: async (id: string) =>
    dataOrThrow(
      await db()
        .from("habits")
        .select("*")
        .eq("challenge_id", id)
        .order("sort_order"),
    ) as Habit[],
  addHabit: async (challenge: string, name: string, reminder: string | null) =>
    dataOrThrow(
      await db().rpc("add_draft_habit", {
        p_challenge: challenge,
        p_name: name,
        p_reminder: reminder,
      }),
    ),
  updateHabit: async (id: string, name: string, reminder: string | null) => {
    dataOrThrow(
      await db().rpc("update_draft_habit", {
        p_id: id,
        p_name: name,
        p_reminder: reminder,
      }),
    );
  },
  deleteHabit: async (id: string) => {
    dataOrThrow(await db().rpc("delete_draft_habit", { p_id: id }));
  },
  start: async (id: string) =>
    dataOrThrow(await db().rpc("start_challenge", { p_id: id })),
  retry: async (id: string) =>
    dataOrThrow(await db().rpc("retry_challenge", { p_challenge: id })),
  reconcile: async (id: string) => {
    dataOrThrow(await db().rpc("reconcile_challenge", { p_challenge: id }));
  },
  attempts: async (id: string) =>
    dataOrThrow(
      await db()
        .from("challenge_attempts")
        .select("*")
        .eq("challenge_id", id)
        .order("attempt_number", { ascending: false }),
    ) as Attempt[],
  days: async (id: string) =>
    dataOrThrow(
      await db()
        .from("daily_progress")
        .select("*")
        .eq("attempt_id", id)
        .order("day_number"),
    ) as DailyProgress[],
  completions: async (id: string, day: number) =>
    dataOrThrow(
      await db()
        .from("habit_completions")
        .select("habit_id,day_number")
        .eq("attempt_id", id)
        .eq("day_number", day),
    ) as Completion[],
  completeHabit: async (id: string) => {
    dataOrThrow(await db().rpc("complete_habit", { p_habit: id }));
  },
};

export const catalogApi = {
  templates: async () =>
    dataOrThrow(
      await db()
        .from("prebuilt_challenges")
        .select("*,prebuilt_challenge_habits(id,name,sort_order)")
        .order("name"),
    ) as Template[],
  startTemplate: async (id: string) =>
    dataOrThrow(
      await db().rpc("start_prebuilt", {
        p_template: id,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
    ) as string,
  shop: async () =>
    dataOrThrow(
      await db().from("shop_items").select("*").order("price"),
    ) as ShopItem[],
  owned: async () =>
    dataOrThrow(await db().from("user_items").select("shop_item_id")) as {
      shop_item_id: string;
    }[],
  purchase: async (id: string) => {
    dataOrThrow(await db().rpc("purchase_shop_item", { p_item: id }));
  },
  setTheme: async (id: string | null) => {
    dataOrThrow(await db().rpc("set_theme", { p_item: id }));
  },
  setCosmetic: async (id: string | null, category: "PROFILE" | "INTERFACE") => {
    dataOrThrow(await db().rpc("set_cosmetic", { p_item: id, p_category: category }));
  },
  preferences: async () =>
    dataOrThrow(
      await db().from("notification_preferences").select("*").single(),
    ) as {
      habit_reminders_enabled: boolean;
      progress_reminders_enabled: boolean;
      warning_notifications_enabled: boolean;
      daily_result_enabled: boolean;
    },
  savePreferences: async (
    habit: boolean,
    progress: boolean,
    warning: boolean,
    result: boolean,
  ) => {
    dataOrThrow(
      await db().rpc("set_notification_preferences", {
        p_habit: habit,
        p_progress: progress,
        p_warning: warning,
        p_result: result,
      }),
    );
  },
  profileStats: async () => {
    const [completed, days, streak, rewards] = await Promise.all([
      db()
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED"),
      db()
        .from("daily_progress")
        .select("id", { count: "exact", head: true })
        .eq("status", "COMPLETED"),
      db()
        .from("challenge_attempts")
        .select("best_streak")
        .order("best_streak", { ascending: false })
        .limit(1),
      db()
        .from("reward_events")
        .select("event_type,coins,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    for (const result of [completed, days, streak, rewards])
      if (result.error) throw new Error(result.error.message);
    return {
      completedChallenges: completed.count ?? 0,
      completedDays: days.count ?? 0,
      bestStreak: streak.data?.[0]?.best_streak ?? 0,
      rewards: (rewards.data ?? []) as {
        event_type: string;
        coins: number;
        created_at: string;
      }[],
    };
  },
};
