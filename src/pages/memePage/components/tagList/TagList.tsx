import { memo, MouseEvent, useCallback, useMemo } from 'react';
import { shuffleArray } from '@/shared/utils/common';

interface TagListProps {
  tags: string[];
  selected: string;
  onChangeTag: (tag: string) => void;
}

const TagList = ({ tags, selected, onChangeTag }: TagListProps) => {
  // region [Hooks]
  const randomTags = useMemo(() => ['전체'].concat(shuffleArray(tags)), [tags]);

  const tagGroups = useMemo(() => {
    return randomTags.reduce<string[][]>(
      (acc, tag, index) => {
        acc[index % 3].push(tag);
        return acc;
      },
      [[], [], []]
    );
  }, [randomTags]);
  // endregion

  // region [Events]
  const onClickTag = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onChangeTag(e.currentTarget.dataset.tag || '전체');
    },
    [onChangeTag]
  );
  // endregion


  const classNames = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");

  return (
    <div className="relative flex flex-col gap-1.5 py-2 px-4 -mx-2 overflow-x-auto no-scrollbar">
      {tagGroups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={`tag-group-${groupIndex}`} className="flex flex-nowrap justify-start gap-1.5 w-full">
          {group.map((tag) => (
            <button
              key={tag}
              type="button"
              data-tag={tag}
              onClick={onClickTag}
              className={classNames(
                "flex justify-center items-center px-[10px] py-1 border rounded-2xl whitespace-nowrap text-sm transition-colors",
                // Active 상태 분기
                tag === selected
                  ? "border-[#f7931a] bg-[#f7931a] text-white"
                  : "bg-neutral-100 border-border text-current dark:bg-neutral-600"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const MemoizedTagList = memo(TagList)
MemoizedTagList.displayName = "TagList";

export default MemoizedTagList;