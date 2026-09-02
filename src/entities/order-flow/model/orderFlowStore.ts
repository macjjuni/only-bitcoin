import { create } from "zustand";
import { createEmptyOrderFlowSnapshot } from "./snapshot";
import type { OrderFlowSnapshot } from "./types";

interface OrderFlowStoreType {
  snapshot: OrderFlowSnapshot;
  setSnapshot: (snapshot: OrderFlowSnapshot) => void;
  resetSnapshot: () => void;
}

/**
 * HUD 전용 저빈도 스토어.
 *
 * 체결은 초당 수백 건까지 오지만 이 스토어는 커밋 주기(초당 4~10회)에만 갱신된다.
 * 캔버스는 이 스토어를 거치지 않고 커넥터를 직접 읽으므로, 렌더 트리와 고빈도 데이터가
 * 서로를 붙잡지 않는다. 시세 스토어와 달리 영속화하지 않는다. 지난 값은 의미가 없다.
 */
const useOrderFlowStore = create<OrderFlowStoreType>()((set) => ({
  snapshot: createEmptyOrderFlowSnapshot(),
  setSnapshot: (snapshot) => set({ snapshot }),
  resetSnapshot: () => set({ snapshot: createEmptyOrderFlowSnapshot() }),
}));

export default useOrderFlowStore;
