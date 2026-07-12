"use client";

import { KIcon, KSwitch } from "kku-ui";
import { Moon } from "lucide-react";
import { memo } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import { AnimationIcon, ListGroup, ListRow } from "@/shared/ui";

const StyleListRowGroup = () => {
  // region [Hooks]
  const isCountUp = useSettingStore((state) => state.setting.isCountUp);
  const setIsCountUp = useSettingStore((state) => state.setIsCountUp);

  const isBackgroundImg = useSettingStore((state) => state.setting.isBackgroundImg);
  const setIsBackgroundImg = useSettingStore((state) => state.setIsBackgroundImg);

  const isDark = useSettingStore((state) => state.theme) === "dark";
  const setTheme = useSettingStore((state) => state.setTheme);
  // endregion

  return (
    <ListGroup header="스타일 및 화면 설정">
      <ListRow
        icon={<Moon />}
        label="다크모드"
        rightElement={
          <KSwitch checked={isDark} onCheckedChange={(val) => setTheme(val ? "dark" : "light")} />
        }
      />
      <ListRow
        className="dark:text-gray-700"
        icon={<KIcon icon="bitcoin_square" size={24} color="currentColor" />}
        label="배경 이미지"
        rightElement={<KSwitch checked={isBackgroundImg} onCheckedChange={setIsBackgroundImg} />}
      />
      <ListRow
        icon={<AnimationIcon size={24} />}
        label="카운트 업 애니메이션"
        rightElement={<KSwitch checked={isCountUp} onCheckedChange={setIsCountUp} />}
      />
    </ListGroup>
  );
};

const MemoizedStyleListRowGroup = memo(StyleListRowGroup);
MemoizedStyleListRowGroup.displayName = "StyleListRowGroup";

export default MemoizedStyleListRowGroup;
