import { memo, MouseEvent, useCallback, useMemo } from 'react';
import { shuffleArray } from '@/shared/utils/common';
import './TagList.scss';

interface TagListProps {
  tags: string[];
  selected: string;
  onChangeTag: (tag: string) => void;
}

const TagList = ({ tags, selected, onChangeTag }: TagListProps) => {
  // region [Hooks]

  const randomTags = useMemo(() => ['전체'].concat(shuffleArray(tags)), [tags]);

  // 태그를 3줄로 나누기
  const tagGroups = useMemo(() => {
    return randomTags.reduce<string[][]>(
      (acc, tag, index) => {
        acc[index % 3].push(tag);
        return acc;
      },
      [[], [], []] // 3개의 빈 배열 생성
    );
  }, [randomTags]);

  // endregion

  // region [Events]

  const onClickTag = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onChangeTag((e.target as HTMLButtonElement).dataset.tag || '전체');
    },
    [onChangeTag]
  );

  // endregion

  // region [Privates]

  const tagItemActive = useCallback(
    (currentTag: string) => (currentTag === selected ? ' active' : ''),
    [selected]
  );

  // endregion

  return (
    <div className="tag-list">
      {tagGroups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={groupIndex} className="tag-list__item">
          {group.map((tag) => (
            <button key={tag} type="button" className={`tag-list__item__tag${tagItemActive(tag)}`}
              data-tag={tag} onClick={onClickTag}>
              {tag}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default memo(TagList);
