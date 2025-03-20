import { memo, MouseEvent, useCallback, useMemo } from "react";
import { shuffleArray } from "@/shared/utils/common";
import "./TagList.scss";

interface TagListProps {
  tags: string[];
  selected: string;
  onChangeTag: (tag: string) => void;
}


const TagList = ({ tags, selected, onChangeTag }: TagListProps) => {


  // region [Hooks]

  const randomTags = useMemo(() => ["전체"].concat(shuffleArray(tags)), [tags]);

  // endregion


  // region [Events]

  const onClickTag = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    onChangeTag((e.target as HTMLButtonElement).dataset.tag || "전체");
  }, [onChangeTag]);

  // endregion


  // region [Privates]

  const tagItemActive = useCallback((currentTag: string) => currentTag === selected ? " active" : "", [selected]);

  // endregion


  return (
    <div className="tag-list">
      <div className="tag-list__item">
        {randomTags.filter((_, index) => index % 2 === 0).map((tag) => (
          <button key={tag} type="button" className={`tag-list__item__tag${tagItemActive(tag)}`} data-tag={tag} onClick={onClickTag}>
            {tag}
          </button>
        ))}
      </div>
      <div className="tag-list__item">
        {randomTags.filter((_, index) => index % 2 !== 0).map((tag) => (
          <button key={tag} type="button" className={`tag-list__item__tag${tagItemActive(tag)}`} data-tag={tag} onClick={onClickTag}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(TagList);
