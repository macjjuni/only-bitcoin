'use client';

import { memo, useCallback, useMemo, useState } from "react";
import { LazyImage } from "@/components";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import { env } from "@/shared/config/env";
import ImageModal from "../imageModal/ImageModal";

interface GalleryProps {
  images: MemeImageResponseData[];
  selected: string;
}

const IMAGE_BASE_URL = env.NEXT_PUBLIC_MEME_IMAGE_URL;


const Gallery = ({ images, selected }: GalleryProps) => {

  // region [Hooks]
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredImages = useMemo(() => {
    if (selected === "전체") return images;
    return images.filter(item => item.tags.includes(selected));
  }, [images, selected]);
  // endregion


  // region [Privates]
  const getImageUrl = useCallback((src: string) => `${IMAGE_BASE_URL}/image/${src}.webp`, []);

  const closeModal = useCallback(() => {
    setSelectedImage(null);
  }, []);
  // endregion


  // region [Events]
  const onClickImage = useCallback((src: string) => {
    setSelectedImage(src);
  }, []);
  // endregion

  return (
    <>
      <div className="columns-2 sm:columns-3 gap-3 pb-2">
        {filteredImages.map(({ src }) => {
          const imageUrl = getImageUrl(src);
          return (
            <div
              key={src}
              className="mb-3 break-inside-avoid cursor-pointer group"
              onClick={() => onClickImage(imageUrl)}
            >
              <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral-200 dark:border-neutral-700">
                <LazyImage
                  src={imageUrl}
                  alt={src}
                  className="w-full h-auto transform group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <ImageModal
          src={selectedImage}
          onClose={closeModal}
        />
      )}
    </>
  );
};

const MemoizedGallery = memo(Gallery);
MemoizedGallery.displayName = "Gallery";

export default MemoizedGallery;