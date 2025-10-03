import { forwardRef, memo, RefObject, useRef } from "react";
import html2canvas from "html2canvas";


const PipWindow = forwardRef<HTMLDivElement>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const openPip = async () => {
    const target = ref as RefObject<HTMLDivElement>; // ref 타입 단언
    if (!target?.current) return;

    const canvas = await html2canvas(target.current, {
      useCORS: true,
      scale: 2,
      allowTaint: true,      // 오염 허용
      backgroundColor: null, // 투명 배경
    });
    const stream = canvas.captureStream();

    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();

    try {
      await videoRef.current.requestPictureInPicture();
    } catch (err) {
      console.error("PIP 실행 실패:", err);
    }
  };

  return (
    <div>
      <button type="button" onClick={openPip} style={{ color: "#fff" }}>
        PIP 열기
      </button>
      <video ref={videoRef} style={{ display: "none" }} muted />
    </div>
  );
});

PipWindow.displayName = "PipWindow";

export default memo(PipWindow);
