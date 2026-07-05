import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export interface ThemeSlice {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}


export const createThemeSlice: StateCreator<StoreType, [], [], ThemeSlice> = (set) => ({
  theme: "light",
  setTheme: (theme) => set((store) => {
    // DOM 조작을 통해 스타일 즉시 반영
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { ...store, theme };
  }),
});
