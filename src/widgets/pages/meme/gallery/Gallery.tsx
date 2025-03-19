import { memo } from "react";
import { LazyImage } from "@/widgets";
import { MemeResponseImageData } from "@/shared/api/memeImageData";
import "./Gallery.scss";


const Gallery = ({ images }: { images: MemeResponseImageData[] }) => {

  // region [Hooks]
  // endregion

  console.log(images);
  // region [Life Cycles]
  // endregion

  return (
    <div className="gallery">
        <div className="gallery__column">
          {images.filter((_, index) => index % 2 === 0).map((image) => (
            <LazyImage key={image.alt} src={image.src} alt={image.alt} tags={image.tags} className="gallery__image" />
          ))}
        </div>
        <div className="gallery__column">
          {images.filter((_, index) => index % 2 !== 0).map((image) => (
            <LazyImage key={image.alt} src={image.src} alt={image.alt} tags={image.tags} className="gallery__image" />
          ))}
        </div>
    </div>
  );
};

export default memo(Gallery);
