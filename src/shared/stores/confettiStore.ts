import { create } from "zustand";

interface ConfettiStore {
  isActive: boolean;
  show: () => void;
  hide: () => void;
}

const useConfettiStore = create<ConfettiStore>((set) => ({
  isActive: false,
  show: () => set({ isActive: true }),
  hide: () => set({ isActive: false }),
}));

export default useConfettiStore;
