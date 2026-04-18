import { useEffect, useState } from "react";

const CONFETTI_DISABLED_KEY = "champion-confetti-disabled";
const EVENT_NAME = "champion-confetti-pref-change";

export function useConfettiEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    const read = () =>
      setEnabled(localStorage.getItem(CONFETTI_DISABLED_KEY) !== "1");
    read();
    const handler = () => read();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return enabled;
}

export function setConfettiEnabled(enabled: boolean): void {
  if (enabled) localStorage.removeItem(CONFETTI_DISABLED_KEY);
  else localStorage.setItem(CONFETTI_DISABLED_KEY, "1");
  window.dispatchEvent(new Event(EVENT_NAME));
}
