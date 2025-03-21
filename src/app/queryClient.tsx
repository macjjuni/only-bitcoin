import { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10분 동안 데이터가 유효하다고 간주
      refetchOnWindowFocus: false, // 창이 다시 포커스될 때 자동 요청 방지
      refetchOnReconnect: false, // 네트워크 재연결 시 자동 요청 방지
      refetchOnMount: false // 컴포넌트 마운트 시 자동 요청 방지
    }
  }
});

persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.localStorage }),
});
