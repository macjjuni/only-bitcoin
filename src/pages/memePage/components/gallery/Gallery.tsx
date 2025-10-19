import { memo, useCallback, useMemo } from "react";
import { LazyImage } from "../../../../components";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import "./Gallery.scss";


interface GalleryProps {
  images: MemeImageResponseData[];
  selected: string;
}

const imageUrl = import.meta.env.VITE_MEME_IMAGE_URL;


const Gallery = ({ images, selected }: GalleryProps) => {

  // region [Hooks]

  const filterImages = useMemo(() => {
    if (selected === '전체') {
      return images;
    }
    return images.filter(item => item.tags.includes(selected));
  },[images, selected]);

  // endregion


  // region [Privates]

  const getImageUrl = useCallback((src: string) => `${imageUrl}/image/${src}.webp`, [])

  // endregion


  // region [Life Cycles]
  // endregion

  return (
    <div className="gallery">
      <div className="gallery__column">
        {filterImages.filter((_, index) => index % 2 === 0).map(({src, tags}) => (
          <LazyImage key={src} src={getImageUrl(src)} alt={src.slice(0, -5)} tags={tags} className="gallery__image" />
        ))}
      </div>
      <div className="gallery__column">
        {filterImages.filter((_, index) => index % 2 !== 0).map(({src, tags}) => (
          <LazyImage key={src} src={getImageUrl(src)} alt={src} tags={tags} className="gallery__image" />
        ))}
      </div>
    </div>
  );
};

export default memo(Gallery);
