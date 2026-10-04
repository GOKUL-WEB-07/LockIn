import { useSyncExternalStore } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

let pendingPrompt: InstallPromptEvent | null = null;
const displayMode = window.matchMedia("(display-mode: standalone)");
let installed = displayMode.matches;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Capture the prompt before React mounts and retain it across page navigation.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pendingPrompt = event as InstallPromptEvent;
  notify();
});
window.addEventListener("appinstalled", () => {
  installed = true;
  pendingPrompt = null;
  notify();
});
displayMode.addEventListener("change", () => {
  installed = displayMode.matches;
  notify();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useInstall() {
  const status = useSyncExternalStore(subscribe, () =>
    installed ? "installed" : pendingPrompt ? "ready" : "manual",
  );
  return { status, install };
}

async function install() {
  const prompt = pendingPrompt;
  if (!prompt) return "unavailable";
  pendingPrompt = null;
  notify();
  const result = await prompt.prompt();
  return result.outcome;
}
