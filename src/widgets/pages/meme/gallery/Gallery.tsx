import { memo, useMemo } from "react";
import { LazyImage } from "@/widgets";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import "./Gallery.scss";


interface GalleryProps {
  images: MemeImageResponseData[];
  selected: string;
}


const Gallery = ({ images, selected }: GalleryProps) => {

  // region [Hooks]

  const filterImages = useMemo(() => {
    if (selected === '전체') {
      return images;
    }
    return images.filter(item => item.tags.includes(selected));
  },[images, selected]);

  // endregion


  // region [Life Cycles]
  // endregion

  return (
    <div className="gallery">
      <div className="gallery__column">
        {filterImages.filter((_, index) => index % 2 === 0).map(({src, tags}) => (
          <LazyImage key={src.slice(0, -5)} src={src} alt={src.slice(0, -5)} tags={tags} className="gallery__image" />
        ))}
      </div>
      <div className="gallery__column">
        {filterImages.filter((_, index) => index % 2 !== 0).map(({src, tags}) => (
          <LazyImage key={src.slice(0, -5)} src={src} alt={src.slice(0, -5)} tags={tags} className="gallery__image" />
        ))}
      </div>
    </div>
  );
};

export default memo(Gallery);
