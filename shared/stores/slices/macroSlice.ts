import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export interface MacroSlice {
  macroSequence: number[];
  setMacroSequence: (macroSequence: number[]) => void;
}


export const createMacroSlice: StateCreator<StoreType, [], [], MacroSlice> = (set) => ({
  macroSequence: [1, 2, 3, 4],
  setMacroSequence: (macroSequence) => set(() => ({ macroSequence })),
});
