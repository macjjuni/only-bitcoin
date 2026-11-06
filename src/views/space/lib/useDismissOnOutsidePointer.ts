import { type RefObject, useEffect, useRef } from "react";

/**
 * 열린 패널 바깥을 누르면 닫음.
 *
 * 누르는 순간(`pointerdown`) 봄. 막지 않아서 3D 화면을 눌러 시야를 돌리려던 동작은
 * 그대로 이어짐. 패널을 여닫는 버튼은 `ignoredIds` 로 빼야 함. 안 빼면 열린 상태에서
 * 그 버튼을 눌렀을 때 "바깥이라 닫힘 → 버튼 클릭으로 다시 열림" 이 되어 안 닫힘.
 *
 * 캡처 단계에서 들어 다른 요소가 전파를 막아도(조이스틱 등) 놓치지 않음.
 */
export const useDismissOnOutsidePointer = (
  panelRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
  ignoredIds: readonly string[] = [],
): void => {
  // 렌더마다 바뀌는 콜백·목록 때문에 리스너를 다시 걸지 않게 ref 로 들고 있음.
  const onDismissRef = useRef(onDismiss);
  const ignoredIdsRef = useRef(ignoredIds);
  onDismissRef.current = onDismiss;
  ignoredIdsRef.current = ignoredIds;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDownDocument = (event: PointerEvent): void => {
      const target = event.target;

      if (!(target instanceof Node) || panelRef.current?.contains(target)) {
        return;
      }
      const isIgnored = ignoredIdsRef.current.some((id) =>
        document.getElementById(id)?.contains(target),
      );

      if (!isIgnored) {
        onDismissRef.current();
      }
    };

    document.addEventListener("pointerdown", onPointerDownDocument, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDownDocument, true);
    };
  }, [isOpen, panelRef]);
};
