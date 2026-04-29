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

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("dark");

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;

    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "system"
    ) {
      setThemeState(storedTheme);
    }
  }, []);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(nextTheme: Theme) {
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

    applyTheme(theme);

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme(theme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [disableTransitionOnChange, enableSystem, theme]);

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
