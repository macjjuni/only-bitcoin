import { memo, useCallback, useMemo } from "react";
import { LazyImage } from "@/components";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";

interface GalleryProps {
  images: MemeImageResponseData[];
  selected: string;
}

const imageUrl = import.meta.env.VITE_MEME_IMAGE_URL;

const Gallery = ({ images, selected }: GalleryProps) => {

  // region [Hooks]
  const filterImages = useMemo(() => {
    if (selected === "전체") return images;
    return images.filter(item => item.tags.includes(selected));
  }, [images, selected]);
  // endregion

  // region [Privates]
  const getImageUrl = useCallback((src: string) => `${imageUrl}/image/${src}.webp`, []);
  // endregion


  return (
    <div className="flex gap-4 px-2 pb-3 justify-center z-[-1]">
      <div className="flex-1 flex flex-col gap-4 max-w-[237px] w-[calc((100dvw-48px)/2)]">
        {filterImages
          .filter((_, index) => index % 2 === 0)
          .map(({ src }) => (
            <LazyImage
              key={src}
              src={getImageUrl(src)}
              alt={src}
              className="w-full border-[0.5px] border-border"
            />
          ))}
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-[237px] w-[calc((100dvw-48px)/2)]">
        {filterImages
          .filter((_, index) => index % 2 !== 0)
          .map(({ src }) => (
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