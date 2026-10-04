export type ChallengeStatus =
  "DRAFT" | "ACTIVE" | "COMPLETED" | "UNSUCCESSFUL" | "ARCHIVED";
export type AttemptStatus = "ACTIVE" | "RESET" | "COMPLETED" | "UNSUCCESSFUL";
export type DayStatus = "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "MISSED";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  super_coins: number;
  selected_theme: string;
  selected_profile_item_id: string | null;
  selected_interface_item_id: string | null;
}
export interface Challenge {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: "CUSTOM" | "PREBUILT";
  status: ChallengeStatus;
  active_attempt_id: string | null;
  timezone: string;
  created_at: string;
}
export interface Attempt {
  id: string;
  challenge_id: string;
  attempt_number: number;
  start_date: string;
  end_date: string | null;
  current_day: number;
  successful_days: number;
  current_streak: number;
  best_streak: number;
  consecutive_misses: number;
  status: AttemptStatus;
}
export interface Habit {
  id: string;
  challenge_id: string;
  name: string;
  reminder_time: string | null;
  sort_order: number;
  locked: boolean;
}
export interface DailyProgress {
  day_number: number;
  completed_habits: number;
  total_habits: number;
  completion_percentage: number;
  status: DayStatus;
}
export interface Completion {
  habit_id: string;
  day_number: number;
}
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  prebuilt_challenge_habits: { id: string; name: string; sort_order: number }[];
}
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  asset_url: string | null;
}
