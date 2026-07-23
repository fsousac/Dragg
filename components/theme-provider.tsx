"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
  attribute?: "class";
  children: React.ReactNode;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
};

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  theme: Theme;
};

const storageKey = "dragg-theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function applyThemeToDocument({
  nextTheme,
  enableSystem,
  disableTransitionOnChange,
  setResolvedTheme,
}: {
  nextTheme: Theme;
  enableSystem: boolean;
  disableTransitionOnChange: boolean;
  setResolvedTheme: (theme: ResolvedTheme) => void;
}) {
  const nextResolvedTheme =
    nextTheme === "system" && enableSystem ? getSystemTheme() : nextTheme;

  setResolvedTheme(nextResolvedTheme as ResolvedTheme);

  if (disableTransitionOnChange) {
    document.documentElement.classList.add("disable-theme-transitions");
    window.setTimeout(() => {
      document.documentElement.classList.remove("disable-theme-transitions");
    }, 0);
  }

  document.documentElement.classList.toggle(
    "dark",
    nextResolvedTheme === "dark",
  );
  document.documentElement.style.colorScheme = nextResolvedTheme;
}

function useStoredThemeSync(setThemeState: (theme: Theme) => void) {
  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;

    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "system"
    ) {
      setThemeState(storedTheme);
    }
  }, [setThemeState]);
}

function useSystemThemeSync({
  theme,
  enableSystem,
  disableTransitionOnChange,
  setResolvedTheme,
}: {
  theme: Theme;
  enableSystem: boolean;
  disableTransitionOnChange: boolean;
  setResolvedTheme: (theme: ResolvedTheme) => void;
}) {
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    applyThemeToDocument({ nextTheme: theme, enableSystem, disableTransitionOnChange, setResolvedTheme });

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyThemeToDocument({ nextTheme: theme, enableSystem, disableTransitionOnChange, setResolvedTheme });
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [disableTransitionOnChange, enableSystem, theme, setResolvedTheme]);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("dark");

  useStoredThemeSync(setThemeState);
  useSystemThemeSync({ theme, enableSystem, disableTransitionOnChange, setResolvedTheme });

  const value = React.useMemo(
    () => ({
      resolvedTheme,
      setTheme(nextTheme: Theme) {
        window.localStorage.setItem(storageKey, nextTheme);
        setThemeState(nextTheme);
      },
      theme,
    }),
    [resolvedTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
