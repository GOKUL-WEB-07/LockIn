export const CHALLENGE_DURATION = 21;
export const DAILY_SUCCESS_THRESHOLD = 0.75;
export const MIN_SUCCESSFUL_DAYS = 17;
export const MAX_CONSECUTIVE_MISSES = 2;

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  tracker: "/tracker",
  checklist: "/checklist",
  prebuilt: "/prebuilt",
  store: "/store",
  profile: "/profile",
  settings: "/settings",
  create: "/challenge/create",
} as const;
