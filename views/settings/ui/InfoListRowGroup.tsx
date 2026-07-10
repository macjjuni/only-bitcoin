"use client";

import { KButton, KIcon, KListGroup, KListRow, KListRowAccordion, kToast } from "kku-ui";
import { clipboardUtil } from "kku-util";
import { CodeXml, QrCode as QrCodeIcon } from "lucide-react";
import { memo, useCallback } from "react";
import { QRCode } from "react-qrcode-logo";
import { sourceOptions } from "@/shared/constants/setting";

const LIGHTNING_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS || "";
const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL || "https://x.com/a7w2en7z_";
const DONATE_VALUE = "donation" as const;

/**
 * 후원 행을 찾기 위한 클래스 훅.
 *
 * KListRowAccordion 은 ref 도 id 도 받지 않고 className 만 받는다. 이 행을 div 로
 * 감싸 ref 를 달면 그 행이 wrapper 의 유일한 자식이 되어, kku-ui 가 코너와 구분선을
 * 정할 때 쓰는 first:/last: 가 둘 다 걸린다(위아래가 모두 둥글어지고 아래 행의 위쪽
 * 라운딩이 사라진다). 그래서 감싸지 않고 클래스로 찾는다.
 */
const DONATION_ROW_CLASS = "donation-row";

const InfoListRowGroup = () => {
  // region [Privates]
  const onScrollDown = useCallback(() => {
    setTimeout(() => {
      document
        .querySelector(`.${DONATION_ROW_CLASS}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  const onRouteToFeedback = useCallback(() => {
    window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer");
  }, []);
  // endregion

  // region [Events]
  const onChangeDonationRow = useCallback(
    (val: string) => {
      if (val === DONATE_VALUE) {
        onScrollDown();
      }
    },
    [onScrollDown],
  );

  const onClickCopyAddress = useCallback(async () => {
    const isCopySuccess = await clipboardUtil.copyToClipboard(LIGHTNING_ADDRESS);
    if (isCopySuccess) {
      kToast.success("주소 복사 완료! 👍");
    }
  }, []);
  // endregion

  return (
    <KListGroup header="정보">
      <KListRowAccordion
        className={`glass-surface ${DONATION_ROW_CLASS}`}
        value={DONATE_VALUE}
        label="개발자 후원"
        icon={<QrCodeIcon />}
        onValueChange={onChangeDonationRow}
      >
        <div className="flex flex-col justify-center items-center gap-4 pb-4">
          <QRCode
            value={LIGHTNING_ADDRESS}
            size={264}
            logoImage="https://www.walletofsatoshi.com/assets/images/icon.png"
            logoPadding={2}
          />
          <KButton variant="primary" onClick={onClickCopyAddress}>
            라이트닝 주소 복사
          </KButton>
        </div>
      </KListRowAccordion>

      <KListRowAccordion
        className="glass-surface"
        value="resource"
        label="리소스 출처"
        icon={<CodeXml />}
      >
        <ul>
          {sourceOptions.map(({ label, value }) => (
            <li key={label} className="text-sm text-current tracking-tighter">
              - {label}: {value}
            </li>
          ))}
        </ul>
      </KListRowAccordion>
      <KListRow
        className="glass-surface"
        icon={<KIcon icon="x_logo" size={24} />}
        label="피드백"
        onClick={onRouteToFeedback}
      />
      <KListRow
        className="glass-surface"
        icon={<KIcon icon="dev" color="#333" size={24} />}
        label="버전 정보"
        rightElement={
          <span className="text-[17px] text-muted-foreground">
            {process.env.NEXT_PUBLIC_APP_VERSION || "-"}
          </span>
        }
      />
    </KListGroup>
  );
};

const MemoizedInfoListRowGroup = memo(InfoListRowGroup);
MemoizedInfoListRowGroup.displayName = "InfoListRowGroup";

export default MemoizedInfoListRowGroup;
