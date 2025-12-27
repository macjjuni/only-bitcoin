import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KSkeleton } from "kku-ui";
import { ComponentBaseTypes } from "@/shared/types/base.interface";

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
      {!isLoaded && !isError && (
        <KSkeleton className="absolute inset-0 z-0 h-full w-full" />
      )}
      {isVisible && !isError && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          data-tag={tags?.join(", ")}
          onLoad={onLoadedImage}
          onError={onErrorImage}
          className={[
            "relative z-10 w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
          ].filter(Boolean).join(" ")}
        />
      )}
      {isError && (
        <div className="relative flex aspect-square w-full items-center justify-center bg-neutral-800">
          <span className="text-xl font-bold text-white tracking-tighter italic">Not Found</span>
        </div>
      )}
    </div>
  );
};

export default memo(LazyImage);
