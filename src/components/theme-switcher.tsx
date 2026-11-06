"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const MODES = [
  ["light", Sun],
  ["dark", Moon],
  ["system", Monitor],
] as const;

// Sets the `dark` class on <html>. The inline script in layout.tsx does the same before first paint.
function apply(mode: string) {
  const dark = mode === "dark" || (mode === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeSwitcher() {
  const [mode, setMode] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    // localStorage is only readable after mount, so the saved mode is set here to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(saved);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const t = localStorage.getItem("theme");
      if (!t || t === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const pick = (m: string) => {
    setMode(m);
    localStorage.setItem("theme", m);
    apply(m);
  };

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-full bg-white/10 p-0.5">
      {MODES.map(([m, Icon]) => (
        <button
          key={m}
          type="button"
          onClick={() => pick(m)}
          aria-pressed={mode === m}
          aria-label={m}
          title={m[0].toUpperCase() + m.slice(1)}
          className="grid h-8 w-9 place-items-center rounded-full text-band-foreground transition-colors aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
