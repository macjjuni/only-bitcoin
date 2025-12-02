import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import "./LazyImage.scss";

interface LazyImageProps extends ComponentBaseTypes {
  src: string;
  alt?: string;
  tags?: string[];
  width?: number;
  height?: number;
}

const MAX_RETRY_COUNT = 3;

const LazyImage = ({ src, alt = "", tags, className = "", width, height }: LazyImageProps) => {

  // region [Hooks]

  const imgRef = useRef<HTMLImageElement | null>(null);
  const rootRef = useRef<HTMLImageElement | null>(null);
  const retryCountRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // endregion


  // region [Styles]

  const rootClass = useMemo(() => {
    const clazz = [];

    if (className) {
      clazz.push(className);
    }
    if (isLoaded) {
      clazz.push("lazy-image--loaded");
    }
    if (isError) {
      clazz.push("lazy-image--error");
    }

    return clazz.join(" ");
  }, [className, isLoaded, isError]);

  // endregion

  // region [Events]

  const onLoadedImage = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const onErrorImage = useCallback(() => {
    if (retryCountRef.current < MAX_RETRY_COUNT) {
      retryCountRef.current += 1;
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 800);
    } else {
      setIsVisible(false);
      setError(true);
    }
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
    <div ref={imgRef} className={`lazy-image ${rootClass}`}>
      {!isLoaded && <div className="lazy-image__skeleton" />}
      {isVisible && !isError && (
        <img
          ref={rootRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          data-tag={tags?.join(", ")}
          className={`lazy-image__img ${isLoaded ? "lazy-image__img--loaded" : "lazy-image__img--loading"}`}
          onLoad={onLoadedImage}
          onError={onErrorImage}
        />
      )}
      {isError && <div className="lazy-image__error__img" />}
    </div>
  );
};

export default memo(LazyImage);
