import { createContext, useContext, useState, useLayoutEffect, ReactNode } from "react";

export type BaseTheme = "default" | "ocean" | "forest" | "sunset";
export type AccentColor = "emerald" | "sky" | "violet" | "amber" | "rose";

export const BASE_THEMES: { id: BaseTheme; labelTh: string; bg: string; card: string }[] = [
  { id: "default",  labelTh: "Midnight",  bg: "hsl(222,20%,9%)",   card: "hsl(222,18%,13%)" },
  { id: "ocean",    labelTh: "Ocean",     bg: "hsl(220,40%,8%)",   card: "hsl(220,35%,12%)" },
  { id: "forest",   labelTh: "Forest",    bg: "hsl(150,30%,7%)",   card: "hsl(150,25%,11%)" },
  { id: "sunset",   labelTh: "Sunset",    bg: "hsl(20,30%,8%)",    card: "hsl(20,25%,12%)" },
];

export const ACCENT_COLORS: { id: AccentColor; labelTh: string; hex: string }[] = [
  { id: "emerald", labelTh: "มรกต",   hex: "#10b981" },
  { id: "sky",     labelTh: "ฟ้า",    hex: "#0ea5e9" },
  { id: "violet",  labelTh: "ม่วง",   hex: "#8b5cf6" },
  { id: "amber",   labelTh: "ส้ม",    hex: "#f59e0b" },
  { id: "rose",    labelTh: "ชมพู",   hex: "#f43f5e" },
];

type AppThemeContextType = {
  baseTheme: BaseTheme;
  accentColor: AccentColor;
  setBaseTheme: (t: BaseTheme) => void;
  setAccentColor: (a: AccentColor) => void;
};

const AppThemeContext = createContext<AppThemeContextType | null>(null);

function applyClasses(baseTheme: BaseTheme, accentColor: AccentColor) {
  const html = document.documentElement;
  BASE_THEMES.forEach(t => html.classList.remove(`theme-${t.id}`));
  ACCENT_COLORS.forEach(a => html.classList.remove(`accent-${a.id}`));
  if (baseTheme !== "default") html.classList.add(`theme-${baseTheme}`);
  html.classList.add(`accent-${accentColor}`);
}

const VALID_BASE_THEMES = new Set<BaseTheme>(["default", "ocean", "forest", "sunset"]);
const VALID_ACCENT_COLORS = new Set<AccentColor>(["emerald", "sky", "violet", "amber", "rose"]);

function loadBaseTheme(): BaseTheme {
  const stored = localStorage.getItem("bk_base_theme");
  return stored && VALID_BASE_THEMES.has(stored as BaseTheme)
    ? (stored as BaseTheme)
    : "default";
}

function loadAccentColor(): AccentColor {
  const stored = localStorage.getItem("bk_accent_color");
  return stored && VALID_ACCENT_COLORS.has(stored as AccentColor)
    ? (stored as AccentColor)
    : "emerald";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>(loadBaseTheme);
  const [accentColor, setAccentColorState] = useState<AccentColor>(loadAccentColor);

  useLayoutEffect(() => {
    applyClasses(baseTheme, accentColor);
  }, [baseTheme, accentColor]);

  const setBaseTheme = (t: BaseTheme) => {
    setBaseThemeState(t);
    localStorage.setItem("bk_base_theme", t);
  };

  const setAccentColor = (a: AccentColor) => {
    setAccentColorState(a);
    localStorage.setItem("bk_accent_color", a);
  };

  return (
    <AppThemeContext.Provider value={{ baseTheme, accentColor, setBaseTheme, setAccentColor }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
