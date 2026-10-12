export type Theme = "light" | "dark";

export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const getStoredTheme = (): Theme | null => (localStorage.getItem("theme") as Theme | null) ?? null;

export const getSystemTheme = (): Theme => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const toggleTheme = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next: Theme = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("theme", next);
};
