export const STORE_COSMETICS = {
  comet: "b4afebc5-6db5-4a4b-a343-2b0c1cbda007",
  champion: "b4afebc5-6db5-4a4b-a343-2b0c1cbda008",
  aurora: "b4afebc5-6db5-4a4b-a343-2b0c1cbda009",
  stardust: "b4afebc5-6db5-4a4b-a343-2b0c1cbda010",
} as const;

export function cosmeticKind(id: string | null | undefined) {
  if (id === STORE_COSMETICS.comet) return "comet";
  if (id === STORE_COSMETICS.champion) return "champion";
  if (id === STORE_COSMETICS.aurora) return "aurora";
  if (id === STORE_COSMETICS.stardust) return "stardust";
  return null;
}
