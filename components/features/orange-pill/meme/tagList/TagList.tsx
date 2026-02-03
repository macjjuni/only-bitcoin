import { memo, MouseEvent, useCallback, useMemo } from 'react';

interface TagListProps {
  tags: string[];
  selected: string;
  onChangeTag: (tag: string) => void;
}

const TagList = ({ tags, selected, onChangeTag }: TagListProps) => {

  // region [Hooks]
  const tagRows = useMemo(() => {
    const firstRow: string[] = [];
    const secondRow: string[] = [];
    const thirdRow: string[] = [];

    tags.forEach((tag, index) => {
      if (index % 3 === 0) firstRow.push(tag);
      else if (index % 3 === 1) secondRow.push(tag);
      else thirdRow.push(tag);
    });

    return [firstRow, secondRow, thirdRow];
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
    <div className="-mx-2 py-2 px-2 pb-4 overflow-x-auto no-scrollbar">
      <div className="flex flex-col gap-2 w-max">
        {tagRows.map((row, rowIndex) => (
          <div key={`tag-row-${rowIndex}`} className="flex gap-2">
            {row.map((tag) => (
              <button
                key={tag}
                type="button"
                data-tag={tag}
                onClick={onClickTag}
                className={classNames(
                  "px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap",
                  tag === selected
                    ? "bg-gradient-to-r from-[#f7931a] to-[#ff8c00] text-white shadow-md"
                    : "bg-white border border-neutral-300 text-neutral-700 hover:border-[#f7931a] hover:text-[#f7931a] dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-[#f7931a]"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const MemoizedTagList = memo(TagList)
MemoizedTagList.displayName = "TagList";

export default MemoizedTagList;