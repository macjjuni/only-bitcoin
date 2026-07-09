'use client'

import { useCallback, useMemo, useState } from 'react'
import Gallery from './Gallery'
import TagList from './TagList'
import { PageLayout } from '@/layouts'
import { MemeImageResponseData } from '@/entities/meme'

interface MemeClientPageProps {
  initialImages: MemeImageResponseData[];
}

const MemeClientPage = ({ initialImages }: MemeClientPageProps) => {

  // region [Hooks]
  const [selectedTag, setSelectedTag] = useState<string>('전체')
  
  const tags = useMemo(() => ['전체', ...new Set(initialImages.flatMap(i => i.tags))], [initialImages]);
  // endregion

  // region [Events]
  const onChangeTag = useCallback((tag: string) => {
    setSelectedTag(tag)
  }, [])
  // endregion

  return (
    <PageLayout>
      <TagList 
        tags={tags} 
        selected={selectedTag} 
        onChangeTag={onChangeTag}
      />
      <Gallery 
        images={initialImages} 
        selected={selectedTag}
      />
    </PageLayout>
  )
}

export default MemeClientPage;
