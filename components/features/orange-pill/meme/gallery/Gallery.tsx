'use client';

import { memo, useCallback, useMemo } from "react";
import { LazyImage } from "@/components";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import { env } from "@/shared/config/env";

interface GalleryProps {
  images: MemeImageResponseData[];
  selected: string;
}

const IMAGE_BASE_URL = env.NEXT_PUBLIC_MEME_IMAGE_URL;


const Gallery = ({ images, selected }: GalleryProps) => {

  // region [Hooks]
  const filteredImages = useMemo(() => {
    if (selected === "전체") return images;
    return images.filter(item => item.tags.includes(selected));
  }, [images, selected]);

  const [leftCol, rightCol] = useMemo(() => {
    const left: MemeImageResponseData[] = [];
    const right: MemeImageResponseData[] = [];
    
    filteredImages.forEach((img, index) => {
      if (index % 2 === 0) left.push(img);
      else right.push(img);
    });
    
    return [left, right];
  }, [filteredImages]);
  // endregion

  // region [Events]
  const getImageUrl = useCallback((src: string) => `${IMAGE_BASE_URL}/image/${src}.webp`, []);
  // endregion

  return (
    <div className="flex gap-4 px-2 pb-3 justify-center">
      {/* Left Column */}
      <div className="flex-1 flex flex-col gap-4 max-w-[237px] w-[calc((100dvw-48px)/2)]">
        {leftCol.map(({ src }) => (
          <LazyImage
            key={src}
            src={getImageUrl(src)}
            alt={src}
            className="w-full border-[0.5px] border-border"
          />
        ))}
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col gap-4 max-w-[237px] w-[calc((100dvw-48px)/2)]">
        {rightCol.map(({ src }) => (
          <LazyImage
            key={src}
            src={getImageUrl(src)}
            alt={src}
            className="w-full border-[0.5px] border-border"
          />
        ))}
      </div>
    </div>
  );
};

const MemoizedGallery = memo(Gallery);
MemoizedGallery.displayName = "Gallery";

export default MemoizedGallery;