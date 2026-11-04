"use client";

import { kToast } from "kku-ui";
import { clipboardUtil } from "kku-util";
import { Copy, Share2, X } from "lucide-react";
import { type MouseEvent, memo, type ReactNode, useCallback, useEffect, useRef } from "react";
import { env } from "@/shared/config/env";
import { ShareCardQr } from "@/shared/ui";

const SHARE_TITLE_ID = "space-share-title";

/**
 * QR 규격. 후원 모달과 같은 크기로 맞춰 두 창이 나란히 느껴지게 함.
 *
 * 주소가 30자 남짓이라 라이트닝 주소(105자)보다 훨씬 성글다. 가운데 로고를
 * 얹어도 `Q`(25% 복원) 면 넉넉함.
 */
const SHARE_QR_SIZE = 200;
const SHARE_QR_PADDING = 16;
const SHARE_QR_LOGO_EMOJI = "₿";
const SHARE_QR_LOGO_PADDING = 6;

/**
 * 공유할 주소.
 *
 * `window.location.href` 를 쓰지 않는다. 그 값에는 `?stats=1`·`?dummies=50`
 * 같은 개발용 쿼리가 붙어 있을 수 있고, 로컬에서 열었다면 `localhost` 라
 * 받는 사람에게 쓸모가 없다. 배포 주소를 박아 **어디서 눌러도 같은 링크**가
 * 나오게 한다.
 */
const SPACE_SHARE_URL = `${env.NEXT_PUBLIC_URL}/space`;

interface SpaceShareDialogProps {
  onClose: () => void;
}

/**
 * 스페이스 공유 모달.
 *
 * 캔버스 위 전체를 덮어 뒤 조작을 막음. Esc·배경 클릭·닫기 버튼으로 닫힘.
 * 구조와 조작은 `SpaceDonationDialog` 과 같게 맞춤 — 같은 버튼 묶음에서 열리는
 * 창 둘이 서로 다르게 동작하면 혼란스러움.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceShareDialog({ onClose }: SpaceShareDialogProps): ReactNode {
  // region [Hooks]
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // endregion


  // region [Privates]
  const focusCloseButton = useCallback((): void => {
    closeButtonRef.current?.focus();
  }, []);

  /**
   * Esc 는 문서 전체에서 받음. 주소나 빈 곳을 눌러 포커스가 대화상자 밖으로
   * 빠져도 닫히게 함.
   */
  const attachEscapeKey = useCallback((): (() => void) => {
    const onKeyDownDocument = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDownDocument);
    return () => {
      document.removeEventListener("keydown", onKeyDownDocument);
    };
  }, [onClose]);
  // endregion


  // region [Events]
  const onClickBackdrop = useCallback((event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const onClickCopyUrl = useCallback(async (): Promise<void> => {
    const isCopySuccess = await clipboardUtil.copyToClipboard(SPACE_SHARE_URL);
    if (isCopySuccess) {
      kToast.success("주소 복사 완료! 👍");
    }
  }, []);
  // endregion


  // region [Life Cycles]
  useEffect(focusCloseButton, [focusCloseButton]);
  useEffect(attachEscapeKey, [attachEscapeKey]);
  // endregion

  return (
    // 배경 클릭 닫기는 보조 수단임. 키보드는 대화상자의 Esc·닫기 버튼이 맡음.
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClickBackdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={SHARE_TITLE_ID} className="w-full max-w-[300px] rounded-2xl border border-white/10 bg-[#0d1119]/95 p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id={SHARE_TITLE_ID} className="flex items-center gap-1.5 text-sm font-semibold">
            <Share2 size={16} className="text-bitcoin" />
            공유하기
          </h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="공유 창 닫기" className="flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-white/55">
          이 주소를 보내면 같은 공간에서 만날 수 있어요.
        </p>

        {/* 폰으로 찍어 바로 들어올 수 있게 둠. 링크를 옮겨 적을 필요가 없음. */}
        <div className="mt-4 flex justify-center">
          <ShareCardQr id="space-share-qr" value={SPACE_SHARE_URL} size={SHARE_QR_SIZE} padding={SHARE_QR_PADDING} ecLevel="Q" logoEmoji={SHARE_QR_LOGO_EMOJI} logoPadding={SHARE_QR_LOGO_PADDING} />
        </div>

        {/*
          주소를 고를 수 있게 `select-all` 을 검. 복사 버튼이 막히는 환경
          (권한 거부·구형 브라우저)에서 손으로 긁어 복사할 길을 남김.
          `break-all` 이 없으면 긴 주소가 모달을 가로로 밀어냄.
        */}
        <p className="mt-4 select-all break-all rounded-xl bg-white/[0.06] px-3 py-2.5 text-center font-mono text-xs leading-relaxed text-white/85">
          {SPACE_SHARE_URL}
        </p>

        <button type="button" onClick={onClickCopyUrl} className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-bitcoin text-xs font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          <Copy size={14} />
          주소 복사
        </button>
      </div>
    </div>
  );
}

const MemoizedSpaceShareDialog = memo(SpaceShareDialog);
MemoizedSpaceShareDialog.displayName = "SpaceShareDialog";

export default MemoizedSpaceShareDialog;
