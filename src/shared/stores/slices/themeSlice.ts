import type { StateCreator } from "zustand";

export interface ThemeSlice {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const createThemeSlice: StateCreator<ThemeSlice> = (set) => ({
  theme: "light",
  setTheme: (theme) =>
    set((store) => {
      // DOM 조작을 통해 스타일 즉시 반영
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { ...store, theme };
    }),
});
