import type { StateCreator } from "zustand";

export interface MacroSlice {
  macroSequence: number[];
  setMacroSequence: (macroSequence: number[]) => void;
}

export const createMacroSlice: StateCreator<MacroSlice> = (set) => ({
  macroSequence: [1, 2, 3, 4],
  setMacroSequence: (macroSequence) => set(() => ({ macroSequence })),
});
