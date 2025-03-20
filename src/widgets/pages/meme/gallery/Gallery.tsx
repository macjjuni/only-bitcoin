import { memo, useMemo } from "react";
import { LazyImage } from "@/widgets";
import { MemeResponseImageData } from "@/shared/api/memeImageData";
import "./Gallery.scss";


interface GalleryProps {
  images: MemeResponseImageData[];
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
        {filterImages.filter((_, index) => index % 2 === 0).map((image) => (
          <LazyImage key={image.alt} src={image.src} alt={image.alt} tags={image.tags} className="gallery__image" />
        ))}
      </div>
      <div className="gallery__column">
        {filterImages.filter((_, index) => index % 2 !== 0).map((image) => (
          <LazyImage key={image.alt} src={image.src} alt={image.alt} tags={image.tags} className="gallery__image" />
        ))}
      </div>
    </div>
  );
};

export default memo(Gallery);
