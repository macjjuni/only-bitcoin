import { memo } from "react";
import { KIcon, KListGroup, KListRow, KSwitch } from "kku-ui";
import { Moon } from "lucide-react";
import { AnimationIcon } from "@/components";
import useStore from "@/shared/stores/store";


const StyleListRowGroup = () => {

  // region [Hooks]
  const isCountUp = useStore(state => state.setting.isCountUp);
  const setIsCountUp = useStore(state => state.setIsCountUp);

  const isBackgroundImg = useStore(state => state.setting.isBackgroundImg);
  const setIsBackgroundImg = useStore(state => state.setIsBackgroundImg);

  const isDark = useStore(state => state.theme) === "dark";
  const setTheme = useStore(state => state.setTheme);
  // endregion


  return (
    <KListGroup header="스타일 및 화면 설정">
      <KListRow icon={<Moon />} label="다크모드"
                rightElement={<KSwitch checked={isDark}
                                       onCheckedChange={(val) => setTheme(val ? "dark" : "light")} />} />
      <KListRow icon={<KIcon icon="bitcoin_square" size={24} color="currentColor" />} label="배경 이미지"
                rightElement={<KSwitch checked={isBackgroundImg} onCheckedChange={setIsBackgroundImg} />} />
      <KListRow icon={<AnimationIcon size={24} />} label="카운트 업 애니메이션"
                rightElement={<KSwitch checked={isCountUp} onCheckedChange={setIsCountUp} />}
      />
    </KListGroup>
  );
};

const MemoizedStyleListRowGroup = memo(StyleListRowGroup);
MemoizedStyleListRowGroup.displayName = "StyleListRowGroup";

export default MemoizedStyleListRowGroup;
