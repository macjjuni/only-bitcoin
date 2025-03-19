import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import "./LazyImage.scss";

interface LazyImageProps extends ComponentBaseTypes {
  src: string;
  alt?: string;
  tags: string[];
}

const LazyImage = ({ src, alt = "", tags, className = "" }: LazyImageProps) => {

  // region [Hooks]

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // endregion


  // region [Styles]

  const rootClass = useMemo(() => {
    const clazz = [];

    if (className) { clazz.push(className); }
    if (isLoaded) { clazz.push('lazy-image--loaded'); }

    return clazz.join(' ');
  }, [className, isLoaded]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // endregion

  return (
    <div ref={imgRef} className={`lazy-image ${rootClass}`}>
      {!isLoaded && <div className="lazy-image__skeleton" />}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={`lazy-image__img ${isLoaded ? "lazy-image__img--loaded" : "lazy-image__img--loading"}`}
          onLoad={() => setIsLoaded(true)}
          data-tag={tags.join(", ")}
        />
      )}
    </div>
  );
};

export default memo(LazyImage);