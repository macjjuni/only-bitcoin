'use client';

import { useCallback, useMemo, useState } from 'react'
import { Gallery, TagList } from '@/app/orange-pill/meme/components'
import { useMemeImages } from '@/shared/api'
import { PageLayout } from '@/layouts'


const Page = () => {

  // region [Hooks]
  const { images } = useMemeImages()
  const [selectedTag, setSelectedTag] = useState<string>('전체')
  const tags = useMemo(() => [...new Set(images.flatMap(image => image.tags))], [images])
  // endregion

  // region [Events]
  const onChangeTag = useCallback((tag: string) => {
    setSelectedTag(tag)
  }, [])
  // endregion


  return (
    <PageLayout>
      <TagList tags={tags} selected={selectedTag} onChangeTag={onChangeTag}/>
      <Gallery images={images} selected={selectedTag}/>
    </PageLayout>
  )
}

export default Page
