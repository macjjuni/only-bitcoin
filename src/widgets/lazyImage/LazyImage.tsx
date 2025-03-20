import { memo, SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import "./LazyImage.scss";

interface LazyImageProps extends ComponentBaseTypes {
  src: string;
  alt?: string;
  tags?: string[];
  onClick?: () => void;
}

interface WrapperSizeTypes {
  width: string;
  height: string;
}


const LazyImage = ({ src, alt = "", tags, className = "", onClick }: LazyImageProps) => {

  // region [Hooks]

  const imgRef = useRef<HTMLImageElement | null>(null);
  const rootRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [wrapperSize, setWrapperSize] = useState<WrapperSizeTypes>({ width: 'auto', height: 'auto' });

  // endregion


  // region [Styles]

  const rootClass = useMemo(() => {
    const clazz = [];

    if (className) { clazz.push(className); }
    if (isLoaded) { clazz.push("lazy-image--loaded"); }

    return clazz.join(" ");
  }, [className, isLoaded]);

  // endregion


  // region [Privates]


  // endregion


  // region [Events]

  const onClickImage = useCallback(() => {
    onClick?.();
  }, []);

  const onLoadedImage = useCallback((e: SyntheticEvent<HTMLImageElement>) => {

    const { width, height } = e.currentTarget;

    setWrapperSize({width: `${width}px`, height: `${height}px`});
    setIsLoaded(true)
  }, []);

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
    <div ref={imgRef} className={`lazy-image ${rootClass}`} style={wrapperSize}>
      {!isLoaded && <div className="lazy-image__skeleton" />}
      {isVisible && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions
        <img ref={rootRef} src={src} alt={alt}
             className={`lazy-image__img ${isLoaded ? "lazy-image__img--loaded" : "lazy-image__img--loading"}`}
             onClick={onClickImage}
             onLoad={onLoadedImage}
             data-tag={tags?.join(", ")}/>
      )}
    </div>
  );
};

export default memo(LazyImage);
