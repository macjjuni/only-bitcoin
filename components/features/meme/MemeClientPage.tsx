'use client'

import { useCallback, useMemo, useState } from 'react'
import { Gallery, TagList } from '@/components/features/orange-pill/meme'
import { PageLayout } from '@/layouts'
import { MemeImageResponseData } from '@/shared/types/api/memeImage'

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

export default MemeClientPage