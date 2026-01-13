import { memo, MouseEvent, useCallback, useMemo } from 'react';

interface TagListProps {
  tags: string[];
  selected: string;
  onChangeTag: (tag: string) => void;
}

const TagList = ({ tags, selected, onChangeTag }: TagListProps) => {

  // region [Hooks]
  const tagGroups = useMemo(() => {
    return tags.reduce<string[][]>(
      (acc, tag, index) => {
        acc[index % 3].push(tag);
        return acc;
      },
      [[], [], []]
    );
  }, [tags]);
  // endregion

  // region [Events]
  const onClickTag = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    onChangeTag(e.currentTarget.dataset.tag || '전체');
  }, [onChangeTag]);
  // endregion

  // region [Privates]
  const classNames = (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" ");
  // endregion

  return (
    <div className="relative flex flex-col gap-1.5 py-2 px-4 pb-4 -mx-2 overflow-x-auto no-scrollbar">
      {tagGroups.map((group, groupIndex) => (
        <div key={`tag-group-${groupIndex}`} className="flex flex-nowrap justify-start gap-1.5 w-full">
          {group.map((tag) => (
            <button
              key={tag}
              type="button"
              data-tag={tag}
              onClick={onClickTag}
              className={classNames(
                "flex justify-center items-center px-[10px] py-1 border rounded-2xl whitespace-nowrap text-sm transition-colors",
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