import { useCallback, useState, memo } from "react";
import { useBearStore } from "@/store";
import FearGreedDialog from "@/components/modal/FearGreedDialog";
import ChipItem from "@/components/atom/chipItem/chipItem";

const FearGreed = () => {
  // 👇 BTC시세 업데이트 마다 렌더링 방지하기 위해 스토어에서 할당하지 않고 개별 State로 관리
  const [isModal, setModal] = useState(false);
  const fearGreed = useBearStore((state) => state.fearGreed);

  const openFearGreed = useCallback(() => {
    setModal(true);
  }, []);

  return (
    <>
      <ChipItem label="F&GI" value={fearGreed.value} onClick={openFearGreed} />
      <FearGreedDialog open={isModal} setOpen={setModal} />
    </>
  );
};

export default memo(FearGreed);
